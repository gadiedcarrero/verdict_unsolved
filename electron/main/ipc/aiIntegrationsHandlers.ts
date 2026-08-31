import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import {
  createEmptyAiIntegrationsConfig,
  isAiIntegrationsConfig,
  type AiIntegrationsConfig,
} from '../../../shared/ai-integrations';

// Fuera de la carpeta del repo a propósito (mismo criterio que saveHandlers.ts
// para los guardados de partida): si esto viviera en src/games/**, terminaría
// commiteado a git como cualquier otro JSON del proyecto, y una API key real
// no debe llegar nunca al historial del repo.
function getPath(): string {
  return join(app.getPath('userData'), 'ai-integrations.json');
}

/** Reusado por otros handlers (p. ej. scriptBreakdownHandlers.ts) que necesitan
 * la key de un proveedor sin duplicar la lectura/parseo del archivo. Se
 * FUNDE sobre los defaults en vez de exigir la forma completa (a diferencia
 * de `isAiIntegrationsConfig`, usado solo para validar lo que llega por
 * `ai-integrations:write`) — un archivo guardado antes de que existiera
 * `imageProvider`/`comfyuiBaseUrl`/etc. seguía siendo válido y no debía
 * perder las keys ya cargadas solo por faltarle campos nuevos. */
export async function getStoredAiIntegrationsConfig(): Promise<AiIntegrationsConfig> {
  const defaults = createEmptyAiIntegrationsConfig();
  try {
    const raw = await readFile(getPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    return { ...defaults, ...(parsed as Partial<AiIntegrationsConfig>) };
  } catch {
    return defaults;
  }
}

export function registerAiIntegrationsHandlers(): void {
  ipcMain.handle('ai-integrations:read', getStoredAiIntegrationsConfig);

  ipcMain.handle('ai-integrations:write', async (_event, data: unknown) => {
    if (!isAiIntegrationsConfig(data)) {
      throw new Error('ai-integrations:write recibió datos con forma inválida');
    }
    await writeFile(getPath(), JSON.stringify(data, null, 2), 'utf-8');
  });
}
