import { describe, expect, it } from 'vitest';
import { capabilityVocabulary, unreachableCapabilities } from '@/game-engine/scene-engine/capabilities';
import { CharacterSchema, SceneSchema, type Character, type Scene } from '@/game-engine/scene-engine/schemas';

function character(id: string, capabilities: string[]): Character {
  return CharacterSchema.parse({ id, name: `character.${id}.name`, portrait: null, color: '#fff', capabilities });
}

/** Una escena con una zona que exige capacidades — `enabledWhen` o
 * `visibleWhen` según el caso. */
function sceneRequiring(
  id: string,
  requirements: { capabilities: string[]; via?: 'enabledWhen' | 'visibleWhen' }[],
): Scene {
  return SceneSchema.parse({
    id,
    act: 1,
    backgrounds: [
      {
        id: 'bg-1',
        assetPath: 'backgrounds/x.png',
        hotspots: requirements.map((requirement, index) => ({
          id: `zona-${index}`,
          label: 'hotspot.x',
          area: { x: 0, y: 0, width: 10, height: 10 },
          onInteract: [],
          [requirement.via ?? 'enabledWhen']: { capabilities: requirement.capabilities },
        })),
      },
    ],
  });
}

const GRAY = character('director-gray', ['analisis', 'hackeo']);
const WRAITH = character('wraith', ['fuerza', 'infiltracion']);

describe('capabilityVocabulary', () => {
  it('junta lo que tienen los personajes y lo que piden las zonas', () => {
    const vocabulary = capabilityVocabulary([GRAY, WRAITH], [sceneRequiring('e1', [{ capabilities: ['nadar'] }])]);

    expect(vocabulary).toEqual(['analisis', 'fuerza', 'hackeo', 'infiltracion', 'nadar']);
  });

  it('no repite una capacidad que tienen varios', () => {
    const vocabulary = capabilityVocabulary([character('a', ['fuerza']), character('b', ['fuerza'])], []);

    expect(vocabulary).toEqual(['fuerza']);
  });

  it('mira también las condiciones de visibilidad, no solo las de habilitación', () => {
    const scene = sceneRequiring('e1', [{ capabilities: ['vista-aguda'], via: 'visibleWhen' }]);

    expect(capabilityVocabulary([], [scene])).toEqual(['vista-aguda']);
  });
});

describe('unreachableCapabilities', () => {
  // El fallo que esto existe para atrapar: la zona pide "fuerza", el
  // personaje tiene "fuerte", y la zona no responde nunca sin dar un error.
  it('señala la capacidad que una zona pide y nadie tiene', () => {
    const scene = sceneRequiring('e1', [{ capabilities: ['fuerza'] }]);

    expect(unreachableCapabilities([character('gray', ['fuerte'])], [scene])).toEqual(['fuerza']);
  });

  it('no señala nada cuando alguien la tiene', () => {
    const scene = sceneRequiring('e1', [{ capabilities: ['fuerza'] }]);

    expect(unreachableCapabilities([GRAY, WRAITH], [scene])).toEqual([]);
  });

  // Alcanza con que UN personaje la tenga: no hace falta que la tenga el que
  // esté activo en esa escena, eso lo resuelve el jugador cambiando.
  it('alcanza con que un solo personaje la tenga', () => {
    const scene = sceneRequiring('e1', [{ capabilities: ['fuerza'] }]);

    expect(unreachableCapabilities([GRAY, WRAITH], [scene])).toEqual([]);
    expect(unreachableCapabilities([GRAY], [scene])).toEqual(['fuerza']);
  });

  it('no señala capacidades que nadie pide, aunque nadie las tenga', () => {
    expect(unreachableCapabilities([GRAY], [sceneRequiring('e1', [{ capabilities: ['analisis'] }])])).toEqual([]);
  });

  it('junta las que faltan de todas las escenas, sin repetir', () => {
    const scenes = [
      sceneRequiring('e1', [{ capabilities: ['nadar'] }, { capabilities: ['trepar'] }]),
      sceneRequiring('e2', [{ capabilities: ['nadar'] }]),
    ];

    expect(unreachableCapabilities([GRAY], scenes)).toEqual(['nadar', 'trepar']);
  });
});
