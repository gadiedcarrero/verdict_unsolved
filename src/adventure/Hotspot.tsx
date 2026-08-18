import type { CSSProperties, JSX } from 'react';
import type { Hotspot as HotspotData, TextStyle } from '../game-engine/scene-engine/schemas';
import { translate } from '../i18n/translate';

const FONT_FAMILY_CLASSES: Record<TextStyle['fontFamily'], string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

export function HotspotArea({
  hotspot,
  strings,
  labelStyle,
  onInteract,
  onHoverChange,
}: {
  hotspot: HotspotData;
  strings: Record<string, string>;
  /** Ya resuelto: default general del sitio + override de este hotspot, si tiene. */
  labelStyle: TextStyle;
  onInteract: (hotspot: HotspotData) => void;
  onHoverChange?: (hovering: boolean) => void;
}): JSX.Element {
  const { area } = hotspot;
  const displayLabel = translate(strings, hotspot.label);
  const isPolygon = hotspot.shape === 'polygon' && (hotspot.points?.length ?? 0) >= 3;

  const areaStyle: CSSProperties = isPolygon
    ? {
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        clipPath: `polygon(${hotspot.points!.map((p) => `${p.x}% ${p.y}%`).join(', ')})`,
      }
    : {
        left: `${area.x}%`,
        top: `${area.y}%`,
        width: `${area.width}%`,
        height: `${area.height}%`,
      };

  // Rectángulo: el tooltip flota arriba de la propia caja (chica). Polígono:
  // la "caja" del botón es todo el stage (para que el clip-path defina el
  // área real), así que el tooltip se ancla directo al borde superior del
  // bounding box en vez de relativo al botón.
  const labelStyleProps: CSSProperties = isPolygon
    ? { left: `${area.x + area.width / 2}%`, top: `${area.y}%`, transform: 'translate(-50%, -140%)' }
    : { left: '50%', top: '-1.5rem', transform: 'translateX(-50%)' };

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
        ...areaStyle,
        // Por encima de cualquier capa de escena (zIndex 1-4), para que el
        // clic siempre llegue al hotspot y no a la capa/placeholder debajo.
        zIndex: 50,
      }}
    >
      <span
        className={`pointer-events-none absolute rounded bg-graphite-950/90 px-2 py-1 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 ${FONT_FAMILY_CLASSES[labelStyle.fontFamily]}`}
        style={{ ...labelStyleProps, fontSize: `${labelStyle.fontSize}px`, color: labelStyle.color }}
      >
        {displayLabel}
      </span>
    </button>
  );
}
