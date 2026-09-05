import { describe, expect, it } from 'vitest';
import charactersJson from '@/games/verdict-unsolved/characters.json';
import prologoScene from '@/games/verdict-unsolved/scenes/prologo-acheron.json';
import { CharacterSchema, SceneSchema } from '@/game-engine/scene-engine/schemas';

// `Character.variants` y `SceneLayer.character` se agregaron con datos ya
// guardados en disco (18 personajes, todas las escenas del caso). Ambos campos
// tienen que poder faltar: si un día alguien los vuelve requeridos, el juego
// deja de cargar entero en vez de fallar en un solo lugar visible.
describe('variantes de personaje sobre datos ya guardados', () => {
  it('parsea el roster real, que todavía no tiene variantes', () => {
    const parsed = charactersJson.map((c) => CharacterSchema.parse(c));

    expect(parsed).toHaveLength(18);
    for (const character of parsed) {
      expect(character.variants).toEqual({});
    }
  });

  it('parsea una escena real, cuyas capas todavía no apuntan a un personaje', () => {
    const scene = SceneSchema.parse(prologoScene);

    for (const background of scene.backgrounds) {
      for (const layer of background.layers) {
        expect(layer.character).toBeUndefined();
      }
    }
  });
});
