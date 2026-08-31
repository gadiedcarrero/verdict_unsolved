import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import type { AiIntegrationsConfig } from '../../../shared/ai-integrations';
import { formatApiError } from './apiErrors';
import { getStoredAiIntegrationsConfig } from './aiIntegrationsHandlers';
import { generateComfyUIImage, NO_TEXT_INSTRUCTION } from './comfyuiImageProvider';

const ID_PATTERN = /^[a-z0-9-]+$/;

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function assetsDir(gameId: string): string {
  return `assets/games/${gameId}`;
}
function backgroundsDir(gameId: string): string {
  return `${assetsDir(gameId)}/backgrounds`;
}

function sniffImageMimeType(bytes: Buffer): string {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  return 'image/png';
}

function toDataUri(bytes: Buffer): string {
  return `data:${sniffImageMimeType(bytes)};base64,${bytes.toString('base64')}`;
}

const FETCH_RETRY_ATTEMPTS = 3;

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }
  throw lastError;
}

const BACKGROUND_STYLE_PROMPT =
  `Wide point-and-click adventure game background/establishing shot. Plain, cinematic, dramatic lighting matching a moody detective-thriller graphic novel aesthetic — stylized illustrated digital painting, clean linework, painterly shading. No watermark, no UI, no border. ${NO_TEXT_INSTRUCTION}`;

type CharacterReference = { name: string; description: string; portraitPath: string };
type GenerateResult = { ok: true; bytes: Buffer } | { ok: false; error: string };

// El desglose de guion ya había intentado meter personajes en un fondo por
// su cuenta (a partir de characterIds de la escena) y salía mal — nombres
// mal puestos, caras genéricas. La diferencia acá: el usuario elige a mano
// qué personajes van, y se les manda al modelo la MISMA imagen de
// referencia que ya se usa en todos lados para mantener identidad (ver
// characterArtHandlers.ts) — no una descripción de texto reinterpretada
// de cero. Cada referencia va numerada y con su nombre en el prompt para
// que el modelo sepa cuál personaje puntual del relato le corresponde a
// cuál imagen.
async function generateNanoBanana(
  apiKey: string,
  prompt: string,
  referenceEntries: (CharacterReference & { bytes: Buffer })[],
): Promise<GenerateResult> {
  let response: Response;
  if (referenceEntries.length > 0) {
    const referenceList = referenceEntries
      .map((c, i) => `Reference image ${i + 1} = ${c.name}${c.description ? ` (${c.description})` : ''}.`)
      .join(' ');
    const fullPrompt =
      `${referenceList} Use each character's EXACT reference image likeness (face, hair, build, and ` +
      "clothing/outfit) for that named character wherever they appear in the scene below — copy their " +
      "exact clothing from the reference image pixel-for-pixel, don't reinterpret it from the text " +
      "description, and don't swap it for something that seems to fit the location better (e.g. never " +
      'put a character in a suit or formal wear just because the scene is a meeting room/office — they ' +
      `keep wearing exactly what their reference image shows, regardless of location). Scene: ${prompt.trim()}\n\n${BACKGROUND_STYLE_PROMPT}`;
    response = await fetchWithRetry('https://fal.run/fal-ai/nano-banana/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_urls: referenceEntries.map((c) => toDataUri(c.bytes)),
        aspect_ratio: '16:9',
      }),
    });
  } else {
    const fullPrompt = `${prompt.trim()}\n\n${BACKGROUND_STYLE_PROMPT}`;
    response = await fetchWithRetry('https://fal.run/fal-ai/nano-banana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
      body: JSON.stringify({ prompt: fullPrompt, aspect_ratio: '16:9' }),
    });
  }
  if (!response.ok) {
    return { ok: false, error: await formatApiError('fal.ai (Nano Banana)', response) };
  }
  const data = (await response.json()) as { images?: { url?: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) {
    return { ok: false, error: 'fal.ai (Nano Banana) no devolvió una imagen.' };
  }
  const imageResponse = await fetchWithRetry(url);
  if (!imageResponse.ok) {
    return { ok: false, error: `No se pudo descargar el resultado (${imageResponse.status}).` };
  }
  return { ok: true, bytes: Buffer.from(await imageResponse.arrayBuffer()) };
}

