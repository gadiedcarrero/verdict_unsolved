import { describe, expect, it } from 'vitest';
import {
  NEW_GAME_STARTING_SCENE_ID,
  newGameCaseMeta,
  newGameFirstScene,
  newGameIndexModule,
} from '@shared/new-game-template';
import { loadAdventureCase } from '@/game-engine/scene-engine/loadAdventureCase';

/**
 * Lo que importa de la plantilla de juego nuevo no es cómo se ve, es que el
 * juego resultante CARGUE. Un proyecto creado desde la app que falla la
 * validación del bundle aparece en el hub como una tarjeta rota, y no hay
 * forma de arreglarlo desde la app — hay que ir a editar JSON a mano, que es
 * exactamente lo que este flujo existe para evitar.
 */
function bundleAsCreated(gameId = 'naufrago', title = 'El náufrago') {
  return {
    case: newGameCaseMeta(gameId, title),
    scenes: [newGameFirstScene()],
    characters: [],
    strings: {},
  };
}

describe('plantilla de juego nuevo', () => {
  it('produce un juego que carga', () => {
    const result = loadAdventureCase(bundleAsCreated());

    expect(result.ok).toBe(true);
  });

  it('arranca en una escena que existe', () => {
    const result = loadAdventureCase(bundleAsCreated());
    if (!result.ok) throw new Error(result.error);

    const startingScene = result.data.scenes.find((scene) => scene.id === result.data.case.startingSceneId);
    expect(startingScene).toBeDefined();
    expect(startingScene?.backgrounds).toHaveLength(1);
  });

  it('conserva el título que puso el usuario', () => {
    const result = loadAdventureCase(bundleAsCreated('naufrago', 'El náufrago'));
    if (!result.ok) throw new Error(result.error);

    expect(result.data.case.title).toBe('El náufrago');
    expect(result.data.case.id).toBe('naufrago');
  });

  it('no arrastra los sistemas de VERDICT', () => {
    const result = loadAdventureCase(bundleAsCreated());
    if (!result.ok) throw new Error(result.error);

    expect(result.data.agents).toEqual([]);
    expect(result.data.equipmentItems).toEqual([]);
    expect(result.data.investigationAreas).toEqual([]);
  });

  // El index.ts es lo único del juego que es código; si deja de exportar
  // `gameBundleRaw` o de leer la carpeta scenes/, el juego se vuelve
  // invisible para `gameProjects` sin ningún error visible.
  it('el módulo generado expone el bundle y descubre las escenas solo', () => {
    const module = newGameIndexModule();

    expect(module).toContain('export const gameBundleRaw');
    expect(module).toContain("import.meta.glob<{ default: unknown }>('./scenes/*.json', { eager: true })");
    expect(module).toContain("import caseMeta from './case.json'");
  });

  it('el nombre del archivo de la primera escena coincide con el id de arranque', () => {
    expect(newGameFirstScene()['id']).toBe(NEW_GAME_STARTING_SCENE_ID);
    expect(newGameCaseMeta('x', 'X')['startingSceneId']).toBe(NEW_GAME_STARTING_SCENE_ID);
  });
});
