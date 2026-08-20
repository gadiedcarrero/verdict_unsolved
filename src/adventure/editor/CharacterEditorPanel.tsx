import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type { Character } from '../../game-engine/scene-engine/schemas';
import { gameAssetUrl } from '../gameAssetUrl';
import { slugify } from './slug';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function PortraitPreview({ gameId, portrait }: { gameId: string; portrait: string | null }): JSX.Element {
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
      src={gameAssetUrl(gameId, portrait)}
      alt=""
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full border border-graphite-700 object-cover"
    />
  );
}

/** Cada personaje puede tener variantes de retrato además del "por
 * defecto" (enojado, sonriendo...), referenciadas desde un diálogo puntual
 * vía DialogueNode.portraitExpression — ver ActionComposer en
 * SceneEditorPanel.tsx. El nombre de la expresión es libre pero se
 * normaliza a slug para no chocar con el patrón de nombre de archivo. */
function ExpressionsFields({
  gameId,
  character,
  uploadingKey,
  onUploadExpression,
  onRemoveExpression,
}: {
  gameId: string;
  character: Character;
  uploadingKey: string | null;
  onUploadExpression: (expressionKey: string, file: File) => void;
  onRemoveExpression: (expressionKey: string) => void;
}): JSX.Element {
  const [newKey, setNewKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entries = Object.entries(character.expressions);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    const key = slugify(newKey);
    if (file && newKey.trim()) onUploadExpression(key, file);
    event.target.value = '';
    setNewKey('');
  }

  return (
    <div className="mt-2 border-t border-graphite-800 pt-1">
      <p className="mb-1 text-[9px] text-graphite-500 uppercase">Expresiones (para diálogo)</p>
      {entries.map(([key, path]) => (
        <div key={key} className="mb-1 flex items-center gap-2">
          <PortraitPreview gameId={gameId} portrait={path} />
          <p className="flex-1 truncate text-[9px] text-graphite-300">{key}</p>
          <button
            type="button"
            onClick={() => onRemoveExpression(key)}
            className="text-[8px] text-graphite-500 uppercase hover:text-red-400"
          >
            quitar
          </button>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          type="text"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
          placeholder="nombre (ej: enojado)"
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!newKey.trim() || uploadingKey !== null}
          className="shrink-0 rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploadingKey ? 'Subiendo...' : '+ Subir'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}

function CharacterFields({
  gameId,
  character,
  strings,
  onNameTextChange,
  onColorChange,
  onUploadPortrait,
  uploading,
  uploadingExpressionKey,
  onUploadExpression,
  onRemoveExpression,
}: {
  gameId: string;
  character: Character;
  strings: Record<string, string>;
  onNameTextChange: (text: string) => void;
  onColorChange: (color: string) => void;
  onUploadPortrait: (file: File) => void;
  uploading: boolean;
  uploadingExpressionKey: string | null;
  onUploadExpression: (expressionKey: string, file: File) => void;
  onRemoveExpression: (expressionKey: string) => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onUploadPortrait(file);
    event.target.value = '';
  }

  return (
    <div className="mb-2 flex gap-2 border-b border-graphite-800 pb-2">
      <PortraitPreview gameId={gameId} portrait={character.portrait} />
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
        <ExpressionsFields
          gameId={gameId}
          character={character}
          uploadingKey={uploadingExpressionKey}
          onUploadExpression={onUploadExpression}
          onRemoveExpression={onRemoveExpression}
        />
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
  gameId,
  characters,
  strings,
  uploadingId,
  uploadingExpressionKey,
  onNameTextChange,
  onColorChange,
  onUploadPortrait,
  onUploadExpression,
  onRemoveExpression,
  onCreateCharacter,
}: {
  gameId: string;
  characters: Character[];
  strings: Record<string, string>;
  uploadingId: string | null;
  /** "<characterId>:<expresión>" del upload en curso, o null. */
  uploadingExpressionKey: string | null;
  onNameTextChange: (characterId: string, nameKey: string, text: string) => void;
  onColorChange: (characterId: string, color: string) => void;
  onUploadPortrait: (characterId: string, file: File) => void;
  onUploadExpression: (characterId: string, expressionKey: string, file: File) => void;
  onRemoveExpression: (characterId: string, expressionKey: string) => void;
  onCreateCharacter: (name: string, nameText: string, color: string) => void;
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
          gameId={gameId}
          character={character}
          strings={strings}
          uploading={uploadingId === character.id}
          uploadingExpressionKey={
            uploadingExpressionKey?.startsWith(`${character.id}:`)
              ? uploadingExpressionKey.slice(character.id.length + 1)
              : null
          }
          onNameTextChange={(text) => onNameTextChange(character.id, character.name, text)}
          onColorChange={(color) => onColorChange(character.id, color)}
          onUploadPortrait={(file) => onUploadPortrait(character.id, file)}
          onUploadExpression={(expressionKey, file) => onUploadExpression(character.id, expressionKey, file)}
          onRemoveExpression={(expressionKey) => onRemoveExpression(character.id, expressionKey)}
        />
      ))}
    </div>
  );
}