// OpenAI no tiene un equivalente directo a mandar VARIAS imágenes de
// referencia numeradas como Nano Banana (`images.edit` acepta una imagen
// base + máscara, no una lista con nombres) — con un solo personaje
// elegido, esa imagen ancla la identidad; con varios, solo la del primero
// se usa como base y el resto queda solo en la descripción de texto (peor
// consistencia que Nano Banana para escenas con más de un personaje).
async function generateOpenAI(
  apiKey: string,
  prompt: string,
  referenceEntries: (CharacterReference & { bytes: Buffer })[],
): Promise<GenerateResult> {
  const fullPrompt = referenceEntries.length
    ? `${referenceEntries.map((c) => `${c.name}${c.description ? ` (${c.description})` : ''}`).join(', ')} appear in this scene, matching their reference image likeness. Scene: ${prompt.trim()}\n\n${BACKGROUND_STYLE_PROMPT}`
    : `${prompt.trim()}\n\n${BACKGROUND_STYLE_PROMPT}`;
  let response: Response;
  if (referenceEntries.length > 0) {
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', new Blob([new Uint8Array(referenceEntries[0]!.bytes)], { type: 'image/png' }), 'reference.png');
    form.append('prompt', fullPrompt);
    form.append('size', '1536x1024');
    form.append('quality', 'high');
    response = await fetchWithRetry('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } else {
    response = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: fullPrompt, size: '1536x1024', quality: 'high' }),
    });
  }
  if (!response.ok) {
    return { ok: false, error: await formatApiError('OpenAI', response) };
  }
  const data = (await response.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return { ok: false, error: 'OpenAI no devolvió una imagen.' };
  return { ok: true, bytes: Buffer.from(b64, 'base64') };
}

// Local con ComfyUI: IP-Adapter cuando hay referencias (mantiene el look
// general de los personajes elegidos, combinados — pensado en PressForge
// para objetos/sujetos, no caras puntuales, así que la fidelidad por
// personaje es menor que Nano Banana/InstantID para escenas con varios a
// la vez), txt2img plano si no hay ninguna.
async function generateComfyUI(
  config: AiIntegrationsConfig,
  prompt: string,
  referenceEntries: (CharacterReference & { bytes: Buffer })[],
): Promise<GenerateResult> {
  try {
    const fullPrompt = `${prompt.trim()}\n\n${BACKGROUND_STYLE_PROMPT}`;
    // ComfyUI no tiene un modo "IP-Adapter para varias caras a la vez" tan
    // confiable como InstantID por personaje — se manda la PRIMERA
    // referencia elegida como ancla de estilo general de la escena, en vez
    // de arriesgar que el modelo mezcle rasgos de varias caras en una sola.
    const bytes = await generateComfyUIImage({
      baseUrl: config.comfyuiBaseUrl,
      checkpoint: config.comfyuiCheckpoint,
      prompt: fullPrompt,
      width: 1216,
      height: 832,
      faceReferenceBytes: referenceEntries[0]?.bytes,
    });
    return { ok: true, bytes };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function registerBackgroundArtHandlers(): void {
  ipcMain.handle(
    'ai:generate-background',
    async (_event, gameId: unknown, fileId: unknown, prompt: unknown, characters: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(fileId)) {
        return { ok: false, error: `Id de archivo inválido: ${String(fileId)}` };
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return { ok: false, error: 'Falta describir la escena.' };
      }
      if (
        !Array.isArray(characters) ||
        !characters.every(
          (c) =>
            c &&
            typeof c === 'object' &&
            typeof (c as Record<string, unknown>).name === 'string' &&
            typeof (c as Record<string, unknown>).description === 'string' &&
            typeof (c as Record<string, unknown>).portraitPath === 'string',
        )
      ) {
        return { ok: false, error: 'Personajes inválidos.' };
      }
      const config = await getStoredAiIntegrationsConfig();
      const charRefs = characters as CharacterReference[];
      try {
        const referenceEntries = await Promise.all(
          charRefs.map(async (c) => ({
            ...c,
            bytes: await readFile(join(app.getAppPath(), assetsDir(gameId), c.portraitPath)),
          })),
        );

        let result: GenerateResult;
        if (config.imageProvider === 'openai') {
          if (!config.openaiApiKey) {
            return { ok: false, error: 'Falta la API key de OpenAI en Ajustes → Integraciones IA.' };
          }
          result = await generateOpenAI(config.openaiApiKey, prompt, referenceEntries);
        } else if (config.imageProvider === 'comfyui') {
          result = await generateComfyUI(config, prompt, referenceEntries);
        } else {
          if (!config.falApiKey) {
            return { ok: false, error: 'Falta la API key de fal.ai en Ajustes → Integraciones IA.' };
          }
          result = await generateNanoBanana(config.falApiKey, prompt, referenceEntries);
        }
        if (!result.ok) return result;

        const dir = join(app.getAppPath(), backgroundsDir(gameId));
        await mkdir(dir, { recursive: true });
        const relativePath = `backgrounds/${fileId}.png`;
        await writeFile(join(app.getAppPath(), assetsDir(gameId), relativePath), result.bytes);
        return { ok: true, path: relativePath };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const hint = message.includes('fetch failed')
          ? ' — probablemente la conexión se cortó subiendo las referencias. Probá de nuevo.'
          : '';
        return { ok: false, error: `${message}${hint}` };
      }
    },
  );
}
