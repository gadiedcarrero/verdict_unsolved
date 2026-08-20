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
  saveCharacterPortrait: (gameId, characterId, ext, data, expressionKey) =>
    ipcRenderer.invoke('scene-editor:save-portrait', gameId, characterId, ext, data, expressionKey),
  saveSceneBackground: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-background', gameId, fileId, ext, data),
  saveCursorImage: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-cursor', gameId, fileId, ext, data),
  saveActionMenuImage: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-action-menu-image', gameId, fileId, ext, data),
  readAiIntegrations: () => ipcRenderer.invoke('ai-integrations:read'),
  writeAiIntegrations: (config) => ipcRenderer.invoke('ai-integrations:write', config),
  generateScriptBreakdown: (scriptText) => ipcRenderer.invoke('script-breakdown:generate', scriptText),
  saveScriptBreakdown: (gameId, breakdown) => ipcRenderer.invoke('script-breakdown:save', gameId, breakdown),
  readScriptBreakdown: (gameId) => ipcRenderer.invoke('script-breakdown:read', gameId),
  generateCharacterPortrait: (gameId, characterId, description) =>
    ipcRenderer.invoke('ai:generate-character-portrait', gameId, characterId, description),
};

contextBridge.exposeInMainWorld('api', api);
