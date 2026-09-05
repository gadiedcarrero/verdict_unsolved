import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import sharp from 'sharp';
import type { AiIntegrationsConfig } from '../../../shared/ai-integrations';
import { formatApiError } from './apiErrors';
import { getStoredAiIntegrationsConfig } from './aiIntegrationsHandlers';
import {
  chromaKeyToTransparent,
  generateComfyUIImage,
  GREEN_SCREEN_INSTRUCTION,
  NO_TEXT_INSTRUCTION,
} from './comfyuiImageProvider';

const ID_PATTERN = /^[a-z0-9-]+$/;

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function assetsDir(gameId: string): string {
  return `assets/games/${gameId}`;
}
function portraitsDir(gameId: string): string {
  return `${assetsDir(gameId)}/portraits`;
}
// Cuerpos enteros de las variantes, aparte de `layers/` (objetos sueltos de
// escena) porque esto se regenera desde el roster de personajes, no se dibuja
// por escena.
function charactersDir(gameId: string): string {
  return `${assetsDir(gameId)}/characters`;
}

// Retrato de un personaje ya existente (guardado una sola vez acá) usado
// SOLO como guía estructural de pose para el retrato base de personajes
// nuevos — ver POSE_GUIDE_INSTRUCTION más abajo. Ruta relativa a
// app.getAppPath() (= raíz del repo en dev) y no a __dirname — este PNG
// vive en el código fuente, no en out/main/ como el preload/renderer, así
// que no hay build que lo copie ahí.
function poseReferencePath(): string {
  return join(app.getAppPath(), 'electron/main/assets/portrait-pose-reference.png');
}

const POSE_GUIDE_INSTRUCTION =
  "Use the attached reference image ONLY as a structural pose guide: copy its camera framing, bust crop, and exact 3/4 body/head turn direction and angle. Completely ignore and discard the reference image's identity — different face, different hair, different age, different clothing, different everything except the pose/orientation/framing. Draw this character instead: ";

// Ver memoria "busto 3/4, fondo transparente" — mismo criterio que
// DialogueOverlay.tsx (el retrato se dibuja sin recorte, sobresaliendo de
// un aro decorativo, así que necesita fondo transparente para verse bien).
// Nano Banana no tiene canal alfa real: pedirle "fondo transparente" en el
// prompt hace que dibuje un cuadriculado de transparencia como imagen
// (píxeles opacos, no alfa de verdad) en vez de dejar el fondo vacío. Así
// que acá se le pide un fondo simple/liso (fácil de recortar después) y la
// transparencia real se logra con un recorte de fondo aparte (ver
// removeBackground más abajo), no con el modelo de generación.
const PORTRAIT_STYLE_PROMPT =
  `Bust portrait, framed from mid-chest up, character positioned in the lower half of the image with clear headroom above the head. Plain, simple, softly lit background — no scenery, no props, no other characters. Stylized illustrated adventure-game character art, clean linework, painterly shading, dramatic but flattering lighting. No watermark, no border or frame, no checkerboard/transparency pattern drawn as an image. ${NO_TEXT_INSTRUCTION}`;

// Mismo encuadre que la versión de Nano Banana, pero con fondo transparente
// nativo (gpt-image-1 sí produce alfa real cuando se le pide "background:
// transparent" en la request, a diferencia de Nano Banana) — no hace falta
// un paso de recorte aparte para este proveedor.
const PORTRAIT_STYLE_PROMPT_OPENAI =
  `Bust portrait, framed from mid-chest up, character positioned in the lower half of the image with clear headroom above the head. Fully transparent background — no scenery, no backdrop, no ground. Stylized illustrated adventure-game character art, clean linework, painterly shading, dramatic but flattering lighting. No watermark, no border or frame. ${NO_TEXT_INSTRUCTION}`;

// Cuerpo entero para poner EN la escena (ver CharacterVariant en
// schemas.ts), no el busto del círculo de diálogo. Dos decisiones de arte
// deliberadas acá:
//
// 1. Caricatura de borde negro, a propósito en otro lenguaje visual que el
//    fondo. Un recorte plano sobre un fondo generado se nota siempre; en vez
//    de pelear por integrarlo (caro, frágil, nunca del todo logrado), el
//    contraste se asume como estilo — el cerebro lo lee como decisión, no
//    como error, igual que Ace Attorney o Danganronpa.
// 2. Sin piso ni sombra proyectada: una sombra fija implica una dirección de
//    luz que no va a coincidir con la del fondo sobre el que se pegue.
//
// La POSE no se dicta acá — viene en la descripción de la variante (de pie,
// sentado en silla de ruedas, encapuchado). Esto solo garantiza que entre
// entera en el cuadro sea cual sea.
const BODY_STYLE_PROMPT =
  `Full-body character sprite: the ENTIRE figure is visible from head to feet, centered, with a small margin on every side — nothing cropped at any edge. Keep the pose described above, seen straight on at eye level, with no dramatic perspective or foreshortening. Bold black outline around the figure and its main internal shapes, flat cel-shaded cartoon style, clean confident linework, simple solid colors, minimal texture, even neutral lighting. Plain, simple, flat background — no scenery, no props, no other characters, no floor, no cast shadow. No watermark, no border or frame, no checkerboard/transparency pattern drawn as an image. ${NO_TEXT_INSTRUCTION}`;

