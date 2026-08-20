import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { createEmptyAiIntegrationsConfig, isAiIntegrationsConfig } from '../../../shared/ai-integrations';

// Fuera de la carpeta del repo a propósito (mismo criterio que saveHandlers.ts
// para los guardados de partida): si esto viviera en src/games/**, terminaría
// commiteado a git como cualquier otro JSON del proyecto, y una API key real
// no debe llegar nunca al historial del repo.
function getPath(): string {
  return join(app.getPath('userData'), 'ai-integrations.json');
}

/** Reusado por otros handlers (p. ej. scriptBreakdownHandlers.ts) que necesitan
 * la key de un proveedor sin duplicar la lectura/parseo del archivo. */
export async function getStoredAiIntegrationsConfig(): Promise<ReturnType<typeof createEmptyAiIntegrationsConfig>> {
  try {
    const raw = await readFile(getPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return isAiIntegrationsConfig(parsed) ? parsed : createEmptyAiIntegrationsConfig();
  } catch {
    return createEmptyAiIntegrationsConfig();
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
