import type { JSX } from 'react';
import type { Hotspot as HotspotData } from '../game-engine/scene-engine/schemas';
import { translate } from '../i18n/translate';

export function HotspotArea({
  hotspot,
  strings,
  onInteract,
  onHoverChange,
}: {
  hotspot: HotspotData;
  strings: Record<string, string>;
  onInteract: (hotspot: HotspotData) => void;
  onHoverChange?: (hovering: boolean) => void;
}): JSX.Element {
  const { area } = hotspot;
  const displayLabel = translate(strings, hotspot.label);

  return (
    <button
      type="button"
      aria-label={displayLabel}
      onClick={() => onInteract(hotspot)}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      className="group absolute cursor-pointer"
      style={{
        left: `${area.x}%`,
        top: `${area.y}%`,
        width: `${area.width}%`,
        height: `${area.height}%`,
        // Por encima de cualquier capa de escena (zIndex 1-4), para que el
        // clic siempre llegue al hotspot y no a la capa/placeholder debajo.
        zIndex: 50,
      }}
    >
      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-graphite-950/90 px-2 py-1 text-[10px] tracking-wide whitespace-nowrap text-graphite-100 opacity-0 transition-opacity group-hover:opacity-100">
        {displayLabel}
      </span>
    </button>
  );
}
