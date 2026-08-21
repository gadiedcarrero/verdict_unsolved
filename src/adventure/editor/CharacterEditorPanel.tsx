import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type { Character } from '../../game-engine/scene-engine/schemas';
import type { ElevenLabsVoice } from '../../../shared/elevenlabs';
import { EMOTIONS } from '../../../shared/emotions';
import { gameAssetUrl } from '../gameAssetUrl';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Los mensajes de error de la IA a veces traen un link (ej: "cargá crédito
 * en https://...") — se muestra clickeable, abre en el navegador de verdad
 * en vez de navegar la ventana de la app (setWindowOpenHandler en
 * electron/main/window.ts ya intercepta target="_blank" para eso). */
function ErrorText({ message, className }: { message: string; className?: string }): JSX.Element {
  const parts = message.split(URL_PATTERN);
  return (
    <p className={`text-[9px] text-red-300 ${className ?? ''}`}>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-red-200"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

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

const PORTRAIT_LOAD_MAX_RETRIES = 3;

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
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);

  // Justo después de generar/subir, el archivo recién escrito a veces no
  // está listo para servirse todavía en el primer intento (visto con
  // retratos generados por IA: la IPC ya devolvió éxito, pero el <img> falla
  // igual la primera carga) — sin reintento quedaba en "sin foto" para
  // siempre aunque el archivo estuviera perfectamente bien. Reintenta con
  // backoff antes de rendirse. Cambiar de retrato reinicia el contador.
  useEffect(() => {
    setRetry(0);
    setFailed(false);
  }, [portrait]);

  function handleError(): void {
    if (retry < PORTRAIT_LOAD_MAX_RETRIES) {
      setTimeout(() => setRetry((n) => n + 1), 400 * (retry + 1));
    } else {
      setFailed(true);
    }
  }

  if (!portrait || failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-graphite-600 text-[8px] text-graphite-500">
        sin foto
      </div>
    );
  }
  const src = gameAssetUrl(gameId, portrait);
  return (
    <img
      key={`${portrait}-${retry}`}
      src={retry > 0 ? `${src}?retry=${retry}` : src}
      alt=""
      onError={handleError}
      onClick={onPreview ? () => onPreview(portrait) : undefined}
      className={`h-10 w-10 shrink-0 rounded-full border border-graphite-700 object-cover ${onPreview ? 'cursor-pointer hover:border-amber-accent' : ''}`}
    />
  );
}

/** Expresiones emocionales: vocabulario fijo (shared/emotions.ts), no texto
 * libre — así el desplegable "Expresión del retrato" en el compositor de
 * diálogo siempre elige entre las mismas opciones conocidas. Cada una se
 * genera con un click: usa el retrato por defecto del personaje como
 * referencia visual (edición de imagen, no texto puro), así la cara se
 * mantiene reconocible entre expresiones — por eso requiere que el
 * personaje ya tenga retrato base. Identidades distintas (Wraith, Director
 * Gray) o edades distintas del mismo personaje NO van acá — son personajes
 * separados, ver "Crear variante" más abajo. */
