import type { SaveData } from './save-data';

export type SceneEditorSaveResult = { ok: true } | { ok: false; error: string };
export type PortraitSaveResult = { ok: true; path: string } | { ok: false; error: string };
export type BackgroundSaveResult = { ok: true; path: string } | { ok: false; error: string };

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
  /** Solo funciona en `pnpm dev` — escribe characters.json y funde `stringsPatch`
   * (nombres de personaje) con locales/es.json. */
  saveCharacters: (characters: unknown, stringsPatch: Record<string, string>) => Promise<SceneEditorSaveResult>;
  /** Solo funciona en `pnpm dev` — sube un retrato a assets/.../portraits/ y
   * devuelve la ruta relativa a guardar en el personaje. */
  saveCharacterPortrait: (characterId: string, ext: string, data: Uint8Array) => Promise<PortraitSaveResult>;
  /** Solo funciona en `pnpm dev` — sube un fondo a assets/.../backgrounds/ y
   * devuelve la ruta relativa a guardar en `scene.backgrounds`. */
  saveSceneBackground: (fileId: string, ext: string, data: Uint8Array) => Promise<BackgroundSaveResult>;
};
