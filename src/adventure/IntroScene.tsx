import { useEffect, useRef, useState, type JSX } from 'react';
import type { Scene } from '../game-engine/scene-engine/schemas';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { PlaceholderLayer } from './PlaceholderLayer';
import { useStageSize } from './useStageSize';

const DEFAULT_SLIDE_MS = 2500;

/**
 * Escena "intro": una secuencia de fondos (logos, splash) que pasa sola por
 * tiempo — sin capas, hotspots ni diálogo — y al terminar (o al saltarla con
 * el botón "Comenzar") dispara `scene.onIntroComplete`, típicamente un
 * `transitionTo` al menú. Ver Scene.kind en schemas.ts.
 */
export function IntroScene({ gameId, scene }: { gameId: string; scene: Scene }): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useStageSize(containerRef);
  const [index, setIndex] = useState(0);
  const runActions = useAdventureRuntimeStore((s) => s.runActions);

  const backgrounds = scene.backgrounds;
  const current = backgrounds[index];

  useEffect(() => {
    if (!current) {
      runActions(scene.onIntroComplete ?? []);
      return;
    }
    const timer = window.setTimeout(() => {
      if (index + 1 < backgrounds.length) {
        setIndex(index + 1);
      } else {
        runActions(scene.onIntroComplete ?? []);
      }
    }, current.durationMs ?? DEFAULT_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, current, backgrounds.length, scene.onIntroComplete, runActions]);

  return (
    <div ref={containerRef} className="flex h-screen w-screen items-center justify-center bg-graphite-950">
      <div className="relative overflow-hidden bg-graphite-950" style={{ width, height }}>
        {current ? (
          <PlaceholderLayer gameId={gameId} assetPath={current.assetPath} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-graphite-600 uppercase">
            Sin fondos — agregá uno en el editor
          </div>
        )}

        {scene.introSkippable && (
          <button
            type="button"
            onClick={() => runActions(scene.onIntroComplete ?? [])}
            className="absolute right-8 bottom-8 rounded border border-graphite-400/60 px-4 py-2 text-[11px] tracking-widest text-graphite-200 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
          >
            Comenzar
          </button>
        )}
      </div>
    </div>
  );
}
