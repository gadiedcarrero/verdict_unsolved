import { useRef, type JSX } from 'react';
import type { Scene } from '../game-engine/scene-engine/schemas';
import { translate } from '../i18n/translate';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { MENU_POSITION_CLASSES, MenuButtonView } from './MenuButtonView';
import { MENU_TITLE_POSITION_CLASSES, MenuTitleView } from './MenuTitleView';
import { PlaceholderLayer } from './PlaceholderLayer';
import { useStageSize } from './useStageSize';

/**
 * Escena "menu": un fondo con botones (título, menú de inicio) — sin capas,
 * hotspots ni diálogo. Cada botón corre sus propias `onClick` actions (ver
 * MenuButtonSchema), típicamente un `transitionTo`. Ver Scene.kind en
 * schemas.ts.
 */
export function MenuScene({
  gameId,
  scene,
  strings,
}: {
  gameId: string;
  scene: Scene;
  strings: Record<string, string>;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useStageSize(containerRef);
  const runActions = useAdventureRuntimeStore((s) => s.runActions);

  const activeBackground = scene.backgrounds[0];

  return (
    <div ref={containerRef} className="flex h-screen w-screen items-center justify-center bg-graphite-950">
      <div className="relative overflow-hidden bg-graphite-950" style={{ width, height }}>
        {activeBackground ? (
          <PlaceholderLayer
            gameId={gameId}
            assetPath={activeBackground.assetPath}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-graphite-600 uppercase">
            Sin fondo — agregá uno en el editor
          </div>
        )}

        {scene.menuTitle && (
          <div className={MENU_TITLE_POSITION_CLASSES[scene.menuAppearance.position]}>
            <MenuTitleView title={scene.menuTitle} text={translate(strings, scene.menuTitle.text)} />
          </div>
        )}

        <div className={MENU_POSITION_CLASSES[scene.menuAppearance.position]}>
          {scene.menuButtons.map((button) => (
            <MenuButtonView
              key={button.id}
              label={translate(strings, button.label)}
              appearance={scene.menuAppearance}
              onClick={() => runActions(button.onClick)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
