import type { SaveData } from './save-data';

export type SceneEditorSaveResult = { ok: true } | { ok: false; error: string };

export type DesktopApi = {
  saveGame: (data: SaveData) => Promise<void>;
  loadGame: () => Promise<SaveData>;
  /** Solo funciona en `pnpm dev` — escribe directo sobre el JSON fuente de la escena. */
  saveSceneLayout: (sceneId: string, scene: unknown) => Promise<SceneEditorSaveResult>;
};
