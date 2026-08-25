import type { AiIntegrationsConfig } from './ai-integrations';
import type { ElevenLabsVoicesResult } from './elevenlabs';
import type { SaveData } from './save-data';
import type { ScriptBreakdown } from './script-breakdown';

export type SceneEditorSaveResult = { ok: true } | { ok: false; error: string };
export type PortraitSaveResult = { ok: true; path: string } | { ok: false; error: string };

export type PortraitFlipResult = { ok: true } | { ok: false; error: string };
export type BackgroundSaveResult = { ok: true; path: string } | { ok: false; error: string };
export type ScriptBreakdownGenerateResult =
  | { ok: true; breakdown: ScriptBreakdown }
  | { ok: false; error: string };
export type ScriptBreakdownReadResult = { ok: true; breakdown: ScriptBreakdown | null } | { ok: false; error: string };

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
   * y devuelve la ruta relativa a guardar en el personaje. `expressionKey`
   * null = retrato por defecto (Character.portrait); una clave = variante
   * adicional (Character.expressions[clave]). */
  saveCharacterPortrait: (
    gameId: string,
    characterId: string,
    ext: string,
    data: Uint8Array,
    expressionKey: string | null,
  ) => Promise<PortraitSaveResult>;
  /** Solo funciona en `pnpm dev` — sube un fondo a assets/games/<gameId>/backgrounds/
   * y devuelve la ruta relativa a guardar en `scene.backgrounds`. */
  saveSceneBackground: (
    gameId: string,
    fileId: string,
    ext: string,
    data: Uint8Array,
  ) => Promise<BackgroundSaveResult>;
  /** Solo funciona en `pnpm dev` — sube una imagen de cursor a
   * assets/games/<gameId>/cursors/ y devuelve la ruta relativa. */
  saveCursorImage: (gameId: string, fileId: string, ext: string, data: Uint8Array) => Promise<BackgroundSaveResult>;
  /** Solo funciona en `pnpm dev` — sube una de las 5 imágenes del menú de
   * acción a assets/games/<gameId>/action-menu/ y devuelve la ruta relativa. */
  saveActionMenuImage: (gameId: string, fileId: string, ext: string, data: Uint8Array) => Promise<BackgroundSaveResult>;
  /** Keys de proveedores de IA (OpenAI, ElevenLabs, imagen, Seedance) — vale
   * para toda la plataforma, no por juego, y se guarda en userData (fuera
   * del repo, nunca en un JSON que se commitea). */
  readAiIntegrations: () => Promise<AiIntegrationsConfig>;
  writeAiIntegrations: (config: AiIntegrationsConfig) => Promise<void>;
  /** Paso 3 del pipeline de IA (ver docs/plataforma/00-vision-ia.md): un solo
   * llamado a OpenAI que lee el guion completo pegado por el usuario y
   * devuelve roster de personajes + desglose legible por escena, con
   * propuesta de minijuego donde corresponda. Usa la key ya guardada en
   * Integraciones IA — no requiere pasarla acá. */
  generateScriptBreakdown: (scriptText: string) => Promise<ScriptBreakdownGenerateResult>;
  /** Solo funciona en `pnpm dev` — persiste el desglose (ya revisado o no)
   * en src/games/<gameId>/script-breakdown.json. */
  saveScriptBreakdown: (gameId: string, breakdown: ScriptBreakdown) => Promise<SceneEditorSaveResult>;
  readScriptBreakdown: (gameId: string) => Promise<ScriptBreakdownReadResult>;
  /** Genera un retrato (busto 3/4, fondo transparente) con OpenAI y lo
   * guarda en portraits/<characterId>.png (o
   * portraits/<characterId>-<expressionKey>.png con expressionKey) — usa la
   * key ya guardada en Integraciones IA. Solo funciona en `pnpm dev`.
   * `referenceImagePath`: ruta relativa (dentro de assets/games/<gameId>/)
   * a una imagen YA generada para usar como referencia visual (vía
   * /images/edits — redibuja partiendo de esa imagen en vez de texto puro),
   * para expresiones (mismo personaje, cambia la cara) y variantes (mismo
   * personaje base, cambia edad/vestuario/identidad) — null = generación
   * desde cero por texto. */
  generateCharacterPortrait: (
    gameId: string,
    characterId: string,
    prompt: string,
    expressionKey: string | null,
    referenceImagePath: string | null,
  ) => Promise<PortraitSaveResult>;
  /** Ningún proveedor de imagen probado acierta siempre la orientación —
   * espeja horizontalmente el archivo YA guardado en `relativePath` (ej.
   * "portraits/adrian-cross.png"), en el mismo lugar. No genera de nuevo,
   * no consume crédito de ningún proveedor. */
  flipCharacterPortrait: (gameId: string, relativePath: string) => Promise<PortraitFlipResult>;
  /** Lista las voces disponibles en la cuenta de ElevenLabs (premade +
   * propias) — usa la key ya guardada en Integraciones IA. No es por juego:
   * la cuenta de ElevenLabs es una sola para toda la plataforma. */
  listElevenLabsVoices: () => Promise<ElevenLabsVoicesResult>;
};
