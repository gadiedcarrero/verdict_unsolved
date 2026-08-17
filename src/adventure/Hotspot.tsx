import type { JSX } from 'react';
import type { Hotspot as HotspotData } from '../game-engine/scene-engine/schemas';

export function HotspotArea({
  hotspot,
  onInteract,
}: {
  hotspot: HotspotData;
  onInteract: (hotspot: HotspotData) => void;
}): JSX.Element {
  const { area } = hotspot;

  return (
    <button
      type="button"
      aria-label={hotspot.label}
      onClick={() => onInteract(hotspot)}
      className="group absolute rounded border border-transparent transition-colors hover:border-amber-accent/70 hover:bg-amber-accent/10 focus-visible:border-amber-accent"
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
      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-graphite-950/90 px-2 py-1 text-[10px] tracking-wide whitespace-nowrap text-graphite-100 opacity-0 group-hover:opacity-100">
        {hotspot.label}
      </span>
    </button>
  );
}
