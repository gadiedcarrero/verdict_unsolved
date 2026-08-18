import type { Hotspot } from '../game-engine/scene-engine/schemas';

/**
 * Dónde ancla el tooltip de un hotspot, en % del stage. Por defecto es el
 * centro-arriba de su bounding box (`area`, que para "polygon" ya es el
 * rectángulo que contiene todos los puntos) — pero se puede arrastrar a
 * cualquier lado desde el editor, y esa posición se guarda en
 * `Hotspot.labelOffset`.
 */
export function resolveLabelPosition(hotspot: Hotspot): { x: number; y: number } {
  if (hotspot.labelOffset) return hotspot.labelOffset;
  return { x: hotspot.area.x + hotspot.area.width / 2, y: hotspot.area.y };
}
