import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ipcMain } from 'electron';

/** Arranca/consulta el servidor ComfyUI local (ver comfyuiImageProvider.ts)
 * — no la generación en sí, solo "¿está prendido?" y "prendelo" para que el
 * editor pueda mostrar un semáforo y ahorrarle al usuario ir a buscar el
 * .command a mano cada vez. */

const COMFYUI_DIR = join(homedir(), 'ComfyUI');

// Corto a propósito — esto se llama seguido desde un polling en el editor,
// no puede quedarse colgado esperando un timeout largo si el server está
// apagado (que es el caso más común).
const STATUS_TIMEOUT_MS = 2500;

export function registerComfyUIStatusHandlers(): void {
  ipcMain.handle('comfyui:status', async (_event, baseUrl: unknown) => {
    if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
      return { running: false };
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/system_stats`, { signal: controller.signal });
        return { running: response.ok };
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return { running: false };
    }
  });

  // Lo deja corriendo DESAPEGADO del proceso de Electron (detached +
  // unref) — si no, cerrar la app o recargar la ventana lo mataría, y la
  // gracia es dejarlo abierto mientras se sigue generando.
  ipcMain.handle('comfyui:launch', () => {
    const scriptPath = join(COMFYUI_DIR, 'main.py');
    const venvPython = join(COMFYUI_DIR, 'venv', 'bin', 'python');
    if (!existsSync(COMFYUI_DIR) || !existsSync(scriptPath)) {
      return { ok: false, error: `No encontré ComfyUI en ${COMFYUI_DIR}.` };
    }
    const pythonBin = existsSync(venvPython) ? venvPython : 'python3';
    try {
      const child = spawn(pythonBin, ['main.py'], {
        cwd: COMFYUI_DIR,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env['PATH'] ?? ''}` },
      });
      child.unref();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
