import { loadAdventureCase } from './loadAdventureCase';
import type { LoadAdventureCaseResult } from './types';

/**
 * Cada carpeta bajo src/games/<id>/ es un juego independiente — su propio
 * index.ts exporta `gameBundleRaw`. Se descubren todos automáticamente (como
 * las escenas dentro de cada juego), así que sumar un juego nuevo es crear
 * la carpeta, no tocar este archivo.
 */
const gameModules = import.meta.glob<{ gameBundleRaw: unknown }>('../../games/*/index.ts', { eager: true });

export type GameProject = {
  id: string;
  result: LoadAdventureCaseResult;
};

function extractGameId(path: string): string {
  const match = /\/games\/([^/]+)\/index\.ts$/.exec(path);
  return match?.[1] ?? path;
}

export const gameProjects: GameProject[] = Object.entries(gameModules)
  .map(([path, mod]) => ({ id: extractGameId(path), result: loadAdventureCase(mod.gameBundleRaw) }))
  .sort((a, b) => a.id.localeCompare(b.id));

export function getGameProject(id: string): GameProject | undefined {
  return gameProjects.find((project) => project.id === id);
}
