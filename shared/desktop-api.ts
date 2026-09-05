import type { AiIntegrationsConfig } from './ai-integrations';
import type { ElevenLabsVoicesResult } from './elevenlabs';
import type { ParsedScene } from './parsed-scene';
import type { SaveData } from './save-data';
import type { ScriptBreakdown, ScriptBreakdownPanel } from './script-breakdown';

export type SceneEditorSaveResult = { ok: true } | { ok: false; error: string };
export type PortraitSaveResult = { ok: true; path: string } | { ok: false; error: string };

export type PortraitFlipResult = { ok: true } | { ok: false; error: string };
export type ImageEditResult = { ok: true } | { ok: false; error: string };
export type BackgroundSaveResult = { ok: true; path: string } | { ok: false; error: string };
export type ScriptBreakdownGenerateResult =
  | { ok: true; breakdown: ScriptBreakdown; warnings: string[] }
  | { ok: false; error: string };
export type ScriptBreakdownReadResult = { ok: true; breakdown: ScriptBreakdown | null } | { ok: false; error: string };
export type ScriptBreakdownScenePanelsResult =
  | { ok: true; sourceText: string; panels: ScriptBreakdownPanel[] }
  | { ok: false; error: string };
export type ComfyUIStatusResult = { running: boolean };
export type ComfyUILaunchResult = { ok: true } | { ok: false; error: string };
export type ComfyUIListCheckpointsResult = { ok: true; files: string[] } | { ok: false; error: string };

export type CreateGameResult = { ok: true; startingSceneId: string } | { ok: false; error: string };

