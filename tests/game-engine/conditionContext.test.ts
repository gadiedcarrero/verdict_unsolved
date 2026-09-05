import { describe, expect, it } from 'vitest';
import { createEmptyAdventureCaseState } from '@shared/save-data';
import { conditionContextOf } from '@/game-engine/scene-engine/conditions';
import { CharacterSchema } from '@/game-engine/scene-engine/schemas';

const ROSTER = [
  CharacterSchema.parse({
    id: 'director-gray',
    name: 'character.director-gray.name',
    portrait: null,
    color: '#6b7a8f',
    capabilities: ['analisis', 'hackeo', 'deduccion'],
  }),
  CharacterSchema.parse({
    id: 'wraith',
    name: 'character.wraith.name',
    portrait: null,
    color: '#8f6b6b',
    capabilities: ['fuerza', 'movilidad', 'infiltracion'],
  }),
];

function stateWith(activeCharacterId: string | null) {
  return { ...createEmptyAdventureCaseState('escena-1'), activeCharacterId };
}

describe('conditionContextOf', () => {
  it('resuelve las capacidades del personaje activo contra el roster', () => {
    const context = conditionContextOf(stateWith('wraith'), ROSTER);

    expect(context.activeCharacterId).toBe('wraith');
    expect(context.capabilities).toEqual(['fuerza', 'movilidad', 'infiltracion']);
  });

  it('no arrastra capacidades cuando no hay nadie activo', () => {
    expect(conditionContextOf(stateWith(null), ROSTER).capabilities).toEqual([]);
  });

  // Un guion puede nombrar a alguien que todavía no está en el roster (una
  // escena importada antes de crear al personaje): eso no puede tumbar el
  // juego, solo dejarlo sin capacidades.
  it('tolera un personaje activo que no existe en el roster', () => {
    const context = conditionContextOf(stateWith('fantasma'), ROSTER);

    expect(context.activeCharacterId).toBe('fantasma');
    expect(context.capabilities).toEqual([]);
  });
});
