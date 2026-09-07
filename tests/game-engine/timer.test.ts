import { describe, expect, it } from 'vitest';
import { remainingSeconds, timerSecondsFor } from '@/game-engine/scene-engine/timer';
import { SceneTimerSchema } from '@/game-engine/scene-engine/schemas';

function timer(raw: Record<string, unknown>) {
  return SceneTimerSchema.parse({ seconds: 60, label: 'timer.oxigeno', ...raw });
}

describe('timerSecondsFor', () => {
  it('da los segundos base a quien no tiene ninguna capacidad que sume', () => {
    expect(timerSecondsFor(timer({ capabilityBonus: { 'respiracion-subacuatica': 30 } }), [])).toBe(60);
  });

  // El caso que motivó todo esto: la misma escena dura más para quien puede
  // aguantar la respiración. Una condición no sabe expresar esto — solo sabe
  // decir sí o no.
  it('suma el bonus de la capacidad que el personaje tiene', () => {
    const t = timer({ capabilityBonus: { 'respiracion-subacuatica': 30 } });

    expect(timerSecondsFor(t, ['respiracion-subacuatica'])).toBe(90);
  });

  it('acumula varias capacidades', () => {
    const t = timer({ capabilityBonus: { 'respiracion-subacuatica': 30, resistencia: 15 } });

    expect(timerSecondsFor(t, ['respiracion-subacuatica', 'resistencia'])).toBe(105);
  });

  it('ignora capacidades que este reloj no premia', () => {
    const t = timer({ capabilityBonus: { resistencia: 15 } });

    expect(timerSecondsFor(t, ['hackeo', 'fuerza'])).toBe(60);
  });

  // Un bonus negativo mal escrito no puede dejar una escena imposible de
  // jugar y sin ninguna pista de por qué.
  it('nunca deja la escena en cero segundos', () => {
    expect(timerSecondsFor(timer({ seconds: 10, capabilityBonus: { herido: -999 } }), ['herido'])).toBe(1);
  });
});

describe('remainingSeconds', () => {
  it('redondea hacia arriba, para que el reloj no muestre 0 mientras queda tiempo', () => {
    expect(remainingSeconds(10_500, 10_000)).toBe(1);
  });

  it('no baja de cero', () => {
    expect(remainingSeconds(10_000, 20_000)).toBe(0);
  });

  it('cuenta el tiempo real transcurrido, no los ticks', () => {
    const endsAt = 100_000;

    expect(remainingSeconds(endsAt, 40_000)).toBe(60);
    // Aunque el intervalo se haya atrasado, el reloj dice la verdad.
    expect(remainingSeconds(endsAt, 95_000)).toBe(5);
  });
});
