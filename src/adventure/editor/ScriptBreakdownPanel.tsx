import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import type {
  NarrativePurpose,
  ScriptBreakdown,
  ScriptBreakdownCharacter,
  ScriptBreakdownPanel as ScriptBreakdownPanelData,
  ScriptBreakdownReviewStatus,
  ScriptBreakdownScene,
} from '../../../shared/script-breakdown';

const NARRATIVE_PURPOSE_LABEL: Record<NarrativePurpose, string> = {
  establishing: 'Establishing',
  character_intro: 'Presentación',
  dialogue: 'Diálogo',
  revelation: 'Revelación',
  action: 'Acción',
  reaction: 'Reacción',
  transition: 'Transición',
  cliffhanger: 'Cliffhanger',
};

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

const STATUS_LABEL: Record<ScriptBreakdownReviewStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  cut: 'Cortada',
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Los mensajes de error de OpenAI a veces traen un link (ej: "cargá
 * crédito en https://...") — se muestra clickeable, abre en el navegador de
 * verdad (setWindowOpenHandler en electron/main/window.ts intercepta
 * target="_blank" para eso, no navega la ventana de la app). */
function ErrorText({ message }: { message: string }): JSX.Element {
  const parts = message.split(URL_PATTERN);
  return (
    <p className="mb-3 rounded border border-red-500/40 bg-red-950/30 p-2 text-[9px] text-red-300">
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noreferrer" className="underline hover:text-red-200">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

function PanelCard({
  panel,
  onDisplayTextChange,
  onImageDescriptionChange,
}: {
  panel: ScriptBreakdownPanelData;
  onDisplayTextChange: (text: string) => void;
  onImageDescriptionChange: (text: string) => void;
}): JSX.Element {
  return (
    <div className="mb-1 rounded border border-graphite-800 bg-graphite-950/60 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="rounded border border-sky-400/40 px-1 text-[8px] tracking-widest text-sky-300 uppercase">
          {NARRATIVE_PURPOSE_LABEL[panel.narrativePurpose]}
        </span>
        {panel.characters.length > 0 && (
          <span className="truncate text-[8px] text-graphite-500">{panel.characters.join(', ')}</span>
        )}
      </div>
      <textarea
        value={panel.displayText}
        onChange={(event) => onDisplayTextChange(event.target.value)}
        rows={2}
        className={`${inputClassName} mb-1`}
        placeholder="Texto debajo del panel..."
      />
      <textarea
        value={panel.imageDescription}
        onChange={(event) => onImageDescriptionChange(event.target.value)}
        rows={2}
        className={`${inputClassName} text-graphite-400`}
        placeholder="Descripción visual (en inglés, para el generador de imagen)..."
      />
      {(panel.location || Object.keys(panel.continuity).length > 0) && (
        <div className="mt-1 rounded border border-graphite-800 bg-black/30 p-1">
          {panel.location && <p className="text-[8px] text-graphite-500">Locación: {panel.location}</p>}
          {Object.keys(panel.continuity).length > 0 && (
            <p className="text-[8px] text-graphite-600">
              {Object.entries(panel.continuity).map(([key, value], i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  <span className="text-graphite-500">{key}:</span> {value}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RetryPanelsForm({
  scene,
  retrying,
  retryError,
  onRetry,
}: {
  scene: ScriptBreakdownScene;
  retrying: boolean;
  retryError: string | null;
  onRetry: (sourceText: string) => void;
}): JSX.Element {
  const [sourceText, setSourceText] = useState(scene.sourceText);
  return (
    <div className="mt-1 rounded border border-graphite-800 bg-graphite-950/60 p-1.5">
      <p className="mb-1 text-[9px] text-graphite-500">
        Sin paneles todavía — no se pudo ubicar el texto original de esta escena en el guion. Pegalo acá a mano y
        generá los paneles solo para esta escena.
      </p>
      <textarea
        value={sourceText}
        onChange={(event) => setSourceText(event.target.value)}
        rows={4}
        className={`${inputClassName} mb-1`}
        placeholder="Pegá acá el texto original de esta escena..."
      />
      {retryError && <p className="mb-1 text-[9px] text-red-300">{retryError}</p>}
      <button
        type="button"
        onClick={() => onRetry(sourceText)}
        disabled={retrying || sourceText.trim().length < 20}
        className="w-full rounded border border-amber-accent px-1.5 py-1 text-[9px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
      >
        {retrying ? 'Generando paneles...' : 'Generar paneles con este texto'}
      </button>
    </div>
  );
}

function SceneCard({
  scene,
  characters,
  retrying,
  retryError,
  gameSceneExists,
  creatingScene,
  onSummaryChange,
  onStatusChange,
  onPanelDisplayTextChange,
  onPanelImageDescriptionChange,
  onRetryPanels,
  onCreateGameScene,
}: {
  scene: ScriptBreakdownScene;
  characters: ScriptBreakdownCharacter[];
  retrying: boolean;
  retryError: string | null;
  /** Si ya existe una escena de juego (ESCENA tab) con este mismo id —
   * cambia el botón de "Crear" a "Abrir" en vez de mostrar los dos. */
  gameSceneExists: boolean;
  creatingScene: boolean;
  onSummaryChange: (summary: string) => void;
  onStatusChange: (status: ScriptBreakdownReviewStatus) => void;
  onPanelDisplayTextChange: (panelId: string, text: string) => void;
  onPanelImageDescriptionChange: (panelId: string, text: string) => void;
  onRetryPanels: (sourceText: string) => void;
  onCreateGameScene: () => void;
}): JSX.Element {
  const [panelsOpen, setPanelsOpen] = useState(false);
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
        <div className="mb-1 rounded border border-sky-400/40 bg-graphite-950 p-1">
          <p className="text-[9px] text-sky-300">Minijuego sugerido: {scene.minigame.template}</p>
          <p className="text-[9px] text-graphite-500">{scene.minigame.reason}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setPanelsOpen((v) => !v)}
        className="mb-1 w-full rounded border border-graphite-700 px-1.5 py-1 text-left text-[9px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
      >
        {panelsOpen ? '▾' : '▸'} Paneles cinemáticos ({scene.panels.length})
      </button>
      <button
        type="button"
        onClick={onCreateGameScene}
        disabled={creatingScene || (!gameSceneExists && scene.panels.length === 0)}
        title={
          scene.panels.length === 0
            ? 'Esta escena todavía no tiene paneles generados.'
            : gameSceneExists
              ? 'Ya existe — abrirla en la pestaña ESCENA para seguir generando sus fondos.'
              : 'Crea la escena de juego (tipo cinemática) con la cola de paneles lista para generar sus fondos uno por uno.'
        }
        className="w-full rounded border border-amber-accent/60 px-1.5 py-1 text-[9px] tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
      >
        {creatingScene ? 'Creando...' : gameSceneExists ? 'Abrir escena de juego →' : 'Crear escena de juego →'}
      </button>
      {panelsOpen && (
        <div className="mt-1">
          {scene.panels.length === 0 ? (
            <RetryPanelsForm scene={scene} retrying={retrying} retryError={retryError} onRetry={onRetryPanels} />
          ) : (
            scene.panels.map((panel) => (
              <PanelCard
                key={panel.id}
                panel={panel}
                onDisplayTextChange={(text) => onPanelDisplayTextChange(panel.id, text)}
                onImageDescriptionChange={(text) => onPanelImageDescriptionChange(panel.id, text)}
              />
            ))
          )}
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
  warnings,
  onGenerate,
  onSceneSummaryChange,
  onSceneStatusChange,
  onPanelDisplayTextChange,
  onPanelImageDescriptionChange,
  scenePanelsRetrying,
  scenePanelsRetryError,
  onRetryScenePanels,
  existingSceneIds,
  creatingScene,
  onCreateGameScene,
}: {
  breakdown: ScriptBreakdown | null;
  generating: boolean;
  error: string | null;
  mergeNote: string | null;
  /** Escenas cuyo desglose en paneles falló al analizar — no se pudo
   * generar TODO en un solo llamado sin arriesgar calidad (ver
   * scriptBreakdownHandlers.ts), así que una escena puntual puede fallar
   * sin tirar abajo el análisis entero. */
  warnings: string[];
  onGenerate: (scriptText: string) => void;
  onSceneSummaryChange: (sceneId: string, summary: string) => void;
  onSceneStatusChange: (sceneId: string, status: ScriptBreakdownReviewStatus) => void;
  onPanelDisplayTextChange: (sceneId: string, panelId: string, text: string) => void;
  onPanelImageDescriptionChange: (sceneId: string, panelId: string, text: string) => void;
  /** Reintento puntual de paneles por escena (pegando el texto a mano) —
   * ver RetryPanelsForm. Claves por sceneId. */
  scenePanelsRetrying: Record<string, boolean>;
  scenePanelsRetryError: Record<string, string>;
  onRetryScenePanels: (sceneId: string, sceneTitle: string, sourceText: string) => void;
  /** Ids de las escenas de juego que ya existen (pestaña ESCENA) — decide si
   * el botón dice "Crear" o "Abrir" para cada escena del desglose. */
  existingSceneIds: string[];
  creatingScene: boolean;
  onCreateGameScene: (sceneId: string) => void;
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
        y si corresponde, un minijuego sugerido) y, dentro de cada escena, un desglose en paneles cinemáticos
        (imagen + texto por panel — abrí &quot;Paneles cinemáticos&quot; en cada escena para verlos). Revisás todo
        acá — aprobar/cortar escenas, ajustar texto de cada panel — sin generar ninguna imagen todavía. Los
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
        {generating
          ? 'Generando (escenas + paneles, puede tardar varios minutos con un guion largo)...'
          : breakdown
            ? 'Generar de nuevo'
            : 'Generar desglose con IA'}
      </button>

      {mergeNote && (
        <p className="mb-3 rounded border border-sky-400/40 bg-graphite-900/60 p-2 text-[9px] text-sky-300">
          {mergeNote}
        </p>
      )}
      {error && <ErrorText message={error} />}
      {warnings.length > 0 && (
        <div className="mb-3 rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
          <p className="mb-1 text-[9px] font-semibold tracking-widest text-amber-accent uppercase">
            {warnings.length} escena{warnings.length === 1 ? '' : 's'} sin paneles (falló el desglose)
          </p>
          {warnings.map((warning, index) => (
            <p key={index} className="text-[9px] text-graphite-400">
              {warning}
            </p>
          ))}
        </div>
      )}

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
              retrying={scenePanelsRetrying[scene.id] ?? false}
              retryError={scenePanelsRetryError[scene.id] ?? null}
              gameSceneExists={existingSceneIds.includes(scene.id)}
              creatingScene={creatingScene}
              onSummaryChange={(summary) => onSceneSummaryChange(scene.id, summary)}
              onStatusChange={(status) => onSceneStatusChange(scene.id, status)}
              onPanelDisplayTextChange={(panelId, text) => onPanelDisplayTextChange(scene.id, panelId, text)}
              onPanelImageDescriptionChange={(panelId, text) =>
                onPanelImageDescriptionChange(scene.id, panelId, text)
              }
              onRetryPanels={(sourceText) => onRetryScenePanels(scene.id, scene.title, sourceText)}
              onCreateGameScene={() => onCreateGameScene(scene.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}
