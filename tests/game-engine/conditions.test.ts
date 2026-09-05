import { describe, expect, it } from 'vitest';
import { ConditionSchema } from '@/game-engine/scene-engine/schemas';
import { evaluateCondition, type ConditionContext } from '@/game-engine/scene-engine/conditions';

function context(overrides: Partial<ConditionContext> = {}): ConditionContext {
  return {
    flags: [],
    variables: {},
    activeCharacterId: null,
    inventoryItemIds: [],
    capabilities: [],
    ...overrides,
  };
}

/** Pasa por el schema a propósito: así los tests usan la misma forma que un
 * archivo de escena en disco, con los `default([])` ya aplicados. */
function condition(raw: unknown) {
  return ConditionSchema.parse(raw);
}

describe('evaluateCondition', () => {
  it('se cumple cuando no hay condición', () => {
    expect(evaluateCondition(undefined, context())).toBe(true);
  });

  it('se cumple cuando la condición está vacía', () => {
    expect(evaluateCondition(condition({}), context())).toBe(true);
  });

  it('exige que estén todos los flags pedidos', () => {
    const c = condition({ flags: ['caja_movida', 'luz_apagada'] });

    expect(evaluateCondition(c, context({ flags: ['caja_movida'] }))).toBe(false);
    expect(evaluateCondition(c, context({ flags: ['caja_movida', 'luz_apagada'] }))).toBe(true);
  });

  it('exige que no esté ninguno de los flags prohibidos', () => {
    const c = condition({ notFlags: ['alarma'] });

    expect(evaluateCondition(c, context({ flags: ['alarma'] }))).toBe(false);
    expect(evaluateCondition(c, context({ flags: ['otra_cosa'] }))).toBe(true);
  });

  it('compara variables por igualdad con el atajo de valor pelado', () => {
    const c = condition({ variables: { JANUS_FOUND: true } });

    expect(evaluateCondition(c, context({ variables: { JANUS_FOUND: true } }))).toBe(true);
    expect(evaluateCondition(c, context({ variables: { JANUS_FOUND: false } }))).toBe(false);
  });

  it('compara rangos numéricos con la forma larga', () => {
    const c = condition({ variables: { alarmLevel: { op: 'gte', value: 3 } } });

    expect(evaluateCondition(c, context({ variables: { alarmLevel: 2 } }))).toBe(false);
    expect(evaluateCondition(c, context({ variables: { alarmLevel: 3 } }))).toBe(true);
    expect(evaluateCondition(c, context({ variables: { alarmLevel: 4 } }))).toBe(true);
  });

  // Una variable que el guion todavía no escribió es el estado normal al
  // empezar la partida, no un error: la condición simplemente no se cumple.
  it('no cumple ninguna comparación sobre una variable que nunca se escribió, salvo "distinto de"', () => {
    expect(evaluateCondition(condition({ variables: { X: true } }), context())).toBe(false);
    expect(
      evaluateCondition(condition({ variables: { X: { op: 'gt', value: 0 } } }), context()),
    ).toBe(false);
    expect(
      evaluateCondition(condition({ variables: { X: { op: 'ne', value: true } } }), context()),
    ).toBe(true);
  });

  // Sin esto, JavaScript compararía strings ('10' < '9' es true) y devolvería
  // una respuesta que nadie escribió en el guion.
  it('no ordena valores que no son números', () => {
    const c = condition({ variables: { code: { op: 'gt', value: 5 } } });

    expect(evaluateCondition(c, context({ variables: { code: '10' } }))).toBe(false);
  });

  it('exige que se cumplan todos los términos a la vez', () => {
    const c = condition({
      flags: ['entro'],
      notFlags: ['alarma'],
      variables: { PISTAS: { op: 'gte', value: 3 } },
    });

    expect(evaluateCondition(c, context({ flags: ['entro'], variables: { PISTAS: 3 } }))).toBe(
      true,
    );
    expect(
      evaluateCondition(c, context({ flags: ['entro', 'alarma'], variables: { PISTAS: 3 } })),
    ).toBe(false);
    expect(evaluateCondition(c, context({ flags: ['entro'], variables: { PISTAS: 2 } }))).toBe(
      false,
    );
  });
});

// El mecanismo Gray/Wraith del guion: la misma zona responde distinto según
// con quién se esté jugando. Es lo que el sistema de condiciones existía para
// poder expresar sin tocar el motor.
describe('condiciones por personaje', () => {
  it('exige que el personaje activo sea uno de los nombrados', () => {
    const c = condition({ characters: ['wraith'] });

    expect(evaluateCondition(c, context({ activeCharacterId: 'wraith' }))).toBe(true);
    expect(evaluateCondition(c, context({ activeCharacterId: 'director-gray' }))).toBe(false);
  });

  it('exige todas las capacidades pedidas', () => {
    const c = condition({ capabilities: ['fuerza', 'movilidad'] });

    expect(evaluateCondition(c, context({ capabilities: ['fuerza'] }))).toBe(false);
    expect(evaluateCondition(c, context({ capabilities: ['fuerza', 'movilidad', 'hackeo'] }))).toBe(
      true,
    );
  });

  // Al empezar la partida todavía no hay nadie asignado: una zona que pide
  // fuerza no puede responder que sí por no haber a quién preguntarle.
  it('no se cumple sin personaje activo', () => {
    expect(evaluateCondition(condition({ characters: ['wraith'] }), context())).toBe(false);
    expect(evaluateCondition(condition({ capabilities: ['fuerza'] }), context())).toBe(false);
  });

  it('la caja pesada: Gray no puede, Wraith sí', () => {
    const caja = condition({ capabilities: ['fuerza'] });
    const gray = context({
      activeCharacterId: 'director-gray',
      capabilities: ['analisis', 'hackeo', 'deduccion'],
    });
    const wraith = context({
      activeCharacterId: 'wraith',
      capabilities: ['fuerza', 'movilidad', 'infiltracion'],
    });

    expect(evaluateCondition(caja, gray)).toBe(false);
    expect(evaluateCondition(caja, wraith)).toBe(true);
  });
});