const BODY_STYLE_PROMPT_OPENAI =
  `Full-body character sprite: the ENTIRE figure is visible from head to feet, centered, with a small margin on every side — nothing cropped at any edge. Keep the pose described above, seen straight on at eye level, with no dramatic perspective or foreshortening. Bold black outline around the figure and its main internal shapes, flat cel-shaded cartoon style, clean confident linework, simple solid colors, minimal texture, even neutral lighting. Fully transparent background — no scenery, no backdrop, no floor, no cast shadow. No watermark, no border or frame. ${NO_TEXT_INSTRUCTION}`;

/** Encuadre/estilo que se le agrega al prompt del personaje. Una entrada por
 * proveedor con alfa nativo y otra para los que no lo tienen (ver el
 * comentario de PORTRAIT_STYLE_PROMPT sobre el recorte de fondo). */
type ArtStyle = { base: string; openai: string };

const PORTRAIT_STYLE: ArtStyle = { base: PORTRAIT_STYLE_PROMPT, openai: PORTRAIT_STYLE_PROMPT_OPENAI };
const BODY_STYLE: ArtStyle = { base: BODY_STYLE_PROMPT, openai: BODY_STYLE_PROMPT_OPENAI };

async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${url} (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

// Recorte de fondo real (canal alfa) vía fal.ai — separado de la
// generación en sí porque Nano Banana no produce alfa (ver comentario de
// arriba). rembg necesita una URL pública, no bytes crudos — por eso todo
// este pipeline pasa imágenes como URLs de fal.media en vez de descargar y
// resubir en cada paso.
async function removeBackground(apiKey: string, imageUrl: string): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/imageutils/rembg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!response.ok) {
    throw new Error(await formatApiError('fal.ai (rembg)', response));
  }
  const data = (await response.json()) as { image?: { url?: string } };
  const url = data.image?.url;
  if (!url) throw new Error('fal.ai (rembg) no devolvió una imagen.');
  return url;
}

type ImageBytesResult = { ok: true; bytes: Buffer } | { ok: false; error: string };

