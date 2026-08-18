import type { JSX } from 'react';
import type { Scene } from '../../game-engine/scene-engine/schemas';
import type { EditableRect } from './EditableBox';

function RectFields({
  label,
  rect,
  onChange,
}: {
  label: string;
  rect: EditableRect;
  onChange: (rect: EditableRect) => void;
}): JSX.Element {
  return (
    <div className="mb-2 border-b border-graphite-800 pb-2">
      <p className="mb-1 truncate text-graphite-100">{label}</p>
      <div className="grid grid-cols-4 gap-1">
        {(['x', 'y', 'width', 'height'] as const).map((key) => (
          <label key={key} className="flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">{key}</span>
            <input
              type="number"
              step={0.5}
              value={Math.round(rect[key] * 10) / 10}
              onChange={(event) => onChange({ ...rect, [key]: Number(event.target.value) })}
              className="w-full rounded border border-graphite-700 bg-graphite-900 px-1 py-0.5 text-[10px] text-graphite-100"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function SceneEditorPanel({
  scene,
  onLayerRectChange,
  onHotspotRectChange,
  onSave,
  onDiscard,
  hasChanges,
  saving,
  saveMessage,
}: {
  scene: Scene;
  onLayerRectChange: (layerId: string, rect: EditableRect) => void;
  onHotspotRectChange: (hotspotId: string, rect: EditableRect) => void;
  onSave: () => void;
  onDiscard: () => void;
  hasChanges: boolean;
  saving: boolean;
  saveMessage: string | null;
}): JSX.Element {
  return (
    <div className="absolute top-4 left-4 z-300 max-h-[calc(100%-2rem)] w-72 overflow-y-auto rounded border border-graphite-700 bg-graphite-950/95 p-3 text-xs text-graphite-200 shadow-2xl">
      <p className="mb-1 text-[11px] font-semibold tracking-widest text-amber-accent uppercase">Editor de posiciones</p>
      <p className="mb-3 text-[10px] text-graphite-400">
        Arrastrá los objetos en la escena (ámbar = capas, celeste = hotspots) o ajustá los números acá. No cambia nada
        hasta que aprietes Guardar.
      </p>

      {scene.layers.map((layer) => (
        <RectFields
          key={layer.id}
          label={layer.id}
          rect={{ x: layer.x, y: layer.y, width: layer.width ?? 10, height: layer.height ?? 10 }}
          onChange={(rect) => onLayerRectChange(layer.id, rect)}
        />
      ))}

      <p className="mt-3 mb-1 text-[10px] font-semibold text-sky-400 uppercase">Hotspots</p>
      {scene.hotspots.map((hotspot) => (
        <RectFields key={hotspot.id} label={hotspot.id} rect={hotspot.area} onChange={(rect) => onHotspotRectChange(hotspot.id, rect)} />
      ))}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || saving}
          className="rounded border border-amber-accent px-3 py-1.5 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={!hasChanges}
          className="rounded border border-graphite-700 px-3 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Descartar
        </button>
      </div>
      {saveMessage && <p className="mt-2 text-[10px] text-graphite-300">{saveMessage}</p>}
    </div>
  );
}
