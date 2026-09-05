import { describe, expect, it } from 'vitest';
import { CharacterSchema, SceneSchema } from '@/game-engine/scene-engine/schemas';

/**
 * `Character.variants` y `SceneLayer.character` se agregaron con datos ya
 * guardados en disco. Ambos tienen que poder faltar: si un día alguien los
 * vuelve requeridos, un juego entero deja de cargar en vez de fallar en un
 * solo lugar visible.
 *
 * Los datos son sintéticos a propósito — antes esto corría contra el roster
 * de VERDICT, y la garantía dejaba de existir en cuanto se borraba ese juego.
 * Lo que se prueba es el schema, no el contenido.
 */

const PERSONAJE_SIN_VARIANTES = {
  id: 'sin-variantes',
  name: 'character.sin-variantes.name',
  portrait: 'portraits/sin-variantes.png',
  description: 'Alguien dibujado antes de que existieran las variantes.',
  expressions: { serio: { path: 'portraits/sin-variantes-serio.png', description: '' } },
  voices: {},
  color: '#8a94a6',
};

const ESCENA_CON_CAPA_SUELTA = {
  id: 'escena-vieja',
  act: 1,
  backgrounds: [
    {
      id: 'bg-1',
      assetPath: 'backgrounds/escena-vieja.png',
      layers: [{ id: 'lampara', assetPath: 'layers/lampara.png', x: 10, y: 20 }],
    },
  ],
};

describe('variantes de personaje sobre datos guardados antes de que existieran', () => {
  it('parsea un personaje sin el campo variants', () => {
    const character = CharacterSchema.parse(PERSONAJE_SIN_VARIANTES);

    expect(character.variants).toEqual({});
    expect(character.capabilities).toEqual([]);
    // Lo que ya tenía tiene que sobrevivir intacto.
    expect(character.expressions['serio']?.path).toBe('portraits/sin-variantes-serio.png');
  });

  it('parsea una capa que no apunta a ningún personaje', () => {
    const scene = SceneSchema.parse(ESCENA_CON_CAPA_SUELTA);
    const layer = scene.backgrounds[0]!.layers[0]!;

    expect(layer.character).toBeUndefined();
    expect(layer.assetPath).toBe('layers/lampara.png');
    expect(layer.zIndex).toBe(0);
  });

  it('parsea una escena sin objetos ni investigación', () => {
    const scene = SceneSchema.parse(ESCENA_CON_CAPA_SUELTA);

    expect(scene.items).toEqual([]);
    expect(scene.investigation).toBeUndefined();
    expect(scene.activeCharacterId).toBeUndefined();
  });
});
