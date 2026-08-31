import type {
  Hotspot,
  HotspotShape,
  InteractWithTarget,
  PolygonPoint,
  Scene,
  SceneAction,
  TextStyleOverride,
} from '../../game-engine/scene-engine/schemas';
import { resolveLabelPosition } from '../hotspotLabel';
import type { EditableRect } from './EditableBox';

export type EditableObject = {
  id: string;
  /** 'sprite' = tiene su propia capa/imagen. 'zone' = solo una zona sobre el fondo, sin imagen aparte. */
  kind: 'sprite' | 'zone';
  rect: EditableRect;
  /** Si existe un hotspot para este id, su valor de `interactable`. Si no
   * existe ningún hotspot todavía (capa puramente decorativa), false. */
  interactable: boolean;
  /** Clave de traducción del hotspot (label), o null si todavía no tiene uno. */
  labelKey: string | null;
  /** 'rect' para sprites (las capas siempre son rectangulares) o zonas sin
   * forma libre todavía. 'polygon' solo puede darse en una zona (hotspot). */
  shape: HotspotShape;
  /** Solo si `shape === 'polygon'`. */
  points: PolygonPoint[] | null;
  /** Override de tipografía del tooltip para este hotspot, si tiene. */
  labelStyle: TextStyleOverride | undefined;
  /** Dónde se ancla el tooltip (automático o arrastrado a mano), null si
   * todavía no hay hotspot. */
  labelPosition: PolygonPoint | null;
  /** Si es true, un click abre el menú de acción (Examinar/Interactuar/
   * Interactuar con/Cerrar) en vez de correr `onInteract` directo. false en
   * objetos sin hotspot todavía. */
  actionMenuEnabled: boolean;
  onInteract: SceneAction[];
  onExamine: SceneAction[];
  interactWithTargets: InteractWithTarget[];
};

/**
 * Une capas y hotspots en una sola lista de "objetos" para el editor visual:
 * cuando una capa y un hotspot comparten id, se editan como una sola caja
 * (misma posición para el arte y la zona clicable) en vez de dos separadas.
 * Los hotspots sin capa (zonas puras sobre el fondo, creadas a mano en el
 * editor) aparecen igual, marcados como 'zone'. `hotspots` es el del fondo
 * que se está editando ahora mismo (ver SceneBackground.hotspots) — no de
 * la escena entera, ya que cada fondo tiene las suyas.
 */
export function buildEditableObjects(scene: Scene, hotspots: Hotspot[]): EditableObject[] {
  const hotspotById = new Map(hotspots.map((h) => [h.id, h]));
  const layerIds = new Set(scene.layers.map((l) => l.id));

  const spriteObjects: EditableObject[] = scene.layers.map((layer) => {
    const hotspot = hotspotById.get(layer.id);
    return {
      id: layer.id,
      kind: 'sprite',
      rect: { x: layer.x, y: layer.y, width: layer.width ?? 10, height: layer.height ?? 10 },
      interactable: hotspot?.interactable ?? false,
      labelKey: hotspot?.label ?? null,
      shape: 'rect',
      points: null,
      labelStyle: hotspot?.labelStyle,
      labelPosition: hotspot ? resolveLabelPosition(hotspot) : null,
      actionMenuEnabled: hotspot?.actionMenuEnabled ?? false,
      onInteract: hotspot?.onInteract ?? [],
      onExamine: hotspot?.onExamine ?? [],
      interactWithTargets: hotspot?.interactWithTargets ?? [],
    };
  });

  const zoneObjects: EditableObject[] = hotspots
    .filter((hotspot) => !layerIds.has(hotspot.id))
    .map((hotspot) => ({
      id: hotspot.id,
      kind: 'zone',
      rect: hotspot.area,
      interactable: hotspot.interactable,
      labelKey: hotspot.label,
      shape: hotspot.shape,
      points: hotspot.points ?? null,
      labelStyle: hotspot.labelStyle,
      labelPosition: resolveLabelPosition(hotspot),
      actionMenuEnabled: hotspot.actionMenuEnabled,
      onInteract: hotspot.onInteract,
      onExamine: hotspot.onExamine,
      interactWithTargets: hotspot.interactWithTargets,
    }));

  return [...spriteObjects, ...zoneObjects];
}
