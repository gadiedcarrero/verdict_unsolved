import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { CharacterEditorPanel } from './editor/CharacterEditorPanel';
import { gameAssetUrl } from './gameAssetUrl';
import { translate } from '../i18n/translate';
import type { EditableRect } from './editor/EditableBox';
import { boundingBoxOfPoints } from './editor/polygonUtils';
import { SceneEditorPanel, type ActionComposerValue } from './editor/SceneEditorPanel';
import { SiteSettingsPanel, type ActionMenuImageKind, type ActionMenuZoneKey } from './editor/SiteSettingsPanel';
import { slugify, uniqueId } from './editor/slug';
import { getGameProject } from '../game-engine/scene-engine/gameProjects';
import type {
  Character,
  CinematicTransition,
  DialogueNode,
  Hotspot,
  HotspotShape,
  InteractWithTarget,
  MenuAppearance,
  MinigameOutcomeAction,
  PolygonPoint,
  Scene,
  SceneAction,
  SceneKind,
  SiteSettings,
  TextStyle,
  TextStyleOverride,
} from '../game-engine/scene-engine/schemas';
import { useSaveStore } from '../game-engine/save-system/save.store';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { DialogueOverlay } from './DialogueOverlay';
import { InterfaceHost } from './interfaces/InterfaceHost';
import { CinematicScene } from './CinematicScene';
import { IntroScene } from './IntroScene';
import { MENU_BUTTON_ACTION_CONTINUE, MENU_BUTTON_ACTION_QUIT } from './menuButtonActions';
import { MenuScene } from './MenuScene';
import { MinigameHost } from './minigames/MinigameHost';
import { resizeCursorImage } from './resizeCursorImage';
import { SceneViewer } from './SceneViewer';
import { ScriptBreakdownPanel } from './editor/ScriptBreakdownPanel';
import {
  mergeScriptBreakdownReview,
  type ScriptBreakdown,
  type ScriptBreakdownCharacter,
  type ScriptBreakdownReviewStatus,
} from '../../shared/script-breakdown';
import type { ElevenLabsVoice } from '../../shared/elevenlabs';
import { EMOTIONS } from '../../shared/emotions';

type EditorTab = 'scene' | 'characters' | 'settings' | 'script-ai';

/** Zona de forma libre en proceso de trazado — todavía no es un hotspot
 * real hasta que se cierra (ver closePolygonDraft). También se usa para
 * "reiniciar forma": ahí se preserva onInteract/repeatable/labelStyle del
 * hotspot existente en vez de perderlos. */
type PolygonDraft = {
  id: string;
  label: string;
  /** Texto a fundir en pendingStrings al cerrar — null si es un reinicio de
   * forma (el texto ya existe y no cambia). */
  labelText: string | null;
  interactable: boolean;
  onInteract: SceneAction[];
  repeatable: boolean;
  labelStyle: TextStyleOverride | undefined;
  labelOffset: PolygonPoint | undefined;
  actionMenuEnabled: boolean;
  onExamine: SceneAction[];
  interactWithTargets: InteractWithTarget[];
  points: PolygonPoint[];
};

const DEFAULT_MENU_APPEARANCE: MenuAppearance = {
  position: 'center',
  buttonStyle: 'bordered',
  fontFamily: 'sans',
  fontSize: 16,
  fontColor: '#e6eaef',
  hoverColor: '#e0a636',
};

/** Recarga completa después de guardar, con un pequeño margen. El archivo se
 * escribe desde el proceso de Electron, pero quien sirve el JSON a la
 * página es Vite (proceso aparte, mirando el filesystem) — recargar
 * inmediatamente después de que el IPC confirma "ok" puede ganarle a Vite
 * a notar el cambio, y la página recargada trae el JSON viejo (una zona
 * recién trazada "desaparecía" hasta cerrar y volver a abrir la app
 * entera, que le da tiempo de sobra a Vite para ponerse al día). */
function reloadAfterSave(): void {
  window.setTimeout(() => window.location.reload(), 400);
}

/** `panel.characters` son nombres (los escribió la IA leyendo el guion, ver
 * PANEL_SYSTEM_PROMPT), no ids — hay que resolverlos contra el roster del
 * desglose para poder mandarle el retrato correcto como referencia visual a
 * `generateBackground`. Coincidencia exacta primero, con fallback laxo por
 * si el nombre del panel viene abreviado o con un apodo. */
