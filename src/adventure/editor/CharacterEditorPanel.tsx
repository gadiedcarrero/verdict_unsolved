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
      key={portrait}
      src={gameAssetUrl(gameId, portrait)}
      alt=""
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full border border-graphite-700 object-cover"
    />
  );
}

/** Cada personaje puede tener variantes de retrato además de la "por
 * defecto" — una emoción puntual (enojado, sonriendo) o una identidad
 * visualmente distinta del mismo personaje (ej: Adrian Cross también
 * aparece como "Director Gray" o como el agente enmascarado "Wraith").
 * Referenciadas desde un diálogo puntual vía DialogueNode.portraitExpression
 * — ver ActionComposer en SceneEditorPanel.tsx. Cada expresión guarda su
 * propia descripción visual (autocontenida — nunca depende de la
 * descripción base ni de otra expresión) para poder generar/regenerar su
 * imagen con IA sin mezclar apariencias en un mismo prompt. */
function ExpressionsFields({
  gameId,
  character,
  uploadingKey,
  generatingArtIds,
  onUploadExpression,
  onRemoveExpression,
  onAddExpression,
  onExpressionDescriptionChange,
  onGenerateExpression,
}: {
  gameId: string;
  character: Character;
  uploadingKey: string | null;
  generatingArtIds: string[];
  onUploadExpression: (expressionKey: string, file: File) => void;
  onRemoveExpression: (expressionKey: string) => void;
  onAddExpression: (key: string, description: string) => void;
  onExpressionDescriptionChange: (expressionKey: string, description: string) => void;
  onGenerateExpression: (expressionKey: string, description: string) => void;
}): JSX.Element {
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const entries = Object.entries(character.expressions);

  function handleFileChange(expressionKey: string, event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onUploadExpression(expressionKey, file);
    event.target.value = '';
  }

  function submitNewExpression(): void {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    onAddExpression(slugify(trimmed), newDescription.trim());
    setNewKey('');
    setNewDescription('');
  }

  return (
    <div className="mt-2 border-t border-graphite-800 pt-1">
      <p className="mb-1 text-[9px] text-graphite-500 uppercase">
        Expresiones e identidades alternativas (para diálogo)
      </p>
      {entries.map(([key, expression]) => {
        const generating = generatingArtIds.includes(`${character.id}:${key}`);
        return (
          <div key={key} className="mb-1 rounded border border-graphite-800 bg-graphite-950/60 p-1.5">
            <div className="mb-1 flex items-center gap-2">
              <PortraitPreview gameId={gameId} portrait={expression.path} />
              <p className="flex-1 truncate text-[9px] text-graphite-300">{key}</p>
              <button
                type="button"
                onClick={() => onRemoveExpression(key)}
                className="text-[8px] text-graphite-500 uppercase hover:text-red-400"
              >
                quitar
              </button>
            </div>
            <textarea
              value={expression.description}
              onChange={(event) => onExpressionDescriptionChange(key, event.target.value)}
              placeholder="Descripción visual autocontenida (para generar con IA)..."
              rows={2}
              className={`${inputClassName} mb-1`}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onGenerateExpression(key, expression.description)}
                disabled={!expression.description.trim() || generating}
                className="flex-1 rounded border border-sky-400/40 px-2 py-1 text-[8px] tracking-widest text-sky-300 uppercase transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating ? 'Generando...' : expression.path ? 'Regenerar con IA' : 'Generar con IA'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRefs.current[key]?.click()}
                disabled={uploadingKey === key}
                className="shrink-0 rounded border border-graphite-700 px-2 py-1 text-[8px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploadingKey === key ? 'Subiendo...' : 'Subir manual'}
              </button>
              <input
                ref={(el) => {
                  fileInputRefs.current[key] = el;
                }}
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(key, event)}
                className="hidden"
              />
            </div>
          </div>
        );
      })}
      <div className="rounded border border-dashed border-graphite-700 p-1.5">
        <input
          type="text"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
          placeholder="nombre (ej: enojado, o una identidad como wraith)"
          className={`${inputClassName} mb-1`}
        />
        <textarea
          value={newDescription}
          onChange={(event) => setNewDescription(event.target.value)}
          placeholder="Descripción visual (opcional si vas a subir la imagen a mano)..."
          rows={2}
          className={`${inputClassName} mb-1`}
        />
        <button
          type="button"
          onClick={submitNewExpression}
          disabled={!newKey.trim()}
          className="w-full rounded border border-graphite-700 px-2 py-1 text-[8px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Agregar expresión
        </button>
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
  onDescriptionChange,
  onUploadPortrait,
  onGeneratePortrait,
  uploading,
  generatingArtIds,
  uploadingExpressionKey,
  onUploadExpression,
  onRemoveExpression,
  onAddExpression,
  onExpressionDescriptionChange,
  onGenerateExpression,
}: {
  gameId: string;
  character: Character;
  strings: Record<string, string>;
  onNameTextChange: (text: string) => void;
  onColorChange: (color: string) => void;
  onDescriptionChange: (description: string) => void;
  onUploadPortrait: (file: File) => void;
  onGeneratePortrait: (description: string) => void;
  uploading: boolean;
  generatingArtIds: string[];
  uploadingExpressionKey: string | null;
  onUploadExpression: (expressionKey: string, file: File) => void;
  onRemoveExpression: (expressionKey: string) => void;
  onAddExpression: (key: string, description: string) => void;
  onExpressionDescriptionChange: (expressionKey: string, description: string) => void;
  onGenerateExpression: (expressionKey: string, description: string) => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatingPortrait = generatingArtIds.includes(character.id);

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
        <label className="mb-1 flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">
            Descripción visual (look base — para generar con IA)
          </span>
          <textarea
            value={character.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={2}
            className={inputClassName}
          />
        </label>
        <div className="mb-1 flex items-center gap-2">
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
            onClick={() => onGeneratePortrait(character.description)}
            disabled={!character.description.trim() || generatingPortrait}
            className="rounded border border-sky-400/40 px-2 py-1 text-[9px] tracking-widest text-sky-300 uppercase transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generatingPortrait ? 'Generando...' : character.portrait ? 'Regenerar con IA' : 'Generar con IA'}
          </button>
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
          generatingArtIds={generatingArtIds}
          onUploadExpression={onUploadExpression}
          onRemoveExpression={onRemoveExpression}
          onAddExpression={onAddExpression}
          onExpressionDescriptionChange={onExpressionDescriptionChange}
          onGenerateExpression={onGenerateExpression}
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
  generatingArtIds,
  onNameTextChange,
  onColorChange,
  onDescriptionChange,
  onUploadPortrait,
  onUploadExpression,
  onRemoveExpression,
  onAddExpression,
  onExpressionDescriptionChange,
  onGeneratePortrait,
  onGenerateExpression,
  onCreateCharacter,
}: {
  gameId: string;
  characters: Character[];
  strings: Record<string, string>;
  uploadingId: string | null;
  /** "<characterId>:<expresión>" del upload en curso, o null. */
  uploadingExpressionKey: string | null;
  /** "<characterId>" o "<characterId>:<expresión>" de cada generación por
   * IA en curso — puede haber varias en paralelo (retrato + identidades). */
  generatingArtIds: string[];
  onNameTextChange: (characterId: string, nameKey: string, text: string) => void;
  onColorChange: (characterId: string, color: string) => void;
  onDescriptionChange: (characterId: string, description: string) => void;
  onUploadPortrait: (characterId: string, file: File) => void;
  onUploadExpression: (characterId: string, expressionKey: string, file: File) => void;
  onRemoveExpression: (characterId: string, expressionKey: string) => void;
  onAddExpression: (characterId: string, key: string, description: string) => void;
  onExpressionDescriptionChange: (characterId: string, expressionKey: string, description: string) => void;
  onGeneratePortrait: (characterId: string, description: string) => void;
  onGenerateExpression: (characterId: string, expressionKey: string, description: string) => void;
  onCreateCharacter: (name: string, nameText: string, color: string) => void;
}): JSX.Element {
  return (
    <div className="text-xs text-graphite-200">
      <p className="mb-3 text-[10px] text-graphite-400">
        El retrato y el color se usan en cualquier diálogo donde este personaje sea el que habla, en toda la
        novela. Los personajes que encuentra el desglose de guion (pestaña &quot;Guion IA&quot;) aparecen acá solos,
        con su descripción ya cargada — nada cambia hasta que aprietes Guardar.
      </p>

      <CreateCharacterForm onCreate={onCreateCharacter} />

      {characters.map((character) => (
        <CharacterFields
          key={character.id}
          gameId={gameId}
          character={character}
          strings={strings}
          uploading={uploadingId === character.id}
          generatingArtIds={generatingArtIds}
          uploadingExpressionKey={
            uploadingExpressionKey?.startsWith(`${character.id}:`)
              ? uploadingExpressionKey.slice(character.id.length + 1)
              : null
          }
          onNameTextChange={(text) => onNameTextChange(character.id, character.name, text)}
          onColorChange={(color) => onColorChange(character.id, color)}
          onDescriptionChange={(description) => onDescriptionChange(character.id, description)}
          onUploadPortrait={(file) => onUploadPortrait(character.id, file)}
          onGeneratePortrait={(description) => onGeneratePortrait(character.id, description)}
          onUploadExpression={(expressionKey, file) => onUploadExpression(character.id, expressionKey, file)}
          onRemoveExpression={(expressionKey) => onRemoveExpression(character.id, expressionKey)}
          onAddExpression={(key, description) => onAddExpression(character.id, key, description)}
          onExpressionDescriptionChange={(expressionKey, description) =>
            onExpressionDescriptionChange(character.id, expressionKey, description)
          }
          onGenerateExpression={(expressionKey, description) =>
            onGenerateExpression(character.id, expressionKey, description)
          }
        />
      ))}
    </div>
  );
}
