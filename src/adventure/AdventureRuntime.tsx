import { useEffect, useState, type JSX } from 'react';
import { CharacterEditorPanel } from './editor/CharacterEditorPanel';
import type { EditableRect } from './editor/EditableBox';
import { boundingBoxOfPoints } from './editor/polygonUtils';
import { SceneEditorPanel, type ActionComposerValue } from './editor/SceneEditorPanel';
import { SiteSettingsPanel, type ActionMenuImageKind, type ActionMenuZoneKey } from './editor/SiteSettingsPanel';
import { slugify, uniqueId } from './editor/slug';
import { getGameProject } from '../game-engine/scene-engine/gameProjects';
import type {
  Character,
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
  type ScriptBreakdownAlternateLook,
  type ScriptBreakdownCharacter,
  type ScriptBreakdownReviewStatus,
} from '../../shared/script-breakdown';

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
  const [generatingCharacterArtId, setGeneratingCharacterArtId] = useState<string | null>(null);

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
  async function addBackground(file: File): Promise<void> {
    const base = editedScene ?? baseScene;
    if (!base) return;
    setUploadingBackground(true);
    setSaveMessage(null);
    try {
      const takenBgIds = new Set(base.backgrounds.map((bg) => bg.id));
      let n = base.backgrounds.length + 1;
      let bgId = `bg-${n}`;
      while (takenBgIds.has(bgId)) {
        n += 1;
        bgId = `bg-${n}`;
      }
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
  function updateCharacter(characterId: string, patch: Partial<Character>): void {
    const base = editedCharacters ?? baseCharacters;
    setEditedCharacters(base.map((c) => (c.id === characterId ? { ...c, ...patch } : c)));
  }

  function setCharacterNameText(_characterId: string, nameKey: string, text: string): void {
    setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: text }));
  }

  function createCharacter(name: string, nameText: string, color: string): void {
    const base = editedCharacters ?? baseCharacters;
    const taken = new Set(base.map((c) => c.id));
    const id = uniqueId(slugify(name), taken);
    const nameKey = `character.${id}.name`;
    setEditedCharacters([...base, { id, name: nameKey, portrait: null, expressions: {}, color }]);
    setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: nameText }));
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

  async function uploadExpressionPortrait(characterId: string, expressionKey: string, file: File): Promise<void> {
    setUploadingExpressionKey(`${characterId}:${expressionKey}`);
    setCharacterSaveMessage(null);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const result = await window.api.saveCharacterPortrait(gameId, characterId, ext, buffer, expressionKey);
      if (result.ok) {
        const base = editedCharacters ?? baseCharacters;
        const character = base.find((c) => c.id === characterId);
        if (character) {
          updateCharacter(characterId, { expressions: { ...character.expressions, [expressionKey]: result.path } });
        }
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
    const base = editedCharacters ?? baseCharacters;
    const character = base.find((c) => c.id === characterId);
    if (!character) return;
    const expressions = { ...character.expressions };
    delete expressions[expressionKey];
    updateCharacter(characterId, { expressions });
  }

  // Convierte una entrada del roster propuesto por la IA (Guion IA) en un
  // Character real: lo crea si no existe (matcheando por id, mismo slug que
  // createCharacter) o le actualiza el retrato si ya existe. El retrato en sí
  // se sube y persiste al toque vía IPC; el Character (portrait/color/nombre)
  // queda en el borrador de la pestaña Personajes hasta "Guardar cambios" —
  // mismo criterio que uploadPortrait. `look` presente = generar una
  // identidad alternativa (Adrian/Gray/Wraith...) como Character.expressions
  // en vez de tocar el retrato por defecto — cada una con su propia
  // descripción autocontenida para no mezclar dos apariencias en una imagen.
  async function generateCharacterArt(
    breakdownCharacter: ScriptBreakdownCharacter,
    look?: ScriptBreakdownAlternateLook,
  ): Promise<void> {
    setGeneratingCharacterArtId(look ? `${breakdownCharacter.id}:${look.key}` : breakdownCharacter.id);
    setCharacterSaveMessage(null);
    try {
      const result = await window.api.generateCharacterPortrait(
        gameId,
        breakdownCharacter.id,
        (look ? look.description : breakdownCharacter.description) || breakdownCharacter.name,
        look?.key ?? null,
      );
      if (!result.ok) {
        const label = look ? `${breakdownCharacter.name} (${look.label})` : breakdownCharacter.name;
        setCharacterSaveMessage(`Error generando retrato de ${label}: ${result.error}`);
        return;
      }
      const base = editedCharacters ?? baseCharacters;
      const existing = base.find((c) => c.id === breakdownCharacter.id);
      if (existing) {
        if (look) {
          updateCharacter(existing.id, { expressions: { ...existing.expressions, [look.key]: result.path } });
        } else {
          updateCharacter(existing.id, { portrait: result.path });
        }
      } else {
        const nameKey = `character.${breakdownCharacter.id}.name`;
        setEditedCharacters([
          ...base,
          {
            id: breakdownCharacter.id,
            name: nameKey,
            portrait: look ? null : result.path,
            expressions: look ? { [look.key]: result.path } : {},
            color: breakdownCharacter.suggestedColor,
          },
        ]);
        setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: breakdownCharacter.name }));
      }
    } catch (error) {
      const label = look ? `${breakdownCharacter.name} (${look.label})` : breakdownCharacter.name;
      setCharacterSaveMessage(
        `Error generando retrato de ${label}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setGeneratingCharacterArtId(null);
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
    try {
      const result = await window.api.generateScriptBreakdown(scriptText);
      if (result.ok) {
        // Regenerar corre la IA de nuevo sobre el guion entero — el corte en
        // escenas puede cambiar, así que no alcanza con pisar el desglose
        // viejo: se matchea por título para no perder el trabajo de revisión
        // ya hecho (ver mergeScriptBreakdownReview).
        const { breakdown, carriedOverCount } = mergeScriptBreakdownReview(scriptBreakdown, result.breakdown);
        persistScriptBreakdown(breakdown);
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
          <aside className="flex h-full w-80 shrink-0 flex-col border-r border-graphite-700 bg-graphite-950">
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
                  onSwitchScene={switchEditorScene}
                  onCreateScene={(name, act, kind) => void createScene(name, act, kind)}
                  onAddBackground={(file) => void addBackground(file)}
                  onRemoveBackground={removeBackground}
                  onBackgroundDurationChange={updateBackgroundDuration}
                  onBackgroundColorChange={updateBackgroundColor}
                  onBackgroundImageWidthChange={updateBackgroundImageWidth}
                  onChangeKind={updateSceneKind}
                  onChangeIntroSkippable={updateIntroSkippable}
                  onChangeIntroCompleteTarget={updateIntroCompleteTarget}
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
                  onNameTextChange={setCharacterNameText}
                  onColorChange={(id, color) => updateCharacter(id, { color })}
                  onUploadPortrait={(id, file) => void uploadPortrait(id, file)}
                  onUploadExpression={(id, expressionKey, file) => void uploadExpressionPortrait(id, expressionKey, file)}
                  onRemoveExpression={removeExpression}
                  onCreateCharacter={createCharacter}
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
                  gameId={gameId}
                  breakdown={scriptBreakdown}
                  generating={scriptBreakdownGenerating}
                  error={scriptBreakdownError}
                  mergeNote={scriptBreakdownMergeNote}
                  existingCharacters={displayCharacters}
                  generatingCharacterArtId={generatingCharacterArtId}
                  onGenerate={(scriptText) => void generateScriptBreakdown(scriptText)}
                  onGenerateCharacterArt={(character, look) => void generateCharacterArt(character, look)}
                  onSceneSummaryChange={updateScriptBreakdownSceneSummary}
                  onSceneStatusChange={updateScriptBreakdownSceneStatus}
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
          <div className="min-w-0 flex-1">
            {displayScene ? (
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