function EmotionsFields({
  gameId,
  character,
  uploadingKey,
  generatingArtIds,
  artErrors,
  onPreviewPortrait,
  onUploadExpression,
  onRemoveExpression,
  onGenerateEmotion,
}: {
  gameId: string;
  character: Character;
  uploadingKey: string | null;
  generatingArtIds: string[];
  artErrors: Record<string, string>;
  onPreviewPortrait: (path: string) => void;
  onUploadExpression: (expressionKey: string, file: File) => void;
  onRemoveExpression: (expressionKey: string) => void;
  onGenerateEmotion: (emotionCode: string) => void;
}): JSX.Element {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const hasBasePortrait = Boolean(character.portrait);

  function handleFileChange(expressionKey: string, event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onUploadExpression(expressionKey, file);
    event.target.value = '';
  }

  return (
    <div className="mt-2 border-t border-graphite-800 pt-1">
      <p className="mb-1 text-[9px] text-graphite-500 uppercase">Expresiones emocionales</p>
      {!hasBasePortrait && (
        <p className="mb-1 text-[9px] text-graphite-600">
          Generá primero el retrato base de arriba — las expresiones parten de esa imagen como referencia.
        </p>
      )}
      {EMOTIONS.map(({ code, label }) => {
        const expression = character.expressions[code];
        const generating = generatingArtIds.includes(`${character.id}:${code}`);
        const error = artErrors[`${character.id}:${code}`];
        return (
          <div key={code} className="mb-1 rounded border border-graphite-800 bg-graphite-950/60 p-1.5">
            <div className="mb-1 flex items-center gap-2">
              <PortraitPreview gameId={gameId} portrait={expression?.path ?? null} onPreview={onPreviewPortrait} />
              <p className="flex-1 text-[9px] text-graphite-300">{label}</p>
              {expression?.path && (
                <button
                  type="button"
                  onClick={() => onRemoveExpression(code)}
                  className="shrink-0 text-[8px] text-graphite-500 uppercase hover:text-red-400"
                >
                  quitar
                </button>
              )}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onGenerateEmotion(code)}
                disabled={!hasBasePortrait || generating}
                className="flex-1 rounded border border-sky-400/40 px-2 py-1 text-[8px] tracking-widest text-sky-300 uppercase transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating ? 'Generando...' : expression?.path ? 'Regenerar con IA' : 'Generar con IA'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRefs.current[code]?.click()}
                disabled={uploadingKey === code}
                className="shrink-0 rounded border border-graphite-700 px-2 py-1 text-[8px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploadingKey === code ? 'Subiendo...' : 'Subir manual'}
              </button>
              <input
                ref={(el) => {
                  fileInputRefs.current[code] = el;
                }}
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(code, event)}
                className="hidden"
              />
            </div>
            {error && <ErrorText message={error} className="mt-1" />}
          </div>
        );
      })}
    </div>
  );
}

/** Identidades distintas del mismo personaje en la trama (Wraith, Director
 * Gray) o versiones de otra edad (Adrian joven en un flashback) son
 * personajes NUEVOS y separados, no expresiones — cada uno necesita su
 * propio set completo de expresiones emocionales, y mezclar "identidad" con
 * "emoción" en un mismo campo no escala. Genera partiendo del retrato de
 * ESTE personaje como referencia visual. */
