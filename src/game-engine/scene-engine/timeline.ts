import type { AudioClip, Scene, SceneBackground } from './schemas';

/**
 * La matemática de la línea de tiempo: dónde empieza cada panel y cuánto dura
 * la escena entera.
 *
 * Se deriva de las duraciones de los paneles en vez de guardarse: la posición
 * de un panel no es un dato propio, es la suma de lo que dura todo lo anterior.
 * Guardarla obligaría a recalcular la pista completa cada vez que se cambia una
 * duración, y a mantener sincronizado algo que ya se puede calcular.
 */

/** El mismo default que usa CinematicScene para un panel sin duración propia. */
export const DEFAULT_PANEL_MS = 2500;

export function panelDurationMs(background: SceneBackground): number {
  return background.durationMs ?? DEFAULT_PANEL_MS;
}

export type PanelSpan = { background: SceneBackground; startMs: number; durationMs: number };

/** Cada panel con el milisegundo en que entra, en orden. */
export function panelSpans(scene: Scene): PanelSpan[] {
  let startMs = 0;
  return scene.backgrounds.map((background) => {
    const durationMs = panelDurationMs(background);
    const span = { background, startMs, durationMs };
    startMs += durationMs;
    return span;
  });
}

/** Cuánto dura la escena. Incluye el audio que sobresale del último panel: un
 * clip que sigue sonando después de la última imagen forma parte de la escena
 * aunque no haya nada que mirar, y si la pista no lo abarcara no habría forma
 * de verlo ni de moverlo. */
export function sceneDurationMs(scene: Scene): number {
  const panels = panelSpans(scene).reduce((total, span) => total + span.durationMs, 0);
  const audioEnd = scene.audioTrack.reduce((max, clip) => Math.max(max, clip.startMs + clip.durationMs), 0);
  return Math.max(panels, audioEnd);
}

/** Qué panel se ve en un milisegundo dado, o null si la escena ya terminó. */
export function panelAt(scene: Scene, ms: number): SceneBackground | null {
  for (const span of panelSpans(scene)) {
    if (ms >= span.startMs && ms < span.startMs + span.durationMs) return span.background;
  }
  return null;
}

/** Los clips que suenan en un milisegundo dado. */
export function clipsAt(scene: Scene, ms: number): AudioClip[] {
  return scene.audioTrack.filter((clip) => ms >= clip.startMs && ms < clip.startMs + Math.max(clip.durationMs, 1));
}
