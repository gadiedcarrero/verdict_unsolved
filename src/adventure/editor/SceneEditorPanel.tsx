import { useState, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type { Scene } from '../../game-engine/scene-engine/schemas';
import type { EditableObject } from './editableObjects';
import { buildEditableObjects } from './editableObjects';
import type { EditableRect } from './EditableBox';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function ObjectFields({
  object,
  strings,
  onRectChange,
  onInteractableChange,
  onLabelTextChange,
}: {
  object: EditableObject;
  strings: Record<string, string>;
  onRectChange: (rect: EditableRect) => void;
  onInteractableChange: (interactable: boolean) => void;
  onLabelTextChange: (text: string) => void;
}): JSX.Element {
  return (
    <div className="mb-2 border-b border-graphite-800 pb-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-graphite-100">
          {object.id}
          {object.kind === 'zone' && <span className="ml-1 text-sky-400">· zona</span>}
        </p>
        <label className="flex shrink-0 items-center gap-1 text-[9px] text-graphite-400">
          <input type="checkbox" checked={object.interactable} onChange={(event) => onInteractableChange(event.target.checked)} />
          interactuable
        </label>
      </div>

      {object.labelKey && (
        <label className="mb-1 flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Texto al pasar el mouse</span>
          <input
            type="text"
            value={strings[object.labelKey] ?? translate(strings, object.labelKey)}
            onChange={(event) => onLabelTextChange(event.target.value)}
            className={inputClassName}
          />
        </label>
      )}

      <div className="grid grid-cols-4 gap-1">
        {(['x', 'y', 'width', 'height'] as const).map((key) => (
          <label key={key} className="flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">{key}</span>
            <input
              type="number"
              step={0.5}
              value={Math.round(object.rect[key] * 10) / 10}
              onChange={(event) => onRectChange({ ...object.rect, [key]: Number(event.target.value) })}
              className={inputClassName}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function CreateZoneForm({
  onCreate,
}: {
  onCreate: (name: string, labelText: string, interactable: boolean) => void;
}): JSX.Element {
  const [name, setName] = useState('');
  const [labelText, setLabelText] = useState('');
  const [interactable, setInteractable] = useState(true);

  function submit(): void {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate(trimmedName, labelText.trim() || trimmedName, interactable);
    setName('');
    setLabelText('');
    setInteractable(true);
  }

  return (
    <div className="mb-3 rounded border border-sky-400/40 bg-graphite-900/60 p-2">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-sky-400 uppercase">+ Crear zona nueva</p>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Nombre (id interno)</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
      </label>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Texto al pasar el mouse</span>
        <input
          type="text"
          value={labelText}
          onChange={(event) => setLabelText(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="mb-2 flex items-center gap-1 text-[9px] text-graphite-400">
        <input type="checkbox" checked={interactable} onChange={(event) => setInteractable(event.target.checked)} />
        interactuable
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="w-full rounded border border-sky-400 px-2 py-1 text-[10px] font-semibold tracking-widest text-sky-400 uppercase transition-colors hover:bg-sky-400 hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-sky-400"
      >
        Crear
      </button>
    </div>
  );
}

export function SceneEditorPanel({
  scene,
  strings,
  onObjectRectChange,
  onToggleInteractable,
  onLabelTextChange,
  onCreateZone,
  onSave,
  onDiscard,
  hasChanges,
  saving,
  saveMessage,
}: {
  scene: Scene;
  strings: Record<string, string>;
  onObjectRectChange: (objectId: string, rect: EditableRect) => void;
  onToggleInteractable: (objectId: string, interactable: boolean) => void;
  onLabelTextChange: (labelKey: string, text: string) => void;
  onCreateZone: (name: string, labelText: string, interactable: boolean) => void;
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
        <span className="text-amber-accent">Ámbar</span> = objeto con imagen propia. <span className="text-sky-400">Celeste</span> = zona
        sin imagen aparte. Nada cambia hasta que aprietes Guardar.
      </p>

      <CreateZoneForm onCreate={onCreateZone} />

      {buildEditableObjects(scene).map((object) => (
        <ObjectFields
          key={object.id}
          object={object}
          strings={strings}
          onRectChange={(rect) => onObjectRectChange(object.id, rect)}
          onInteractableChange={(interactable) => onToggleInteractable(object.id, interactable)}
          onLabelTextChange={(text) => onLabelTextChange(object.labelKey ?? `hotspot.${scene.id}.${object.id}`, text)}
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
