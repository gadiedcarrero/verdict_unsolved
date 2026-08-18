import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../../shared/desktop-api';

const api: DesktopApi = {
  saveGame: (data) => ipcRenderer.invoke('save:write', data),
  loadGame: () => ipcRenderer.invoke('save:read'),
  saveSceneLayout: (sceneId, scene, stringsPatch) =>
    ipcRenderer.invoke('scene-editor:save', sceneId, scene, stringsPatch),
  saveCharacters: (characters, stringsPatch) =>
    ipcRenderer.invoke('scene-editor:save-characters', characters, stringsPatch),
  saveCharacterPortrait: (characterId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-portrait', characterId, ext, data),
};

contextBridge.exposeInMainWorld('api', api);
