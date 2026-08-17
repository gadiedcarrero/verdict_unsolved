import type { JSX } from 'react';
import type { Hotspot as HotspotData } from '../game-engine/scene-engine/schemas';

export function HotspotArea({
  hotspot,
  onInteract,
  onHoverChange,
}: {
  hotspot: HotspotData;
  onInteract: (hotspot: HotspotData) => void;
  onHoverChange?: (hovering: boolean) => void;
}): JSX.Element {
  const { area } = hotspot;

  return (
    <button
      type="button"
      aria-label={hotspot.label}
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
      }}
    >
      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-graphite-950/90 px-2 py-1 text-[10px] tracking-wide whitespace-nowrap text-graphite-100 opacity-0 transition-opacity group-hover:opacity-100">
        {hotspot.label}
      </span>
    </button>
  );
}
