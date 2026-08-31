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
  generateBackground: (gameId, fileId, prompt, characters) =>
    ipcRenderer.invoke('ai:generate-background', gameId, fileId, prompt, characters),
  saveCursorImage: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-cursor', gameId, fileId, ext, data),
  saveActionMenuImage: (gameId, fileId, ext, data) =>
    ipcRenderer.invoke('scene-editor:save-action-menu-image', gameId, fileId, ext, data),
  readAiIntegrations: () => ipcRenderer.invoke('ai-integrations:read'),
  writeAiIntegrations: (config) => ipcRenderer.invoke('ai-integrations:write', config),
  generateScriptBreakdown: (scriptText) => ipcRenderer.invoke('script-breakdown:generate', scriptText),
  saveScriptBreakdown: (gameId, breakdown) => ipcRenderer.invoke('script-breakdown:save', gameId, breakdown),
  readScriptBreakdown: (gameId) => ipcRenderer.invoke('script-breakdown:read', gameId),
  generateScenePanels: (sceneId, sceneTitle, sourceText) =>
    ipcRenderer.invoke('script-breakdown:generate-scene-panels', sceneId, sceneTitle, sourceText),
  generateCharacterPortrait: (gameId, characterId, prompt, expressionKey, referenceImagePath) =>
    ipcRenderer.invoke('ai:generate-character-portrait', gameId, characterId, prompt, expressionKey, referenceImagePath),
  flipCharacterPortrait: (gameId, relativePath) =>
    ipcRenderer.invoke('ai:flip-character-portrait', gameId, relativePath),
  editImage: (gameId, relativePath, instruction, referenceImages) =>
    ipcRenderer.invoke('ai:edit-image', gameId, relativePath, instruction, referenceImages),
  undoImageEdit: (gameId, relativePath) => ipcRenderer.invoke('ai:undo-image-edit', gameId, relativePath),
  listElevenLabsVoices: () => ipcRenderer.invoke('ai:list-elevenlabs-voices'),
  checkComfyUIStatus: (baseUrl) => ipcRenderer.invoke('comfyui:status', baseUrl),
  launchComfyUI: () => ipcRenderer.invoke('comfyui:launch'),
};

contextBridge.exposeInMainWorld('api', api);
