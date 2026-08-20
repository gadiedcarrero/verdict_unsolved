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
export type ScriptBreakdownCharacter = {
  id: string;
  name: string;
  description: string;
  suggestedColor: string;
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

function isScriptBreakdownCharacter(value: unknown): value is ScriptBreakdownCharacter {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['description'] === 'string' &&
    typeof v['suggestedColor'] === 'string'
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
