import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';

const CASE_DIR = 'src/cases/case-001-la-ultima-llamada';
const SCENES_DIR = `${CASE_DIR}/scenes`;
const STRINGS_FILE = `${CASE_DIR}/locales/es.json`;
const CHARACTERS_FILE = `${CASE_DIR}/characters.json`;
const ASSETS_DIR = 'assets/cases/case-001-la-ultima-llamada';
const PORTRAITS_DIR = `${ASSETS_DIR}/portraits`;
const BACKGROUNDS_DIR = `${ASSETS_DIR}/backgrounds`;

// Patrón en vez de lista fija: permite crear escenas/personajes nuevos desde
// el editor sin tener que sumar cada id acá a mano.
const ID_PATTERN = /^[a-z0-9-]+$/;
const EXT_PATTERN = /^[a-z0-9]{1,5}$/i;

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every((v) => typeof v === 'string')
  );
}

async function mergeStrings(patch: Record<string, string>): Promise<void> {
  const filePath = join(app.getAppPath(), STRINGS_FILE);
  const current = JSON.parse(await readFile(filePath, 'utf-8')) as Record<string, string>;
  const merged = { ...current, ...patch };
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(filePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8');
}

export function registerSceneEditorHandlers(): void {
  ipcMain.handle(
    'scene-editor:save',
    async (_event, sceneId: unknown, scene: unknown, stringsPatch: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (typeof sceneId !== 'string' || !ID_PATTERN.test(sceneId)) {
        return { ok: false, error: `Id de escena inválido: ${String(sceneId)}` };
      }
      try {
        const filePath = join(app.getAppPath(), SCENES_DIR, `${sceneId}.json`);
        await writeFile(filePath, `${JSON.stringify(scene, null, 2)}\n`, 'utf-8');

        if (isStringRecord(stringsPatch) && Object.keys(stringsPatch).length > 0) {
          await mergeStrings(stringsPatch);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle('scene-editor:save-characters', async (_event, characters: unknown, stringsPatch: unknown) => {
    if (app.isPackaged) {
      return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
    }
    if (!Array.isArray(characters)) {
      return { ok: false, error: 'Formato de personajes inválido.' };
    }
    try {
      const filePath = join(app.getAppPath(), CHARACTERS_FILE);
      await writeFile(filePath, `${JSON.stringify(characters, null, 2)}\n`, 'utf-8');

      if (isStringRecord(stringsPatch) && Object.keys(stringsPatch).length > 0) {
        await mergeStrings(stringsPatch);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(
    'scene-editor:save-portrait',
    async (_event, characterId: unknown, ext: unknown, data: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (typeof characterId !== 'string' || !ID_PATTERN.test(characterId)) {
        return { ok: false, error: `Id de personaje inválido: ${String(characterId)}` };
      }
      if (typeof ext !== 'string' || !EXT_PATTERN.test(ext)) {
        return { ok: false, error: `Extensión de archivo inválida: ${String(ext)}` };
      }
      if (!(data instanceof Uint8Array)) {
        return { ok: false, error: 'Datos de imagen inválidos.' };
      }
      try {
        const dir = join(app.getAppPath(), PORTRAITS_DIR);
        await mkdir(dir, { recursive: true });
        const relativePath = `portraits/${characterId}.${ext.toLowerCase()}`;
        const filePath = join(app.getAppPath(), ASSETS_DIR, relativePath);
        await writeFile(filePath, Buffer.from(data));
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle(
    'scene-editor:save-background',
    async (_event, fileId: unknown, ext: unknown, data: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (typeof fileId !== 'string' || !ID_PATTERN.test(fileId)) {
        return { ok: false, error: `Id de fondo inválido: ${String(fileId)}` };
      }
      if (typeof ext !== 'string' || !EXT_PATTERN.test(ext)) {
        return { ok: false, error: `Extensión de archivo inválida: ${String(ext)}` };
      }
      if (!(data instanceof Uint8Array)) {
        return { ok: false, error: 'Datos de imagen inválidos.' };
      }
      try {
        const dir = join(app.getAppPath(), BACKGROUNDS_DIR);
        await mkdir(dir, { recursive: true });
        const relativePath = `backgrounds/${fileId}.${ext.toLowerCase()}`;
        const filePath = join(app.getAppPath(), ASSETS_DIR, relativePath);
        await writeFile(filePath, Buffer.from(data));
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );
}
