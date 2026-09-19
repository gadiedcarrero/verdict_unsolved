import type { AudioClip, AudioTrack, Scene, SceneBackground } from './schemas';

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
  // Los clips de una pista en loop no la alargan: se repiten dentro de lo que
  // dure la escena, así que estirarla por ellos sería una escena infinita.
  const audioEnd = scene.audioTracks
    .filter((track) => !track.loop)
    .flatMap((track) => track.clips)
    .reduce((max, clip) => Math.max(max, clip.startMs + clip.durationMs), 0);
  return Math.max(panels, audioEnd);
}

/** Qué panel se ve en un milisegundo dado, o null si la escena ya terminó. */
export function panelAt(scene: Scene, ms: number): SceneBackground | null {
  for (const span of panelSpans(scene)) {
    if (ms >= span.startMs && ms < span.startMs + span.durationMs) return span.background;
  }
  return null;
}

/** Dónde está la cabeza de reproducción DENTRO de un clip, o null si ese clip
 * no suena en ese momento. En una pista en loop el clip se repite desde su
 * inicio, así que el desfase se calcula con un módulo — por eso esto devuelve
 * el offset y no un booleano: el reproductor necesita saber en qué punto del
 * archivo ponerse, no solo si suena. */
export function clipOffsetMs(clip: AudioClip, track: AudioTrack, ms: number): number | null {
  if (ms < clip.startMs) return null;
  const elapsed = ms - clip.startMs;
  const length = Math.max(clip.durationMs, 1);
  if (track.loop) return elapsed % length;
  return elapsed < length ? elapsed : null;
}

/** Los clips que suenan en un milisegundo dado, con su pista. */
export function clipsAt(scene: Scene, ms: number): { clip: AudioClip; track: AudioTrack; offsetMs: number }[] {
  const sounding: { clip: AudioClip; track: AudioTrack; offsetMs: number }[] = [];
  for (const track of scene.audioTracks) {
    if (track.muted) continue;
    for (const clip of track.clips) {
      const offsetMs = clipOffsetMs(clip, track, ms);
      if (offsetMs !== null) sounding.push({ clip, track, offsetMs });
    }
  }
  return sounding;
}
