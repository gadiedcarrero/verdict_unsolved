import type { Scene } from '../../game-engine/scene-engine/schemas';
import type { EditableRect } from './EditableBox';

export type EditableObject = {
  id: string;
  /** 'sprite' = tiene su propia capa/imagen. 'fixed' = solo hotspot, la imagen ya está pintada en el fondo. */
  kind: 'sprite' | 'fixed';
  rect: EditableRect;
  /** Para 'sprite': si existe un hotspot con el mismo id. Para 'fixed': siempre true (no existiría si no). */
  interactable: boolean;
};

/**
 * Une capas y hotspots en una sola lista de "objetos" para el editor visual:
 * cuando una capa y un hotspot comparten id, se editan como una sola caja
 * (misma posición para el arte y la zona clicable) en vez de dos separadas.
 */
export function buildEditableObjects(scene: Scene): EditableObject[] {
  const hotspotIds = new Set(scene.hotspots.map((h) => h.id));
  const layerIds = new Set(scene.layers.map((l) => l.id));

  const spriteObjects: EditableObject[] = scene.layers.map((layer) => ({
    id: layer.id,
    kind: 'sprite',
    rect: { x: layer.x, y: layer.y, width: layer.width ?? 10, height: layer.height ?? 10 },
    interactable: hotspotIds.has(layer.id),
  }));

  const fixedObjects: EditableObject[] = scene.hotspots
    .filter((hotspot) => !layerIds.has(hotspot.id))
    .map((hotspot) => ({
      id: hotspot.id,
      kind: 'fixed',
      rect: hotspot.area,
      interactable: true,
    }));

  return [...spriteObjects, ...fixedObjects];
}
