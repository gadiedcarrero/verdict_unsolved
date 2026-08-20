import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';

// Patrón en vez de lista fija: permite crear juegos/escenas/personajes
// nuevos desde el editor sin tener que sumar cada id acá a mano. También es
// la única defensa contra path traversal — un gameId/sceneId/characterId
// tipo "../../algo" nunca matchea esto, así que nunca llega a join().
const ID_PATTERN = /^[a-z0-9-]+$/;
const EXT_PATTERN = /^[a-z0-9]{1,5}$/i;

function gameDir(gameId: string): string {
  return `src/games/${gameId}`;
}
function scenesDir(gameId: string): string {
  return `${gameDir(gameId)}/scenes`;
}
function stringsFile(gameId: string): string {
  return `${gameDir(gameId)}/locales/es.json`;
}
function charactersFile(gameId: string): string {
  return `${gameDir(gameId)}/characters.json`;
}
function siteSettingsFile(gameId: string): string {
  return `${gameDir(gameId)}/site-settings.json`;
}
function assetsDir(gameId: string): string {
  return `assets/games/${gameId}`;
}
function portraitsDir(gameId: string): string {
  return `${assetsDir(gameId)}/portraits`;
}
function backgroundsDir(gameId: string): string {
  return `${assetsDir(gameId)}/backgrounds`;
}
function cursorsDir(gameId: string): string {
  return `${assetsDir(gameId)}/cursors`;
}
function actionMenuDir(gameId: string): string {
  return `${assetsDir(gameId)}/action-menu`;
}

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every((v) => typeof v === 'string')
  );
}

async function mergeStrings(gameId: string, patch: Record<string, string>): Promise<void> {
  const filePath = join(app.getAppPath(), stringsFile(gameId));
  const current = JSON.parse(await readFile(filePath, 'utf-8')) as Record<string, string>;
  const merged = { ...current, ...patch };
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(filePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8');
}

export function registerSceneEditorHandlers(): void {
  ipcMain.handle(
    'scene-editor:save',
    async (_event, gameId: unknown, sceneId: unknown, scene: unknown, stringsPatch: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(sceneId)) {
        return { ok: false, error: `Id de escena inválido: ${String(sceneId)}` };
      }
      try {
        const filePath = join(app.getAppPath(), scenesDir(gameId), `${sceneId}.json`);
        await writeFile(filePath, `${JSON.stringify(scene, null, 2)}\n`, 'utf-8');

        if (isStringRecord(stringsPatch) && Object.keys(stringsPatch).length > 0) {
          await mergeStrings(gameId, stringsPatch);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle(
    'scene-editor:save-characters',
    async (_event, gameId: unknown, characters: unknown, stringsPatch: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!Array.isArray(characters)) {
        return { ok: false, error: 'Formato de personajes inválido.' };
      }
      try {
        const filePath = join(app.getAppPath(), charactersFile(gameId));
        await writeFile(filePath, `${JSON.stringify(characters, null, 2)}\n`, 'utf-8');

        if (isStringRecord(stringsPatch) && Object.keys(stringsPatch).length > 0) {
          await mergeStrings(gameId, stringsPatch);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle('scene-editor:save-site-settings', async (_event, gameId: unknown, settings: unknown) => {
    if (app.isPackaged) {
      return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
    }
    if (!isValidId(gameId)) {
      return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
    }
    try {
      const filePath = join(app.getAppPath(), siteSettingsFile(gameId));
      await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(
    'scene-editor:save-portrait',
    async (_event, gameId: unknown, characterId: unknown, ext: unknown, data: unknown, expressionKey: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(characterId)) {
        return { ok: false, error: `Id de personaje inválido: ${String(characterId)}` };
      }
      if (typeof ext !== 'string' || !EXT_PATTERN.test(ext)) {
        return { ok: false, error: `Extensión de archivo inválida: ${String(ext)}` };
      }
      if (!(data instanceof Uint8Array)) {
        return { ok: false, error: 'Datos de imagen inválidos.' };
      }
      // null = retrato por defecto (portraits/<id>.<ext>, como siempre); una
      // clave de expresión válida = variante adicional del mismo personaje
      // (portraits/<id>-<expresión>.<ext>, ver Character.expressions).
      if (expressionKey !== null && !isValidId(expressionKey)) {
        return { ok: false, error: `Id de expresión inválido: ${JSON.stringify(expressionKey)}` };
      }
      try {
        const dir = join(app.getAppPath(), portraitsDir(gameId));
        await mkdir(dir, { recursive: true });
        const fileName = expressionKey ? `${characterId}-${expressionKey}` : characterId;
        const relativePath = `portraits/${fileName}.${ext.toLowerCase()}`;
        const filePath = join(app.getAppPath(), assetsDir(gameId), relativePath);
        await writeFile(filePath, Buffer.from(data));
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle(
    'scene-editor:save-cursor',
    async (_event, gameId: unknown, fileId: unknown, ext: unknown, data: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(fileId)) {
        return { ok: false, error: `Id de cursor inválido: ${String(fileId)}` };
      }
      if (typeof ext !== 'string' || !EXT_PATTERN.test(ext)) {
        return { ok: false, error: `Extensión de archivo inválida: ${String(ext)}` };
      }
      if (!(data instanceof Uint8Array)) {
        return { ok: false, error: 'Datos de imagen inválidos.' };
      }
      try {
        const dir = join(app.getAppPath(), cursorsDir(gameId));
        await mkdir(dir, { recursive: true });
        const relativePath = `cursors/${fileId}.${ext.toLowerCase()}`;
        const filePath = join(app.getAppPath(), assetsDir(gameId), relativePath);
        await writeFile(filePath, Buffer.from(data));
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle(
    'scene-editor:save-action-menu-image',
    async (_event, gameId: unknown, fileId: unknown, ext: unknown, data: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(fileId)) {
        return { ok: false, error: `Id de imagen inválido: ${String(fileId)}` };
      }
      if (typeof ext !== 'string' || !EXT_PATTERN.test(ext)) {
        return { ok: false, error: `Extensión de archivo inválida: ${String(ext)}` };
      }
      if (!(data instanceof Uint8Array)) {
        return { ok: false, error: 'Datos de imagen inválidos.' };
      }
      try {
        const dir = join(app.getAppPath(), actionMenuDir(gameId));
        await mkdir(dir, { recursive: true });
        const relativePath = `action-menu/${fileId}.${ext.toLowerCase()}`;
        const filePath = join(app.getAppPath(), assetsDir(gameId), relativePath);
        await writeFile(filePath, Buffer.from(data));
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle(
    'scene-editor:save-background',
    async (_event, gameId: unknown, fileId: unknown, ext: unknown, data: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
      }
      if (!isValidId(fileId)) {
        return { ok: false, error: `Id de fondo inválido: ${String(fileId)}` };
      }
      if (typeof ext !== 'string' || !EXT_PATTERN.test(ext)) {
        return { ok: false, error: `Extensión de archivo inválida: ${String(ext)}` };
      }
      if (!(data instanceof Uint8Array)) {
        return { ok: false, error: 'Datos de imagen inválidos.' };
      }
      try {
        const dir = join(app.getAppPath(), backgroundsDir(gameId));
        await mkdir(dir, { recursive: true });
        const relativePath = `backgrounds/${fileId}.${ext.toLowerCase()}`;
        const filePath = join(app.getAppPath(), assetsDir(gameId), relativePath);
        await writeFile(filePath, Buffer.from(data));
        return { ok: true, path: relativePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );
}
