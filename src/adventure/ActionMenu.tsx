import { useState, type JSX } from 'react';
import type { ActionMenuActionKind } from './adventureRuntime.store';
import { cursorCssValue } from './cursorCss';
import { gameAssetUrl } from './gameAssetUrl';
import { translate } from '../i18n/translate';
import type { ActionMenuSettings, CursorSettings, PolygonPoint } from '../game-engine/scene-engine/schemas';

const MENU_WIDTH_PX = 220;

const ZONES: {
  kind: ActionMenuActionKind;
  zoneField: keyof ActionMenuSettings;
  imageField: keyof ActionMenuSettings;
  labelKey: string;
}[] = [
  { kind: 'examine', zoneField: 'examineZone', imageField: 'examineImagePath', labelKey: 'actionMenu.examine' },
  { kind: 'interact', zoneField: 'interactZone', imageField: 'interactImagePath', labelKey: 'actionMenu.interact' },
  {
    kind: 'interactWith',
    zoneField: 'interactWithZone',
    imageField: 'interactWithImagePath',
    labelKey: 'actionMenu.interactWith',
  },
  { kind: 'close', zoneField: 'closeZone', imageField: 'closeImagePath', labelKey: 'actionMenu.close' },
];

/**
 * Menú de acción 100% de arte custom por juego (ver SiteSettings.actionMenu):
 * una imagen base y 4 zonas libres trazadas a mano sobre ella (Examinar/
 * Interactuar/Interactuar con/Cerrar) — al pasar el mouse sobre una zona, la
 * imagen visible cambia a la de esa acción. Reemplaza al viejo menú circular
 * con íconos SVG genéricos.
 */
export function ActionMenu({
  gameId,
  anchor,
  actionMenu,
  strings,
  cursor,
  onSelectAction,
  onClose,
}: {
  gameId: string;
  /** Centro del objeto, en % del stage. */
  anchor: { x: number; y: number };
  actionMenu: ActionMenuSettings;
  strings: Record<string, string>;
  /** El cursor custom del juego no puede volver a la flecha nativa del
   * sistema en ningún punto de la pantalla, ni siquiera acá arriba del
   * menú — mismo criterio que el resto del stage (ver cursorCss.ts). */
  cursor: CursorSettings;
  onSelectAction: (kind: ActionMenuActionKind) => void;
  onClose: () => void;
}): JSX.Element | null {
  const [hovered, setHovered] = useState<ActionMenuActionKind | null>(null);

  if (!actionMenu.normalImagePath) return null;

  const hoveredZone = ZONES.find((z) => z.kind === hovered);
  const imagePath = (hoveredZone && actionMenu[hoveredZone.imageField]) || actionMenu.normalImagePath;
  const defaultCursor = cursorCssValue(gameId, cursor.defaultCursorPath, 'default');
  const zoneCursor = cursorCssValue(gameId, cursor.hoverCursorPath, 'pointer');

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 300, cursor: defaultCursor }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, width: MENU_WIDTH_PX, zIndex: 301 }}
      >
        <span
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-graphite-950/90 px-2 py-1 text-[13px] text-graphite-100 transition-opacity ${hoveredZone ? 'opacity-100' : 'opacity-0'}`}
          style={{ top: -6 }}
        >
          {hoveredZone ? translate(strings, hoveredZone.labelKey) : ''}
        </span>
        <img
          src={gameAssetUrl(gameId, imagePath as string)}
          alt=""
          draggable={false}
          className="pointer-events-none block w-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
        />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {ZONES.map((zone) => {
            const points = actionMenu[zone.zoneField] as PolygonPoint[];
            if (points.length < 3) return null;
            return (
              <polygon
                key={zone.kind}
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="transparent"
                pointerEvents="all"
                style={{ cursor: zoneCursor }}
                onMouseEnter={() => setHovered(zone.kind)}
                onMouseLeave={() => setHovered((h) => (h === zone.kind ? null : h))}
                onClick={() => onSelectAction(zone.kind)}
              />
            );
          })}
        </svg>
      </div>
    </>
  );
}
