import { describe, expect, it } from 'vitest';
import { InvestigationSchema } from '@/game-engine/scene-engine/schemas';
import { canSolve, cluesRequired, discoveredCluesOf } from '@/game-engine/scene-engine/investigation';

/** Pasa por el schema para que los tests usen la misma forma que un archivo de
 * escena en disco, con los defaults ya aplicados. */
function investigation(raw: Record<string, unknown>) {
  return InvestigationSchema.parse({ objective: 'obj.test', ...raw });
}

const TRES_PISTAS = [
  { id: 'empleo', text: 'clue.empleo' },
  { id: 'pagos', text: 'clue.pagos' },
  { id: 'credencial', text: 'clue.credencial' },
];

describe('cluesRequired', () => {
  it('pide todas las pistas declaradas cuando no se fija un número', () => {
    expect(cluesRequired(investigation({ clues: TRES_PISTAS }))).toBe(3);
  });

  it('respeta el número fijado cuando la escena ofrece pistas de más', () => {
    expect(cluesRequired(investigation({ clues: TRES_PISTAS, requiredClues: 2 }))).toBe(2);
  });
});

describe('discoveredCluesOf', () => {
  // La lista de descubiertas es de todo el caso: si se contara su largo en vez
  // de cruzarla contra las de la escena, una escena se daría por resuelta con
  // pistas encontradas en otra.
  it('solo cuenta las pistas de esta investigación', () => {
    const found = discoveredCluesOf(investigation({ clues: TRES_PISTAS }), ['empleo', 'de-otra-escena']);

    expect(found.map((c) => c.id)).toEqual(['empleo']);
  });
});

describe('canSolve', () => {
  it('no se habilita mientras falten pistas', () => {
    const inv = investigation({ clues: TRES_PISTAS });

    expect(canSolve(inv, [])).toBe(false);
    expect(canSolve(inv, ['empleo', 'pagos'])).toBe(false);
  });

  it('se habilita al completar las pistas', () => {
    const inv = investigation({ clues: TRES_PISTAS });

    expect(canSolve(inv, ['empleo', 'pagos', 'credencial'])).toBe(true);
  });

  it('se habilita al llegar al mínimo pedido, sin necesitar las opcionales', () => {
    const inv = investigation({ clues: TRES_PISTAS, requiredClues: 2 });

    expect(canSolve(inv, ['empleo', 'pagos'])).toBe(true);
  });

  it('se puede resolver de entrada una investigación que solo es una pregunta', () => {
    expect(canSolve(investigation({ clues: [] }), [])).toBe(true);
  });

  it('ignora pistas de otras escenas al contar', () => {
    const inv = investigation({ clues: TRES_PISTAS });

    expect(canSolve(inv, ['otra-1', 'otra-2', 'otra-3'])).toBe(false);
  });
});