function resolvePanelCharacterIds(names: string[], breakdownCharacters: ScriptBreakdownCharacter[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const match =
      breakdownCharacters.find((c) => c.name === name) ??
      breakdownCharacters.find((c) => c.name.includes(name) || name.includes(c.name));
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

export function AdventureRuntime({ gameId, onExit }: { gameId: string; onExit: () => void }): JSX.Element {
  const project = getGameProject(gameId);

  const load = useSaveStore((s) => s.load);
  const isLoaded = useSaveStore((s) => s.isLoaded);
  const persistedAdventureState = useSaveStore((s) => s.adventureCaseState);

  const init = useAdventureRuntimeStore((s) => s.init);
  const bundle = useAdventureRuntimeStore((s) => s.bundle);
  const currentSceneId = useAdventureRuntimeStore((s) => s.currentSceneId);
  // Se leen para forzar el re-render cuando cambian; el valor derivado se
  // recalcula abajo con getActiveScene()/getActiveNode().
  useAdventureRuntimeStore((s) => s.activeDialogueNodeId);
  const activeInterfaceId = useAdventureRuntimeStore((s) => s.activeInterfaceId);
  const transitioning = useAdventureRuntimeStore((s) => s.transitioning);
  const interactHotspot = useAdventureRuntimeStore((s) => s.interactHotspot);
  const activeActionMenuHotspotId = useAdventureRuntimeStore((s) => s.activeActionMenuHotspotId);
  const selectAction = useAdventureRuntimeStore((s) => s.selectAction);
  const closeActionMenu = useAdventureRuntimeStore((s) => s.closeActionMenu);
  const combiningHotspotId = useAdventureRuntimeStore((s) => s.combiningHotspotId);
  const interactWithFallbackVisible = useAdventureRuntimeStore((s) => s.interactWithFallbackVisible);
  const activeBackgroundId = useAdventureRuntimeStore((s) => s.activeBackgroundId);
  const advance = useAdventureRuntimeStore((s) => s.advance);
  const selectChoice = useAdventureRuntimeStore((s) => s.selectChoice);
  const getActiveScene = useAdventureRuntimeStore((s) => s.getActiveScene);
  const getActiveNode = useAdventureRuntimeStore((s) => s.getActiveNode);
  const playFromScene = useAdventureRuntimeStore((s) => s.playFromScene);
  const resetRuntime = useAdventureRuntimeStore((s) => s.reset);

  // Modo edición: arrastrar/redimensionar objetos, crear zonas nuevas, editar
  // el roster de personajes, y guardar todo directo en el JSON fuente (solo
  // en `pnpm dev`). Arranca directo en modo edición en dev — como el editor
  // de Unity — para no depender de que ya exista una escena jugable.
  const [editMode, setEditMode] = useState(() => import.meta.env.DEV);

  // Qué pestaña del editor está abierta (Escena/Personajes/Ajustes). Se
  // persiste porque cada "Guardar cambios" recarga la página entera (ver
  // handleSave) — sin esto, guardar en Ajustes te devolvía siempre a la
  // pestaña Escena, dando la sensación de que "no guardó".
  const editorTabStorageKey = `verdictUnsolved.editorTab.${gameId}`;
  const [editorTab, setEditorTabState] = useState<EditorTab>(() => {
    const stored = localStorage.getItem(editorTabStorageKey);
    return stored === 'scene' || stored === 'characters' || stored === 'settings' || stored === 'script-ai'
      ? stored
      : 'scene';
  });
  function setEditorTab(tab: EditorTab): void {
    localStorage.setItem(editorTabStorageKey, tab);
    setEditorTabState(tab);
  }

  // Ancho del panel de herramientas a la izquierda, a gusto del usuario
  // (arrastrando el borde) — global, no por juego, porque es una preferencia
  // de la interfaz del editor, no del contenido. Clamp para que no desaparezca
  // ni tape toda la pantalla.
  const SIDEBAR_MIN_WIDTH = 260;
  const SIDEBAR_MAX_WIDTH = 900;
  const sidebarWidthStorageKey = 'verdictUnsolved.editorSidebarWidth';
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem(sidebarWidthStorageKey));
    return Number.isFinite(stored) && stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : 320;
  });
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  function startSidebarResize(event: ReactMouseEvent): void {
    event.preventDefault();
    setResizingSidebar(true);
    function onMouseMove(moveEvent: MouseEvent): void {
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, moveEvent.clientX));
      setSidebarWidth(next);
    }
    function onMouseUp(): void {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizingSidebar(false);
      localStorage.setItem(sidebarWidthStorageKey, String(sidebarWidthRef.current));
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Retrato/expresión sobre el que se hizo click en la pestaña Personajes,
  // para mostrarlo grande del lado derecho (las miniaturas de la lista son
  // chicas a propósito, para que quepan muchas). null = nada seleccionado
  // todavía, o se cambió de pestaña.
  const [previewedPortrait, setPreviewedPortrait] = useState<string | null>(null);

  // Qué escena se está editando: puede ser distinta de `currentSceneId`
  // (la del juego real) — el editor deja navegar/editar cualquier escena.
  // `null` = seguir a la escena actual del juego. Se persiste porque cada
  // "Guardar cambios" recarga la página entera (ver handleSave) — sin
  // esto, guardar te devolvía a la escena que el juego tenía activa.
  const editorSceneStorageKey = `verdictUnsolved.editorScene.${gameId}`;
  const [editorSceneId, setEditorSceneIdState] = useState<string | null>(() =>
    localStorage.getItem(editorSceneStorageKey),
  );
  function setEditorSceneId(sceneId: string | null): void {
    if (sceneId) localStorage.setItem(editorSceneStorageKey, sceneId);
    else localStorage.removeItem(editorSceneStorageKey);
    setEditorSceneIdState(sceneId);
  }

  const [editedScene, setEditedScene] = useState<Scene | null>(null);
  // Texto (clave → texto en ES) nuevo o editado en esta sesión de edición,
  // pendiente de fundirse con locales/es.json al guardar.
  const [pendingStrings, setPendingStrings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [generatingBackground, setGeneratingBackground] = useState(false);
  const [backgroundGenError, setBackgroundGenError] = useState<string | null>(null);
  const [creatingScene, setCreatingScene] = useState(false);

  const [editedCharacters, setEditedCharacters] = useState<Character[] | null>(null);
  const [pendingCharacterStrings, setPendingCharacterStrings] = useState<Record<string, string>>({});
  const [characterSaving, setCharacterSaving] = useState(false);
  const [characterSaveMessage, setCharacterSaveMessage] = useState<string | null>(null);
  const [uploadingPortraitId, setUploadingPortraitId] = useState<string | null>(null);
  // "<characterId>:<expresión>" mientras se sube una variante adicional de
  // retrato (ver Character.expressions) — separado de uploadingPortraitId
  // porque ese es solo para el retrato por defecto.
  const [uploadingExpressionKey, setUploadingExpressionKey] = useState<string | null>(null);
  // Id de personaje del desglose (Guion IA) para el que se está generando un
  // retrato con IA en este momento, o null.
  // "<characterId>" (retrato por defecto) o "<characterId>:<expresión>" por
  // cada generación en curso — array en vez de un solo id porque es normal
  // disparar varias en paralelo (personaje + sus identidades alternativas).
  const [generatingCharacterArtIds, setGeneratingCharacterArtIds] = useState<string[]>([]);
  // Mismas claves que generatingCharacterArtIds ("<characterId>" o
  // "<characterId>:<expresión>") → mensaje de error de ESA generación
  // puntual. Separado de characterSaveMessage a propósito: generando varios
  // personajes seguidos, el error del primero quedaba pisado apenas
  // arrancaba la generación del segundo (era un solo mensaje compartido) —
  // acá cada uno tiene el suyo y no se toca hasta que se reintenta esa
  // generación en particular.
  const [characterArtErrors, setCharacterArtErrors] = useState<Record<string, string>>({});
  // Voltear un retrato reescribe el archivo en el MISMO path — sin esto, el
  // <img> sigue mostrando la versión vieja cacheada por el navegador porque
  // la URL no cambió. Clave = path relativo (ej. "portraits/adrian.png"),
  // valor = contador que se suma a la URL como cache-buster.
  const [portraitCacheBust, setPortraitCacheBust] = useState<Record<string, number>>({});
  const [flippingPortraitPath, setFlippingPortraitPath] = useState<string | null>(null);

  // Ningún proveedor de imagen genera perfecto a la primera — en vez de que
  // cada corrección puntual necesite pedírmela por chat, esto deja
  // corregir CUALQUIER imagen ya generada (fondo de escena, retrato) en
  // texto libre directo desde el editor. `editingImagePath` no null = hay
  // un panel de edición abierto para ese path relativo (reemplaza el
  // visor normal de la escena mientras está abierto).
  const [editingImagePath, setEditingImagePath] = useState<string | null>(null);
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [imageEditGenerating, setImageEditGenerating] = useState(false);
  const [imageEditError, setImageEditError] = useState<string | null>(null);
  // Imágenes sueltas subidas desde la computadora del usuario (no assets
  // del juego) para guiar la corrección puntual — "usá esta pose", "el
  // estilo de esta referencia" — se mandan junto con la instrucción, no
  // reemplazan a la imagen que se está editando.
  const [imageEditReferences, setImageEditReferences] = useState<
    { name: string; bytes: Uint8Array; previewUrl: string }[]
  >([]);
  const imageEditReferenceInputRef = useRef<HTMLInputElement>(null);
  const [draggingImageReference, setDraggingImageReference] = useState(false);

  const [editedSiteSettings, setEditedSiteSettings] = useState<SiteSettings | null>(null);
  const [siteSettingsSaving, setSiteSettingsSaving] = useState(false);
  const [siteSettingsSaveMessage, setSiteSettingsSaveMessage] = useState<string | null>(null);
  const [uploadingCursor, setUploadingCursor] = useState<'default' | 'hover' | null>(null);
  const [uploadingActionMenuImage, setUploadingActionMenuImage] = useState<ActionMenuImageKind | null>(null);

  // Desglose de guion generado por IA (paso 3 del pipeline, ver
  // docs/plataforma/00-vision-ia.md) — a diferencia de escena/personajes/
  // ajustes, cada cambio se persiste solo (no hay "Guardar cambios"/
  // "Descartar" acá): es un documento de revisión, no una estructura
  // versionada a mano, y regenerarlo cuesta un llamado real a OpenAI que no
  // conviene arriesgar a perder por cerrar la pestaña.
  const [scriptBreakdown, setScriptBreakdown] = useState<ScriptBreakdown | null>(null);
  const [scriptBreakdownGenerating, setScriptBreakdownGenerating] = useState(false);
  const [scriptBreakdownError, setScriptBreakdownError] = useState<string | null>(null);
  const [scriptBreakdownMergeNote, setScriptBreakdownMergeNote] = useState<string | null>(null);
  // Escenas cuyo desglose en paneles falló (ver generateScenePanels en
  // scriptBreakdownHandlers.ts) — no aborta el análisis entero, pero el
  // usuario tiene que saber cuáles quedaron sin paneles para reintentar.
  const [scriptBreakdownWarnings, setScriptBreakdownWarnings] = useState<string[]>([]);
  // Reintento puntual de paneles para UNA escena (pegando el texto a mano) —
  // por sceneId, no un solo booleano global, porque el usuario puede tener
  // varias escenas sin paneles a la vez.
  const [scenePanelsRetrying, setScenePanelsRetrying] = useState<Record<string, boolean>>({});
  const [scenePanelsRetryError, setScenePanelsRetryError] = useState<Record<string, string>>({});

  // Voces de ElevenLabs disponibles en la cuenta — se piden a mano (botón
  // "Cargar voces" en Personajes), no en cada apertura del editor, mismo
  // criterio que el resto de los llamados a IA de esta pestaña.
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[] | null>(null);
  const [elevenLabsVoicesLoading, setElevenLabsVoicesLoading] = useState(false);
  const [elevenLabsVoicesError, setElevenLabsVoicesError] = useState<string | null>(null);

  // Zona de forma libre en proceso de trazado (ver "Crear zona" o "Reiniciar
  // forma") — no null mientras se están juntando puntos a click.
  const [polygonDraft, setPolygonDraft] = useState<PolygonDraft | null>(null);

  // Cambiar de escena (o salir del modo edición) resetea `editedScene` y
  // `polygonDraft` sin avisar — antes se perdía en silencio una zona a
  // medio trazar o cualquier cambio sin guardar. Esta guarda confirma antes
  // de descartar.
  function confirmDiscardUnsavedSceneEdits(): boolean {
    if (editedScene === null && polygonDraft === null) return true;
    return window.confirm(
      'Tenés cambios sin guardar en esta escena (por ejemplo, una zona a medio trazar) — se van a perder si cambiás de escena ahora. ¿Seguir igual?',
    );
  }

  function switchEditorScene(sceneId: string): void {
    if (!confirmDiscardUnsavedSceneEdits()) return;
    setEditorSceneId(sceneId);
  }

  useEffect(() => {
    void load(gameId);
  }, [load, gameId]);

  useEffect(() => {
    setScriptBreakdown(null);
    setScriptBreakdownError(null);
    void window.api.readScriptBreakdown(gameId).then((result) => {
      if (result.ok) setScriptBreakdown(result.breakdown);
    });
  }, [gameId]);

  useEffect(() => {
    if (isLoaded && project?.result.ok && !bundle) {
      init(project.result.data, persistedAdventureState);
    }
  }, [isLoaded, bundle, init, persistedAdventureState, project]);

  // Cargar la lista de voces de ElevenLabs a mano (un botón aparte antes de
  // que existiera esto) era demasiado fácil de pasar por alto — se abría el
  // desplegable de un personaje sin haber cargado nada y parecía roto. Se
  // pide sola una vez al entrar a Personajes; si falla (key faltante, etc.)
  // no reintenta sola en cada cambio de pestaña, pero el botón "Recargar
  // voces" sigue disponible a mano.
  useEffect(() => {
    if (editorTab === 'characters' && elevenLabsVoices === null && !elevenLabsVoicesLoading && !elevenLabsVoicesError) {
      void loadElevenLabsVoices();
    }
  }, [editorTab]);

  const activeEditorSceneId = editorSceneId ?? currentSceneId;

  useEffect(() => {
    setEditedScene(null);
    setPendingStrings({});
    setSaveMessage(null);
    setPolygonDraft(null);
  }, [activeEditorSceneId]);

  if (!project) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-graphite-950 p-8 text-center text-graphite-200">
        <p>
          Proyecto &quot;{gameId}&quot; no encontrado.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          Volver al selector de proyectos
        </button>
      </div>
    );
  }

  if (!project.result.ok) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 p-8 text-center text-graphite-200">
        <p>
          No se pudo cargar el juego.
          <br />
          <span className="text-sm text-graphite-400">{project.result.error}</span>
        </p>
      </div>
    );
  }

  if (!isLoaded || !bundle) {
    return <div className="h-screen w-screen bg-graphite-950" />;
  }

  const allScenes = bundle.scenes;
  // En modo edición se puede navegar y editar cualquier escena, no solo la
  // que el estado de juego tiene activa ahora mismo.
  const baseScene = editMode ? (allScenes.find((s) => s.id === activeEditorSceneId) ?? null) : getActiveScene();
  const activeNode = getActiveNode();
  const displayScene = editedScene ?? baseScene;
  // Cola de paneles pendientes para "crear escena de juego" desde el
  // desglose de guion (ver createSceneFromBreakdown/PendingPanelQueue): se
  // deriva sola de cuántos fondos ya tiene la escena — el panel N ya está
  // generado si hay al menos N fondos, así que no hace falta guardar
  // ningún estado extra ni marcar qué panel corresponde a qué fondo.
  const breakdownSceneForDisplay =
    scriptBreakdown?.scenes.find((s) => s.id === displayScene?.id) ?? null;
  const nextPendingPanel =
    breakdownSceneForDisplay && displayScene && breakdownSceneForDisplay.panels.length > displayScene.backgrounds.length
      ? breakdownSceneForDisplay.panels[displayScene.backgrounds.length]
      : null;
  const pendingBreakdownPanel =
    nextPendingPanel && breakdownSceneForDisplay && displayScene
      ? {
          imageDescription: nextPendingPanel.imageDescription,
          displayText: nextPendingPanel.displayText,
          index: displayScene.backgrounds.length,
          total: breakdownSceneForDisplay.panels.length,
        }
      : null;
  const baseCharacters = bundle.characters;
  const displayCharacters = editedCharacters ?? baseCharacters;
  const baseSiteSettings = bundle.siteSettings;
  const displaySiteSettings = editedSiteSettings ?? baseSiteSettings;

  // Un "objeto" del editor es una capa y su hotspot (si existe) con el mismo
  // id — se mueven juntos porque representan la misma cosa en pantalla. Ver
  // editor/editableObjects.ts.
  function updateObjectRect(objectId: string, rect: EditableRect): void {
    setEditedScene((prev) => {
      const base = prev ?? baseScene;
      if (!base) return prev;
      const hasLayer = base.layers.some((layer) => layer.id === objectId);
      return {
        ...base,
        layers: hasLayer
          ? base.layers.map((layer) => (layer.id === objectId ? { ...layer, ...rect } : layer))
          : base.layers,
        hotspots: base.hotspots.map((hotspot) => (hotspot.id === objectId ? { ...hotspot, area: rect } : hotspot)),
      };
    });
  }

  // Tilda/destilda si un objeto responde al mouse. Si todavía no tiene
  // hotspot (capa puramente decorativa), tildar crea uno nuevo con una clave
  // de traducción propia; si ya existe, solo cambia su flag `interactable`
  // (la zona sigue ahí, solo deja de reaccionar).
  function toggleInteractable(objectId: string, interactable: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const hasHotspot = base.hotspots.some((h) => h.id === objectId);
    if (hasHotspot) {
      setEditedScene({
        ...base,
        hotspots: base.hotspots.map((h) => (h.id === objectId ? { ...h, interactable } : h)),
      });
      return;
    }
    const layer = base.layers.find((l) => l.id === objectId);
    if (!layer) return;
    const labelKey = `hotspot.${base.id}.${objectId}`;
    setEditedScene({
      ...base,
      hotspots: [
        ...base.hotspots,
        {
          id: layer.id,
          label: labelKey,
          area: { x: layer.x, y: layer.y, width: layer.width ?? 10, height: layer.height ?? 10 },
          shape: 'rect',
          onInteract: [],
          repeatable: true,
          interactable,
          actionMenuEnabled: false,
          onExamine: [],
          interactWithTargets: [],
        },
      ],
    });
    setPendingStrings((prev) => (labelKey in prev ? prev : { ...prev, [labelKey]: objectId }));
  }

  // Crea una zona nueva directamente sobre la escena. "rect" se crea al
  // toque con un tamaño por defecto; "polygon" arranca un trazado a click
  // (ver polygonDraft) que recién se convierte en hotspot al cerrarse.
  function createZone(name: string, labelText: string, interactable: boolean, shape: HotspotShape): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const taken = new Set([...base.hotspots.map((h) => h.id), ...base.layers.map((l) => l.id)]);
    const id = uniqueId(slugify(name), taken);
    const labelKey = `hotspot.${base.id}.${id}`;

    if (shape === 'polygon') {
      setPolygonDraft({
        id,
        label: labelKey,
        labelText,
        interactable,
        onInteract: [],
        repeatable: true,
        labelStyle: undefined,
        labelOffset: undefined,
        actionMenuEnabled: false,
        onExamine: [],
        interactWithTargets: [],
        points: [],
      });
      return;
    }

    setEditedScene({
      ...base,
      hotspots: [
        ...base.hotspots,
        {
          id,
          label: labelKey,
          area: { x: 40, y: 40, width: 15, height: 15 },
          shape: 'rect',
          onInteract: [],
          repeatable: true,
          interactable,
          actionMenuEnabled: false,
          onExamine: [],
          interactWithTargets: [],
        },
      ],
    });
    setPendingStrings((prev) => ({ ...prev, [labelKey]: labelText }));
  }

  function setLabelText(labelKey: string, text: string): void {
    setPendingStrings((prev) => ({ ...prev, [labelKey]: text }));
  }

  function updateHotspotLabelStyle(objectId: string, patch: Partial<TextStyleOverride> | null): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) =>
        h.id === objectId ? { ...h, labelStyle: patch === null ? undefined : { ...(h.labelStyle ?? {}), ...patch } } : h,
      ),
    });
  }

  // "actionMenuEnabled": si es true, un click en la zona abre el menú de
  // acción (Examinar/Interactuar/Interactuar con/Cerrar) en vez de correr
  // onInteract directo — ver ActionMenu.tsx y SiteSettings.actionMenu para
  // el arte, que es global para todo el juego.
  function setActionMenuEnabled(objectId: string, enabled: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) => (h.id === objectId ? { ...h, actionMenuEnabled: enabled } : h)),
    });
  }

  type ActionSlot = 'onExamine' | 'onInteract';
  const ACTION_SLOT_KEY: Record<ActionSlot, string> = {
    onExamine: 'examine',
    onInteract: 'interact',
  };

  function dialogueNodeIdFor(sceneId: string, objectId: string, slot: ActionSlot): string {
    return `dialogue.${sceneId}.${objectId}.${ACTION_SLOT_KEY[slot]}`;
  }

  function actionComposerValue(base: Scene, objectId: string, slot: ActionSlot): ActionComposerValue {
    const actions = base.hotspots.find((h) => h.id === objectId)?.[slot] ?? [];
    const backgroundAction = actions.find((a) => a.type === 'toggleBackground');
    const sceneAction = actions.find((a) => a.type === 'transitionTo');
    const dialogueAction = actions.find((a) => a.type === 'dialogue');
    const node = dialogueAction?.type === 'dialogue' ? base.dialogueNodes[dialogueAction.nodeId] : undefined;
    return {
      backgroundIdA: backgroundAction?.type === 'toggleBackground' ? backgroundAction.backgroundIdA : '',
      backgroundIdB: backgroundAction?.type === 'toggleBackground' ? backgroundAction.backgroundIdB : '',
      sceneId: sceneAction?.type === 'transitionTo' ? sceneAction.sceneId : '',
      characterId: node?.speaker ?? '',
      dialogueText: node ? (strings[node.line] ?? '') : '',
      portraitExpression: node?.portraitExpression ?? '',
    };
  }

  // Compone hasta tres cosas por acción de objeto (Examinar/Interactuar/
  // Interactuar con): qué dos fondos alterna, a qué escena pasa, y qué dice
  // qué personaje — en ese orden (ver runActions/transitionToScene en el
  // store, que difieren el diálogo hasta después del fundido). El diálogo
  // es una línea suelta, autogenerada acá y guardada en Scene.dialogueNodes,
  // no un nodo del guion armado a mano con choices — para eso se sigue
  // editando el JSON de dialogues/ directamente.
  function updateActionComposer(objectId: string, slot: ActionSlot, patch: Partial<ActionComposerValue>): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const next = { ...actionComposerValue(base, objectId, slot), ...patch };
    const nodeId = dialogueNodeIdFor(base.id, objectId, slot);

    const actions: SceneAction[] = [];
    if (next.backgroundIdA && next.backgroundIdB) {
      actions.push({ type: 'toggleBackground', backgroundIdA: next.backgroundIdA, backgroundIdB: next.backgroundIdB });
    }
    if (next.sceneId) actions.push({ type: 'transitionTo', sceneId: next.sceneId, fade: 'fade' });
    if (next.characterId) actions.push({ type: 'dialogue', nodeId });

    const dialogueNodes: Record<string, DialogueNode> = { ...base.dialogueNodes };
    if (next.characterId) {
      dialogueNodes[nodeId] = {
        id: nodeId,
        speaker: next.characterId,
        line: nodeId,
        portraitExpression: next.portraitExpression || undefined,
      };
      setPendingStrings((prev) => ({ ...prev, [nodeId]: next.dialogueText }));
    } else {
      delete dialogueNodes[nodeId];
    }

    setEditedScene({
      ...base,
      dialogueNodes,
      hotspots: base.hotspots.map((h) => (h.id === objectId ? { ...h, [slot]: actions } : h)),
    });
  }

  function interactWithNodeId(sceneId: string, objectId: string, targetObjectId: string): string {
    return `dialogue.${sceneId}.${objectId}.interactWith.${targetObjectId}`;
  }

  function interactWithComposerValue(base: Scene, objectId: string, targetObjectId: string): ActionComposerValue {
    const entry = base.hotspots
      .find((h) => h.id === objectId)
      ?.interactWithTargets.find((t) => t.targetObjectId === targetObjectId);
    const actions = entry?.onInteract ?? [];
    const backgroundAction = actions.find((a) => a.type === 'toggleBackground');
    const sceneAction = actions.find((a) => a.type === 'transitionTo');
    const dialogueAction = actions.find((a) => a.type === 'dialogue');
    const node = dialogueAction?.type === 'dialogue' ? base.dialogueNodes[dialogueAction.nodeId] : undefined;
    return {
      backgroundIdA: backgroundAction?.type === 'toggleBackground' ? backgroundAction.backgroundIdA : '',
      backgroundIdB: backgroundAction?.type === 'toggleBackground' ? backgroundAction.backgroundIdB : '',
      sceneId: sceneAction?.type === 'transitionTo' ? sceneAction.sceneId : '',
      characterId: node?.speaker ?? '',
      dialogueText: node ? (strings[node.line] ?? '') : '',
      portraitExpression: node?.portraitExpression ?? '',
    };
  }

  // "Interactuar con" no corre una acción fija — cada combinación de dos
  // objetos (diario + tijera) tiene la suya, guardada en
  // Hotspot.interactWithTargets. Ver combiningHotspotId/selectCombineTarget
  // en el store para cómo se resuelve en el juego.
  function updateInteractWithTargetAction(
    objectId: string,
    targetObjectId: string,
    patch: Partial<ActionComposerValue>,
  ): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const next = { ...interactWithComposerValue(base, objectId, targetObjectId), ...patch };
    const nodeId = interactWithNodeId(base.id, objectId, targetObjectId);

    const actions: SceneAction[] = [];
    if (next.backgroundIdA && next.backgroundIdB) {
      actions.push({ type: 'toggleBackground', backgroundIdA: next.backgroundIdA, backgroundIdB: next.backgroundIdB });
    }
    if (next.sceneId) actions.push({ type: 'transitionTo', sceneId: next.sceneId, fade: 'fade' });
    if (next.characterId) actions.push({ type: 'dialogue', nodeId });

    const dialogueNodes: Record<string, DialogueNode> = { ...base.dialogueNodes };
    if (next.characterId) {
      dialogueNodes[nodeId] = {
        id: nodeId,
        speaker: next.characterId,
        line: nodeId,
        portraitExpression: next.portraitExpression || undefined,
      };
      setPendingStrings((prev) => ({ ...prev, [nodeId]: next.dialogueText }));
    } else {
      delete dialogueNodes[nodeId];
    }

    setEditedScene({
      ...base,
      dialogueNodes,
      hotspots: base.hotspots.map((h) =>
        h.id === objectId
          ? {
              ...h,
              interactWithTargets: h.interactWithTargets.map((t) =>
                t.targetObjectId === targetObjectId ? { ...t, onInteract: actions } : t,
              ),
            }
          : h,
      ),
    });
  }

  function addInteractWithTarget(objectId: string, targetObjectId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) =>
        h.id === objectId
          ? { ...h, interactWithTargets: [...h.interactWithTargets, { targetObjectId, onInteract: [] }] }
          : h,
      ),
    });
  }

  function removeInteractWithTarget(objectId: string, targetObjectId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const nodeId = interactWithNodeId(base.id, objectId, targetObjectId);
    const dialogueNodes = { ...base.dialogueNodes };
    delete dialogueNodes[nodeId];
    setEditedScene({
      ...base,
      dialogueNodes,
      hotspots: base.hotspots.map((h) =>
        h.id === objectId
          ? { ...h, interactWithTargets: h.interactWithTargets.filter((t) => t.targetObjectId !== targetObjectId) }
          : h,
      ),
    });
  }

  // "Interactuar" de un objeto puede componer escena+diálogo (lo de
  // arriba) O abrir un minijuego — son alternativas, no se combinan. Un
  // minijuego se detecta mirando si onInteract[0] es del tipo
  // "openMinigame"; activarlo/desactivarlo reemplaza todo el campo.
  function setMinigameEnabled(objectId: string, enabled: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) =>
        h.id === objectId
          ? {
              ...h,
              onInteract: enabled
                ? [{ type: 'openMinigame', template: 'sequence', sequenceLength: 4, onSuccess: [], onFail: [] }]
                : [],
            }
          : h,
      ),
    });
  }

  function updateMinigameSequenceLength(objectId: string, sequenceLength: number): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) => {
        if (h.id !== objectId) return h;
        const action = h.onInteract[0];
        if (action?.type !== 'openMinigame') return h;
        return { ...h, onInteract: [{ ...action, sequenceLength }] };
      }),
    });
  }

  function minigameOutcomeNodeId(sceneId: string, objectId: string, outcome: 'onSuccess' | 'onFail'): string {
    return `dialogue.${sceneId}.${objectId}.minigame.${outcome}`;
  }

  function minigameOutcomeComposerValue(base: Scene, objectId: string, outcome: 'onSuccess' | 'onFail'): ActionComposerValue {
    const action = base.hotspots.find((h) => h.id === objectId)?.onInteract[0];
    const actions: SceneAction[] = action?.type === 'openMinigame' ? action[outcome] : [];
    const backgroundAction = actions.find((a) => a.type === 'toggleBackground');
    const sceneAction = actions.find((a) => a.type === 'transitionTo');
    const dialogueAction = actions.find((a) => a.type === 'dialogue');
    const node = dialogueAction?.type === 'dialogue' ? base.dialogueNodes[dialogueAction.nodeId] : undefined;
    return {
      backgroundIdA: backgroundAction?.type === 'toggleBackground' ? backgroundAction.backgroundIdA : '',
      backgroundIdB: backgroundAction?.type === 'toggleBackground' ? backgroundAction.backgroundIdB : '',
      sceneId: sceneAction?.type === 'transitionTo' ? sceneAction.sceneId : '',
      characterId: node?.speaker ?? '',
      dialogueText: node ? (strings[node.line] ?? '') : '',
      portraitExpression: node?.portraitExpression ?? '',
    };
  }

  function updateMinigameOutcome(
    objectId: string,
    outcome: 'onSuccess' | 'onFail',
    patch: Partial<ActionComposerValue>,
  ): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const next = { ...minigameOutcomeComposerValue(base, objectId, outcome), ...patch };
    const nodeId = minigameOutcomeNodeId(base.id, objectId, outcome);

    const actions: MinigameOutcomeAction[] = [];
    if (next.backgroundIdA && next.backgroundIdB) {
      actions.push({ type: 'toggleBackground', backgroundIdA: next.backgroundIdA, backgroundIdB: next.backgroundIdB });
    }
    if (next.sceneId) actions.push({ type: 'transitionTo', sceneId: next.sceneId, fade: 'fade' });
    if (next.characterId) actions.push({ type: 'dialogue', nodeId });

    const dialogueNodes: Record<string, DialogueNode> = { ...base.dialogueNodes };
    if (next.characterId) {
      dialogueNodes[nodeId] = {
        id: nodeId,
        speaker: next.characterId,
        line: nodeId,
        portraitExpression: next.portraitExpression || undefined,
      };
      setPendingStrings((prev) => ({ ...prev, [nodeId]: next.dialogueText }));
    } else {
      delete dialogueNodes[nodeId];
    }

    setEditedScene({
      ...base,
      dialogueNodes,
      hotspots: base.hotspots.map((h) => {
        if (h.id !== objectId) return h;
        const action = h.onInteract[0];
        if (action?.type !== 'openMinigame') return h;
        return { ...h, onInteract: [{ ...action, [outcome]: actions }] };
      }),
    });
  }

  function updatePolygonPoints(objectId: string, points: PolygonPoint[]): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) =>
        h.id === objectId ? { ...h, points, area: boundingBoxOfPoints(points) } : h,
      ),
    });
  }

  function updateLabelPosition(objectId: string, position: PolygonPoint): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      hotspots: base.hotspots.map((h) => (h.id === objectId ? { ...h, labelOffset: position } : h)),
    });
  }

  // "Reiniciar forma": saca el hotspot existente y arranca un trazado nuevo
  // con el mismo id/texto/acciones — solo cambian los puntos.
  function resetShape(objectId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const hotspot = base.hotspots.find((h) => h.id === objectId);
    if (!hotspot) return;
    setEditedScene({ ...base, hotspots: base.hotspots.filter((h) => h.id !== objectId) });
    setPolygonDraft({
      id: hotspot.id,
      label: hotspot.label,
      labelText: null,
      interactable: hotspot.interactable,
      onInteract: hotspot.onInteract,
      repeatable: hotspot.repeatable,
      labelStyle: hotspot.labelStyle,
      labelOffset: hotspot.labelOffset,
      actionMenuEnabled: hotspot.actionMenuEnabled,
      onExamine: hotspot.onExamine,
      interactWithTargets: hotspot.interactWithTargets,
      points: [],
    });
  }

  // Elimina la zona clickeable de un objeto. Si tenía capa/imagen propia
  // (sprite), la capa queda — solo deja de ser interactuable, como si nunca
  // se hubiera tildado. Si era una zona pura (sin imagen), desaparece del
  // todo de la lista de objetos.
  function removeHotspot(objectId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, hotspots: base.hotspots.filter((h) => h.id !== objectId) });
  }

  function addPolygonDraftPoint(point: PolygonPoint): void {
    setPolygonDraft((prev) => (prev ? { ...prev, points: [...prev.points, point] } : prev));
  }

  function cancelPolygonDraft(): void {
    setPolygonDraft(null);
  }

  function closePolygonDraft(): void {
    if (!polygonDraft || polygonDraft.points.length < 3) return;
    const base = editedScene ?? baseScene;
    if (!base) return;
    const newHotspot: Hotspot = {
      id: polygonDraft.id,
      label: polygonDraft.label,
      area: boundingBoxOfPoints(polygonDraft.points),
      shape: 'polygon',
      points: polygonDraft.points,
      onInteract: polygonDraft.onInteract,
      repeatable: polygonDraft.repeatable,
      interactable: polygonDraft.interactable,
      labelStyle: polygonDraft.labelStyle,
      labelOffset: polygonDraft.labelOffset,
      actionMenuEnabled: polygonDraft.actionMenuEnabled,
      onExamine: polygonDraft.onExamine,
      interactWithTargets: polygonDraft.interactWithTargets,
    };
    setEditedScene({ ...base, hotspots: [...base.hotspots, newHotspot] });
    if (polygonDraft.labelText !== null) {
      const text = polygonDraft.labelText;
      setPendingStrings((prev) => ({ ...prev, [polygonDraft.label]: text }));
    }
    setPolygonDraft(null);
  }

  // Fondos: cada escena puede tener varios (luz prendida/apagada, flashes de
  // relámpago...), numerados automáticamente. El primero de la lista es el
  // que se ve por defecto — a cuál se pasa según qué objeto todavía no está
  // resuelto, queda para más adelante.
  function nextBackgroundId(base: Scene): string {
    const takenBgIds = new Set(base.backgrounds.map((bg) => bg.id));
    let n = base.backgrounds.length + 1;
    let bgId = `bg-${n}`;
    while (takenBgIds.has(bgId)) {
      n += 1;
      bgId = `bg-${n}`;
    }
    return bgId;
  }

  async function addBackground(file: File): Promise<void> {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setUploadingBackground(true);
    setSaveMessage(null);
    try {
      const bgId = nextBackgroundId(base);
      const ext = file.name.split('.').pop() || 'png';
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await window.api.saveSceneBackground(gameId, `${base.id}-${bgId}`, ext, buffer);
      if (result.ok) {
        setEditedScene({ ...base, backgrounds: [...base.backgrounds, { id: bgId, assetPath: result.path }] });
      } else {
        setSaveMessage(`Error subiendo fondo: ${result.error}`);
      }
    } catch (error) {
      setSaveMessage(`Error subiendo fondo: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingBackground(false);
    }
  }

  // Antes la IA elegía sola qué personajes meter en un fondo (a partir del
  // desglose de guion) y salía mal — caras genéricas, gente de más. Ahora
  // el usuario los elige a mano en el editor y cada uno manda su propio
  // retrato ya generado como referencia, para que el modelo use la cara
  // real en vez de reinventarla desde la descripción de texto.
  async function generateBackgroundWithAi(prompt: string, characterIds: string[], caption?: string): Promise<void> {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setGeneratingBackground(true);
    setBackgroundGenError(null);
    try {
      const characterRefs = characterIds
        .map((id) => displayCharacters.find((c) => c.id === id))
        .filter((c): c is Character => Boolean(c?.portrait))
        .map((c) => ({ name: translate(strings, c.name), description: c.description, portraitPath: c.portrait! }));
      const bgId = nextBackgroundId(base);
      const result = await window.api.generateBackground(gameId, `${base.id}-${bgId}`, prompt, characterRefs);
      if (result.ok) {
        setEditedScene({ ...base, backgrounds: [...base.backgrounds, { id: bgId, assetPath: result.path, caption }] });
      } else {
        setBackgroundGenError(result.error);
      }
    } catch (error) {
      setBackgroundGenError(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingBackground(false);
    }
  }

  // Genera el fondo del próximo panel pendiente de la cola (ver
  // pendingBreakdownPanel arriba) — resuelve los personajes de ESE panel
  // puntual (no todos los de la escena) contra el roster del desglose para
  // mandar sus retratos como referencia, y precompleta el pie de foto con
  // el texto del panel.
  async function generatePendingPanelBackground(prompt: string, caption: string): Promise<void> {
    const base = editedScene ?? baseScene;
    if (!base || !scriptBreakdown) return;
    const breakdownScene = scriptBreakdown.scenes.find((s) => s.id === base.id);
    const panel = breakdownScene?.panels[base.backgrounds.length];
    if (!panel) return;
    const characterIds = resolvePanelCharacterIds(panel.characters, scriptBreakdown.characters);
    await generateBackgroundWithAi(prompt, characterIds, caption);
  }

  function removeBackground(bgId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, backgrounds: base.backgrounds.filter((bg) => bg.id !== bgId) });
  }

  function updateBackgroundDuration(bgId: string, durationMs: number): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      backgrounds: base.backgrounds.map((bg) => (bg.id === bgId ? { ...bg, durationMs } : bg)),
    });
  }

  // Para logos que no deben ocupar toda la pantalla: color sólido detrás y
  // la imagen a un % de ancho, centrada — ver IntroScene.tsx.
  function updateBackgroundColor(bgId: string, backgroundColor: string | undefined): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      backgrounds: base.backgrounds.map((bg) => (bg.id === bgId ? { ...bg, backgroundColor } : bg)),
    });
  }

  function updateBackgroundImageWidth(bgId: string, imageWidthPercent: number | undefined): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      backgrounds: base.backgrounds.map((bg) => (bg.id === bgId ? { ...bg, imageWidthPercent } : bg)),
    });
  }

  // "intro": secuencia de fondos por tiempo, sin capas/hotspots — ver
  // IntroScene.tsx. `kind` decide si la escena juega así o como point-and-click.
  function updateSceneKind(kind: SceneKind): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, kind });
  }

  function updateIntroSkippable(introSkippable: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, introSkippable });
  }

  function updateIntroCompleteTarget(sceneId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      onIntroComplete: sceneId ? [{ type: 'transitionTo', sceneId, fade: 'fade' }] : [],
    });
  }

  // "cinematica": secuencia de paneles (fondo + texto) por tiempo, sin
  // capas/hotspots — ver CinematicScene.tsx. Mismo patrón que "intro"
  // arriba, con su propio campo de destino (onCinematicComplete) para no
  // mezclar el "al terminar, ir a" de una cinemática con el de un intro.
  function updateBackgroundCaption(bgId: string, caption: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      backgrounds: base.backgrounds.map((bg) => (bg.id === bgId ? { ...bg, caption } : bg)),
    });
  }

  function updateCinematicTransition(cinematicTransition: CinematicTransition): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, cinematicTransition });
  }

  function updateCinematicCompleteTarget(sceneId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({
      ...base,
      onCinematicComplete: sceneId ? [{ type: 'transitionTo', sceneId, fade: 'fade' }] : [],
    });
  }

  // "menu": fondo + botones, sin capas/hotspots — ver MenuScene.tsx.
  function updateMenuAppearance(patch: Partial<MenuAppearance>): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, menuAppearance: { ...base.menuAppearance, ...patch } });
  }

  function addMenuButton(name: string, labelText: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const taken = new Set(base.menuButtons.map((b) => b.id));
    const id = uniqueId(slugify(name), taken);
    const labelKey = `menu.${base.id}.${id}`;
    setEditedScene({
      ...base,
      menuButtons: [...base.menuButtons, { id, label: labelKey, onClick: [] }],
    });
    setPendingStrings((prev) => ({ ...prev, [labelKey]: labelText }));
  }

  function removeMenuButton(buttonId: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setEditedScene({ ...base, menuButtons: base.menuButtons.filter((b) => b.id !== buttonId) });
  }

  function updateMenuButtonTarget(buttonId: string, value: string): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const onClick: Scene['menuButtons'][number]['onClick'] =
      value === ''
        ? []
        : value === MENU_BUTTON_ACTION_CONTINUE
          ? [{ type: 'continueGame' }]
          : value === MENU_BUTTON_ACTION_QUIT
            ? [{ type: 'quitApp' }]
            : [{ type: 'transitionTo', sceneId: value, fade: 'fade' }];
    setEditedScene({
      ...base,
      menuButtons: base.menuButtons.map((b) => (b.id === buttonId ? { ...b, onClick } : b)),
    });
  }

  // Título del menú: `menuTitle` es toda-o-nada (null = sin título), así que
  // activarlo crea el objeto con defaults y una clave de traducción propia.
  function setMenuTitleEnabled(enabled: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    if (!enabled) {
      setEditedScene({ ...base, menuTitle: null });
      return;
    }
    const titleKey = `menu.${base.id}.title`;
    setEditedScene({
      ...base,
      menuTitle: { text: titleKey, fontFamily: 'serif', fontSize: 48, color: '#e6eaef' },
    });
    setPendingStrings((prev) => (titleKey in prev ? prev : { ...prev, [titleKey]: base.id }));
  }

  function updateMenuTitleAppearance(patch: Partial<Omit<NonNullable<Scene['menuTitle']>, 'text'>>): void {
    const base = editedScene ?? baseScene;
    if (!base?.menuTitle) return;
    setEditedScene({ ...base, menuTitle: { ...base.menuTitle, ...patch } });
  }

  // Crea una escena mínima (sin fondos/objetos todavía) y recarga la app
  // para que la carga dinámica de escenas (import.meta.glob) la recoja.
  async function createScene(name: string, act: number, kind: SceneKind): Promise<void> {
    const taken = new Set(allScenes.map((s) => s.id));
    const id = uniqueId(slugify(name), taken);
    const newScene: Scene = {
      id,
      act,
      kind,
      backgrounds: [],
      layers: [],
      hotspots: [],
      dialogueNodes: {},
      introSkippable: true,
      cinematicTransition: 'fade',
      menuTitle: null,
      menuButtons: [],
      menuAppearance: DEFAULT_MENU_APPEARANCE,
    };
    setCreatingScene(true);
    setSaveMessage(null);
    try {
      const result = await window.api.saveSceneLayout(gameId, id, newScene, {});
      if (result.ok) {
        reloadAfterSave();
        return;
      }
      setSaveMessage(`Error creando escena: ${result.error}`);
    } catch (error) {
      setSaveMessage(`Error creando escena: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreatingScene(false);
    }
  }

  // Convierte una escena YA revisada del desglose de guion en la escena de
  // juego real — vacía de fondos, tipo cinemática, con el mismo id que ya
  // trae del desglose (ya es un slug único ahí). Si ya existe (se llamó
  // antes para esta misma escena), no crea una segunda: solo abre la que
  // ya está, para seguir la cola de paneles donde quedó.
  async function createSceneFromBreakdown(breakdownSceneId: string): Promise<void> {
    const taken = new Set(allScenes.map((s) => s.id));
    if (taken.has(breakdownSceneId)) {
      setEditorSceneId(breakdownSceneId);
      setEditorTab('scene');
      return;
    }
    const newScene: Scene = {
      id: breakdownSceneId,
      act: 1,
      kind: 'cinematica',
      backgrounds: [],
      layers: [],
      hotspots: [],
      dialogueNodes: {},
      introSkippable: true,
      cinematicTransition: 'fade',
      menuTitle: null,
      menuButtons: [],
      menuAppearance: DEFAULT_MENU_APPEARANCE,
    };
    setCreatingScene(true);
    setSaveMessage(null);
    try {
      const result = await window.api.saveSceneLayout(gameId, breakdownSceneId, newScene, {});
      if (result.ok) {
        setEditorSceneId(breakdownSceneId);
        setEditorTab('scene');
        reloadAfterSave();
        return;
      }
      setSaveMessage(`Error creando escena: ${result.error}`);
    } catch (error) {
      setSaveMessage(`Error creando escena: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreatingScene(false);
    }
  }

  async function handleSave(): Promise<void> {
    if (!editedScene) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await window.api.saveSceneLayout(gameId, editedScene.id, editedScene, pendingStrings);
      if (result.ok) {
        // Recarga completa en vez de solo limpiar el estado pendiente: sin
        // esto, el bundle en memoria (strings, escenas) podía quedar
        // desincronizado del JSON recién guardado — algunas zonas mostraban
        // su texto bien y otras la clave cruda, según cuándo se habían
        // guardado. Recargar garantiza que lo que se ve siempre coincide
        // con lo que quedó en disco.
        reloadAfterSave();
        return;
      }
      setSaveMessage(`Error: ${result.error}`);
    } catch (error) {
      setSaveMessage(
        `Error: ${error instanceof Error ? error.message : String(error)} (¿reiniciaste "pnpm dev" después de sumar el editor?)`,
      );
    } finally {
      setSaving(false);
    }
  }

  // --- Personajes: retrato, color y nombre válidos para toda la novela, no
  // solo esta escena. Ver editor/CharacterEditorPanel.tsx.
  //
  // Todas las funciones de acá usan la forma funcional de setEditedCharacters
  // (lee el estado más reciente en vez de una copia capturada al momento de
  // llamar) a propósito: con generación de arte por IA tardando 30-40s, es
  // normal disparar varias en paralelo (un personaje + sus identidades
  // alternativas), y con la forma no funcional la segunda en terminar pisaba
  // por completo lo que había agregado la primera.
  function updateCharacter(characterId: string, patch: Partial<Character>): void {
    setEditedCharacters((prev) => (prev ?? baseCharacters).map((c) => (c.id === characterId ? { ...c, ...patch } : c)));
  }

  function setCharacterNameText(_characterId: string, nameKey: string, text: string): void {
    setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: text }));
  }

  function updateCharacterDescription(characterId: string, description: string): void {
    updateCharacter(characterId, { description });
  }

  function createCharacter(name: string, nameText: string, color: string): void {
    let createdNameKey = '';
    setEditedCharacters((prev) => {
      const base = prev ?? baseCharacters;
      const taken = new Set(base.map((c) => c.id));
      const id = uniqueId(slugify(name), taken);
      createdNameKey = `character.${id}.name`;
      return [...base, { id, name: createdNameKey, portrait: null, description: '', expressions: {}, voices: {}, color }];
    });
    setPendingCharacterStrings((prev) => ({ ...prev, [createdNameKey]: nameText }));
  }

  // No valida referencias (diálogo/hotspots que lo citen como speaker) antes
  // de borrar — a propósito, igual que "eliminar zona" en el editor de
  // escena: es responsabilidad de quien edita, no algo que el editor
  // bloquee. Si el personaje borrado tenía diálogo apuntándole, ese diálogo
  // simplemente muestra el id crudo como nombre hasta que se reapunte.
  function removeCharacter(characterId: string): void {
    setEditedCharacters((prev) => (prev ?? baseCharacters).filter((c) => c.id !== characterId));
  }

  async function uploadPortrait(characterId: string, file: File): Promise<void> {
    setUploadingPortraitId(characterId);
    setCharacterSaveMessage(null);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const result = await window.api.saveCharacterPortrait(gameId, characterId, ext, buffer, null);
      if (result.ok) {
        updateCharacter(characterId, { portrait: result.path });
      } else {
        setCharacterSaveMessage(`Error subiendo retrato: ${result.error}`);
      }
    } catch (error) {
      setCharacterSaveMessage(`Error subiendo retrato: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingPortraitId(null);
    }
  }

  function setExpressionPath(characterId: string, expressionKey: string, path: string): void {
    setEditedCharacters((prev) =>
      (prev ?? baseCharacters).map((c) =>
        c.id !== characterId
          ? c
          : {
              ...c,
              expressions: {
                ...c.expressions,
                [expressionKey]: { path, description: c.expressions[expressionKey]?.description ?? '' },
              },
            },
      ),
    );
  }

  async function uploadExpressionPortrait(characterId: string, expressionKey: string, file: File): Promise<void> {
    setUploadingExpressionKey(`${characterId}:${expressionKey}`);
    setCharacterSaveMessage(null);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const result = await window.api.saveCharacterPortrait(gameId, characterId, ext, buffer, expressionKey);
      if (result.ok) {
        setExpressionPath(characterId, expressionKey, result.path);
      } else {
        setCharacterSaveMessage(`Error subiendo expresión: ${result.error}`);
      }
    } catch (error) {
      setCharacterSaveMessage(`Error subiendo expresión: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingExpressionKey(null);
    }
  }

  function removeExpression(characterId: string, expressionKey: string): void {
    setEditedCharacters((prev) =>
      (prev ?? baseCharacters).map((c) => {
        if (c.id !== characterId) return c;
        const expressions = { ...c.expressions };
        delete expressions[expressionKey];
        return { ...c, expressions };
      }),
    );
  }

  async function loadElevenLabsVoices(): Promise<void> {
    console.log('[voices] cargando...');
    setElevenLabsVoicesLoading(true);
    setElevenLabsVoicesError(null);
    try {
      const result = await window.api.listElevenLabsVoices();
      console.log('[voices] resultado', result);
      if (result.ok) {
        setElevenLabsVoices(result.voices);
      } else {
        setElevenLabsVoicesError(result.error);
      }
    } catch (error) {
      console.error('[voices] error', error);
      setElevenLabsVoicesError(error instanceof Error ? error.message : String(error));
    } finally {
      setElevenLabsVoicesLoading(false);
    }
  }

  function updateCharacterVoice(characterId: string, language: string, voiceId: string): void {
    setEditedCharacters((prev) =>
      (prev ?? baseCharacters).map((c) =>
        c.id !== characterId ? c : { ...c, voices: { ...c.voices, [language]: voiceId } },
      ),
    );
  }

  function removeCharacterVoice(characterId: string, language: string): void {
    setEditedCharacters((prev) =>
      (prev ?? baseCharacters).map((c) => {
        if (c.id !== characterId) return c;
        const voices = { ...c.voices };
        delete voices[language];
        return { ...c, voices };
      }),
    );
  }

  // Genera (o regenera) el retrato de un personaje YA existente en el
  // borrador — a diferencia de la versión anterior, ya no crea el Character:
  // eso ahora lo hace promoteBreakdownCharacters en cuanto se genera el
  // desglose (ver más abajo), así el roster completo aparece de una en la
  // pestaña Personajes sin pasos intermedios. `expressionKey` null = retrato
  // por defecto; una clave = esa identidad/expresión (Character.expressions).
  async function generateCharacterPortraitArt(
    characterId: string,
    prompt: string,
    expressionKey: string | null,
    referenceImagePath: string | null,
  ): Promise<void> {
    const genId = expressionKey ? `${characterId}:${expressionKey}` : characterId;
    setGeneratingCharacterArtIds((prev) => [...prev, genId]);
    setCharacterArtErrors((prev) => {
      const next = { ...prev };
      delete next[genId];
      return next;
    });
    try {
      console.log('[retrato]', genId, 'generando...');
      const result = await window.api.generateCharacterPortrait(
        gameId,
        characterId,
        prompt,
        expressionKey,
        referenceImagePath,
      );
      console.log('[retrato]', genId, 'resultado', result);
      if (!result.ok) {
        setCharacterArtErrors((prev) => ({ ...prev, [genId]: result.error }));
        return;
      }
      if (expressionKey) {
        setExpressionPath(characterId, expressionKey, result.path);
      } else {
        updateCharacter(characterId, { portrait: result.path });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[retrato]', genId, 'error', error);
      setCharacterArtErrors((prev) => ({ ...prev, [genId]: message }));
    } finally {
      setGeneratingCharacterArtIds((prev) => prev.filter((id) => id !== genId));
    }
  }

  // Ningún proveedor de imagen probado acierta siempre la orientación del
  // retrato — en vez de perseguir el 100% automático, esto deja arreglarlo
  // a mano: espeja el archivo YA guardado en el mismo lugar (no genera de
  // nuevo, no gasta crédito). El cache-bust es necesario porque el path no
  // cambia — sin eso el <img> sigue mostrando la versión vieja.
  async function flipPortrait(relativePath: string): Promise<void> {
    setFlippingPortraitPath(relativePath);
    try {
      const result = await window.api.flipCharacterPortrait(gameId, relativePath);
      if (result.ok) {
        setPortraitCacheBust((prev) => ({ ...prev, [relativePath]: (prev[relativePath] ?? 0) + 1 }));
      } else {
        setCharacterSaveMessage(`Error volteando retrato: ${result.error}`);
      }
    } catch (error) {
      setCharacterSaveMessage(`Error volteando retrato: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setFlippingPortraitPath(null);
    }
  }

  // Acepta File[] en vez de FileList a propósito — el selector de archivos
  // da un FileList, pero arrastrar-y-soltar (event.dataTransfer.files) y
  // pegar del portapapeles (los items de tipo imagen de un
  // ClipboardEvent, ver onPasteImageReference) dan array-likes distintos;
  // así los tres caminos llegan acá ya normalizados.
  async function addImageEditReferences(files: File[]): Promise<void> {
    const images = files.filter((file) => file.type.startsWith('image/'));
    const added = await Promise.all(
      images.map(async (file) => ({
        name: file.name || 'imagen pegada',
        bytes: new Uint8Array(await file.arrayBuffer()),
        previewUrl: URL.createObjectURL(file),
      })),
    );
    setImageEditReferences((prev) => [...prev, ...added]);
  }

  function onPasteImageReference(event: ReactClipboardEvent): void {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length === 0) return;
    event.preventDefault();
    void addImageEditReferences(files);
  }

  function onDropImageReference(event: ReactDragEvent): void {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) void addImageEditReferences(Array.from(event.dataTransfer.files));
  }

  function removeImageEditReference(index: number): void {
    setImageEditReferences((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function clearImageEditReferences(): void {
    setImageEditReferences((prev) => {
      for (const ref of prev) URL.revokeObjectURL(ref.previewUrl);
      return [];
    });
  }

  // Corrección puntual en texto libre sobre la imagen abierta en el panel
  // de edición (ver editingImagePath) — reescribe el mismo archivo. No
  // limpia editingImagePath al terminar: el panel se queda abierto con el
  // resultado nuevo para poder seguir iterando ("ahora sacale el reflejo
  // también") sin tener que volver a abrirlo.
  async function submitImageEdit(): Promise<void> {
    if (!editingImagePath || !imageEditPrompt.trim()) return;
    setImageEditGenerating(true);
    setImageEditError(null);
    try {
      const result = await window.api.editImage(
        gameId,
        editingImagePath,
        imageEditPrompt.trim(),
        imageEditReferences.map((r) => r.bytes),
      );
      if (result.ok) {
        setPortraitCacheBust((prev) => ({ ...prev, [editingImagePath]: (prev[editingImagePath] ?? 0) + 1 }));
        setImageEditPrompt('');
        clearImageEditReferences();
      } else {
        setImageEditError(result.error);
      }
    } catch (error) {
      setImageEditError(error instanceof Error ? error.message : String(error));
    } finally {
      setImageEditGenerating(false);
    }
  }

  // Un paso atrás sobre el último editImage aplicado a esta imagen —
  // ver undoImageEdit en imageEditHandlers.ts. Reusa imageEditGenerating
  // para deshabilitar los botones mientras corre: es la misma imagen, no
  // tiene sentido poder aplicar Y deshacer al mismo tiempo.
  async function undoLastImageEdit(): Promise<void> {
    if (!editingImagePath) return;
    setImageEditGenerating(true);
    setImageEditError(null);
    try {
      const result = await window.api.undoImageEdit(gameId, editingImagePath);
      if (result.ok) {
        setPortraitCacheBust((prev) => ({ ...prev, [editingImagePath]: (prev[editingImagePath] ?? 0) + 1 }));
      } else {
        setImageEditError(result.error);
      }
    } catch (error) {
      setImageEditError(error instanceof Error ? error.message : String(error));
    } finally {
      setImageEditGenerating(false);
    }
  }

  // Genera una expresión emocional (vocabulario fijo, ver shared/emotions.ts)
  // usando SIEMPRE el retrato por defecto del personaje como referencia
  // visual (/images/edits) — así la cara se mantiene reconocible entre
  // expresiones en vez de reinterpretarse desde cero cada vez. Por eso
  // requiere que el personaje ya tenga retrato base generado.
  function generateEmotionExpression(characterId: string, emotionCode: string): void {
    const character = displayCharacters.find((c) => c.id === characterId);
    if (!character?.portrait) return;
    const hint = EMOTIONS.find((e) => e.code === emotionCode)?.promptHint ?? emotionCode;
    const prompt =
      `Redraw this exact same character with a ${hint} facial expression. Keep everything else identical: ` +
      `same face structure, same hairstyle, same outfit, same art style, same framing. Only the facial ` +
      `expression (and subtly the pose, if it helps convey the emotion) should change.` +
      (character.description ? `\n\nCharacter description for reference: ${character.description}` : '');
    void generateCharacterPortraitArt(characterId, prompt, emotionCode, character.portrait);
  }

  // "Crear variante": genera un personaje NUEVO a partir de otro ya
  // existente, usando SU retrato como referencia visual — para identidades
  // alternativas (Wraith, Director Gray) o versiones de otra edad del mismo
  // personaje (Adrian joven en un flashback). A propósito es un Character
  // aparte, no una expresión: cada uno necesita su propio set completo de
  // expresiones emocionales, y mezclar "identidad" con "emoción" en el mismo
  // campo no escala (ver conversación — antes Wraith vivía mal como
  // expresión de Adrian Cross).
  async function createCharacterVariant(
    sourceCharacterId: string,
    name: string,
    transformationDescription: string,
    color: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const source = displayCharacters.find((c) => c.id === sourceCharacterId);
    if (!source?.portrait) return { ok: false, error: 'El personaje de origen todavía no tiene retrato base.' };
    const base = editedCharacters ?? baseCharacters;
    const newId = uniqueId(slugify(name), new Set(base.map((c) => c.id)));
    setGeneratingCharacterArtIds((prev) => [...prev, newId]);
    setCharacterArtErrors((prev) => {
      const next = { ...prev };
      delete next[newId];
      return next;
    });
    try {
      const prompt =
        `Redraw this exact same character but: ${transformationDescription}. Keep the same general art style.` +
        (source.description ? `\n\nOriginal character description for reference: ${source.description}` : '');
      console.log('[variante]', newId, 'generando...');
      const result = await window.api.generateCharacterPortrait(gameId, newId, prompt, null, source.portrait);
      console.log('[variante]', newId, 'resultado', result);
      if (!result.ok) {
        setCharacterArtErrors((prev) => ({ ...prev, [newId]: result.error }));
        return { ok: false, error: result.error };
      }
      const nameKey = `character.${newId}.name`;
      setEditedCharacters((prev) => [
        ...(prev ?? baseCharacters),
        {
          id: newId,
          name: nameKey,
          portrait: result.path,
          description: transformationDescription,
          expressions: {},
          voices: {},
          color,
        },
      ]);
      setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: name }));
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[variante]', newId, 'error', error);
      setCharacterArtErrors((prev) => ({ ...prev, [newId]: message }));
      return { ok: false, error: message };
    } finally {
      setGeneratingCharacterArtIds((prev) => prev.filter((id) => id !== newId));
    }
  }

  // Paso 3→2 del pipeline (ver docs/plataforma/00-vision-ia.md): en cuanto
  // se genera un desglose de guion, su roster propuesto pasa a ser parte del
  // borrador real de personajes — así todo se edita y guarda desde un solo
  // lugar (pestaña Personajes), sin una lista aparte acá que hubiera que
  // promover a mano. Nunca pisa un personaje que ya existe (ni su
  // descripción ni sus expresiones ya generadas) — solo agrega personajes
  // nuevos. Las identidades alternativas que detecta la IA (alternateLooks)
  // se promueven como personajes NUEVOS separados, no como expresiones del
  // personaje base — son la misma persona en la trama, pero necesitan su
  // propio set de expresiones emocionales igual que cualquier otro.
  function promoteBreakdownCharacters(breakdownCharacters: ScriptBreakdownCharacter[]): void {
    const pendingNameStrings: Record<string, string> = {};
    setEditedCharacters((prev) => {
      const base = prev ?? baseCharacters;
      const result = [...base];
      const takenIds = new Set(result.map((c) => c.id));
      let changed = false;
      for (const bc of breakdownCharacters) {
        if (!takenIds.has(bc.id)) {
          const nameKey = `character.${bc.id}.name`;
          pendingNameStrings[nameKey] = bc.name;
          result.push({
            id: bc.id,
            name: nameKey,
            portrait: null,
            description: bc.description,
            expressions: {},
            voices: {},
            color: bc.suggestedColor,
          });
          takenIds.add(bc.id);
          changed = true;
        }
        // Cada identidad alternativa (Wraith, Director Gray...) se agrega
        // como personaje propio, no como expresión del personaje base — ver
        // comentario arriba de la función. Si ya existe un personaje con ese
        // id (promovido antes, o creado a mano), no se toca.
        for (const look of bc.alternateLooks) {
          if (takenIds.has(look.key)) continue;
          const nameKey = `character.${look.key}.name`;
          pendingNameStrings[nameKey] = look.label;
          result.push({
            id: look.key,
            name: nameKey,
            portrait: null,
            description: look.description,
            expressions: {},
            voices: {},
            color: bc.suggestedColor,
          });
          takenIds.add(look.key);
          changed = true;
        }
      }
      return changed ? result : base;
    });
    if (Object.keys(pendingNameStrings).length > 0) {
      setPendingCharacterStrings((prev) => ({ ...prev, ...pendingNameStrings }));
    }
  }

  function persistScriptBreakdown(next: ScriptBreakdown): void {
    setScriptBreakdown(next);
    void window.api.saveScriptBreakdown(gameId, next);
  }

  async function generateScriptBreakdown(scriptText: string): Promise<void> {
    setScriptBreakdownGenerating(true);
    setScriptBreakdownError(null);
    setScriptBreakdownMergeNote(null);
    setScriptBreakdownWarnings([]);
    try {
      const result = await window.api.generateScriptBreakdown(scriptText);
      if (result.ok) {
        setScriptBreakdownWarnings(result.warnings);
        // Regenerar corre la IA de nuevo sobre el guion entero — el corte en
        // escenas puede cambiar, así que no alcanza con pisar el desglose
        // viejo: se matchea por título para no perder el trabajo de revisión
        // ya hecho (ver mergeScriptBreakdownReview).
        const { breakdown, carriedOverCount } = mergeScriptBreakdownReview(scriptBreakdown, result.breakdown);
        persistScriptBreakdown(breakdown);
        promoteBreakdownCharacters(breakdown.characters);
        if (scriptBreakdown) {
          setScriptBreakdownMergeNote(
            carriedOverCount > 0
              ? `Se conservó la revisión de ${carriedOverCount} escena${carriedOverCount === 1 ? '' : 's'} que ya tenían el mismo título. El resto quedó en Pendiente para revisar de nuevo.`
              : 'Ninguna escena nueva coincidió en título con las que ya tenías revisadas — todo quedó en Pendiente.',
          );
        }
      } else {
        setScriptBreakdownError(result.error);
      }
    } catch (error) {
      setScriptBreakdownError(error instanceof Error ? error.message : String(error));
    } finally {
      setScriptBreakdownGenerating(false);
    }
  }

  function updateScriptBreakdownSceneSummary(sceneId: string, summary: string): void {
    if (!scriptBreakdown) return;
    persistScriptBreakdown({
      ...scriptBreakdown,
      scenes: scriptBreakdown.scenes.map((s) => (s.id === sceneId ? { ...s, summary } : s)),
    });
  }

  function updateScriptBreakdownSceneStatus(sceneId: string, reviewStatus: ScriptBreakdownReviewStatus): void {
    if (!scriptBreakdown) return;
    persistScriptBreakdown({
      ...scriptBreakdown,
      scenes: scriptBreakdown.scenes.map((s) => (s.id === sceneId ? { ...s, reviewStatus } : s)),
    });
  }

  function updateScriptBreakdownPanelDisplayText(sceneId: string, panelId: string, displayText: string): void {
    if (!scriptBreakdown) return;
    persistScriptBreakdown({
      ...scriptBreakdown,
      scenes: scriptBreakdown.scenes.map((s) =>
        s.id === sceneId
          ? { ...s, panels: s.panels.map((p) => (p.id === panelId ? { ...p, displayText } : p)) }
          : s,
      ),
    });
  }

  function updateScriptBreakdownPanelImageDescription(sceneId: string, panelId: string, imageDescription: string): void {
    if (!scriptBreakdown) return;
    persistScriptBreakdown({
      ...scriptBreakdown,
      scenes: scriptBreakdown.scenes.map((s) =>
        s.id === sceneId
          ? { ...s, panels: s.panels.map((p) => (p.id === panelId ? { ...p, imageDescription } : p)) }
          : s,
      ),
    });
  }

  async function retryScenePanels(sceneId: string, sceneTitle: string, sourceText: string): Promise<void> {
    setScenePanelsRetrying((prev) => ({ ...prev, [sceneId]: true }));
    setScenePanelsRetryError((prev) => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
    try {
      const result = await window.api.generateScenePanels(sceneId, sceneTitle, sourceText);
      if (result.ok) {
        if (!scriptBreakdown) return;
        persistScriptBreakdown({
          ...scriptBreakdown,
          scenes: scriptBreakdown.scenes.map((s) =>
            s.id === sceneId ? { ...s, sourceText: result.sourceText, panels: result.panels } : s,
          ),
        });
      } else {
        setScenePanelsRetryError((prev) => ({ ...prev, [sceneId]: result.error }));
      }
    } catch (error) {
      setScenePanelsRetryError((prev) => ({
        ...prev,
        [sceneId]: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setScenePanelsRetrying((prev) => ({ ...prev, [sceneId]: false }));
    }
  }

  async function handleSaveCharacters(): Promise<void> {
    if (!editedCharacters) return;
    setCharacterSaving(true);
    setCharacterSaveMessage(null);
    try {
      const result = await window.api.saveCharacters(gameId, editedCharacters, pendingCharacterStrings);
      if (result.ok) {
        // Ver comentario en handleSave: recarga completa para no quedar con
        // el bundle en memoria desincronizado del JSON recién guardado.
        reloadAfterSave();
        return;
      }
      setCharacterSaveMessage(`Error: ${result.error}`);
    } catch (error) {
      setCharacterSaveMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCharacterSaving(false);
    }
  }

  // --- Ajustes generales del juego (hoy: tipografía por defecto del
  // tooltip de hotspot) — cualquier zona puede pisarlos puntualmente.
  function updateSiteSettingsHotspotLabelStyle(patch: Partial<TextStyle>): void {
    const base = editedSiteSettings ?? baseSiteSettings;
    setEditedSiteSettings({ ...base, hotspotLabelStyle: { ...base.hotspotLabelStyle, ...patch } });
  }

  async function uploadCursor(kind: 'default' | 'hover', file: File): Promise<void> {
    setUploadingCursor(kind);
    setSiteSettingsSaveMessage(null);
    try {
      // Redimensionado acá (no solo guardado tal cual): un cursor CSS con
      // una imagen grande (p. ej. una foto de varios cientos de px) no se
      // ve — el navegador la ignora y muestra el cursor normal, como si el
      // cambio nunca se hubiera guardado.
      const buffer = await resizeCursorImage(file);
      const result = await window.api.saveCursorImage(gameId, `cursor-${kind}`, 'png', buffer);
      if (result.ok) {
        const base = editedSiteSettings ?? baseSiteSettings;
        setEditedSiteSettings({
          ...base,
          cursor: { ...base.cursor, [kind === 'default' ? 'defaultCursorPath' : 'hoverCursorPath']: result.path },
        });
      } else {
        setSiteSettingsSaveMessage(`Error subiendo cursor: ${result.error}`);
      }
    } catch (error) {
      setSiteSettingsSaveMessage(`Error subiendo cursor: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingCursor(null);
    }
  }

  function removeCursor(kind: 'default' | 'hover'): void {
    const base = editedSiteSettings ?? baseSiteSettings;
    setEditedSiteSettings({
      ...base,
      cursor: { ...base.cursor, [kind === 'default' ? 'defaultCursorPath' : 'hoverCursorPath']: null },
    });
  }

  const ACTION_MENU_IMAGE_FIELD = {
    normal: 'normalImagePath',
    examine: 'examineImagePath',
    interact: 'interactImagePath',
    interactWith: 'interactWithImagePath',
    close: 'closeImagePath',
  } as const;
  const ACTION_MENU_IMAGE_FILE_ID: Record<ActionMenuImageKind, string> = {
    normal: 'normal',
    examine: 'examine',
    interact: 'interact',
    interactWith: 'interact-with',
    close: 'close',
  };

  async function uploadActionMenuImage(kind: ActionMenuImageKind, file: File): Promise<void> {
    setUploadingActionMenuImage(kind);
    setSiteSettingsSaveMessage(null);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await window.api.saveActionMenuImage(gameId, ACTION_MENU_IMAGE_FILE_ID[kind], ext, buffer);
      if (result.ok) {
        const base = editedSiteSettings ?? baseSiteSettings;
        setEditedSiteSettings({
          ...base,
          actionMenu: { ...base.actionMenu, [ACTION_MENU_IMAGE_FIELD[kind]]: result.path },
        });
      } else {
        setSiteSettingsSaveMessage(`Error subiendo imagen: ${result.error}`);
      }
    } catch (error) {
      setSiteSettingsSaveMessage(`Error subiendo imagen: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingActionMenuImage(null);
    }
  }

  function removeActionMenuImage(kind: ActionMenuImageKind): void {
    const base = editedSiteSettings ?? baseSiteSettings;
    setEditedSiteSettings({ ...base, actionMenu: { ...base.actionMenu, [ACTION_MENU_IMAGE_FIELD[kind]]: null } });
  }

  function updateActionMenuZone(zoneKey: ActionMenuZoneKey, points: PolygonPoint[]): void {
    const base = editedSiteSettings ?? baseSiteSettings;
    setEditedSiteSettings({ ...base, actionMenu: { ...base.actionMenu, [zoneKey]: points } });
  }

  async function handleSaveSiteSettings(): Promise<void> {
    if (!editedSiteSettings) return;
    setSiteSettingsSaving(true);
    setSiteSettingsSaveMessage(null);
    try {
      const result = await window.api.saveSiteSettings(gameId, editedSiteSettings);
      if (result.ok) {
        // Ver comentario en handleSave: recarga completa para no quedar con
        // el bundle en memoria desincronizado del JSON recién guardado.
        reloadAfterSave();
        return;
      }
      setSiteSettingsSaveMessage(`Error: ${result.error}`);
    } catch (error) {
      setSiteSettingsSaveMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSiteSettingsSaving(false);
    }
  }

  const strings = { ...bundle.strings, ...pendingStrings, ...pendingCharacterStrings };

  return (
    <div className="relative h-screen w-screen bg-graphite-950">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {import.meta.env.DEV && editMode && displayScene && (
          <button
            type="button"
            onClick={() => {
              playFromScene(activeEditorSceneId);
              setEditMode(false);
            }}
            title="Arranca el juego en la escena que estás editando, sin tocar el save real — como el Play de Unity."
            className="rounded border border-emerald-500/70 px-3 py-1 text-[11px] tracking-widest text-emerald-400 uppercase transition-colors hover:bg-emerald-500 hover:text-graphite-950"
          >
            ▶ Play desde acá
          </button>
        )}
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              if (!confirmDiscardUnsavedSceneEdits()) return;
              setEditMode((v) => !v);
              setEditorSceneId(null);
              setPolygonDraft(null);
            }}
            className={`rounded border px-3 py-1 text-[11px] tracking-widest uppercase transition-colors ${
              editMode
                ? 'border-amber-accent bg-amber-accent text-graphite-950'
                : 'border-graphite-700 text-graphite-400 hover:border-amber-accent hover:text-amber-accent'
            }`}
          >
            {editMode ? 'Salir de edición' : 'Editar posiciones'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            resetRuntime();
            onExit();
          }}
          className="rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          Salir
        </button>
      </div>

      {editMode ? (
        // Modo edición: layout de dos paneles — herramientas a la izquierda,
        // la escena a la derecha, nada superpuesto sobre el juego. Al salir,
        // este layout entero desaparece y vuelve la vista de juego normal.
        <div className="flex h-full w-full">
          <aside
            className="flex h-full shrink-0 flex-col border-r border-graphite-700 bg-graphite-950"
            style={{ width: sidebarWidth }}
          >
            <div className="flex shrink-0 border-b border-graphite-700">
              <button
                type="button"
                onClick={() => setEditorTab('scene')}
                className={`flex-1 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                  editorTab === 'scene'
                    ? 'bg-amber-accent text-graphite-950'
                    : 'text-graphite-400 hover:text-amber-accent'
                }`}
              >
                Escena
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('characters')}
                className={`flex-1 border-l border-graphite-700 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                  editorTab === 'characters'
                    ? 'bg-amber-accent text-graphite-950'
                    : 'text-graphite-400 hover:text-amber-accent'
                }`}
              >
                Personajes
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('settings')}
                className={`flex-1 border-l border-graphite-700 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                  editorTab === 'settings'
                    ? 'bg-amber-accent text-graphite-950'
                    : 'text-graphite-400 hover:text-amber-accent'
                }`}
              >
                Ajustes
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('script-ai')}
                className={`flex-1 border-l border-graphite-700 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                  editorTab === 'script-ai'
                    ? 'bg-amber-accent text-graphite-950'
                    : 'text-graphite-400 hover:text-amber-accent'
                }`}
              >
                Guion IA
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {editorTab === 'scene' ? (
                <SceneEditorPanel
                  gameId={gameId}
                  scene={displayScene}
                  strings={strings}
                  characters={displayCharacters}
                  sceneOptions={allScenes.map((s) => ({ id: s.id, act: s.act }))}
                  activeSceneId={activeEditorSceneId}
                  creatingScene={creatingScene}
                  uploadingBackground={uploadingBackground}
                  generatingBackground={generatingBackground}
                  backgroundGenError={backgroundGenError}
                  onSwitchScene={switchEditorScene}
                  onCreateScene={(name, act, kind) => void createScene(name, act, kind)}
                  onAddBackground={(file) => void addBackground(file)}
                  onGenerateBackground={(prompt, characterIds) => void generateBackgroundWithAi(prompt, characterIds)}
                  pendingPanel={pendingBreakdownPanel}
                  onGeneratePendingPanel={(prompt, caption) => void generatePendingPanelBackground(prompt, caption)}
                  onRemoveBackground={removeBackground}
                  onBackgroundDurationChange={updateBackgroundDuration}
                  onBackgroundColorChange={updateBackgroundColor}
                  backgroundCacheBust={portraitCacheBust}
                  editingBackgroundPath={editingImagePath}
                  onEditBackgroundWithAi={(assetPath) => {
                    setEditingImagePath(assetPath);
                    setImageEditPrompt('');
                    setImageEditError(null);
                  }}
                  onBackgroundImageWidthChange={updateBackgroundImageWidth}
                  onBackgroundCaptionChange={updateBackgroundCaption}
                  onChangeKind={updateSceneKind}
                  onChangeIntroSkippable={updateIntroSkippable}
                  onChangeIntroCompleteTarget={updateIntroCompleteTarget}
                  onChangeCinematicTransition={updateCinematicTransition}
                  onChangeCinematicCompleteTarget={updateCinematicCompleteTarget}
                  onChangeMenuAppearance={updateMenuAppearance}
                  onSetMenuTitleEnabled={setMenuTitleEnabled}
                  onMenuTitleTextChange={setLabelText}
                  onChangeMenuTitleAppearance={updateMenuTitleAppearance}
                  onAddMenuButton={addMenuButton}
                  onRemoveMenuButton={removeMenuButton}
                  onMenuButtonLabelTextChange={setLabelText}
                  onMenuButtonTargetChange={updateMenuButtonTarget}
                  onObjectRectChange={updateObjectRect}
                  onToggleInteractable={toggleInteractable}
                  onLabelTextChange={setLabelText}
                  onLabelStyleChange={updateHotspotLabelStyle}
                  onCreateZone={createZone}
                  polygonDraftPointCount={polygonDraft?.points.length ?? null}
                  onCancelPolygonDraft={cancelPolygonDraft}
                  onResetShape={resetShape}
                  onRemoveZone={removeHotspot}
                  onSetActionMenuEnabled={setActionMenuEnabled}
                  onExamineActionChange={(objectId, patch) => updateActionComposer(objectId, 'onExamine', patch)}
                  onInteractActionChange={(objectId, patch) => updateActionComposer(objectId, 'onInteract', patch)}
                  onAddInteractWithTarget={addInteractWithTarget}
                  onRemoveInteractWithTarget={removeInteractWithTarget}
                  onInteractWithTargetChange={updateInteractWithTargetAction}
                  onSetMinigameEnabled={setMinigameEnabled}
                  onMinigameSequenceLengthChange={updateMinigameSequenceLength}
                  onMinigameSuccessChange={(objectId, patch) => updateMinigameOutcome(objectId, 'onSuccess', patch)}
                  onMinigameFailChange={(objectId, patch) => updateMinigameOutcome(objectId, 'onFail', patch)}
                />
              ) : editorTab === 'characters' ? (
                <CharacterEditorPanel
                  gameId={gameId}
                  characters={displayCharacters}
                  strings={strings}
                  uploadingId={uploadingPortraitId}
                  uploadingExpressionKey={uploadingExpressionKey}
                  generatingArtIds={generatingCharacterArtIds}
                  artErrors={characterArtErrors}
                  portraitCacheBust={portraitCacheBust}
                  flippingPortraitPath={flippingPortraitPath}
                  onFlipPortrait={(path) => void flipPortrait(path)}
                  onPreviewPortrait={setPreviewedPortrait}
                  onNameTextChange={setCharacterNameText}
                  onColorChange={(id, color) => updateCharacter(id, { color })}
                  onDescriptionChange={updateCharacterDescription}
                  onUploadPortrait={(id, file) => void uploadPortrait(id, file)}
                  onUploadExpression={(id, expressionKey, file) => void uploadExpressionPortrait(id, expressionKey, file)}
                  onRemoveExpression={removeExpression}
                  onGenerateEmotion={generateEmotionExpression}
                  onGeneratePortrait={(id, description) => void generateCharacterPortraitArt(id, description, null, null)}
                  onCreateCharacter={createCharacter}
                  onRemoveCharacter={removeCharacter}
                  onCreateVariant={(sourceId, name, description, color) =>
                    createCharacterVariant(sourceId, name, description, color)
                  }
                  voices={elevenLabsVoices}
                  voicesLoading={elevenLabsVoicesLoading}
                  voicesError={elevenLabsVoicesError}
                  onLoadVoices={() => void loadElevenLabsVoices()}
                  onVoiceChange={updateCharacterVoice}
                  onRemoveVoice={removeCharacterVoice}
                />
              ) : editorTab === 'settings' ? (
                <SiteSettingsPanel
                  gameId={gameId}
                  settings={displaySiteSettings}
                  uploadingCursor={uploadingCursor}
                  uploadingActionMenuImage={uploadingActionMenuImage}
                  onChangeHotspotLabelStyle={updateSiteSettingsHotspotLabelStyle}
                  onUploadCursor={(kind, file) => void uploadCursor(kind, file)}
                  onRemoveCursor={removeCursor}
                  onUploadActionMenuImage={(kind, file) => void uploadActionMenuImage(kind, file)}
                  onRemoveActionMenuImage={removeActionMenuImage}
                  onActionMenuZoneChange={updateActionMenuZone}
                />
              ) : (
                <ScriptBreakdownPanel
                  breakdown={scriptBreakdown}
                  generating={scriptBreakdownGenerating}
                  error={scriptBreakdownError}
                  mergeNote={scriptBreakdownMergeNote}
                  warnings={scriptBreakdownWarnings}
                  onGenerate={(scriptText) => void generateScriptBreakdown(scriptText)}
                  onSceneSummaryChange={updateScriptBreakdownSceneSummary}
                  onSceneStatusChange={updateScriptBreakdownSceneStatus}
                  onPanelDisplayTextChange={updateScriptBreakdownPanelDisplayText}
                  onPanelImageDescriptionChange={updateScriptBreakdownPanelImageDescription}
                  scenePanelsRetrying={scenePanelsRetrying}
                  scenePanelsRetryError={scenePanelsRetryError}
                  onRetryScenePanels={(sceneId, sceneTitle, sourceText) =>
                    void retryScenePanels(sceneId, sceneTitle, sourceText)
                  }
                  existingSceneIds={allScenes.map((s) => s.id)}
                  creatingScene={creatingScene}
                  onCreateGameScene={(sceneId) => void createSceneFromBreakdown(sceneId)}
                />
              )}
            </div>

            {/* Pie fijo: no se va con el scroll aunque la lista de arriba
                tenga cientos de escenas/personajes. La pestaña "Guion IA" no
                usa este patrón — cada cambio ahí se persiste solo. */}
            {editorTab !== 'script-ai' && (
              <div className="shrink-0 border-t border-graphite-700 p-3">
                <button
                  type="button"
                  onClick={() =>
                    void (editorTab === 'scene'
                      ? handleSave()
                      : editorTab === 'characters'
                        ? handleSaveCharacters()
                        : handleSaveSiteSettings())
                  }
                  disabled={
                    editorTab === 'scene'
                      ? editedScene === null || saving
                      : editorTab === 'characters'
                        ? editedCharacters === null || characterSaving
                        : editedSiteSettings === null || siteSettingsSaving
                  }
                  className="w-full rounded border border-amber-accent px-3 py-2 text-[11px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
                >
                  {(editorTab === 'scene' ? saving : editorTab === 'characters' ? characterSaving : siteSettingsSaving)
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editorTab === 'scene') {
                      setEditedScene(null);
                      setPendingStrings({});
                      setSaveMessage(null);
                      setPolygonDraft(null);
                    } else if (editorTab === 'characters') {
                      setEditedCharacters(null);
                      setPendingCharacterStrings({});
                      setCharacterSaveMessage(null);
                    } else {
                      setEditedSiteSettings(null);
                      setSiteSettingsSaveMessage(null);
                    }
                  }}
                  disabled={
                    editorTab === 'scene'
                      ? editedScene === null
                      : editorTab === 'characters'
                        ? editedCharacters === null
                        : editedSiteSettings === null
                  }
                  className="mt-2 w-full rounded border border-graphite-700 px-3 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Descartar
                </button>
                {(editorTab === 'scene' ? saveMessage : editorTab === 'characters' ? characterSaveMessage : siteSettingsSaveMessage) && (
                  <p className="mt-2 text-[10px] text-graphite-300">
                    {editorTab === 'scene' ? saveMessage : editorTab === 'characters' ? characterSaveMessage : siteSettingsSaveMessage}
                  </p>
                )}
              </div>
            )}
          </aside>
          {/* Barra de arrastre para achicar/agrandar el panel de la
              izquierda — con las miniaturas de retrato es fácil quedarse
              corto de espacio. */}
          <div
            onMouseDown={startSidebarResize}
            className={`w-1 shrink-0 cursor-col-resize bg-graphite-800 transition-colors hover:bg-amber-accent ${
              resizingSidebar ? 'bg-amber-accent' : ''
            }`}
          />
          <div className="min-w-0 flex-1">
            {editorTab === 'characters' ? (
              <div className="flex h-full w-full items-center justify-center bg-graphite-950 p-10">
                {previewedPortrait ? (
                  <img
                    key={`${previewedPortrait}-${portraitCacheBust[previewedPortrait] ?? 0}`}
                    src={
                      portraitCacheBust[previewedPortrait]
                        ? `${gameAssetUrl(gameId, previewedPortrait)}?v=${portraitCacheBust[previewedPortrait]}`
                        : gameAssetUrl(gameId, previewedPortrait)
                    }
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <p className="text-center text-[11px] tracking-widest text-graphite-600 uppercase">
                    Hacé click en un retrato de la lista para verlo más grande acá
                  </p>
                )}
              </div>
            ) : editorTab === 'scene' && editingImagePath ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDraggingImageReference(true);
                }}
                onDragLeave={() => setDraggingImageReference(false)}
                onDrop={(event) => {
                  setDraggingImageReference(false);
                  onDropImageReference(event);
                }}
                className={`flex h-full w-full flex-col bg-graphite-950 p-6 ${
                  draggingImageReference ? 'ring-2 ring-inset ring-amber-accent' : ''
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] tracking-widest text-graphite-500 uppercase">
                    Editando {editingImagePath} — arrastrá una imagen de referencia acá, o pegala (Cmd/Ctrl+V) en el
                    cuadro de texto
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingImagePath(null);
                      setImageEditPrompt('');
                      setImageEditError(null);
                      clearImageEditReferences();
                    }}
                    className="rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <img
                    key={`${editingImagePath}-${portraitCacheBust[editingImagePath] ?? 0}`}
                    src={
                      portraitCacheBust[editingImagePath]
                        ? `${gameAssetUrl(gameId, editingImagePath)}?v=${portraitCacheBust[editingImagePath]}`
                        : gameAssetUrl(gameId, editingImagePath)
                    }
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="mt-3 shrink-0">
                  <textarea
                    value={imageEditPrompt}
                    onChange={(event) => setImageEditPrompt(event.target.value)}
                    onPaste={onPasteImageReference}
                    rows={2}
                    placeholder='Qué cambiar de esta imagen (ej. "esa foto de la pared se ve realista, redibujala en el mismo estilo ilustrado que el resto")...'
                    className="w-full rounded border border-graphite-700 bg-graphite-900 px-2 py-1.5 text-[11px] text-graphite-100"
                  />
                  {imageEditReferences.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {imageEditReferences.map((ref, index) => (
                        <div key={index} className="relative">
                          <img
                            src={ref.previewUrl}
                            alt={ref.name}
                            title={ref.name}
                            className="h-12 w-12 rounded border border-graphite-700 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImageEditReference(index)}
                            className="absolute -top-1 -right-1 rounded-full bg-graphite-950 px-1 text-[9px] text-graphite-300 hover:text-amber-accent"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void submitImageEdit()}
                      disabled={!imageEditPrompt.trim() || imageEditGenerating}
                      className="rounded border border-sky-400/40 px-3 py-1.5 text-[10px] tracking-widest text-sky-300 uppercase transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {imageEditGenerating ? 'Aplicando...' : 'Aplicar cambio'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void undoLastImageEdit()}
                      disabled={imageEditGenerating}
                      title="Volver a como estaba antes del último cambio aplicado a esta imagen"
                      className="rounded border border-graphite-700 px-3 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Deshacer
                    </button>
                    <button
                      type="button"
                      onClick={() => imageEditReferenceInputRef.current?.click()}
                      className="rounded border border-graphite-700 px-3 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
                    >
                      + Referencia
                    </button>
                    <input
                      ref={imageEditReferenceInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        if (event.target.files) void addImageEditReferences(Array.from(event.target.files));
                        event.target.value = '';
                      }}
                      className="hidden"
                    />
                    {imageEditError && <p className="text-[10px] text-red-300">{imageEditError}</p>}
                  </div>
                </div>
              </div>
            ) : displayScene ? (
              <SceneViewer
                gameId={gameId}
                scene={displayScene}
                strings={strings}
                siteSettings={displaySiteSettings}
                onInteract={interactHotspot}
                editMode={editorTab === 'scene'}
                onObjectRectChange={updateObjectRect}
                onPolygonPointsChange={updatePolygonPoints}
                onLabelPositionChange={updateLabelPosition}
                polygonDraftPoints={polygonDraft?.points ?? null}
                onAddPolygonDraftPoint={addPolygonDraftPoint}
                onClosePolygonDraft={closePolygonDraft}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] tracking-widest text-graphite-600 uppercase">
                Sin escenas — creá una desde el panel
              </div>
            )}
          </div>
        </div>
      ) : displayScene?.kind === 'intro' ? (
        <IntroScene key={displayScene.id} gameId={gameId} scene={displayScene} siteSettings={displaySiteSettings} />
      ) : displayScene?.kind === 'cinematica' ? (
        <CinematicScene
          key={displayScene.id}
          gameId={gameId}
          scene={displayScene}
          siteSettings={displaySiteSettings}
        />
      ) : displayScene?.kind === 'menu' ? (
        <MenuScene
          key={displayScene.id}
          gameId={gameId}
          scene={displayScene}
          strings={strings}
          siteSettings={displaySiteSettings}
        />
      ) : displayScene ? (
        // Modo juego: la escena vuelve a ocupar toda la pantalla, como
        // siempre — el editor no deja rastro.
        <SceneViewer
          gameId={gameId}
          scene={displayScene}
          strings={strings}
          siteSettings={displaySiteSettings}
          onInteract={interactHotspot}
          activeActionMenuHotspotId={activeActionMenuHotspotId}
          onSelectAction={selectAction}
          onCloseActionMenu={closeActionMenu}
          combiningHotspotId={combiningHotspotId}
          interactWithFallbackVisible={interactWithFallbackVisible}
          activeBackgroundId={activeBackgroundId}
        >
          {activeInterfaceId ? (
            <InterfaceHost interfaceId={activeInterfaceId} />
          ) : (
            activeNode && (
              <DialogueOverlay
                gameId={gameId}
                node={activeNode}
                characters={displayCharacters}
                strings={strings}
                onAdvance={advance}
                onChoose={selectChoice}
              />
            )
          )}
          <MinigameHost />
        </SceneViewer>
      ) : (
        <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 text-graphite-200">
          Escena &quot;{currentSceneId}&quot; no encontrada.
        </div>
      )}

      {/* Fundido a negro entre escenas — vive acá arriba (no adentro de
          SceneViewer) porque intro/menú/escena estándar son componentes
          top-level distintos: si el overlay estuviera adentro de uno solo,
          cambiar de tipo de escena (intro→menú, menú→primera escena) hacía
          un corte seco sin fundido, por más que la acción pidiera "fade". */}
      {!editMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-graphite-950 transition-opacity duration-700 ease-in-out"
          style={{ opacity: transitioning ? 1 : 0, zIndex: 500 }}
        />
      )}
    </div>
  );
}
