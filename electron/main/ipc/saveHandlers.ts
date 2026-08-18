import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { createEmptySave, isSaveData, type SaveData } from '../../../shared/save-data';

// Mismo patrón que sceneEditorHandlers.ts: valida el id antes de usarlo para
// construir una ruta de archivo, para que un renderer comprometido no pueda
// escribir fuera de userData con un gameId tipo "../../algo".
const GAME_ID_PATTERN = /^[a-z0-9-]+$/;

// Un archivo de guardado por juego — antes había uno solo porque solo
// existía un juego; con varios, mezclarlos pisaría el progreso de uno con
// el de otro (los campos de AdventureCaseState no significan lo mismo
// entre juegos distintos).
function getSavePath(gameId: string): string {
  return join(app.getPath('userData'), `save-${gameId}.json`);
}

async function readSave(gameId: string): Promise<SaveData | null> {
  try {
    const raw = await readFile(getSavePath(gameId), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return isSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSave(gameId: string, data: SaveData): Promise<void> {
  await writeFile(getSavePath(gameId), JSON.stringify(data, null, 2), 'utf-8');
}

export function registerSaveHandlers(): void {
  ipcMain.handle('save:write', async (_event, gameId: unknown, data: unknown) => {
    if (typeof gameId !== 'string' || !GAME_ID_PATTERN.test(gameId)) {
      throw new Error(`Id de juego inválido: ${String(gameId)}`);
    }
    if (!isSaveData(data)) {
      throw new Error('save:write recibió datos con forma inválida');
    }
    await writeSave(gameId, data);
  });

  ipcMain.handle('save:read', async (_event, gameId: unknown) => {
    if (typeof gameId !== 'string' || !GAME_ID_PATTERN.test(gameId)) {
      throw new Error(`Id de juego inválido: ${String(gameId)}`);
    }
    return (await readSave(gameId)) ?? createEmptySave();
  });
}
