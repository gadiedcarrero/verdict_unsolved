import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';

const SCENES_DIR = 'src/cases/case-001-la-ultima-llamada/scenes';
const STRINGS_FILE = 'src/cases/case-001-la-ultima-llamada/locales/es.json';

// Lista blanca deliberada: evita que el editor visual escriba fuera de las
// escenas conocidas. Sumar el id acá al crear una escena nueva.
const KNOWN_SCENE_IDS = new Set(['oficina-acto1', 'oficina-acto2', 'oficina-llamada']);

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
      if (typeof sceneId !== 'string' || !KNOWN_SCENE_IDS.has(sceneId)) {
        return { ok: false, error: `Escena desconocida: ${String(sceneId)}` };
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
}
