import { useRef, type JSX, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { PolygonPoint } from '../../game-engine/scene-engine/schemas';

const CLOSE_THRESHOLD_PCT = 3;

/**
 * Zona de forma libre (como un path de Illustrator): en vez de arrastrar un
 * rectángulo, se van agregando vértices a click. Dos modos:
 * - `closed: false` (trazando): cada click sobre el stage agrega un punto;
 *   un click cerca del primero (con >=3 puntos ya puestos) cierra la forma.
 * - `closed: true` (ya creada): cada vértice es un círculo arrastrable para
 *   ajustar la forma después de cerrada.
 */
export function PolygonPointEditor({
  points,
  closed,
  stageRef,
  label,
  onChange,
  onAddPoint,
  onClose,
}: {
  points: PolygonPoint[];
  closed: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  label?: string;
  /** Solo si closed: mover un vértice existente. */
  onChange?: (points: PolygonPoint[]) => void;
  /** Solo si !closed: agregar un punto nuevo al final. */
  onAddPoint?: (point: PolygonPoint) => void;
  /** Solo si !closed: cerrar la forma (clic cerca del primer punto). */
  onClose?: () => void;
}): JSX.Element {
  const dragIndex = useRef<number | null>(null);

  function stagePercentFromEvent(event: { clientX: number; clientY: number }): PolygonPoint | null {
    const stageEl = stageRef.current;
    if (!stageEl) return null;
    const rect = stageEl.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handleStageClick(event: ReactPointerEvent<HTMLDivElement>): void {
    if (closed || !onAddPoint) return;
    const point = stagePercentFromEvent(event);
    if (!point) return;
    const first = points[0];
    if (points.length >= 3 && first && Math.hypot(point.x - first.x, point.y - first.y) <= CLOSE_THRESHOLD_PCT) {
      onClose?.();
      return;
    }
    onAddPoint(point);
  }

  function beginVertexDrag(event: ReactPointerEvent<HTMLDivElement>, index: number): void {
    if (!closed) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragIndex.current = index;
  }

  function onVertexPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const index = dragIndex.current;
    if (index === null || !onChange) return;
    const point = stagePercentFromEvent(event);
    if (!point) return;
    onChange(points.map((p, i) => (i === index ? point : p)));
  }

  function endVertexDrag(): void {
    dragIndex.current = null;
  }

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 250, cursor: closed ? 'default' : 'crosshair' }}
      onPointerDown={closed ? undefined : handleStageClick}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.length >= 2 &&
          (closed ? (
            <polygon
              points={pointsAttr}
              fill="rgba(224,166,54,0.15)"
              stroke="#e0a636"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <polyline
              points={pointsAttr}
              fill="none"
              stroke="#e0a636"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </svg>

      {label && points[0] && (
        <span
          className="pointer-events-none absolute rounded bg-graphite-950/90 px-1 text-[9px] whitespace-nowrap text-graphite-100"
          style={{ left: `${points[0].x}%`, top: `${points[0].y}%`, transform: 'translate(4px, -140%)' }}
        >
          {label}
        </span>
      )}

      {points.map((point, index) => (
        <div
          key={index}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-graphite-950 bg-amber-accent"
          style={{ left: `${point.x}%`, top: `${point.y}%`, cursor: closed ? 'grab' : 'default' }}
          onPointerDown={(event) => beginVertexDrag(event, index)}
          onPointerMove={onVertexPointerMove}
          onPointerUp={endVertexDrag}
          onPointerCancel={endVertexDrag}
        />
      ))}
    </div>
  );
}
