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

  init: (bundle: AdventureCaseBundle, persisted: AdventureCaseState | null) => void;
  getActiveScene: () => Scene | null;
  getActiveNode: () => DialogueNode | null;
  interactHotspot: (hotspot: Hotspot) => void;
  openDialogue: (nodeId: string) => void;
  advance: () => void;
  selectChoice: (next: string, setState?: Record<string, unknown>, addFlag?: string) => void;
  closeDialogue: () => void;
  openInterfacePanel: (interfaceId: InterfaceId) => void;
  closeInterface: () => void;
  runActions: (actions: SceneAction[]) => void;
  applyStatePatch: (patch: Partial<AdventureCaseState>) => void;
  addFlag: (flag: string) => void;
  transitionToScene: (sceneId: string, fade: FadeKind) => void;
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

    get().runActions(hotspot.onInteract);
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
    for (const action of actions) {
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
        case 'transitionTo':
          get().transitionToScene(action.sceneId, action.fade);
          break;
        case 'openInterface':
          get().openInterfacePanel(action.interfaceId);
          break;
        case 'addMoney':
          useSaveStore.getState().addMoney(action.amount);
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

  transitionToScene: (sceneId, fade) => {
    set({ activeDialogueNodeId: null, activeInterfaceId: null, transitioning: true });
    const delay = fade === 'cut' ? 0 : SCENE_FADE_MS;
    window.setTimeout(() => {
      const scene = get().bundle?.scenes.find((s) => s.id === sceneId) ?? null;
      set((state) => ({
        currentSceneId: sceneId,
        officeInteractions: [],
        ringState: 'silent',
        ringAttempts: 0,
        caseState: { ...state.caseState, currentSceneId: sceneId },
      }));
      persistIfRegistered(get().caseState);
      if (scene?.onEnter) get().runActions(scene.onEnter);
      window.setTimeout(() => set({ transitioning: false }), 50);
    }, delay);
  },

  playFromScene: (sceneId) => {
    const scene = get().bundle?.scenes.find((s) => s.id === sceneId) ?? null;
    set({
      currentSceneId: sceneId,
      activeDialogueNodeId: null,
      activeInterfaceId: null,
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
      caseState: createEmptyAdventureCaseState(''),
      officeInteractions: [],
      ringState: 'silent',
      ringAttempts: 0,
      transitioning: false,
    });
  },
}));
