import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, shell } from 'electron';

// `package.json` tiene "type": "module", así que out/main/index.js se carga
// como ESM y ahí `__dirname` no existe: usarlo tiraba "ReferenceError:
// __dirname is not defined" antes de que llegara a abrirse la ventana, o sea
// que la app no arrancaba. El preload es el caso opuesto y está forzado a CJS
// a propósito (ver electron.vite.config.ts): sandbox:true no carga preloads
// ESM. El main no tiene esa restricción — Electron soporta ESM en el proceso
// principal — así que se queda en ESM y lo que se reemplaza es `__dirname`.
const moduleDir = dirname(fileURLToPath(import.meta.url));

const isDev = !!process.env['ELECTRON_RENDERER_URL'];

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    show: false,
    fullscreen: !isDev,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(moduleDir, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void window.loadFile(join(moduleDir, '../renderer/index.html'));
  }

  return window;
}
