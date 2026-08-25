import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
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

// Ver memoria "busto 3/4, fondo transparente" — mismo criterio que
// DialogueOverlay.tsx (el retrato se dibuja sin recorte, sobresaliendo de
// un aro decorativo, así que necesita fondo transparente para verse bien).
// El retrato siempre se dibuja pegado al borde IZQUIERDO del cuadro de
// diálogo, con el texto a la derecha (ver DialogueOverlay.tsx) — así que el
// personaje tiene que estar girado hacia la derecha de la imagen, como
// mirando hacia el texto/la conversación, nunca hacia la izquierda ni de
// frente a cámara.
const PORTRAIT_STYLE_PROMPT =
  'Bust portrait, framed from mid-chest up, character positioned in the lower half of the image with clear headroom above the head. Body orientation: the character\'s whole upper body is rotated in a 3/4 turn toward the RIGHT side of the frame — shoulders, torso and head all rotated together, not a front-facing torso with only the head turned. The shoulder nearer the camera is their LEFT shoulder (foreground, closer to the right edge of the frame); their right shoulder is the far one, angled back. Face and gaze also point screen-right, as if looking at someone standing to their right. Never a front-facing torso, never facing or looking left. Fully transparent background — no scenery, no backdrop, no ground. Stylized illustrated adventure-game character art, clean linework, painterly shading, dramatic but flattering lighting. No text, no watermark, no border or frame.';

async function requestImageBytes(
  apiKey: string,
  prompt: string,
  referenceImageBytes: Buffer | null,
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  const fullPrompt = `${prompt}\n\n${PORTRAIT_STYLE_PROMPT}`;
  let response: Response;
  // Con referencia: /images/edits (multipart, redibuja partiendo de esa
  // imagen — así el personaje se mantiene reconocible). Sin referencia:
  // /images/generations (texto puro), para el retrato base de un
  // personaje nuevo que todavía no tiene ninguna imagen propia.
  if (referenceImageBytes) {
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', new Blob([new Uint8Array(referenceImageBytes)], { type: 'image/png' }), 'reference.png');
    form.append('prompt', fullPrompt);
    form.append('size', '1024x1024');
    form.append('quality', 'high');
    // Sin esto, /edits deja que el modelo decida el fondo por su cuenta —
    // el texto del prompt ("fondo transparente") no alcanza de forma
    // confiable, a veces sale RGBA (transparente) y a veces RGB plano
    // (visto en expresiones/variantes generadas por referencia). El
    // endpoint de /generations de abajo ya lo pasa explícito.
    form.append('background', 'transparent');
    response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } else {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: fullPrompt,
        size: '1024x1024',
        quality: 'high',
        background: 'transparent',
        n: 1,
      }),
    });
  }
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
        let referenceImageBytes: Buffer | null = null;
        if (referenceImagePath) {
          try {
            referenceImageBytes = await readFile(join(app.getAppPath(), assetsDir(gameId), referenceImagePath));
          } catch {
            return { ok: false, error: `No se pudo leer la imagen de referencia: ${referenceImagePath}` };
          }
        }
        const result = await requestImageBytes(config.openaiApiKey, prompt.trim(), referenceImageBytes);
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
