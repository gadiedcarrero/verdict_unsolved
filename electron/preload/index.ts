import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../../shared/desktop-api';

const api: DesktopApi = {
  saveGame: (data) => ipcRenderer.invoke('save:write', data),
  loadGame: () => ipcRenderer.invoke('save:read'),
};

contextBridge.exposeInMainWorld('api', api);
