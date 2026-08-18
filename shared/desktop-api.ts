import type { SaveData } from './save-data';

export type SceneEditorSaveResult = { ok: true } | { ok: false; error: string };

export type DesktopApi = {
  saveGame: (data: SaveData) => Promise<void>;
  loadGame: () => Promise<SaveData>;
  /** Solo funciona en `pnpm dev` — escribe directo sobre el JSON fuente de la
   * escena y funde `stringsPatch` con el diccionario locales/es.json del caso. */
  saveSceneLayout: (
    sceneId: string,
    scene: unknown,
    stringsPatch: Record<string, string>,
  ) => Promise<SceneEditorSaveResult>;
};
