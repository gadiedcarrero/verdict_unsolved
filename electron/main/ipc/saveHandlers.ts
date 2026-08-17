import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { createEmptySave, isSaveData, type SaveData } from '../../../shared/save-data';

const SAVE_FILE_NAME = 'save.json';

function getSavePath(): string {
  return join(app.getPath('userData'), SAVE_FILE_NAME);
}

async function readSave(): Promise<SaveData | null> {
  try {
    const raw = await readFile(getSavePath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return isSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSave(data: SaveData): Promise<void> {
  await writeFile(getSavePath(), JSON.stringify(data, null, 2), 'utf-8');
}

export function registerSaveHandlers(): void {
  ipcMain.handle('save:write', async (_event, data: unknown) => {
    if (!isSaveData(data)) {
      throw new Error('save:write recibió datos con forma inválida');
    }
    await writeSave(data);
  });

  ipcMain.handle('save:read', async () => {
    return (await readSave()) ?? createEmptySave();
  });
}
