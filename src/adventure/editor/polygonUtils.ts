import type { PolygonPoint } from '../../game-engine/scene-engine/schemas';
import type { EditableRect } from './EditableBox';

/** Rectángulo mínimo que contiene todos los puntos — se guarda como
 * `Hotspot.area` incluso para zonas poligonales (posición del tooltip,
 * compat con herramientas que todavía esperan un bounding box). */
export function boundingBoxOfPoints(points: PolygonPoint[]): EditableRect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}
