import { useRef, useState, type JSX, type ReactNode } from 'react';
import type { Hotspot as HotspotData, Scene } from '../game-engine/scene-engine/schemas';
import { translate } from '../i18n/translate';
import { buildEditableObjects } from './editor/editableObjects';
import { EditableBox, type EditableRect } from './editor/EditableBox';
import { HotspotArea } from './Hotspot';
import { PlaceholderLayer } from './PlaceholderLayer';
import { useStageSize } from './useStageSize';

export function SceneViewer({
  gameId,
  scene,
  strings,
  transitioning,
  layerOverrides,
  onInteract,
  children,
  editMode = false,
  onObjectRectChange,
}: {
  gameId: string;
  scene: Scene;
  /** Diccionario clave → texto (locales/es.json del caso). */
  strings: Record<string, string>;
  transitioning: boolean;
  /** assetPath alternativo por layer id (p. ej. el teléfono cambia de imagen mientras suena). */
  layerOverrides?: Record<string, string> | undefined;
  onInteract: (hotspot: HotspotData) => void;
  /** Diálogo/interfaces: deben compartir el mismo stage que la escena, no la ventana completa. */
  children?: ReactNode;
  /** Modo edición: arrastrar/redimensionar objetos (capa + hotspot con el mismo id, juntos) directamente sobre la escena. */
  editMode?: boolean;
  onObjectRectChange?: (objectId: string, rect: EditableRect) => void;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { width, height } = useStageSize(containerRef);

  // Id del hotspot bajo el cursor: si coincide con el id de una capa, esa
  // capa se ilumina (drop-shadow sobre su propia silueta transparente) en
  // vez de dibujar un rectángulo alrededor del hotspot.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeBackground = scene.backgrounds[0];

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center bg-graphite-950">
      <div ref={stageRef} className="relative overflow-hidden bg-graphite-950" style={{ width, height }}>
        {activeBackground ? (
          <PlaceholderLayer
            gameId={gameId}
            assetPath={activeBackground.assetPath}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-graphite-600 uppercase">
            Sin fondo — agregá uno en el editor
          </div>
        )}

        {[...scene.layers]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => (
            <PlaceholderLayer
              key={layer.id}
              gameId={gameId}
              assetPath={layerOverrides?.[layer.id] ?? layer.assetPath}
              glow={hoveredId === layer.id}
              className="absolute object-contain"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: layer.width ? `${layer.width}%` : undefined,
                height: layer.height ? `${layer.height}%` : undefined,
                zIndex: layer.zIndex,
              }}
            />
          ))}

        {!editMode &&
          scene.hotspots
            .filter((hotspot) => hotspot.interactable)
            .map((hotspot) => (
              <HotspotArea
                key={hotspot.id}
                hotspot={hotspot}
                strings={strings}
                onInteract={onInteract}
                onHoverChange={(hovering) => setHoveredId(hovering ? hotspot.id : null)}
              />
            ))}

        {editMode &&
          onObjectRectChange &&
          buildEditableObjects(scene).map((object) => (
            <EditableBox
              key={object.id}
              label={`${object.labelKey ? translate(strings, object.labelKey) : object.id}${object.interactable ? '' : ' · no interactuable'}`}
              colorClassName={object.kind === 'zone' ? 'border-sky-400' : 'border-amber-accent'}
              rect={object.rect}
              stageRef={stageRef}
              onChange={(rect) => onObjectRectChange(object.id, rect)}
            />
          ))}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-graphite-950 transition-opacity duration-500"
          style={{ opacity: transitioning ? 1 : 0 }}
        />

        {children}
      </div>
    </div>
  );
}
