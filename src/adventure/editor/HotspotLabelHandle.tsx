import { useRef, type CSSProperties, type JSX, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { PolygonPoint, TextStyle } from '../../game-engine/scene-engine/schemas';

const FONT_FAMILY_CLASSES: Record<TextStyle['fontFamily'], string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

/**
 * Preview arrastrable del tooltip de un hotspot — a diferencia del juego
 * real (que solo se ve al pasar el mouse), en el editor queda siempre
 * visible con su texto/tipografía real, para poder ver dónde va a salir y
 * arrastrarlo a otro lado (se guarda en Hotspot.labelOffset).
 */
export function HotspotLabelHandle({
  position,
  text,
  labelStyle,
  stageRef,
  onChange,
}: {
  position: PolygonPoint;
  text: string;
  labelStyle: TextStyle;
  stageRef: RefObject<HTMLDivElement | null>;
  onChange: (position: PolygonPoint) => void;
}): JSX.Element {
  const dragging = useRef(false);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!dragging.current) return;
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    onChange({ x, y });
  }

  function endDrag(): void {
    dragging.current = false;
  }

  const style: CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: 'translate(-50%, -140%)',
    fontSize: `${labelStyle.fontSize}px`,
    color: labelStyle.color,
    zIndex: 260,
  };

  return (
    <div
      className={`absolute cursor-move touch-none rounded border border-dashed border-sky-400 bg-graphite-950/90 px-2 py-1 whitespace-nowrap ${FONT_FAMILY_CLASSES[labelStyle.fontFamily]}`}
      style={style}
      onPointerDown={beginDrag}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {text}
    </div>
  );
}
