import { create } from 'zustand';
import { createEmptyAdventureCaseState, type AdventureCaseState } from '@shared/save-data';
import { useSaveStore } from '../game-engine/save-system/save.store';
import type {
  AdventureCaseBundle,
  DialogueNode,
  Hotspot,
  InterfaceId,
  Scene,
  SceneAction,
} from '../game-engine/scene-engine/schemas';

export type ActionMenuActionKind = 'examine' | 'interact' | 'interactWith' | 'close';

/** El guion pide 12s de espera al dejar sonar el teléfono; se acorta para
 * que la escena sea jugable durante el desarrollo. Ajustar aquí cuando el
 * ritmo final esté definido. */
const RING_REPEAT_DELAY_MS = 2500;
const RING_START_DELAY_MS = 900;
const SCENE_FADE_MS = 550;

type FadeKind = 'cut' | 'fade' | 'fadeToBlack';

type AdventureRuntimeState = {
  bundle: AdventureCaseBundle | null;
  currentSceneId: string;
  activeDialogueNodeId: string | null;
  activeInterfaceId: InterfaceId | null;
  caseState: AdventureCaseState;
  officeInteractions: string[];
  ringState: 'silent' | 'ringing';
  ringAttempts: number;
  transitioning: boolean;
  /** No null mientras está abierto el menú de acción (Examinar/Interactuar/
   * Interactuar con/Cerrar) de este hotspot — ver Hotspot.actionMenuEnabled. */
  activeActionMenuHotspotId: string | null;
  /** No null mientras el juego espera el segundo click de un "Interactuar
   * con" — el valor es el id del primer objeto elegido. Cualquier click en
   * un hotspot mientras esto no es null se interpreta como el segundo
   * objeto de la combinación, no como su interacción normal. */
  combiningHotspotId: string | null;
  /** True brevemente cuando se intentó una combinación sin `onInteract`
   * programado — ver `interactWith.noMatch` en locales. */
  interactWithFallbackVisible: boolean;
  /** Id del fondo activo de la escena actual, o null = usar el default
   * (`scene.backgrounds[0]`) — ver acción `toggleBackground`. Se resetea a
   * null en cada cambio de escena, así el fondo alternado de una escena no
   * se arrastra a la próxima vez que se entra ahí. */
  activeBackgroundId: string | null;

  init: (bundle: AdventureCaseBundle, persisted: AdventureCaseState | null) => void;
  getActiveScene: () => Scene | null;
  getActiveNode: () => DialogueNode | null;
  /** Si el juego está en modo "combinar" (ver combiningHotspotId), el click
   * se interpreta como el segundo objeto en vez de correr la interacción
   * normal del hotspot. Si no, y el hotspot tiene el menú de acción
   * activado (con la imagen base ya configurada en Ajustes), abre el menú
   * en vez de correr `onInteract` directo. */
  interactHotspot: (hotspot: Hotspot) => void;
  closeActionMenu: () => void;
  selectAction: (kind: ActionMenuActionKind) => void;
  /** Segundo click de un "Interactuar con" — busca en `interactWithTargets`
   * del primer objeto una entrada para este segundo id; si existe corre su
   * `onInteract`, si no muestra el mensaje genérico. Sale del modo
   * combinar de cualquier manera. */
  selectCombineTarget: (targetHotspotId: string) => void;
  /** Alterna `activeBackgroundId` entre dos ids — si ninguno está activo
   * todavía (fondo por defecto), pasa al que no sea `scene.backgrounds[0]`. */
  toggleBackground: (backgroundIdA: string, backgroundIdB: string) => void;
  openDialogue: (nodeId: string) => void;
  advance: () => void;
  selectChoice: (next: string, setState?: Record<string, unknown>, addFlag?: string) => void;
  closeDialogue: () => void;
  openInterfacePanel: (interfaceId: InterfaceId) => void;
  closeInterface: () => void;
  runActions: (actions: SceneAction[]) => void;
  applyStatePatch: (patch: Partial<AdventureCaseState>) => void;
  addFlag: (flag: string) => void;
  /** `onComplete` corre después del fundido y de `scene.onEnter` — la usa
   * `runActions` para encadenar lo que venga después de un `transitionTo`
   * (p. ej. "cambiar de escena y ADEMÁS hacer hablar a un personaje": sin
   * esto, el diálogo se abría en el mismo tick, antes de que la pantalla
   * llegara a fundirse a la escena nueva). */
  transitionToScene: (sceneId: string, fade: FadeKind, onComplete?: () => void) => void;
  /** Botón "Play desde acá" del editor: arranca el juego en `sceneId` sin
   * tocar el save real (a diferencia de `transitionToScene`, que persiste si
   * el caso ya está registrado) — para probar cualquier punto de la historia
   * sin tener que rejugar desde el principio. */
  playFromScene: (sceneId: string) => void;
  /** Vuelve el store a su estado inicial — se usa al salir al selector de
   * proyectos, para que abrir el mismo juego u otro distinto siempre vuelva
   * a correr `init()` de cero en vez de arrastrar el bundle anterior. */
  reset: () => void;
};

