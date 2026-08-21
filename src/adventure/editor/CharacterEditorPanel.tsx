import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type { Character } from '../../game-engine/scene-engine/schemas';
import type { ElevenLabsVoice } from '../../../shared/elevenlabs';
import { gameAssetUrl } from '../gameAssetUrl';
import { slugify } from './slug';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

/** Solo estos dos por ahora — ver memoria project_dialogue_audio_elevenlabs:
 * el guion está en español, pero el juego puede salir primero en inglés. Si
 * hace falta un tercer idioma más adelante, el dato ya soporta cualquier
 * clave (Character.voices es un mapa libre), solo hay que sumar la fila. */
const VOICE_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'Inglés' },
  { code: 'es', label: 'Español' },
];

function voiceOptionLabel(voice: ElevenLabsVoice): string {
  const bits = [voice.gender, voice.accent, voice.descriptive].filter((v): v is string => Boolean(v));
  return bits.length > 0 ? `${voice.name} (${bits.join(', ')})` : voice.name;
}

const GENDER_FILTERS: { value: string; label: string }[] = [
  { value: 'any', label: 'Cualquiera' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
];

/** Desplegable propio en vez de un <select> nativo — un <option> no puede
 * tener un botón adentro, y el pedido puntual fue poder escuchar cada voz
 * SIN que el menú se cierre entre una y otra (con el nativo, cada muestra
 * significaba cerrar, reabrir y volver a ubicarse en la lista). Se cierra
 * solo al elegir una fila o al clickear afuera. */
function VoicePicker({
  voices,
  voiceId,
  previewingId,
  onSelect,
  onClear,
  onPlayPreview,
  disabled,
}: {
  voices: ElevenLabsVoice[];
  voiceId: string | null;
  /** voiceId de la fila cuya muestra está sonando ahora, para marcarla. */
  previewingId: string | null;
  onSelect: (voiceId: string) => void;
  onClear: () => void;
  onPlayPreview: (voice: ElevenLabsVoice) => void;
  disabled: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = voices.find((v) => v.voiceId === voiceId) ?? null;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className={`${inputClassName} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span className="min-w-0 truncate">
          {selected ? voiceOptionLabel(selected) : disabled ? 'Cargando voces...' : '(sin voz)'}
        </span>
        <span className="ml-1 shrink-0 text-graphite-500">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded border border-graphite-700 bg-graphite-900 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="block w-full px-2 py-1 text-left text-[10px] text-graphite-500 uppercase hover:bg-graphite-800"
          >
            (sin voz)
          </button>
          {voices.map((voice) => (
            <div
              key={voice.voiceId}
              className={`flex items-center gap-1 px-1 py-0.5 hover:bg-graphite-800 ${
                voice.voiceId === voiceId ? 'bg-graphite-800' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(voice.voiceId);
                  setOpen(false);
                }}
                className="min-w-0 flex-1 truncate px-1 py-0.5 text-left text-[10px] text-graphite-200"
              >
                {voiceOptionLabel(voice)}
              </button>
              <button
                type="button"
                onClick={() => onPlayPreview(voice)}
                title="Escuchar muestra"
                className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] transition-colors ${
                  previewingId === voice.voiceId
                    ? 'border-amber-accent text-amber-accent'
                    : 'border-graphite-700 text-graphite-400 hover:border-amber-accent hover:text-amber-accent'
                }`}
              >
                ▶
              </button>
            </div>
          ))}
          {voices.length === 0 && <p className="px-2 py-1 text-[9px] text-graphite-600">Ninguna voz coincide.</p>}
        </div>
      )}
    </div>
  );
}

function VoiceRow({
  language,
  label,
  voiceId,
  voices,
  onChange,
  onRemove,
}: {
  language: string;
  label: string;
  voiceId: string | null;
  voices: ElevenLabsVoice[] | null;
  onChange: (voiceId: string) => void;
  onRemove: () => void;
}): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [genderFilter, setGenderFilter] = useState('any');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const selectedVoice = voices?.find((v) => v.voiceId === voiceId) ?? null;

  // Filtro de idioma "duro": solo voces verificadas para este idioma (por
  // muestra propia o por ser su idioma base) — mostrar las 21 igual en
  // todos lados no ayuda a elegir. El filtro de género es manual, no hay
  // dato de género guardado en el personaje para autodetectarlo. La voz ya
  // elegida se mantiene visible aunque deje de matchear el filtro activo,
  // para no perder la selección al tocar el filtro.
  const filteredVoices = (voices ?? []).filter((voice) => {
    const matchesLanguage = Boolean(voice.previewUrlByLanguage[language]) || voice.language === language;
    const matchesGender = genderFilter === 'any' || voice.gender === genderFilter;
    return matchesLanguage && matchesGender;
  });
  if (selectedVoice && !filteredVoices.some((v) => v.voiceId === selectedVoice.voiceId)) {
    filteredVoices.unshift(selectedVoice);
  }

  function playPreview(voice: ElevenLabsVoice): void {
    const previewUrl = voice.previewUrlByLanguage[language] ?? voice.previewUrl;
    if (!previewUrl || !audioRef.current) return;
    audioRef.current.src = previewUrl;
    setPreviewingId(voice.voiceId);
    void audioRef.current.play();
  }

  return (
    <div className="mb-1">
      <div className="mb-0.5 flex items-center justify-between gap-1">
        <span className="text-[9px] text-graphite-500 uppercase">{label}</span>
        <select
          value={genderFilter}
          onChange={(event) => setGenderFilter(event.target.value)}
          disabled={!voices}
          className="rounded border border-graphite-700 bg-graphite-900 px-1 py-0.5 text-[9px] text-graphite-400"
        >
          {GENDER_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <VoicePicker
        voices={filteredVoices}
        voiceId={voiceId}
        previewingId={previewingId}
        disabled={!voices}
        onSelect={onChange}
        onClear={onRemove}
        onPlayPreview={playPreview}
      />
      <audio ref={audioRef} onEnded={() => setPreviewingId(null)} className="hidden" />
      {voices && filteredVoices.length === 0 && (
        <p className="mt-0.5 text-[8px] text-graphite-600">Ninguna voz coincide con este filtro.</p>
      )}
    </div>
  );
}

function VoicesFields({
  character,
  voices,
  onVoiceChange,
  onRemoveVoice,
}: {
  character: Character;
  voices: ElevenLabsVoice[] | null;
  onVoiceChange: (language: string, voiceId: string) => void;
  onRemoveVoice: (language: string) => void;
}): JSX.Element {
  return (
    <div className="mt-2 border-t border-graphite-800 pt-1">
      <p className="mb-1 text-[9px] text-graphite-500 uppercase">Voz (ElevenLabs) — para el audio de diálogo</p>
      {VOICE_LANGUAGES.map(({ code, label }) => (
        <VoiceRow
          key={code}
          language={code}
          label={label}
          voiceId={character.voices[code] ?? null}
          voices={voices}
          onChange={(voiceId) => onVoiceChange(code, voiceId)}
          onRemove={() => onRemoveVoice(code)}
        />
      ))}
    </div>
  );
}

function PortraitPreview({
  gameId,
  portrait,
  onPreview,
}: {
  gameId: string;
  portrait: string | null;
  /** Si está presente, hace click-to-preview (ver panel grande a la
   * derecha del editor) — ausente en contextos donde no aplica. */
  onPreview?: (path: string) => void;
}): JSX.Element {
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
      onClick={onPreview ? () => onPreview(portrait) : undefined}
      className={`h-10 w-10 shrink-0 rounded-full border border-graphite-700 object-cover ${onPreview ? 'cursor-pointer hover:border-amber-accent' : ''}`}
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
  onPreviewPortrait,
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
  onPreviewPortrait: (path: string) => void;
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
              <PortraitPreview gameId={gameId} portrait={expression.path} onPreview={onPreviewPortrait} />
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
  onPreviewPortrait,
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
  voices,
  onVoiceChange,
  onRemoveVoice,
}: {
  gameId: string;
  character: Character;
  strings: Record<string, string>;
  onPreviewPortrait: (path: string) => void;
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
  voices: ElevenLabsVoice[] | null;
  onVoiceChange: (language: string, voiceId: string) => void;
  onRemoveVoice: (language: string) => void;
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
      <PortraitPreview gameId={gameId} portrait={character.portrait} onPreview={onPreviewPortrait} />
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
          onPreviewPortrait={onPreviewPortrait}
          onUploadExpression={onUploadExpression}
          onRemoveExpression={onRemoveExpression}
          onAddExpression={onAddExpression}
          onExpressionDescriptionChange={onExpressionDescriptionChange}
          onGenerateExpression={onGenerateExpression}
        />
        <VoicesFields character={character} voices={voices} onVoiceChange={onVoiceChange} onRemoveVoice={onRemoveVoice} />
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
  onPreviewPortrait,
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
  voices,
  voicesLoading,
  voicesError,
  onLoadVoices,
  onVoiceChange,
  onRemoveVoice,
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
  /** Click en cualquier miniatura (retrato o expresión) — se usa para
   * mostrarla grande en el panel de la derecha del editor. */
  onPreviewPortrait: (path: string) => void;
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
  /** null = todavía no se pidieron a la cuenta de ElevenLabs (ver botón
   * "Cargar voces" abajo). */
  voices: ElevenLabsVoice[] | null;
  voicesLoading: boolean;
  voicesError: string | null;
  onLoadVoices: () => void;
  onVoiceChange: (characterId: string, language: string, voiceId: string) => void;
  onRemoveVoice: (characterId: string, language: string) => void;
}): JSX.Element {
  return (
    <div className="text-xs text-graphite-200">
      <p className="mb-3 text-[10px] text-graphite-400">
        El retrato y el color se usan en cualquier diálogo donde este personaje sea el que habla, en toda la
        novela. Los personajes que encuentra el desglose de guion (pestaña &quot;Guion IA&quot;) aparecen acá solos,
        con su descripción ya cargada — nada cambia hasta que aprietes Guardar.
      </p>

      <div className="mb-3 rounded border border-graphite-800 bg-graphite-900/60 p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadVoices}
            disabled={voicesLoading}
            className="shrink-0 rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {voicesLoading ? 'Cargando...' : voices ? 'Recargar voces' : 'Cargar voces de ElevenLabs'}
          </button>
          {voices && <p className="text-[9px] text-graphite-500">{voices.length} voces disponibles</p>}
        </div>
        {voicesError && <p className="mt-1 text-[9px] text-red-300">{voicesError}</p>}
      </div>

      <CreateCharacterForm onCreate={onCreateCharacter} />

      {characters.map((character) => (
        <CharacterFields
          key={character.id}
          gameId={gameId}
          character={character}
          strings={strings}
          uploading={uploadingId === character.id}
          generatingArtIds={generatingArtIds}
          onPreviewPortrait={onPreviewPortrait}
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
          voices={voices}
          onVoiceChange={(language, voiceId) => onVoiceChange(character.id, language, voiceId)}
          onRemoveVoice={(language) => onRemoveVoice(character.id, language)}
        />
      ))}
    </div>
  );
}
