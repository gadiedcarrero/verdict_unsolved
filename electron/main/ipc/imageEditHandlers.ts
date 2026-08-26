import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { formatApiError } from './apiErrors';
import { getStoredAiIntegrationsConfig } from './aiIntegrationsHandlers';

const ID_PATTERN = /^[a-z0-9-]+$/;

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

// Ningún proveedor de imagen genera perfecto a la primera (ver
// characterArtHandlers.ts — orientación, personajes duplicados, etc.) — en
// vez de que cada corrección puntual necesite que alguien escriba un script
// aparte, esto deja pedir el ajuste en texto libre directo desde el editor
// ("esa foto de la pared se ve realista, no debe ser", "hay un personaje
// duplicado, sacá uno") sobre CUALQUIER imagen ya generada del juego (fondos
// de escena, retratos, lo que sea) — reescribe el mismo archivo, en el mismo
// lugar, no crea uno nuevo.
export function registerImageEditHandlers(): void {
  ipcMain.handle(
    'ai:edit-image',
    async (_event, gameId: unknown, relativePath: unknown, instruction: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (typeof relativePath !== 'string' || relativePath.includes('..')) {
        return { ok: false, error: 'Ruta de imagen inválida.' };
      }
      if (typeof instruction !== 'string' || !instruction.trim()) {
        return { ok: false, error: 'Falta describir qué cambiar.' };
      }
      const config = await getStoredAiIntegrationsConfig();
      if (!config.falApiKey) {
        return { ok: false, error: 'Falta la API key de fal.ai en Ajustes → Integraciones IA.' };
      }
      try {
        const filePath = join(app.getAppPath(), 'assets/games', gameId, relativePath);
        const currentBytes = await readFile(filePath);
        const dataUri = `data:image/png;base64,${currentBytes.toString('base64')}`;
        const prompt =
          `Edit this exact image according to this instruction: ${instruction.trim()}\n\n` +
          'Keep everything else about the image identical — same subjects, same framing, same art style, ' +
          'same lighting — except for what the instruction above asks to change.';
        const response = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Key ${config.falApiKey}` },
          body: JSON.stringify({ prompt, image_urls: [dataUri] }),
        });
        if (!response.ok) {
          return { ok: false, error: await formatApiError('fal.ai (Nano Banana)', response) };
        }
        const data = (await response.json()) as { images?: { url?: string }[] };
        const url = data.images?.[0]?.url;
        if (!url) {
          return { ok: false, error: 'fal.ai (Nano Banana) no devolvió una imagen.' };
        }
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
          return { ok: false, error: `No se pudo descargar el resultado (${imageResponse.status}).` };
        }
        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        await writeFile(filePath, bytes);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );
}
