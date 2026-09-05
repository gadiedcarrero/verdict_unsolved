/**
 * Shared between the Electron main process and the renderer (via preload).
 *
 * Los archivos con los que nace un juego. Viven acá y no adentro del handler
 * para que se puedan probar: lo que importa de esta plantilla es que el juego
 * resultante CARGUE, y eso no se puede afirmar mirándola — hay que pasarla por
 * el schema del bundle. Ver tests/game-engine/newGameTemplate.test.ts.
 */

export const NEW_GAME_STARTING_SCENE_ID = 'escena-1';

export function newGameCaseMeta(gameId: string, title: string): Record<string, unknown> {
  return { id: gameId, title, startingSceneId: NEW_GAME_STARTING_SCENE_ID };
}

/** Una primera escena de verdad, no un juego vacío: recién creado tiene que
 * poder abrirse y jugarse en el acto. El fondo apunta a una imagen que todavía
 * no existe y eso está bien — se dibuja el marcador de asset faltante, que es
 * exactamente el estado en el que está el proyecto. */
export function newGameFirstScene(): Record<string, unknown> {
  return {
    id: NEW_GAME_STARTING_SCENE_ID,
    act: 1,
    kind: 'standard',
    backgrounds: [
      {
        id: 'bg-1',
        assetPath: `backgrounds/${NEW_GAME_STARTING_SCENE_ID}.png`,
        hotspots: [],
        layers: [],
      },
    ],
  };
}

/** El módulo que expone el juego a la plataforma — lo único de un juego que es
 * código y no datos, y por eso lo escribe el editor: `gameProjects` descubre
 * los juegos por `src/games/<id>/index.ts`.
 *
 * Solo trae `case`, `scenes`, `characters` y `strings`; el resto del bundle
 * tiene default, así que un juego nuevo no arrastra los sistemas de VERDICT
 * (agentes, tienda, MIRROR) que no tiene. */
export function newGameIndexModule(): string {
  return `import caseMeta from './case.json';
import characters from './characters.json';
import esStrings from './locales/es.json';

// Carga dinámica: cualquier escena nueva creada desde el editor se suma sola,
// sin tocar este archivo.
const sceneModules = import.meta.glob<{ default: unknown }>('./scenes/*.json', { eager: true });
const scenes = Object.values(sceneModules).map((mod) => mod.default);

export const gameBundleRaw = {
  case: caseMeta,
  scenes,
  characters,
  strings: esStrings,
};
`;
}
