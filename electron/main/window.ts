import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';

const isDev = !!process.env['ELECTRON_RENDERER_URL'];

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    show: false,
    fullscreen: !isDev,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
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
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}