async function requestImageBytesNanoBanana(
  apiKey: string,
  prompt: string,
  referenceImageDataUri: string,
  style: ArtStyle,
): Promise<ImageBytesResult> {
  const fullPrompt = `${prompt}\n\n${style.base}`;
  const response = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
    body: JSON.stringify({ prompt: fullPrompt, image_urls: [referenceImageDataUri] }),
  });
  if (!response.ok) {
    return { ok: false, error: await formatApiError('fal.ai (Nano Banana)', response) };
  }
  const data = (await response.json()) as { images?: { url?: string }[] };
  const rawUrl = data.images?.[0]?.url;
  if (!rawUrl) {
    return { ok: false, error: 'fal.ai (Nano Banana) no devolvió una imagen.' };
  }
  try {
    const transparentUrl = await removeBackground(apiKey, rawUrl);
    return { ok: true, bytes: await fetchBytes(transparentUrl) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function requestImageBytesOpenAI(
  apiKey: string,
  prompt: string,
  referenceImageBytes: Buffer,
  style: ArtStyle,
): Promise<ImageBytesResult> {
  const fullPrompt = `${prompt}\n\n${style.openai}`;
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('image', new Blob([new Uint8Array(referenceImageBytes)], { type: 'image/png' }), 'reference.png');
  form.append('prompt', fullPrompt);
  form.append('size', '1024x1024');
  form.append('quality', 'high');
  // Sin esto, /edits deja que el modelo decida el fondo por su cuenta — el
  // texto del prompt ("fondo transparente") no alcanza de forma confiable,
  // a veces sale RGBA (transparente) y a veces RGB plano.
  form.append('background', 'transparent');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    return { ok: false, error: await formatApiError('OpenAI', response) };
  }
  const data = (await response.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return { ok: false, error: 'OpenAI no devolvió una imagen.' };
  }
  return { ok: true, bytes: Buffer.from(b64, 'base64') };
}

// Local con ComfyUI (ver comfyuiImageProvider.ts) — no tiene canal alfa
// real tampoco, así que pide fondo verde puro (chroma key) y lo recorta a
// mano acá mismo, sin depender de ningún servicio externo. Si hay una
// imagen de referencia (retrato ya existente del MISMO personaje: otra
// expresión o variante), usa InstantID para mantener la misma cara — para
// el retrato base de un personaje nuevo (sin referencia todavía) no hay
// forma de fijar identidad, así que sale plano por texto nada más.
async function requestImageBytesComfyUI(
  config: AiIntegrationsConfig,
  prompt: string,
  faceReferenceBytes: Buffer | null,
  style: ArtStyle,
): Promise<ImageBytesResult> {
  try {
    const fullPrompt = `${prompt}\n\n${style.base}\n\n${GREEN_SCREEN_INSTRUCTION}`;
    const raw = await generateComfyUIImage({
      baseUrl: config.comfyuiBaseUrl,
      checkpoint: config.comfyuiCheckpoint,
      prompt: fullPrompt,
      width: 832,
      height: 1216,
      reference: faceReferenceBytes ? { mode: 'face', bytes: faceReferenceBytes } : undefined,
    });
    const transparent = await chromaKeyToTransparent(raw);
    return { ok: true, bytes: transparent };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Elige proveedor y le pasa el encuadre pedido. Compartido por el retrato de
 * busto y el cuerpo entero: lo único que cambia entre los dos es `style` (y
 * de dónde sale la referencia, que resuelve cada handler). */
async function generateCharacterImage(
  config: AiIntegrationsConfig,
  prompt: string,
  referenceImageBytes: Buffer | null,
  style: ArtStyle,
): Promise<ImageBytesResult> {
  if (config.imageProvider === 'openai') {
    if (!config.openaiApiKey) {
      return { ok: false, error: 'Falta la API key de OpenAI en Ajustes → Integraciones IA.' };
    }
    // /images/edits exige una imagen de entrada; sin referencia no hay
    // llamada posible con este proveedor.
    if (!referenceImageBytes) {
      return { ok: false, error: 'OpenAI necesita una imagen de referencia para este paso.' };
    }
    return requestImageBytesOpenAI(config.openaiApiKey, prompt, referenceImageBytes, style);
  }
  if (config.imageProvider === 'comfyui') {
    return requestImageBytesComfyUI(config, prompt, referenceImageBytes, style);
  }
  if (!config.falApiKey) {
    return { ok: false, error: 'Falta la API key de fal.ai en Ajustes → Integraciones IA.' };
  }
  if (!referenceImageBytes) {
    return { ok: false, error: 'Nano Banana necesita una imagen de referencia para este paso.' };
  }
  const dataUri = `data:image/png;base64,${referenceImageBytes.toString('base64')}`;
  return requestImageBytesNanoBanana(config.falApiKey, prompt, dataUri, style);
}

export function registerCharacterArtHandlers(): void {
  ipcMain.handle(
    'ai:generate-character-portrait',
    async (
      _event,
      gameId: unknown,
      characterId: unknown,
      prompt: unknown,
      expressionKey: unknown,
      referenceImagePath: unknown,
    ) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(characterId)) {
        return { ok: false, error: `Id de personaje inválido: ${String(characterId)}` };
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return { ok: false, error: 'Falta la descripción del personaje.' };
      }
      // null = retrato por defecto (Character.portrait); una clave válida =
      // expresión emocional (Character.expressions[clave]).
      if (expressionKey !== null && !isValidId(expressionKey)) {
        return { ok: false, error: `Id de expresión inválido: ${JSON.stringify(expressionKey)}` };
      }
      if (referenceImagePath !== null && typeof referenceImagePath !== 'string') {
        return { ok: false, error: 'Ruta de referencia inválida.' };
      }
      const config = await getStoredAiIntegrationsConfig();
      try {
        // Con referenceImagePath: retrato/expresión de un personaje que ya
        // tiene imagen propia — se manda tal cual, el modelo mantiene esa
        // identidad. Sin referenceImagePath (retrato base de un personaje
        // nuevo): se manda la imagen de pose genérica de arriba con
        // POSE_GUIDE_INSTRUCTION, que le pide ignorar su identidad y copiar
        // solo la orientación/encuadre. Solo aplica a Nano Banana/OpenAI —
        // ComfyUI/InstantID necesita una CARA de referencia, no una guía de
        // pose genérica, así que en ese caso el retrato base sale sin
        // referencia (plano por texto).
        let referenceImageBytes: Buffer | null;
        let effectivePrompt: string;
        if (referenceImagePath) {
          try {
            referenceImageBytes = await readFile(join(app.getAppPath(), assetsDir(gameId), referenceImagePath));
          } catch {
            return { ok: false, error: `No se pudo leer la imagen de referencia: ${referenceImagePath}` };
          }
          effectivePrompt = prompt.trim();
        } else if (config.imageProvider === 'comfyui') {
          referenceImageBytes = null;
          effectivePrompt = prompt.trim();
        } else {
          referenceImageBytes = await readFile(poseReferencePath());
          effectivePrompt = `${POSE_GUIDE_INSTRUCTION}${prompt.trim()}`;
        }

        const result = await generateCharacterImage(config, effectivePrompt, referenceImageBytes, PORTRAIT_STYLE);
        if (!result.ok) return result;

        const dir = join(app.getAppPath(), portraitsDir(gameId));
        await mkdir(dir, { recursive: true });
        const fileName = expressionKey ? `${characterId}-${expressionKey}` : characterId;
        const relativePath = `portraits/${fileName}.png`;
        const filePath = join(app.getAppPath(), assetsDir(gameId), relativePath);
        await writeFile(filePath, result.bytes);
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  // Cuerpo entero de una variante (ver CharacterVariant en schemas.ts) —
  // hermano del handler de arriba, mismo pipeline con otro encuadre.
  // A diferencia del retrato, acá SIEMPRE hay una referencia de identidad
  // natural y el llamador la pasa según qué se esté generando:
  //   - el cuerpo neutral de una variante → el busto del personaje
  //   - una expresión de esa variante     → el cuerpo neutral ya generado
  // Por eso no hay guía de pose genérica como en el retrato: la pose la
  // dicta la descripción de la variante, no una imagen de referencia.
  ipcMain.handle(
    'ai:generate-character-body',
    async (
      _event,
      gameId: unknown,
      characterId: unknown,
      variantId: unknown,
      prompt: unknown,
      expressionKey: unknown,
      referenceImagePath: unknown,
    ) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(characterId)) {
        return { ok: false, error: `Id de personaje inválido: ${String(characterId)}` };
      }
      if (!isValidId(variantId)) {
        return { ok: false, error: `Id de variante inválido: ${String(variantId)}` };
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return { ok: false, error: 'Falta la descripción de la variante.' };
      }
      // null = cuerpo neutral de la variante; una clave válida = esa misma
      // variante con otra cara.
      if (expressionKey !== null && !isValidId(expressionKey)) {
        return { ok: false, error: `Id de expresión inválido: ${JSON.stringify(expressionKey)}` };
      }
      if (referenceImagePath !== null && typeof referenceImagePath !== 'string') {
        return { ok: false, error: 'Ruta de referencia inválida.' };
      }
      const config = await getStoredAiIntegrationsConfig();
      try {
        let referenceImageBytes: Buffer | null = null;
        if (referenceImagePath) {
          try {
            referenceImageBytes = await readFile(join(app.getAppPath(), assetsDir(gameId), referenceImagePath));
          } catch {
            return { ok: false, error: `No se pudo leer la imagen de referencia: ${referenceImagePath}` };
          }
        }

        const result = await generateCharacterImage(config, prompt.trim(), referenceImageBytes, BODY_STYLE);
        if (!result.ok) return result;

        await mkdir(join(app.getAppPath(), charactersDir(gameId)), { recursive: true });
        const fileName = expressionKey
          ? `${characterId}-${variantId}-${expressionKey}`
          : `${characterId}-${variantId}`;
        const relativePath = `characters/${fileName}.png`;
        await writeFile(join(app.getAppPath(), assetsDir(gameId), relativePath), result.bytes);
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  // Ningún proveedor de imagen probado acierta siempre la orientación —
  // se probaron varias estrategias (texto, imagen de referencia,
  // verificación con IA aparte) y todas fallan alguna vez. En vez de
  // perseguir el 100% automático, este botón deja arreglarlo a mano en un
  // click: espeja horizontalmente el archivo YA guardado, en el mismo path
  // (no genera de nuevo, no gasta crédito de ningún proveedor).
  ipcMain.handle('ai:flip-character-portrait', async (_event, gameId: unknown, relativePath: unknown) => {
    if (!isValidId(gameId)) {
      return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
    }
    if (typeof relativePath !== 'string' || !relativePath.startsWith('portraits/')) {
      return { ok: false, error: 'Ruta de retrato inválida.' };
    }
    try {
      const filePath = join(app.getAppPath(), assetsDir(gameId), relativePath);
      const bytes = await readFile(filePath);
      const flipped = await sharp(bytes).flop().png().toBuffer();
      await writeFile(filePath, flipped);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
