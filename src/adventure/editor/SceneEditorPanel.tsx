import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type { Scene } from '../../game-engine/scene-engine/schemas';
import type { EditableObject } from './editableObjects';
import { buildEditableObjects } from './editableObjects';
import type { EditableRect } from './EditableBox';

const CASE_ASSET_BASE = '/cases/case-001-la-ultima-llamada';
const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function SceneSwitcher({
  sceneOptions,
  activeSceneId,
  creatingScene,
  onSwitchScene,
  onCreateScene,
}: {
  sceneOptions: { id: string; act: number }[];
  activeSceneId: string;
  creatingScene: boolean;
  onSwitchScene: (sceneId: string) => void;
  onCreateScene: (name: string, act: number) => void;
}): JSX.Element {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [act, setAct] = useState(1);

  function submit(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateScene(trimmed, act);
    setName('');
    setAct(1);
    setCreating(false);
  }

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Editando escena</span>
        <select
          value={activeSceneId}
          onChange={(event) => onSwitchScene(event.target.value)}
          className={inputClassName}
        >
          {sceneOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id} (acto {option.act})
            </option>
          ))}
        </select>
      </label>

      {creating ? (
        <div className="rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
          <label className="mb-1 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Nombre (id interno)</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
          </label>
          <label className="mb-2 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Acto</span>
            <input
              type="number"
              min={1}
              value={act}
              onChange={(event) => setAct(Number(event.target.value))}
              className={inputClassName}
            />
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim() || creatingScene}
              className="flex-1 rounded border border-amber-accent px-2 py-1 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creatingScene ? 'Creando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded border border-graphite-700 px-2 py-1 text-[10px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full rounded border border-graphite-700 px-2 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          + Crear nueva escena
        </button>
      )}
    </div>
  );
}

function BackgroundThumb({
  assetPath,
  label,
  onRemove,
}: {
  assetPath: string;
  label: string;
  onRemove: () => void;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative shrink-0">
      {failed ? (
        <div className="flex h-14 w-24 items-center justify-center rounded border border-dashed border-graphite-600 bg-graphite-800/70 text-[8px] text-graphite-500">
          sin imagen
        </div>
      ) : (
        <img
          src={`${CASE_ASSET_BASE}/${assetPath}`}
          alt=""
          onError={() => setFailed(true)}
          className="h-14 w-24 rounded border border-graphite-700 object-cover"
        />
      )}
      <span className="absolute top-0.5 left-0.5 rounded bg-graphite-950/80 px-1 text-[8px] tracking-widest text-amber-accent uppercase">
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 rounded bg-graphite-950/80 px-1 text-[8px] text-graphite-300 hover:text-amber-accent"
      >
        ✕
      </button>
    </div>
  );
}

function BackgroundsSection({
  scene,
  uploading,
  onAddBackground,
  onRemoveBackground,
}: {
  scene: Scene;
  uploading: boolean;
  onAddBackground: (file: File) => void;
  onRemoveBackground: (bgId: string) => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onAddBackground(file);
    event.target.value = '';
  }

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Fondos</p>
      <p className="mb-2 text-[9px] text-graphite-500">
        El primero (BG 1) es el que se ve por defecto. Vincular cada fondo a un objeto/estado se hace más adelante.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        {scene.backgrounds.map((bg, index) => (
          <BackgroundThumb
            key={bg.id}
            assetPath={bg.assetPath}
            label={`BG ${index + 1}`}
            onRemove={() => onRemoveBackground(bg.id)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded border border-graphite-700 px-2 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
      >
        {uploading ? 'Subiendo...' : '+ Agregar fondo'}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}

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
  sceneOptions,
  activeSceneId,
  creatingScene,
  uploadingBackground,
  onSwitchScene,
  onCreateScene,
  onAddBackground,
  onRemoveBackground,
  onObjectRectChange,
  onToggleInteractable,
  onLabelTextChange,
  onCreateZone,
}: {
  scene: Scene | null;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  activeSceneId: string;
  creatingScene: boolean;
  uploadingBackground: boolean;
  onSwitchScene: (sceneId: string) => void;
  onCreateScene: (name: string, act: number) => void;
  onAddBackground: (file: File) => void;
  onRemoveBackground: (bgId: string) => void;
  onObjectRectChange: (objectId: string, rect: EditableRect) => void;
  onToggleInteractable: (objectId: string, interactable: boolean) => void;
  onLabelTextChange: (labelKey: string, text: string) => void;
  onCreateZone: (name: string, labelText: string, interactable: boolean) => void;
}): JSX.Element {
  return (
    <div className="text-xs text-graphite-200">
      <SceneSwitcher
        sceneOptions={sceneOptions}
        activeSceneId={activeSceneId}
        creatingScene={creatingScene}
        onSwitchScene={onSwitchScene}
        onCreateScene={onCreateScene}
      />

      {scene === null ? (
        <p className="text-[10px] text-graphite-500">
          No hay ninguna escena todavía — creá una desde arriba para empezar a editarla.
        </p>
      ) : (
        <>
          <BackgroundsSection
            scene={scene}
            uploading={uploadingBackground}
            onAddBackground={onAddBackground}
            onRemoveBackground={onRemoveBackground}
          />

          <p className="mb-3 text-[10px] text-graphite-400">
            <span className="text-amber-accent">Ámbar</span> = objeto con imagen propia.{' '}
            <span className="text-sky-400">Celeste</span> = zona sin imagen aparte. Nada cambia hasta que aprietes
            Guardar.
          </p>

          <CreateZoneForm onCreate={onCreateZone} />

          {buildEditableObjects(scene).map((object) => (
            <ObjectFields
              key={object.id}
              object={object}
              strings={strings}
              onRectChange={(rect) => onObjectRectChange(object.id, rect)}
              onInteractableChange={(interactable) => onToggleInteractable(object.id, interactable)}
              onLabelTextChange={(text) =>
                onLabelTextChange(object.labelKey ?? `hotspot.${scene.id}.${object.id}`, text)
              }
            />
          ))}
        </>
      )}
    </div>
  );
}
