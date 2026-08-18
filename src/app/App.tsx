import { useEffect, useState, type JSX } from 'react';
import { AdventureRuntime } from '../adventure/AdventureRuntime';
import { usePreferencesStore } from '../game-engine/preferences/preferences.store';
import { ProjectHub } from './ProjectHub';

function usePreferencesEffect(): void {
  const textScale = usePreferencesStore((s) => s.textScale);
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
  }, [textScale]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
}

// El editor recarga la página entera después de crear una escena (para que
// import.meta.glob la recoja) — sin recordar qué juego estaba abierto, esa
// recarga te mandaba de vuelta al selector de proyectos en vez de quedarte
// en el mismo juego.
const LAST_GAME_ID_KEY = 'verdictUnsolved.lastGameId';

export function App(): JSX.Element {
  const [gameId, setGameId] = useState<string | null>(() => localStorage.getItem(LAST_GAME_ID_KEY));
  usePreferencesEffect();

  function openGame(id: string): void {
    localStorage.setItem(LAST_GAME_ID_KEY, id);
    setGameId(id);
  }

  function exitToHub(): void {
    localStorage.removeItem(LAST_GAME_ID_KEY);
    setGameId(null);
  }

  if (!gameId) {
    return <ProjectHub onOpenGame={openGame} />;
  }

  return <AdventureRuntime gameId={gameId} onExit={exitToHub} />;
}
