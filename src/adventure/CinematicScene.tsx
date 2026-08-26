import { useEffect, useRef, useState, type JSX } from 'react';
import type { Scene, SiteSettings } from '../game-engine/scene-engine/schemas';
import { cursorCssValue } from './cursorCss';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { PlaceholderLayer } from './PlaceholderLayer';
import { useStageSize } from './useStageSize';

const DEFAULT_PANEL_MS = 4000;

/**
 * Escena "cinematica": una secuencia de paneles (fondo + texto acompañante
 * opcional) que se reproduce sola, con la transición elegida en
 * `scene.cinematicTransition`, y dispara `scene.onCinematicComplete` al
 * terminar (o al saltarla con el botón, si `introSkippable`) — pensada para
 * momentos tipo "varias viñetas pasando una detrás de otra" que no son ni
 * un cuarto explorable (`kind: "standard"`) ni un splash mudo sin texto
 * (`kind: "intro"`). Ver CinematicTransitionSchema en schemas.ts — "comic"
 * todavía usa el mismo fade que "fade" por dentro, queda pendiente definir
 * cómo se ve esa transición tipo viñeta.
 */
export function CinematicScene({
  gameId,
  scene,
  siteSettings,
}: {
  gameId: string;
  scene: Scene;
  siteSettings: SiteSettings;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useStageSize(containerRef);
  const [index, setIndex] = useState(0);
  // Se resetea a false y vuelve a true un instante después de cada cambio
  // de panel — el fade-in de CSS necesita que la opacidad arranque en 0 en
  // un render aparte del que ya trae el panel nuevo, si no la transición
  // no tiene nada de qué partir.
  const [visible, setVisible] = useState(false);
  const runActions = useAdventureRuntimeStore((s) => s.runActions);

  const backgrounds = scene.backgrounds;
  const current = backgrounds[index];

  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [index]);

  useEffect(() => {
    if (!current) {
      runActions(scene.onCinematicComplete ?? []);
      return;
    }
    const timer = window.setTimeout(() => {
      if (index + 1 < backgrounds.length) {
        setIndex(index + 1);
      } else {
        runActions(scene.onCinematicComplete ?? []);
      }
    }, current.durationMs ?? DEFAULT_PANEL_MS);
    return () => window.clearTimeout(timer);
  }, [index, current, backgrounds.length, scene.onCinematicComplete, runActions]);

  return (
    <div ref={containerRef} className="flex h-screen w-screen items-center justify-center bg-graphite-950">
      <div
        className="relative overflow-hidden bg-graphite-950"
        style={{ width, height, cursor: cursorCssValue(gameId, siteSettings.cursor.defaultCursorPath, 'auto') }}
      >
        {current ? (
          <div
            key={current.id}
            className="absolute inset-0 transition-opacity duration-500 ease-out"
            style={{ opacity: visible ? 1 : 0 }}
          >
            <PlaceholderLayer
              gameId={gameId}
              assetPath={current.assetPath}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {current.caption && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center p-6">
                <p className="max-w-2xl rounded border border-graphite-700 bg-graphite-900/95 p-4 text-center text-sm leading-relaxed text-graphite-100 shadow-2xl backdrop-blur">
                  {current.caption}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-graphite-600 uppercase">
            Sin paneles — agregá fondos en el editor
          </div>
        )}

        {scene.introSkippable && (
          <button
            type="button"
            onClick={() => runActions(scene.onCinematicComplete ?? [])}
            className="absolute right-8 bottom-8 rounded border border-graphite-400/60 px-4 py-2 text-[11px] tracking-widest text-graphite-200 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );
}
