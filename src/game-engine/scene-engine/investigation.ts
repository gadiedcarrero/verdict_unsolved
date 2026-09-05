import type { Clue, Investigation } from './schemas';

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

export function canSolve(investigation: Investigation, discoveredClueIds: readonly string[]): boolean {
  const required = cluesRequired(investigation);
  // Una investigación sin pistas declaradas se puede resolver de entrada: es
  // una escena que solo quiere la pregunta de deducción.
  if (required === 0) return true;
  return discoveredCluesOf(investigation, discoveredClueIds).length >= required;
}
