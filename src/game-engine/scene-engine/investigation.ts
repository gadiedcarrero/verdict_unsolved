import type { Clue, Investigation, Scene } from './schemas';

/**
 * Reglas del loop de investigación, sin estado ni React: qué pistas de esta
 * escena ya están, cuántas hacen falta y si SOLUCIONAR se habilita.
 *
 * Vive aparte del store porque es lo único de este sistema que conviene poder
 * probar solo, y porque el editor necesita las mismas cuentas para mostrarle
 * al autor "3 pistas, hacen falta 3" sin que haya una partida en curso.
 */

/** Cuántas pistas habilitan SOLUCIONAR. `requiredClues: 0` significa "todas",
 * que es el caso normal — pedir un número solo tiene sentido cuando la escena
 * ofrece pistas de más. */
export function cluesRequired(investigation: Investigation): number {
  return investigation.requiredClues > 0 ? investigation.requiredClues : investigation.clues.length;
}

/** Las pistas de ESTA investigación que ya se descubrieron. Se filtra contra
 * las de la escena y no se usa el largo de `discoveredClueIds` directo: esa
 * lista es de todo el caso, y contiene pistas de otras escenas. */
export function discoveredCluesOf(investigation: Investigation, discoveredClueIds: readonly string[]): Clue[] {
  return investigation.clues.filter((clue) => discoveredClueIds.includes(clue.id));
}

/**
 * Toda la evidencia global ya descubierta, de cualquier escena del caso.
 *
 * Se junta recorriendo las escenas en vez de guardarse aparte al descubrirla:
 * el texto de una pista es contenido de la escena que la da, así que
 * duplicarlo en el save lo dejaría desactualizado en cuanto se corrija una
 * redacción — y obligaría a migrar partidas para arreglar una falta de
 * ortografía. Lo que se guarda es el id; el texto se resuelve al mostrarlo.
 */
export function globalEvidenceOf(scenes: readonly Scene[], discoveredClueIds: readonly string[]): Clue[] {
  const seen = new Set<string>();
  const evidence: Clue[] = [];

  for (const scene of scenes) {
    for (const clue of scene.investigation?.clues ?? []) {
      if (!clue.global || seen.has(clue.id) || !discoveredClueIds.includes(clue.id)) continue;
      seen.add(clue.id);
      evidence.push(clue);
    }
  }
  return evidence;
}

export function canSolve(investigation: Investigation, discoveredClueIds: readonly string[]): boolean {
  const required = cluesRequired(investigation);
  // Una investigación sin pistas declaradas se puede resolver de entrada: es
  // una escena que solo quiere la pregunta de deducción.
  if (required === 0) return true;
  return discoveredCluesOf(investigation, discoveredClueIds).length >= required;
}
