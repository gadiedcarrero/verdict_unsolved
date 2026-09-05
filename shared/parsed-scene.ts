/**
 * Shared between the Electron main process and the renderer (via preload).
 *
 * Forma intermedia entre el guion y una escena del motor. La IA emite ESTO,
 * no un `Scene` — a propósito.
 *
 * Un `Scene` tiene ids, claves de traducción, coordenadas, acciones anidadas y
 * una docena de campos con default: pedirle todo eso a un modelo es pedirle
 * que acierte cosas que se calculan solas, y cada error suyo es una escena que
 * no valida. Acá solo se le pide lo que únicamente él puede sacar del guion:
 * qué hay, cómo se llama y qué hace. Los ids, las claves y el layout los pone
 * `buildSceneFromScript`, que es determinista y se puede probar.
 */

export type ParsedHotspotKind =
  | 'info' // muestra texto, no cambia nada
  | 'clue' // suma una pista al caso
  | 'navigate' // lleva a otra imagen de la misma escena (primer plano)
  | 'action'; // cambia el estado visual de la escena

export type ParsedHotspot = {
  /** Como aparece en el guion ("HISTORIAL LABORAL"). */
  name: string;
  kind: ParsedHotspotKind;
  /** Lo que se le dice al jugador al interactuar, si el guion lo trae. */
  text?: string;
  /** Solo `kind: "clue"`: el enunciado de la pista. */
  clue?: string;
  /** Solo `kind: "clue"`: la pista sigue valiendo después de esta escena. */
  globalClue?: boolean;
  /** Solo `kind: "navigate"`: título de la imagen destino, tal como figura en
   * `ParsedScene.images`. */
  targetImage?: string;
  /** Solo `kind: "action"`: título de la imagen a la que cambia la escena. */
  becomesImage?: string;
  /** Capacidades que hacen falta para usarla (ver `Character.capabilities`). */
  requiredCapabilities?: string[];
  /** Qué contesta cuando no se puede ("No puedo mover esto desde la silla"). */
  blockedText?: string;
};

export type ParsedImage = {
  /** Como aparece en el guion ("IMAGEN 4.1 — FICHA DE DANIEL" → "FICHA DE DANIEL"). */
  title: string;
  /** Descripción visual para generar la imagen después. */
  description?: string;
  hotspots: ParsedHotspot[];
};

export type ParsedDeduction = {
  question: string;
  answers: string[];
  /** Índice dentro de `answers`. */
  correctIndex: number;
};

export type ParsedScene = {
  title: string;
  /** `### PERSONAJE` del guion, ya como slug ("director-gray"). */
  characterId?: string;
  /** `### OBJETIVO`. Sin esto la escena no lleva HUD de investigación. */
  objective?: string;
  /** El número de `### PISTAS 0 / N`, si difiere de la cantidad de pistas
   * encontradas en los hotspots (escenas con pistas opcionales). */
  requiredClues?: number;
  images: ParsedImage[];
  deduction?: ParsedDeduction;
};

export function isParsedScene(value: unknown): value is ParsedScene {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['title'] === 'string' && Array.isArray(v['images']);
}
