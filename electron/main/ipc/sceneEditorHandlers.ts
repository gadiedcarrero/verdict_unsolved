import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';

const SCENES_DIR = 'src/cases/case-001-la-ultima-llamada/scenes';

// Lista blanca deliberada: evita que el editor visual escriba fuera de las
// escenas conocidas. Sumar el id acá al crear una escena nueva.
const KNOWN_SCENE_IDS = new Set(['oficina-acto1', 'oficina-acto2', 'oficina-llamada']);

export function registerSceneEditorHandlers(): void {
  ipcMain.handle('scene-editor:save', async (_event, sceneId: unknown, scene: unknown) => {
    if (app.isPackaged) {
      return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
    }
    if (typeof sceneId !== 'string' || !KNOWN_SCENE_IDS.has(sceneId)) {
      return { ok: false, error: `Escena desconocida: ${String(sceneId)}` };
    }
    try {
      const filePath = join(app.getAppPath(), SCENES_DIR, `${sceneId}.json`);
      await writeFile(filePath, `${JSON.stringify(scene, null, 2)}\n`, 'utf-8');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
