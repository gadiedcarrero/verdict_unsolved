import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import {
  newGameCaseMeta,
  newGameFirstScene,
  newGameIndexModule,
  NEW_GAME_STARTING_SCENE_ID,
} from '../../../shared/new-game-template';

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
    'scene-editor:create-game',
    async (_event, gameId: unknown, title: unknown) => {
      if (app.isPackaged) {
        return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
      }
      if (!isValidId(gameId)) {
        return { ok: false, error: 'El id del juego solo puede tener minúsculas, números y guiones.' };
      }
      if (typeof title !== 'string' || !title.trim()) {
        return { ok: false, error: 'Falta el título del juego.' };
      }

      const root = app.getAppPath();
      const caseFile = join(root, gameDir(gameId), 'case.json');
      try {
        await readFile(caseFile, 'utf-8');
        return { ok: false, error: `Ya existe un juego con el id "${gameId}".` };
      } catch {
        // No existe: es lo que queremos.
      }

      try {
        await mkdir(join(root, scenesDir(gameId)), { recursive: true });
        await mkdir(join(root, `${gameDir(gameId)}/locales`), { recursive: true });
        // Las carpetas de arte se crean vacías desde el principio para que
        // generar un fondo o un retrato no tenga que preocuparse por si
        // existen — el resto del pipeline asume que están.
        for (const dir of [portraitsDir(gameId), backgroundsDir(gameId), cursorsDir(gameId), actionMenuDir(gameId)]) {
          await mkdir(join(root, dir), { recursive: true });
        }

        // Una escena inicial de verdad, no un juego vacío: un proyecto recién
        // creado tiene que poder abrirse y jugarse en el acto (mostrando el
        // marcador de fondo faltante) en vez de fallar la validación del
        // bundle por no tener a dónde empezar.
        await writeFile(
          join(root, scenesDir(gameId), `${NEW_GAME_STARTING_SCENE_ID}.json`),
          `${JSON.stringify(newGameFirstScene(), null, 2)}\n`,
          'utf-8',
        );
        await writeFile(caseFile, `${JSON.stringify(newGameCaseMeta(gameId, title.trim()), null, 2)}\n`, 'utf-8');
        // Estos dos existen vacíos porque `index.ts` los importa: el editor
        // los va a reescribir en cuanto se cree un personaje o se guarde un
        // texto, pero Vite no puede resolver un import a un archivo que no
        // está.
        await writeFile(join(root, charactersFile(gameId)), '[]\n', 'utf-8');
        await writeFile(join(root, stringsFile(gameId)), '{}\n', 'utf-8');
        await writeFile(join(root, gameDir(gameId), 'index.ts'), newGameIndexModule(), 'utf-8');

        return { ok: true, startingSceneId: NEW_GAME_STARTING_SCENE_ID };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  // Borra un proyecto entero: su carpeta de código/datos y su carpeta de
  // arte. Es irreversible en disco — lo que lo hace recuperable es git, no
  // esto, así que la UI avisa antes de llamar acá (ver DeleteGameDialog).
  //
  // `confirmId` tiene que venir igual a `gameId`: quien llama ya escribió el
  // id a mano para confirmar, y repetirlo acá deja el handler seguro por sí
  // mismo en vez de depender de que la UI haya preguntado.
  ipcMain.handle('scene-editor:delete-game', async (_event, gameId: unknown, confirmId: unknown) => {
    if (app.isPackaged) {
      return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
    }
    if (!isValidId(gameId)) {
      return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
    }
    if (confirmId !== gameId) {
      return { ok: false, error: 'La confirmación no coincide con el id del juego.' };
    }
    try {
      const root = app.getAppPath();
      // `force` para que borrar un juego al que le falta la carpeta de arte
      // (nunca se generó nada) no falle a mitad de camino dejando el proyecto
      // a medio borrar.
      await rm(join(root, gameDir(gameId)), { recursive: true, force: true });
      await rm(join(root, assetsDir(gameId)), { recursive: true, force: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

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
