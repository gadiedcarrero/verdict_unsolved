import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type { Character } from '../../game-engine/scene-engine/schemas';

const CASE_ASSET_BASE = '/cases/case-001-la-ultima-llamada';
const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function PortraitPreview({ portrait }: { portrait: string | null }): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (!portrait || failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-graphite-600 text-[8px] text-graphite-500">
        sin foto
      </div>
    );
  }
  return (
    <img
      src={`${CASE_ASSET_BASE}/${portrait}`}
      alt=""
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full border border-graphite-700 object-cover"
    />
  );
}

function CharacterFields({
  character,
  strings,
  onNameTextChange,
  onColorChange,
  onUploadPortrait,
  uploading,
}: {
  character: Character;
  strings: Record<string, string>;
  onNameTextChange: (text: string) => void;
  onColorChange: (color: string) => void;
  onUploadPortrait: (file: File) => void;
  uploading: boolean;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onUploadPortrait(file);
    event.target.value = '';
  }

  return (
    <div className="mb-2 flex gap-2 border-b border-graphite-800 pb-2">
      <PortraitPreview portrait={character.portrait} />
      <div className="min-w-0 flex-1">
        <p className="mb-1 truncate text-graphite-100">{character.id}</p>
        <label className="mb-1 flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Nombre mostrado</span>
          <input
            type="text"
            value={strings[character.name] ?? translate(strings, character.name)}
            onChange={(event) => onNameTextChange(event.target.value)}
            className={inputClassName}
          />
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] text-graphite-400">
            color
            <input
              type="color"
              value={character.color}
              onChange={(event) => onColorChange(event.target.value)}
              className="h-5 w-8 cursor-pointer rounded border border-graphite-700 bg-graphite-900"
            />
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
          >
            {uploading ? 'Subiendo...' : 'Subir retrato'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>
    </div>
  );
}

function CreateCharacterForm({
  onCreate,
}: {
  onCreate: (name: string, nameText: string, color: string) => void;
}): JSX.Element {
  const [name, setName] = useState('');
  const [nameText, setNameText] = useState('');
  const [color, setColor] = useState('#e0a636');

  function submit(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, nameText.trim() || trimmed.toUpperCase(), color);
    setName('');
    setNameText('');
    setColor('#e0a636');
  }

  return (
    <div className="mb-3 rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-amber-accent uppercase">+ Agregar personaje</p>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Nombre (id interno)</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
      </label>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Nombre mostrado</span>
        <input
          type="text"
          value={nameText}
          onChange={(event) => setNameText(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="mb-2 flex items-center gap-1 text-[9px] text-graphite-400">
        color
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-5 w-8 cursor-pointer rounded border border-graphite-700 bg-graphite-900"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="w-full rounded border border-amber-accent px-2 py-1 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
      >
        Crear
      </button>
    </div>
  );
}

export function CharacterEditorPanel({
  characters,
  strings,
  uploadingId,
  onNameTextChange,
  onColorChange,
  onUploadPortrait,
  onCreateCharacter,
  onSave,
  onDiscard,
  hasChanges,
  saving,
  saveMessage,
}: {
  characters: Character[];
  strings: Record<string, string>;
  uploadingId: string | null;
  onNameTextChange: (characterId: string, nameKey: string, text: string) => void;
  onColorChange: (characterId: string, color: string) => void;
  onUploadPortrait: (characterId: string, file: File) => void;
  onCreateCharacter: (name: string, nameText: string, color: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  hasChanges: boolean;
  saving: boolean;
  saveMessage: string | null;
}): JSX.Element {
  return (
    <div className="text-xs text-graphite-200">
      <p className="mb-3 text-[10px] text-graphite-400">
        El retrato y el color se usan en cualquier diálogo donde este personaje sea el que habla, en toda la novela.
        Nada cambia hasta que aprietes Guardar.
      </p>

      <CreateCharacterForm onCreate={onCreateCharacter} />

      {characters.map((character) => (
        <CharacterFields
          key={character.id}
          character={character}
          strings={strings}
          uploading={uploadingId === character.id}
          onNameTextChange={(text) => onNameTextChange(character.id, character.name, text)}
          onColorChange={(color) => onColorChange(character.id, color)}
          onUploadPortrait={(file) => onUploadPortrait(character.id, file)}
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
