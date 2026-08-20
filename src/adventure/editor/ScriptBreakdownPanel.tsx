import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import type {
  ScriptBreakdown,
  ScriptBreakdownCharacter,
  ScriptBreakdownReviewStatus,
  ScriptBreakdownScene,
} from '../../../shared/script-breakdown';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

const STATUS_LABEL: Record<ScriptBreakdownReviewStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  cut: 'Cortada',
};

function SceneCard({
  scene,
  characters,
  onSummaryChange,
  onStatusChange,
}: {
  scene: ScriptBreakdownScene;
  characters: ScriptBreakdownCharacter[];
  onSummaryChange: (summary: string) => void;
  onStatusChange: (status: ScriptBreakdownReviewStatus) => void;
}): JSX.Element {
  const sceneCharacters = scene.characterIds
    .map((id) => characters.find((c) => c.id === id)?.name ?? id)
    .join(', ');

  return (
    <div
      className={`mb-2 rounded border p-2 ${
        scene.reviewStatus === 'cut'
          ? 'border-graphite-800 bg-graphite-900/30 opacity-50'
          : scene.reviewStatus === 'approved'
            ? 'border-emerald-600/50 bg-graphite-900/60'
            : 'border-graphite-700 bg-graphite-900/60'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-graphite-100">
          {scene.title} <span className="text-graphite-500">· {scene.id}</span>
        </p>
        <div className="flex shrink-0 gap-1">
          {(['pending', 'approved', 'cut'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`rounded border px-1.5 py-0.5 text-[8px] tracking-widest uppercase transition-colors ${
                scene.reviewStatus === status
                  ? 'border-amber-accent text-amber-accent'
                  : 'border-graphite-700 text-graphite-500 hover:border-graphite-500 hover:text-graphite-300'
              }`}
            >
              {STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      {scene.bridgeFromPrevious && (
        <div className="mb-1 rounded border border-graphite-700 bg-black/40 p-1.5">
          <p className="text-[8px] tracking-widest text-graphite-500 uppercase">Puente · MIRROR</p>
          <p className="font-mono text-[9px] text-emerald-400/90">{scene.bridgeFromPrevious}</p>
        </div>
      )}

      {sceneCharacters && <p className="mb-1 text-[9px] text-graphite-500">Personajes: {sceneCharacters}</p>}

      <textarea
        value={scene.summary}
        onChange={(event) => onSummaryChange(event.target.value)}
        rows={3}
        className={`${inputClassName} mb-1`}
      />

      {scene.objects.length > 0 && (
        <div className="mb-1">
          <p className="text-[8px] tracking-widest text-graphite-500 uppercase">Objetos</p>
          {scene.objects.map((object, index) => (
            <div key={index} className="mb-1 rounded border border-graphite-800 p-1">
              <p className="text-[9px] text-graphite-300">{object.name}</p>
              {object.examineText && <p className="text-[9px] text-graphite-500">Examinar: {object.examineText}</p>}
              {object.interactText && (
                <p className="text-[9px] text-graphite-500">Interactuar: {object.interactText}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {scene.minigame && (
        <div className="rounded border border-sky-400/40 bg-graphite-950 p-1">
          <p className="text-[9px] text-sky-300">Minijuego sugerido: {scene.minigame.template}</p>
          <p className="text-[9px] text-graphite-500">{scene.minigame.reason}</p>
        </div>
      )}
    </div>
  );
}

export function ScriptBreakdownPanel({
  breakdown,
  generating,
  error,
  mergeNote,
  onGenerate,
  onSceneSummaryChange,
  onSceneStatusChange,
}: {
  breakdown: ScriptBreakdown | null;
  generating: boolean;
  error: string | null;
  mergeNote: string | null;
  onGenerate: (scriptText: string) => void;
  onSceneSummaryChange: (sceneId: string, summary: string) => void;
  onSceneStatusChange: (sceneId: string, status: ScriptBreakdownReviewStatus) => void;
}): JSX.Element {
  const [scriptText, setScriptText] = useState('');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileError(null);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setFileError('El archivo está vacío o no se pudo leer como texto.');
        return;
      }
      setScriptText(text);
      setLoadedFileName(file.name);
    } catch (error) {
      setFileError(`No se pudo leer el archivo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <div className="text-xs text-graphite-200">
      <p className="mb-3 text-[10px] text-graphite-400">
        Pegá el guion completo o cargá un documento (.txt, .md). La IA arma un desglose legible por escena (objetos,
        y si corresponde, un minijuego sugerido) y revisás acá — aprobar, cortar o ajustar el resumen. Los
        personajes que encuentra aparecen directo en la pestaña &quot;Personajes&quot; (con su descripción cargada,
        listos para generar retrato) — esta pestaña es solo para escenas.
      </p>

      <div className="mb-2 flex gap-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          Cargar documento
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={(event) => void handleFileChange(event)}
          className="hidden"
        />
        {loadedFileName && <p className="self-center truncate text-[9px] text-graphite-500">{loadedFileName}</p>}
      </div>
      {fileError && <p className="mb-2 text-[9px] text-red-300">{fileError}</p>}

      <textarea
        value={scriptText}
        onChange={(event) => {
          setScriptText(event.target.value);
          setLoadedFileName(null);
        }}
        rows={8}
        placeholder="Pegá el guion completo acá, o cargá un documento arriba..."
        className={`${inputClassName} mb-2`}
      />
      <button
        type="button"
        onClick={() => {
          const hasReviewedScenes = breakdown?.scenes.some((s) => s.reviewStatus !== 'pending') ?? false;
          if (
            hasReviewedScenes &&
            !window.confirm(
              'Ya hay escenas revisadas (aprobadas o cortadas). Volver a generar va a intentar conservar esa revisión matcheando por título, pero las escenas que cambien de título vuelven a Pendiente. ¿Generar de nuevo?',
            )
          ) {
            return;
          }
          onGenerate(scriptText);
        }}
        disabled={generating || scriptText.trim().length < 20}
        className="mb-3 w-full rounded border border-amber-accent px-2 py-1.5 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
      >
        {generating ? 'Generando (puede tardar un minuto)...' : breakdown ? 'Generar de nuevo' : 'Generar desglose con IA'}
      </button>

      {mergeNote && (
        <p className="mb-3 rounded border border-sky-400/40 bg-graphite-900/60 p-2 text-[9px] text-sky-300">
          {mergeNote}
        </p>
      )}
      {error && <p className="mb-3 rounded border border-red-500/40 bg-red-950/30 p-2 text-[9px] text-red-300">{error}</p>}

      {breakdown && (
        <>
          <p className="mb-1 text-[9px] tracking-widest text-graphite-500 uppercase">
            Escenas ({breakdown.scenes.length})
          </p>
          {breakdown.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              characters={breakdown.characters}
              onSummaryChange={(summary) => onSceneSummaryChange(scene.id, summary)}
              onStatusChange={(status) => onSceneStatusChange(scene.id, status)}
            />
          ))}
        </>
      )}
    </div>
  );
}
