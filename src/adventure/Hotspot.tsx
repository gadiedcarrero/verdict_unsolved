import { useState, type CSSProperties, type JSX } from 'react';
import type { Hotspot as HotspotData, TextStyle } from '../game-engine/scene-engine/schemas';
import { FONT_FAMILY_CSS } from './fontFamilyCss';
import { resolveLabelPosition } from './hotspotLabel';
import { translate } from '../i18n/translate';

export function HotspotArea({
  hotspot,
  strings,
  labelStyle,
  hoverCursor,
  onInteract,
  onHoverChange,
}: {
  hotspot: HotspotData;
  strings: Record<string, string>;
  /** Ya resuelto: default general del sitio + override de este hotspot, si tiene. */
  labelStyle: TextStyle;
  /** Valor CSS `cursor` (ver cursorCss.ts) — undefined = flecha/pointer normal. */
  hoverCursor?: string | undefined;
  onInteract: (hotspot: HotspotData) => void;
  onHoverChange?: (hovering: boolean) => void;
}): JSX.Element {
  const { area } = hotspot;
  const displayLabel = translate(strings, hotspot.label);
  const isPolygon = hotspot.shape === 'polygon' && (hotspot.points?.length ?? 0) >= 3;
  // El tooltip no puede vivir DENTRO del botón: un clip-path recorta a sus
  // hijos también, así que un tooltip posicionado fuera del contorno del
  // polígono (arriba de la forma) quedaba invisible. Se renderizan como
  // hermanos y el hover se maneja a mano en vez de con group-hover de CSS.
  const [hovering, setHovering] = useState(false);

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

  const labelPosition = resolveLabelPosition(hotspot);
  const labelStyleProps: CSSProperties = {
    left: `${labelPosition.x}%`,
    top: `${labelPosition.y}%`,
    transform: 'translate(-50%, -140%)',
  };

  function setHover(value: boolean): void {
    setHovering(value);
    onHoverChange?.(value);
  }

  return (
    <>
      <button
        type="button"
        aria-label={displayLabel}
        onClick={() => onInteract(hotspot)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className="absolute cursor-pointer"
        style={{
          ...areaStyle,
          cursor: hoverCursor,
          // Por encima de cualquier capa de escena (zIndex 1-4), para que el
          // clic siempre llegue al hotspot y no a la capa/placeholder debajo.
          zIndex: 50,
        }}
      />
      <span
        className={`pointer-events-none absolute rounded bg-graphite-950/90 px-2 py-1 whitespace-nowrap transition-opacity ${hovering ? 'opacity-100' : 'opacity-0'}`}
        style={{
          ...labelStyleProps,
          fontSize: `${labelStyle.fontSize}px`,
          color: labelStyle.color,
          fontFamily: FONT_FAMILY_CSS[labelStyle.fontFamily],
          zIndex: 51,
        }}
      >
        {displayLabel}
      </span>
    </>
  );
}
