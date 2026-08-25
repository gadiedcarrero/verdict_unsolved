import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import sharp from 'sharp';
import { formatApiError } from './apiErrors';
import { getStoredAiIntegrationsConfig } from './aiIntegrationsHandlers';

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
  'Bust portrait, framed from mid-chest up, character positioned in the lower half of the image with clear headroom above the head. Plain, simple, softly lit background — no scenery, no props, no other characters. Stylized illustrated adventure-game character art, clean linework, painterly shading, dramatic but flattering lighting. No text, no watermark, no border or frame, no checkerboard/transparency pattern drawn as an image.';

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

async function requestImageBytes(
  apiKey: string,
  prompt: string,
  referenceImageDataUri: string,
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  const fullPrompt = `${prompt}\n\n${PORTRAIT_STYLE_PROMPT}`;
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
      if (!config.falApiKey) {
        return { ok: false, error: 'Falta la API key de fal.ai en Ajustes → Integraciones IA.' };
      }
      try {
        // Con referenceImagePath: retrato/expresión de un personaje que ya
        // tiene imagen propia — se manda tal cual, el modelo mantiene esa
        // identidad. Sin referenceImagePath (retrato base de un personaje
        // nuevo): se manda la imagen de pose genérica de arriba con
        // POSE_GUIDE_INSTRUCTION, que le pide ignorar su identidad y copiar
        // solo la orientación/encuadre.
        let referenceImageBytes: Buffer;
        let effectivePrompt: string;
        if (referenceImagePath) {
          try {
            referenceImageBytes = await readFile(join(app.getAppPath(), assetsDir(gameId), referenceImagePath));
          } catch {
            return { ok: false, error: `No se pudo leer la imagen de referencia: ${referenceImagePath}` };
          }
          effectivePrompt = prompt.trim();
        } else {
          referenceImageBytes = await readFile(poseReferencePath());
          effectivePrompt = `${POSE_GUIDE_INSTRUCTION}${prompt.trim()}`;
        }
        const referenceImageDataUri = `data:image/png;base64,${referenceImageBytes.toString('base64')}`;
        const result = await requestImageBytes(config.falApiKey, effectivePrompt, referenceImageDataUri);
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

  // Ningún proveedor de imagen probado (OpenAI, y ahora fal.ai/Nano Banana)
  // acierta siempre la orientación del retrato — se probaron varias
  // estrategias (texto, imagen de referencia, verificación con IA aparte) y
  // todas fallan alguna vez. En vez de perseguir el 100% automático, este
  // botón deja arreglarlo a mano en un click: espeja horizontalmente el
  // archivo YA guardado, en el mismo path (no genera de nuevo, no gasta
  // crédito de ningún proveedor).
  ipcMain.handle(
    'ai:flip-character-portrait',
    async (_event, gameId: unknown, relativePath: unknown) => {
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
    },
  );
}
