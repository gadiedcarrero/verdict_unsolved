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

// Retrato de un personaje ya existente (cualquiera, guardado una sola vez
// acá) usado SOLO como guía estructural de pose para el retrato base de
// personajes nuevos — ver POSE_GUIDE_INSTRUCTION más abajo. Pedirle a
// gpt-image-1 la orientación por texto ("girá a la derecha") resultó nada
// confiable: probado con varias vueltas de wording cada vez más explícito
// (cabeza, hombros, torso) y terminó dibujando para la izquierda de todos
// modos la mayoría de las veces; hasta un clasificador con visión (gpt-4o-mini)
// dio respuestas contradictorias para la MISMA imagen sin espejar y
// espejada. Copiar la pose de una imagen de referencia sí es confiable
// (probado: identidad completamente distinta, pose transferida bien) — los
// modelos de imagen son mucho mejores imitando estructura visual que
// interpretando izquierda/derecha en texto.
// Ruta relativa a app.getAppPath() (= raíz del repo en dev, ver el resto de
// este archivo) y no a __dirname — este PNG vive en el código fuente, no en
// out/main/ como el preload/renderer, así que no hay build que lo copie ahí.
function poseReferencePath(): string {
  return join(app.getAppPath(), 'electron/main/assets/portrait-pose-reference.png');
}

const POSE_GUIDE_INSTRUCTION =
  "Use the attached reference image ONLY as a structural pose guide: copy its camera framing, bust crop, and exact 3/4 body/head turn direction and angle. Completely ignore and discard the reference image's identity — different face, different hair, different age, different clothing, different everything except the pose/orientation/framing. Draw this character instead: ";

// Ver memoria "busto 3/4, fondo transparente" — mismo criterio que
// DialogueOverlay.tsx (el retrato se dibuja sin recorte, sobresaliendo de
// un aro decorativo, así que necesita fondo transparente para verse bien).
const PORTRAIT_STYLE_PROMPT =
  'Bust portrait, framed from mid-chest up, character positioned in the lower half of the image with clear headroom above the head. Fully transparent background — no scenery, no backdrop, no ground. Stylized illustrated adventure-game character art, clean linework, painterly shading, dramatic but flattering lighting. No text, no watermark, no border or frame.';

// Ni el texto del prompt ni la imagen de referencia de pose garantizan la
// orientación final — probado: mismo pipeline, mismo personaje, un intento
// salió mirando bien y el siguiente mal, así que ningún truco de generación
// alcanza por sí solo. Última verificación, decisiva: preguntarle a un
// modelo con visión en qué MITAD del cuadro (izquierda o derecha en
// coordenadas de la imagen, x<512 o x>512 sobre 1024px) cae la oreja
// visible del personaje — reformular la pregunta en coordenadas de píxeles
// en vez de "¿mira para la izquierda o la derecha?" evita la confusión
// egocéntrica que hacía fallar tanto a la generación como a un intento
// anterior de clasificación (gpt-4o-mini con esa frase se contradijo en la
// MISMA imagen sin espejar y espejada). Con gpt-4o + temperatura 0 y esta
// formulación, contestó consistente y correcto en varias imágenes ya
// verificadas a ojo antes de confiarle esta corrección.
async function findsEarOnRightHalf(apiKey: string, pngBytes: Buffer): Promise<boolean | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  "This square image is 1024x1024 pixels. The character's VISIBLE EAR (the one clearly drawn) is located at some x-coordinate. Is that ear at an x-coordinate LESS than 512 (left half of the image) or GREATER than 512 (right half of the image)? If no ear is clearly visible, answer based on which half of the image has more of the face/head area. Reply with exactly one token: \"left-half\" or \"right-half\".",
              },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pngBytes.toString('base64')}` } },
            ],
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const answer = data.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (answer?.startsWith('right')) return true;
    if (answer?.startsWith('left')) return false;
    return null;
  } catch {
    return null;
  }
}

// Oreja visible en la mitad derecha del cuadro (x>512) = el personaje está
// mirando hacia la IZQUIERDA (el lado visible de la cabeza es el que queda
// más lejos del giro) — confirmado visualmente contra varias imágenes
// reales. Como acá siempre queremos que termine mirando a la derecha (ver
// DialogueOverlay.tsx — el retrato va pegado al borde izquierdo del cuadro
// de diálogo), ese es exactamente el caso a espejar.
async function ensureFacingRight(apiKey: string, bytes: Buffer): Promise<Buffer> {
  const earOnRightHalf = await findsEarOnRightHalf(apiKey, bytes);
  if (earOnRightHalf !== true) return bytes;
  return sharp(bytes).flop().png().toBuffer();
}

async function requestImageBytes(
  apiKey: string,
  prompt: string,
  referenceImageBytes: Buffer,
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  const fullPrompt = `${prompt}\n\n${PORTRAIT_STYLE_PROMPT}`;
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
  const bytes = await ensureFacingRight(apiKey, Buffer.from(b64, 'base64'));
  return { ok: true, bytes };
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
      if (!config.openaiApiKey) {
        return { ok: false, error: 'Falta la API key de OpenAI en Ajustes → Integraciones IA.' };
      }
      try {
        // Con referenceImagePath: retrato/expresión de un personaje que ya
        // tiene imagen propia — se manda tal cual, el modelo mantiene esa
        // identidad. Sin referenceImagePath (retrato base de un personaje
        // nuevo): se manda la imagen de pose genérica de arriba con
        // POSE_GUIDE_INSTRUCTION, que le pide ignorar su identidad y copiar
        // solo la orientación/encuadre — así el personaje nuevo nace con la
        // orientación correcta sin depender de texto para lograrlo.
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
        const result = await requestImageBytes(config.openaiApiKey, effectivePrompt, referenceImageBytes);
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
}
