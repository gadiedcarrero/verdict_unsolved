import type { SaveData } from './save-data';

export type SceneEditorSaveResult = { ok: true } | { ok: false; error: string };
export type PortraitSaveResult = { ok: true; path: string } | { ok: false; error: string };
export type BackgroundSaveResult = { ok: true; path: string } | { ok: false; error: string };

export type DesktopApi = {
  /** Un archivo de guardado por juego (save-<gameId>.json en userData). */
  saveGame: (gameId: string, data: SaveData) => Promise<void>;
  loadGame: (gameId: string) => Promise<SaveData>;
  /** Solo funciona en `pnpm dev` — escribe directo sobre el JSON fuente de la
   * escena (src/games/<gameId>/scenes/) y funde `stringsPatch` con el
   * diccionario locales/es.json de ese juego. */
  saveSceneLayout: (
    gameId: string,
    sceneId: string,
    scene: unknown,
    stringsPatch: Record<string, string>,
  ) => Promise<SceneEditorSaveResult>;
  /** Solo funciona en `pnpm dev` — escribe characters.json y funde `stringsPatch`
   * (nombres de personaje) con locales/es.json. */
  saveCharacters: (
    gameId: string,
    characters: unknown,
    stringsPatch: Record<string, string>,
  ) => Promise<SceneEditorSaveResult>;
  /** Solo funciona en `pnpm dev` — escribe site-settings.json (ajustes
   * generales, hoy la tipografía por defecto del tooltip de hotspot). */
  saveSiteSettings: (gameId: string, settings: unknown) => Promise<SceneEditorSaveResult>;
  /** Solo funciona en `pnpm dev` — sube un retrato a assets/games/<gameId>/portraits/
   * y devuelve la ruta relativa a guardar en el personaje. */
  saveCharacterPortrait: (
    gameId: string,
    characterId: string,
    ext: string,
    data: Uint8Array,
  ) => Promise<PortraitSaveResult>;
  /** Solo funciona en `pnpm dev` — sube un fondo a assets/games/<gameId>/backgrounds/
   * y devuelve la ruta relativa a guardar en `scene.backgrounds`. */
  saveSceneBackground: (
    gameId: string,
    fileId: string,
    ext: string,
    data: Uint8Array,
  ) => Promise<BackgroundSaveResult>;
};
