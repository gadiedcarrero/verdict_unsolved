/**
 * Shared between the Electron main process and the renderer (via preload).
 * Kept dependency-free and framework-agnostic on purpose (mismo criterio que
 * save-data.ts / ai-integrations.ts).
 *
 * Ver docs/plataforma/00-vision-ia.md, paso 3 del pipeline ("guion → desglose
 * legible por escena"): la IA lee el guion completo una sola vez y devuelve
 * esto — roster de personajes + una escena por cada escena narrativa del
 * guion, en texto legible, con propuesta de minijuego si corresponde. Es un
 * borrador para revisar (aprobar/cortar/ajustar) antes de traducirlo a datos
 * reales del motor (Scene, Character, hotspots) — todavía no es esa
 * traducción.
 */
export type ScriptBreakdownAlternateLook = {
  /** Slug — se usa como clave en Character.expressions al generar el arte. */
  key: string;
  /** Nombre visible de la identidad/disfraz (ej: "Director Gray", "Wraith"). */
  label: string;
  /** Descripción de apariencia AUTOCONTENIDA de esta identidad — no depende
   * de leer `description` primero, para no repetir el error de mezclar dos
   * apariencias en un solo prompt de imagen. */
  description: string;
};

export type ScriptBreakdownCharacter = {
  id: string;
  name: string;
  /** Apariencia base/neutral del personaje — NUNCA debe mencionar disfraces
   * o identidades alternativas (esas van en `alternateLooks`), justamente
   * para que cada retrato generado por IA describa una sola apariencia
   * coherente en vez de mezclar dos looks distintos en una imagen. */
  description: string;
  suggestedColor: string;
  /** Identidades/disfraces con apariencia claramente distinta del mismo
   * personaje (ej: Adrian Cross también aparece como "Director Gray" en
   * silla de ruedas y como el agente enmascarado "Wraith") — cada uno se
   * genera como su propia imagen y se guarda como una expresión nombrada
   * del mismo Character (Character.expressions), no como personaje aparte:
   * siguen siendo la misma persona a efectos de diálogo/color/nombre. */
  alternateLooks: ScriptBreakdownAlternateLook[];
};

export type ScriptBreakdownObject = {
  name: string;
  examineText: string | null;
  interactText: string | null;
};

export type ScriptBreakdownMinigameSuggestion = {
  /** Nombre libre propuesto por la IA — puede no coincidir todavía con un
   * `MinigameTemplate` real del motor (ver schemas.ts) si hace falta
   * construir una plantilla nueva; el renderer decide cómo mostrarlo. */
  template: string;
  reason: string;
};

export type ScriptBreakdownReviewStatus = 'pending' | 'approved' | 'cut';

export type ScriptBreakdownScene = {
  id: string;
  title: string;
  summary: string;
  /** Línea corta (típicamente de MIRROR, en tono de bloque de terminal —
   * ver `DialogueNode.terminalBlock` en schemas.ts) que conecta el final de
   * la escena anterior con esta: salto de tiempo, quién llegó, qué cambió.
   * `null` si la escena sigue directo de la anterior sin salto (misma
   * locación/momento) y no hace falta puente. Se traduce a un `onEnter` de
   * la escena real del motor — ver docs/plataforma/00-vision-ia.md. */
  bridgeFromPrevious: string | null;
  characterIds: string[];
  objects: ScriptBreakdownObject[];
  minigame: ScriptBreakdownMinigameSuggestion | null;
  reviewStatus: ScriptBreakdownReviewStatus;
};

export type ScriptBreakdown = {
  generatedAt: string;
  characters: ScriptBreakdownCharacter[];
  scenes: ScriptBreakdownScene[];
};

function isScriptBreakdownAlternateLook(value: unknown): value is ScriptBreakdownAlternateLook {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['key'] === 'string' && typeof v['label'] === 'string' && typeof v['description'] === 'string';
}

function isScriptBreakdownCharacter(value: unknown): value is ScriptBreakdownCharacter {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['description'] === 'string' &&
    typeof v['suggestedColor'] === 'string' &&
    Array.isArray(v['alternateLooks']) &&
    v['alternateLooks'].every(isScriptBreakdownAlternateLook)
  );
}

function isScriptBreakdownObject(value: unknown): value is ScriptBreakdownObject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['name'] === 'string' &&
    (typeof v['examineText'] === 'string' || v['examineText'] === null) &&
    (typeof v['interactText'] === 'string' || v['interactText'] === null)
  );
}

function isScriptBreakdownMinigameSuggestion(value: unknown): value is ScriptBreakdownMinigameSuggestion {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['template'] === 'string' && typeof v['reason'] === 'string';
}

function isScriptBreakdownScene(value: unknown): value is ScriptBreakdownScene {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['title'] === 'string' &&
    typeof v['summary'] === 'string' &&
    (typeof v['bridgeFromPrevious'] === 'string' || v['bridgeFromPrevious'] === null) &&
    Array.isArray(v['characterIds']) &&
    v['characterIds'].every((id) => typeof id === 'string') &&
    Array.isArray(v['objects']) &&
    v['objects'].every(isScriptBreakdownObject) &&
    (v['minigame'] === null || isScriptBreakdownMinigameSuggestion(v['minigame'])) &&
    (v['reviewStatus'] === 'pending' || v['reviewStatus'] === 'approved' || v['reviewStatus'] === 'cut')
  );
}

export function isScriptBreakdown(value: unknown): value is ScriptBreakdown {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['generatedAt'] === 'string' &&
    Array.isArray(v['characters']) &&
    v['characters'].every(isScriptBreakdownCharacter) &&
    Array.isArray(v['scenes']) &&
    v['scenes'].every(isScriptBreakdownScene)
  );
}

function normalizeSceneTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Regenerar el desglose vuelve a correr la IA sobre el guion entero — el
 * corte en escenas puede cambiar (más o menos granular) y los ids se
 * regeneran, así que no sirve matchear por id. Se matchea por título
 * normalizado: si una escena nueva tiene el mismo título (sin mayúsculas ni
 * acentos) que una escena vieja, se asume la misma escena narrativa y se le
 * copia el `reviewStatus` ya decidido — a propósito solo el estado de
 * revisión, no el resumen/objetos (esos siempre quedan con el texto fresco
 * de la IA). Si no matchea ninguna, queda 'pending' (nunca se inventa un
 * "aprobada" para algo que no se pudo confirmar que es lo mismo).
 */
export function mergeScriptBreakdownReview(
  previous: ScriptBreakdown | null,
  next: ScriptBreakdown,
): { breakdown: ScriptBreakdown; carriedOverCount: number } {
  if (!previous || previous.scenes.length === 0) {
    return { breakdown: next, carriedOverCount: 0 };
  }
  const previousByTitle = new Map(previous.scenes.map((scene) => [normalizeSceneTitle(scene.title), scene]));
  let carriedOverCount = 0;
  const scenes = next.scenes.map((scene) => {
    const match = previousByTitle.get(normalizeSceneTitle(scene.title));
    if (!match || match.reviewStatus === 'pending') return scene;
    carriedOverCount += 1;
    return { ...scene, reviewStatus: match.reviewStatus };
  });
  return { breakdown: { ...next, scenes }, carriedOverCount };
}
