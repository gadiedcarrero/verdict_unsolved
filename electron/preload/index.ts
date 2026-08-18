import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../../shared/desktop-api';

const api: DesktopApi = {
  saveGame: (gameId, data) => ipcRenderer.invoke('save:write', gameId, data),
  loadGame: (gameId) => ipcRenderer.invoke('save:read', gameId),
  saveSceneLayout: (gameId, sceneId, scene, stringsPatch) =>
    ipcRenderer.invoke('scene-editor:save', gameId, sceneId, scene, stringsPatch),
  saveCharacters: (gameId, characters, stringsPatch) =>
    ipcRenderer.invoke('scene-editor:save-characters', gameId, characters, stringsPatch),
  saveSiteSettings: (gameId, settings) => ipcRenderer.invoke('scene-editor:save-site-settings', gameId, settings),
  saveCharacterPortrait: (gameId, characterId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-portrait', gameId, characterId, ext, data),
  saveSceneBackground: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-background', gameId, fileId, ext, data),
  saveCursorImage: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-cursor', gameId, fileId, ext, data),
};

contextBridge.exposeInMainWorld('api', api);
