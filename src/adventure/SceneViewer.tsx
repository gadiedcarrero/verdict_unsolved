import type { JSX } from 'react';
import type { Hotspot as HotspotData, Scene } from '../game-engine/scene-engine/schemas';
import { HotspotArea } from './Hotspot';
import { PlaceholderLayer } from './PlaceholderLayer';

export function SceneViewer({
  scene,
  transitioning,
  layerOverrides,
  onInteract,
}: {
  scene: Scene;
  transitioning: boolean;
  /** assetPath alternativo por layer id (p. ej. el teléfono cambia de imagen mientras suena). */
  layerOverrides?: Record<string, string> | undefined;
  onInteract: (hotspot: HotspotData) => void;
}): JSX.Element {
  return (
    <div className="relative h-full w-full overflow-hidden bg-graphite-950">
      <PlaceholderLayer assetPath={scene.background} className="absolute inset-0 h-full w-full object-cover" />

      {[...scene.layers]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((layer) => (
          <PlaceholderLayer
            key={layer.id}
            assetPath={layerOverrides?.[layer.id] ?? layer.assetPath}
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

      {scene.hotspots.map((hotspot) => (
        <HotspotArea key={hotspot.id} hotspot={hotspot} onInteract={onInteract} />
      ))}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-graphite-950 transition-opacity duration-500"
        style={{ opacity: transitioning ? 1 : 0 }}
      />
    </div>
  );
}
