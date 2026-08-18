import type { JSX } from 'react';
import type { Scene } from '../../game-engine/scene-engine/schemas';
import type { EditableObject } from './editableObjects';
import { buildEditableObjects } from './editableObjects';
import type { EditableRect } from './EditableBox';

function ObjectFields({
  object,
  onRectChange,
  onInteractableChange,
}: {
  object: EditableObject;
  onRectChange: (rect: EditableRect) => void;
  onInteractableChange: (interactable: boolean) => void;
}): JSX.Element {
  return (
    <div className="mb-2 border-b border-graphite-800 pb-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-graphite-100">
          {object.id}
          {object.kind === 'fixed' && <span className="ml-1 text-sky-400">· fijo</span>}
        </p>
        {object.kind === 'sprite' && (
          <label className="flex shrink-0 items-center gap-1 text-[9px] text-graphite-400">
            <input
              type="checkbox"
              checked={object.interactable}
              onChange={(event) => onInteractableChange(event.target.checked)}
            />
            interactuable
          </label>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {(['x', 'y', 'width', 'height'] as const).map((key) => (
          <label key={key} className="flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">{key}</span>
            <input
              type="number"
              step={0.5}
              value={Math.round(object.rect[key] * 10) / 10}
              onChange={(event) => onRectChange({ ...object.rect, [key]: Number(event.target.value) })}
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
  onObjectRectChange,
  onToggleInteractable,
  onSave,
  onDiscard,
  hasChanges,
  saving,
  saveMessage,
}: {
  scene: Scene;
  onObjectRectChange: (objectId: string, rect: EditableRect) => void;
  onToggleInteractable: (objectId: string, interactable: boolean) => void;
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
        <span className="text-amber-accent">Ámbar</span> = objeto con imagen propia (mueve la imagen y su zona clicable
        juntas). <span className="text-sky-400">Celeste</span> = zona fija sin imagen aparte, ya pintada en el fondo.
        Nada cambia hasta que aprietes Guardar.
      </p>

      {buildEditableObjects(scene).map((object) => (
        <ObjectFields
          key={object.id}
          object={object}
          onRectChange={(rect) => onObjectRectChange(object.id, rect)}
          onInteractableChange={(interactable) => onToggleInteractable(object.id, interactable)}
        />
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