function CreateVariantForm({
  hasSourcePortrait,
  onCreate,
}: {
  hasSourcePortrait: boolean;
  onCreate: (name: string, description: string, color: string) => Promise<{ ok: boolean; error?: string }>;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#8fa3c9');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName || !trimmedDescription) return;
    setSubmitting(true);
    setError(null);
    const result = await onCreate(trimmedName, trimmedDescription, color);
    setSubmitting(false);
    if (result.ok) {
      setName('');
      setDescription('');
      setOpen(false);
    } else {
      setError(result.error ?? 'Error desconocido.');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasSourcePortrait}
        title={hasSourcePortrait ? undefined : 'Generá primero el retrato base'}
        className="mt-2 w-full rounded border border-dashed border-graphite-700 px-2 py-1 text-[8px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Crear variante (otra identidad o edad de este mismo personaje)
      </button>
    );
  }

  return (
    <div className="mt-2 rounded border border-dashed border-graphite-700 p-1.5">
      <p className="mb-1 text-[8px] text-graphite-500">
        Ej: &quot;Wraith&quot; con descripción &quot;misma persona pero con máscara táctica negra cubriendo todo el
        rostro, ropa de agente de campo&quot;, o &quot;Adrian joven&quot; con &quot;misma persona pero unos 15 años
        más joven, sin canas, rostro más suave&quot;. La descripción tiene que ser autocontenida — no dependas de la
        descripción del personaje original.
      </p>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre (ej: Wraith, Adrian joven)"
        className={`${inputClassName} mb-1`}
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Qué cambia — descripción visual autocontenida..."
        rows={2}
        className={`${inputClassName} mb-1`}
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[9px] text-graphite-400">
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
          onClick={() => void submit()}
          disabled={!name.trim() || !description.trim() || submitting}
          className="flex-1 rounded border border-sky-400/40 px-2 py-1 text-[9px] tracking-widest text-sky-300 uppercase transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Generando...' : 'Crear variante'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-[9px] text-graphite-500 uppercase hover:text-graphite-300"
        >
          cancelar
        </button>
      </div>
      {error && <ErrorText message={error} className="mt-1" />}
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
  artErrors,
  uploadingExpressionKey,
  onUploadExpression,
  onRemoveExpression,
  onGenerateEmotion,
  voices,
  onVoiceChange,
  onRemoveVoice,
  onRemoveCharacter,
  onCreateVariant,
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
  artErrors: Record<string, string>;
  uploadingExpressionKey: string | null;
  onUploadExpression: (expressionKey: string, file: File) => void;
  onRemoveExpression: (expressionKey: string) => void;
  onGenerateEmotion: (emotionCode: string) => void;
  voices: ElevenLabsVoice[] | null;
  onVoiceChange: (language: string, voiceId: string) => void;
  onRemoveVoice: (language: string) => void;
  onRemoveCharacter: () => void;
  onCreateVariant: (name: string, description: string, color: string) => Promise<{ ok: boolean; error?: string }>;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatingPortrait = generatingArtIds.includes(character.id);
  const portraitError = artErrors[character.id];

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onUploadPortrait(file);
    event.target.value = '';
  }

  return (
    <div className="mb-2 flex gap-2 border-b border-graphite-800 pb-2">
      <PortraitPreview gameId={gameId} portrait={character.portrait} onPreview={onPreviewPortrait} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-graphite-100">{character.id}</p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Eliminar "${character.id}"? Si hay diálogo apuntándole por id, va a quedar sin nombre/color hasta que lo reapuntes.`)) {
                onRemoveCharacter();
              }
            }}
            className="shrink-0 text-[9px] text-graphite-500 uppercase hover:text-red-400"
          >
            eliminar
          </button>
        </div>
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
        {portraitError && <ErrorText message={portraitError} className="mb-1" />}
        <EmotionsFields
          gameId={gameId}
          character={character}
          uploadingKey={uploadingExpressionKey}
          generatingArtIds={generatingArtIds}
          artErrors={artErrors}
          onPreviewPortrait={onPreviewPortrait}
          onUploadExpression={onUploadExpression}
          onRemoveExpression={onRemoveExpression}
          onGenerateEmotion={onGenerateEmotion}
        />
        <VoicesFields character={character} voices={voices} onVoiceChange={onVoiceChange} onRemoveVoice={onRemoveVoice} />
        <CreateVariantForm hasSourcePortrait={Boolean(character.portrait)} onCreate={onCreateVariant} />
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
  artErrors,
  onPreviewPortrait,
  onNameTextChange,
  onColorChange,
  onDescriptionChange,
  onUploadPortrait,
  onUploadExpression,
  onRemoveExpression,
  onGenerateEmotion,
  onGeneratePortrait,
  onCreateCharacter,
  onRemoveCharacter,
  onCreateVariant,
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
   * IA en curso — puede haber varias en paralelo (retrato + expresiones). */
  generatingArtIds: string[];
  /** Mismas claves que generatingArtIds → mensaje de error de esa
   * generación puntual, si falló — cada una la suya, no se pisan entre
   * personajes generados en la misma tanda. */
  artErrors: Record<string, string>;
  /** Click en cualquier miniatura (retrato o expresión) — se usa para
   * mostrarla grande en el panel de la derecha del editor. */
  onPreviewPortrait: (path: string) => void;
  onNameTextChange: (characterId: string, nameKey: string, text: string) => void;
  onColorChange: (characterId: string, color: string) => void;
  onDescriptionChange: (characterId: string, description: string) => void;
  onUploadPortrait: (characterId: string, file: File) => void;
  onUploadExpression: (characterId: string, expressionKey: string, file: File) => void;
  onRemoveExpression: (characterId: string, expressionKey: string) => void;
  onGenerateEmotion: (characterId: string, emotionCode: string) => void;
  onGeneratePortrait: (characterId: string, description: string) => void;
  onCreateCharacter: (name: string, nameText: string, color: string) => void;
  onRemoveCharacter: (characterId: string) => void;
  onCreateVariant: (
    sourceCharacterId: string,
    name: string,
    description: string,
    color: string,
  ) => Promise<{ ok: boolean; error?: string }>;
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
        {voicesError && <ErrorText message={voicesError} className="mt-1" />}
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
          artErrors={artErrors}
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
          onGenerateEmotion={(emotionCode) => onGenerateEmotion(character.id, emotionCode)}
          voices={voices}
          onVoiceChange={(language, voiceId) => onVoiceChange(character.id, language, voiceId)}
          onRemoveVoice={(language) => onRemoveVoice(character.id, language)}
          onRemoveCharacter={() => onRemoveCharacter(character.id)}
          onCreateVariant={(name, description, color) => onCreateVariant(character.id, name, description, color)}
        />
      ))}
    </div>
  );
}
