import { useRef, type JSX, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export type EditableRect = { x: number; y: number; width: number; height: number };

const MIN_SIZE_PCT = 2;

/**
 * Rectángulo arrastrable/redimensionable sobre el stage de la escena, usado
 * por el modo edición (ver AdventureRuntime). Convierte movimiento de mouse
 * en píxeles a delta en porcentaje usando el tamaño real del stage, así que
 * funciona igual sin importar cuánto se haya achicado/agrandado la ventana.
 */
export function EditableBox({
  rect,
  stageRef,
  label,
  colorClassName,
  onChange,
}: {
  rect: EditableRect;
  stageRef: RefObject<HTMLDivElement | null>;
  label: string;
  colorClassName: string;
  onChange: (rect: EditableRect) => void;
}): JSX.Element {
  const drag = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; orig: EditableRect } | null>(null);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>, mode: 'move' | 'resize'): void {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, startX: event.clientX, startY: event.clientY, orig: rect };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const state = drag.current;
    const stageEl = stageRef.current;
    if (!state || !stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    const dxPct = ((event.clientX - state.startX) / stageRect.width) * 100;
    const dyPct = ((event.clientY - state.startY) / stageRect.height) * 100;

    if (state.mode === 'move') {
      onChange({ ...state.orig, x: state.orig.x + dxPct, y: state.orig.y + dyPct });
    } else {
      onChange({
        ...state.orig,
        width: Math.max(MIN_SIZE_PCT, state.orig.width + dxPct),
        height: Math.max(MIN_SIZE_PCT, state.orig.height + dyPct),
      });
    }
  }

  function endDrag(): void {
    drag.current = null;
  }

  return (
    <div
      className={`absolute cursor-move touch-none border-2 border-dashed ${colorClassName}`}
      style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%`, zIndex: 200 }}
      onPointerDown={(event) => beginDrag(event, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span className="pointer-events-none absolute -top-5 left-0 rounded bg-graphite-950/90 px-1 text-[9px] whitespace-nowrap text-graphite-100">
        {label} — x{rect.x.toFixed(1)} y{rect.y.toFixed(1)} w{rect.width.toFixed(1)} h{rect.height.toFixed(1)}
      </span>
      <div
        className="absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize touch-none bg-amber-accent"
        onPointerDown={(event) => beginDrag(event, 'resize')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </div>
  );
}
