import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { registerAiIntegrationsHandlers } from './ipc/aiIntegrationsHandlers';
import { registerCharacterArtHandlers } from './ipc/characterArtHandlers';
import { registerSaveHandlers } from './ipc/saveHandlers';
import { registerSceneEditorHandlers } from './ipc/sceneEditorHandlers';
import { registerScriptBreakdownHandlers } from './ipc/scriptBreakdownHandlers';

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [existingWindow] = BrowserWindow.getAllWindows();
    if (existingWindow) {
      if (existingWindow.isMinimized()) existingWindow.restore();
      existingWindow.focus();
    }
  });

  void app.whenReady().then(() => {
    registerSaveHandlers();
    registerSceneEditorHandlers();
    registerAiIntegrationsHandlers();
    registerScriptBreakdownHandlers();
    registerCharacterArtHandlers();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