export type DesktopApi = {
  /** Solo funciona en `pnpm dev` — crea src/games/<gameId>/ con su case.json,
   * una primera escena, los archivos vacíos que el módulo importa y el
   * index.ts que expone el juego a la plataforma, más las carpetas de arte.
   * Es lo que permite empezar un juego desde la app en vez de a mano. */
  createGame: (gameId: string, title: string) => Promise<CreateGameResult>;
  /** Solo funciona en `pnpm dev` — borra src/games/<gameId>/ y
   * assets/games/<gameId>/ enteras. Irreversible en disco: lo recuperable es
   * lo que esté commiteado. `confirmId` tiene que ser igual a `gameId` (quien
   * llama lo escribió a mano), así el handler no depende de que la UI haya
   * preguntado. */
  deleteGame: (gameId: string, confirmId: string) => Promise<SceneEditorSaveResult>;
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
  /** Genera un fondo de escena con IA a partir de una narración libre —
   * a diferencia de dejar que la IA adivine qué personajes van solos (no
   * funcionaba bien), `characters` es la lista elegida a mano en el editor;
   * cada uno manda su propio retrato ya generado como referencia visual,
   * así el modelo usa la cara real del personaje en vez de reinventarla
   * desde una descripción de texto. Guarda en
   * assets/games/<gameId>/backgrounds/<fileId>.png. */
  generateBackground: (
    gameId: string,
    fileId: string,
    prompt: string,
    characters: { name: string; description: string; portraitPath: string }[],
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
  /** Reintento puntual para UNA escena que quedó sin paneles (el texto
   * original no se pudo ubicar en el guion) — el usuario pega el texto de
   * esa escena a mano acá y esto corre solo el paso 2 del pipeline para
   * ella, sin repetir el análisis del guion entero. */
  generateScenePanels: (
    sceneId: string,
    sceneTitle: string,
    sourceText: string,
  ) => Promise<ScriptBreakdownScenePanelsResult>;
  /** Convierte el texto de UNA escena del guion en un `ParsedScene` — la
   * forma intermedia que `buildSceneFromScript` traduce a escena del motor.
   * `characterIds` es el roster ya existente: el modelo tiene que elegir de
   * ahí y no inventar personajes. `knownCapabilities` es el vocabulario de
   * capacidades que ya usa el juego, para que reuse la palabra exacta en vez
   * de un sinónimo que dejaría la zona sin responder. */
  generateSceneDraft: (
    sceneTitle: string,
    sourceText: string,
    characterIds: string[],
    knownCapabilities: string[],
  ) => Promise<{ ok: true; parsed: ParsedScene } | { ok: false; error: string }>;
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
  /** Cuerpo entero de una variante del personaje, para ponerlo EN la escena
   * (ver `CharacterVariant` en schemas.ts) — hermano de
   * `generateCharacterPortrait`, que sigue siendo el busto del círculo de
   * diálogo. `expressionKey` null = el cuerpo neutral de la variante.
   * `referenceImagePath` fija la identidad: el busto del personaje cuando se
   * genera el cuerpo neutral, y ese cuerpo ya generado cuando se generan sus
   * expresiones. */
  generateCharacterBody: (
    gameId: string,
    characterId: string,
    variantId: string,
    prompt: string,
    expressionKey: string | null,
    referenceImagePath: string | null,
  ) => Promise<PortraitSaveResult>;
  /** Ningún proveedor de imagen probado acierta siempre la orientación —
   * espeja horizontalmente el archivo YA guardado en `relativePath` (ej.
   * "portraits/adrian-cross.png"), en el mismo lugar. No genera de nuevo,
   * no consume crédito de ningún proveedor. */
  flipCharacterPortrait: (gameId: string, relativePath: string) => Promise<PortraitFlipResult>;
  /** Corrección puntual en texto libre sobre CUALQUIER imagen ya generada
   * del juego (fondo de escena, retrato, lo que sea) — ej. "esa foto de la
   * pared se ve realista, no debe ser" o "hay un personaje duplicado, sacá
   * uno". Redibuja partiendo de la imagen actual en `relativePath` y la
   * reescribe en el mismo lugar. `referenceImages`: imágenes sueltas
   * subidas por el usuario desde su computadora (no assets del juego) para
   * guiar el cambio — "usá esta pose", "el estilo de esta referencia". */
  editImage: (
    gameId: string,
    relativePath: string,
    instruction: string,
    referenceImages: Uint8Array[],
  ) => Promise<ImageEditResult>;
  /** Un solo paso atrás sobre el último editImage aplicado a `relativePath`
   * — no hay un botón de "deshacer" que valga nada si la corrección
   * termina peor que el original. Falla con un error legible si no hay
   * nada para deshacer todavía. */
  undoImageEdit: (gameId: string, relativePath: string) => Promise<ImageEditResult>;
  /** Lista las voces disponibles en la cuenta de ElevenLabs (premade +
   * propias) — usa la key ya guardada en Integraciones IA. No es por juego:
   * la cuenta de ElevenLabs es una sola para toda la plataforma. */
  listElevenLabsVoices: () => Promise<ElevenLabsVoicesResult>;
  /** ¿Está prendido el servidor ComfyUI local en `baseUrl`? Ping corto (ver
   * comfyuiStatusHandlers.ts) — pensado para pollear desde un indicador en
   * el editor, no para saber si la generación en sí va a funcionar. */
  checkComfyUIStatus: (baseUrl: string) => Promise<ComfyUIStatusResult>;
  /** Arranca ComfyUI en esta máquina (`~/ComfyUI`), desapegado del proceso
   * de Electron — queda corriendo aunque se cierre la app. No hace falta
   * llamarlo si el semáforo ya está en verde (un segundo `python main.py`
   * no puede tomar el mismo puerto y se cierra solo sin avisar nada útil). */
  launchComfyUI: () => Promise<ComfyUILaunchResult>;
  /** Lista los checkpoints SDXL instalados en ~/ComfyUI/models/checkpoints —
   * para que Ajustes ofrezca un selector en vez de un campo de texto libre
   * donde había que escribir a mano el nombre exacto del archivo. */
  listComfyUICheckpoints: () => Promise<ComfyUIListCheckpointsResult>;
};