function persistIfRegistered(state: AdventureCaseState): void {
  if (!state.registered) return;
  useSaveStore.getState().setAdventureCaseState(state);
  void useSaveStore.getState().persist();
}

export const useAdventureRuntimeStore = create<AdventureRuntimeState>((set, get) => ({
  bundle: null,
  currentSceneId: '',
  activeDialogueNodeId: null,
  activeInterfaceId: null,
  caseState: createEmptyAdventureCaseState(''),
  officeInteractions: [],
  ringState: 'silent',
  ringAttempts: 0,
  transitioning: false,
  activeActionMenuHotspotId: null,
  combiningHotspotId: null,
  interactWithFallbackVisible: false,
  activeBackgroundId: null,

  init: (bundle, persisted) => {
    const startingSceneId = bundle.case.startingSceneId;
    const caseState = persisted ?? createEmptyAdventureCaseState(startingSceneId);
    set({
      bundle,
      currentSceneId: caseState.registered ? caseState.currentSceneId : startingSceneId,
      caseState,
      activeDialogueNodeId: null,
      activeInterfaceId: null,
      officeInteractions: [],
      ringState: 'silent',
      ringAttempts: 0,
      transitioning: false,
      activeActionMenuHotspotId: null,
      combiningHotspotId: null,
      interactWithFallbackVisible: false,
      activeBackgroundId: null,
    });
  },

  getActiveScene: () => {
    const { bundle, currentSceneId } = get();
    return bundle?.scenes.find((s) => s.id === currentSceneId) ?? null;
  },

  getActiveNode: () => {
    const { bundle, activeDialogueNodeId } = get();
    if (!bundle || !activeDialogueNodeId) return null;
    return bundle.dialogues[activeDialogueNodeId] ?? null;
  },

  interactHotspot: (hotspot) => {
    const state = get();

    if (state.combiningHotspotId) {
      get().selectCombineTarget(hotspot.id);
      return;
    }

    const isOfficeExploration =
      state.currentSceneId === 'oficina-acto1' &&
      hotspot.id !== 'telefono' &&
      !state.caseState.registered;

    if (isOfficeExploration && !state.officeInteractions.includes(hotspot.id)) {
      const updated = [...state.officeInteractions, hotspot.id];
      set({ officeInteractions: updated });
      if (updated.length >= 2 && state.ringState === 'silent') {
        set({ ringState: 'ringing' });
        window.setTimeout(() => get().openDialogue('telefono-ring-choice'), RING_START_DELAY_MS);
      }
    }

    // El caso ya quedó registrado (decisión irreversible tomada): no debe
    // volver a ofrecer "Aceptar/Rechazar" al re-tocar el teléfono. Acá
    // termina el contenido construido hasta ahora (solo Acto I).
    if (hotspot.id === 'telefono-llamada' && state.caseState.registered) {
      get().openDialogue('caso-ya-registrado');
      return;
    }

    // Sin `normalImagePath` configurado todavía en Ajustes, no hay nada que
    // mostrar — se cae al click único de siempre en vez de abrir un menú
    // vacío/roto.
    if (hotspot.actionMenuEnabled && state.bundle?.siteSettings.actionMenu.normalImagePath) {
      set({ activeActionMenuHotspotId: hotspot.id });
      return;
    }

    get().runActions(hotspot.onInteract);
  },

  closeActionMenu: () => {
    set({ activeActionMenuHotspotId: null });
  },

  selectAction: (kind) => {
    const hotspotId = get().activeActionMenuHotspotId;
    set({ activeActionMenuHotspotId: null });
    if (kind === 'close' || !hotspotId) return;
    if (kind === 'interactWith') {
      set({ combiningHotspotId: hotspotId });
      return;
    }
    const hotspot = get().getActiveScene()?.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return;
    get().runActions(kind === 'examine' ? hotspot.onExamine : hotspot.onInteract);
  },

  selectCombineTarget: (targetHotspotId) => {
    const sourceId = get().combiningHotspotId;
    set({ combiningHotspotId: null });
    if (!sourceId || sourceId === targetHotspotId) return;
    const source = get().getActiveScene()?.hotspots.find((h) => h.id === sourceId);
    const match = source?.interactWithTargets.find((t) => t.targetObjectId === targetHotspotId);
    if (match) {
      get().runActions(match.onInteract);
      return;
    }
    set({ interactWithFallbackVisible: true });
    window.setTimeout(() => set({ interactWithFallbackVisible: false }), 1800);
  },

  toggleBackground: (backgroundIdA, backgroundIdB) => {
    const scene = get().getActiveScene();
    const effective = get().activeBackgroundId ?? scene?.backgrounds[0]?.id ?? null;
    set({ activeBackgroundId: effective === backgroundIdA ? backgroundIdB : backgroundIdA });
  },

  openDialogue: (nodeId) => {
    const node = get().bundle?.dialogues[nodeId];
    if (!node) return;
    set({ activeDialogueNodeId: nodeId, activeInterfaceId: null });
    if (node.onShow) get().runActions(node.onShow);
  },

  advance: () => {
    const node = get().getActiveNode();
    if (!node) return;

    if (node.id === 'telefono-sigue-sonando') {
      const attempts = get().ringAttempts + 1;
      set({ ringAttempts: attempts, activeDialogueNodeId: null });
      window.setTimeout(() => {
        get().openDialogue(attempts >= 3 ? 'telefono-mirror-intervencion' : 'telefono-ring-choice');
      }, RING_REPEAT_DELAY_MS);
      return;
    }

    if (node.next) {
      get().openDialogue(node.next);
    } else {
      get().closeDialogue();
    }
  },

  selectChoice: (next, setState, addFlag) => {
    if (setState) get().applyStatePatch(setState);
    if (addFlag) get().addFlag(addFlag);
    get().openDialogue(next);
  },

  closeDialogue: () => {
    set({ activeDialogueNodeId: null });
  },

  openInterfacePanel: (interfaceId) => {
    set({ activeInterfaceId: interfaceId, activeDialogueNodeId: null });
  },

  closeInterface: () => {
    set({ activeInterfaceId: null });
  },

  runActions: (actions) => {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]!;
      switch (action.type) {
        case 'dialogue':
          get().openDialogue(action.nodeId);
          break;
        case 'setState':
          get().applyStatePatch(action.patch);
          break;
        case 'addFlag':
          get().addFlag(action.flag);
          break;
        case 'transitionTo': {
          // Lo que venga después en la lista (p. ej. hacer hablar a un
          // personaje) se difiere hasta que la escena nueva termine de
          // entrar — si no, se disparaba en el mismo tick, antes de que
          // la pantalla llegara a fundirse a la escena nueva.
          const remaining = actions.slice(i + 1);
          get().transitionToScene(action.sceneId, action.fade, remaining.length > 0 ? () => get().runActions(remaining) : undefined);
          return;
        }
        case 'openInterface':
          get().openInterfacePanel(action.interfaceId);
          break;
        case 'addMoney':
          useSaveStore.getState().addMoney(action.amount);
          break;
        case 'toggleBackground':
          get().toggleBackground(action.backgroundIdA, action.backgroundIdB);
          break;
        case 'continueGame': {
          const { caseState } = get();
          if (caseState.registered) {
            get().transitionToScene(caseState.currentSceneId, 'fade');
          }
          break;
        }
        case 'quitApp':
          window.close();
          break;
      }
    }
  },

  applyStatePatch: (patch) => {
    set((state) => ({ caseState: { ...state.caseState, ...patch } }));
    persistIfRegistered(get().caseState);
  },

  addFlag: (flag) => {
    set((state) =>
      state.caseState.flags.includes(flag)
        ? state
        : { caseState: { ...state.caseState, flags: [...state.caseState.flags, flag] } },
    );
    persistIfRegistered(get().caseState);
  },

  transitionToScene: (sceneId, fade, onComplete) => {
    set({
      activeDialogueNodeId: null,
      activeInterfaceId: null,
      activeActionMenuHotspotId: null,
      combiningHotspotId: null,
      interactWithFallbackVisible: false,
      transitioning: true,
    });
    const delay = fade === 'cut' ? 0 : SCENE_FADE_MS;
    window.setTimeout(() => {
      const scene = get().bundle?.scenes.find((s) => s.id === sceneId) ?? null;
      set((state) => ({
        currentSceneId: sceneId,
        officeInteractions: [],
        ringState: 'silent',
        ringAttempts: 0,
        activeBackgroundId: null,
        caseState: { ...state.caseState, currentSceneId: sceneId },
      }));
      persistIfRegistered(get().caseState);
      if (scene?.onEnter) get().runActions(scene.onEnter);
      window.setTimeout(() => {
        set({ transitioning: false });
        onComplete?.();
      }, 50);
    }, delay);
  },

  playFromScene: (sceneId) => {
    const scene = get().bundle?.scenes.find((s) => s.id === sceneId) ?? null;
    set({
      currentSceneId: sceneId,
      activeDialogueNodeId: null,
      activeInterfaceId: null,
      activeActionMenuHotspotId: null,
      combiningHotspotId: null,
      interactWithFallbackVisible: false,
      activeBackgroundId: null,
      officeInteractions: [],
      ringState: 'silent',
      ringAttempts: 0,
      transitioning: false,
    });
    if (scene?.onEnter) get().runActions(scene.onEnter);
  },

  reset: () => {
    set({
      bundle: null,
      currentSceneId: '',
      activeDialogueNodeId: null,
      activeInterfaceId: null,
      activeActionMenuHotspotId: null,
      combiningHotspotId: null,
      interactWithFallbackVisible: false,
      activeBackgroundId: null,
      caseState: createEmptyAdventureCaseState(''),
      officeInteractions: [],
      ringState: 'silent',
      ringAttempts: 0,
      transitioning: false,
    });
  },
}));
