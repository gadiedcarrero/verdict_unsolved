import { create } from 'zustand';
import { createEmptyAdventureCaseState, type AdventureCaseState, type VariableValue } from '@shared/save-data';
import { useSaveStore } from '../game-engine/save-system/save.store';
import { conditionContextOf, evaluateCondition } from '../game-engine/scene-engine/conditions';
import { canSolve, globalEvidenceOf } from '../game-engine/scene-engine/investigation';
import type {
  AdventureCaseBundle,
  DialogueNode,
  Character,
  Clue,
  Hotspot,
  InterfaceId,
  Investigation,
  MinigameTemplate,
  Scene,
  SceneAction,
  SceneBackground,
} from '../game-engine/scene-engine/schemas';

export type ActionMenuActionKind = 'examine' | 'interact' | 'interactWith' | 'close';

/** Minijuego actualmente abierto — ver openMinigame en SceneActionSchema.
 * `sequenceLength` es específico de `template: "sequence"`; cuando se sume
 * otro template esto también pasa a ser una unión por `template`. */
export type ActiveMinigame = {
  template: MinigameTemplate;
  sequenceLength: number;
  onSuccess: SceneAction[];
  onFail: SceneAction[];
};

// 750 = un poco más que la transición CSS de 700ms (ver duration-700 en
// SceneViewer) para que la escena ya haya cambiado cuando el fundido a
// negro termina de taparla del todo — antes eran 550/500, muy rápido para
// el tono del juego, se sentía "cortante" en vez de un fundido real.
const SCENE_FADE_MS = 750;
// Solo para "fadeToBlack": una pausa extra sobre la pantalla negra antes de
// empezar a revelar la escena nueva — el respiro dramático que el nombre
// promete y que antes no existía (fadeToBlack y fade se comportaban
// idéntico). "fade" sigue con el pequeño margen de siempre.
const FADE_TO_BLACK_HOLD_MS = 400;

type FadeKind = 'cut' | 'fade' | 'fadeToBlack';

type AdventureRuntimeState = {
  bundle: AdventureCaseBundle | null;
  currentSceneId: string;
  activeDialogueNodeId: string | null;
  activeInterfaceId: InterfaceId | null;
  caseState: AdventureCaseState;
  transitioning: boolean;
  /** No null mientras está abierto el menú de acción (Examinar/Interactuar/
   * Interactuar con/Cerrar) de este hotspot — ver Hotspot.actionMenuEnabled. */
  activeActionMenuHotspotId: string | null;
  /** No null mientras el juego espera el segundo click de un "Interactuar
   * con" — el valor es el id del primer objeto elegido. Cualquier click en
   * un hotspot mientras esto no es null se interpreta como el segundo
   * objeto de la combinación, no como su interacción normal. */
  combiningHotspotId: string | null;
  /** Clave de traducción del aviso corto que se muestra centrado unos
   * segundos y se va solo, o null. Lo usan la combinación sin resultado
   * (`interactWith.noMatch`) y las zonas bloqueadas por `enabledWhen`
   * (`Hotspot.disabledMessage`) — mismo aviso, no dos mecanismos iguales. */
  transientMessageKey: string | null;
  /** True mientras está abierta la pregunta de deducción de SOLUCIONAR. */
  deductionOpen: boolean;
  /** True mientras está abierto el panel de pistas del caso. */
  cluePanelOpen: boolean;
  /** Id del fondo activo de la escena actual, o null = usar el default
   * (`scene.backgrounds[0]`) — ver acción `toggleBackground`. Se resetea a
   * null en cada cambio de escena, así el fondo alternado de una escena no
   * se arrastra a la próxima vez que se entra ahí. */
  activeBackgroundId: string | null;
  /** No null mientras hay un minijuego abierto — ver acción `openMinigame`. */
  activeMinigame: ActiveMinigame | null;

  init: (bundle: AdventureCaseBundle, persisted: AdventureCaseState | null) => void;
  getActiveScene: () => Scene | null;
  /** El fondo efectivamente activo ahora mismo (`activeBackgroundId`, o el
   * primero de la escena si todavía no se tocó ningún `toggleBackground`/
   * `setBackground`) — cada fondo trae sus propias zonas interactivas (ver
   * SceneBackground.hotspots), así que esto es la fuente real de qué zonas
   * responden en este momento, no `getActiveScene()` sola. */
  getActiveBackground: () => SceneBackground | null;
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
  setBackground: (backgroundId: string) => void;
  /** Corre `onSuccess` o `onFail` del minijuego activo según `success`, y lo
   * cierra. Cancelar el minijuego (p. ej. "Salir") cuenta como fracaso. */
  completeMinigame: (success: boolean) => void;
  openDialogue: (nodeId: string) => void;
  advance: () => void;
  selectChoice: (next: string, setState?: Record<string, unknown>, addFlag?: string) => void;
  closeDialogue: () => void;
  openInterfacePanel: (interfaceId: InterfaceId) => void;
  closeInterface: () => void;
  runActions: (actions: SceneAction[]) => void;
  applyStatePatch: (patch: Partial<AdventureCaseState>) => void;
  addFlag: (flag: string) => void;
  /** Escribe una variable de guion (ver `AdventureCaseState.variables`). */
  setVariable: (name: string, value: VariableValue) => void;
  /** Suma una pista al caso (idempotente) y avisa en pantalla cuál fue. */
  discoverClue: (clueId: string) => void;
  setObjective: (objective: string) => void;
  /** Suma un personaje a los jugables. El primero pasa a ser el activo. */
  unlockCharacter: (characterId: string) => void;
  /** Lo saca. Si era el activo, pasa a serlo el primero que quede. */
  lockCharacter: (characterId: string) => void;
  /** Cambia con quién se juega, desbloqueándolo si hacía falta. */
  setActiveCharacter: (characterId: string) => void;
  getActiveCharacter: () => Character | null;
  /** Los jugables ahora mismo, en el orden del selector. */
  getAvailableCharacters: () => Character[];
  /** La investigación de la escena actual, o null si no es una escena de
   * investigación. */
  getInvestigation: () => Investigation | null;
  /** Si SOLUCIONAR está habilitado: hay investigación, no está ya resuelta, y
   * están las pistas que pide. */
  canSolveInvestigation: () => boolean;
  /** Pulsar SOLUCIONAR: abre la deducción si la hay, o resuelve directo. */
  solveInvestigation: () => void;
  /** Elegir una conclusión. La incorrecta avisa y deja seguir intentando. */
  answerDeduction: (answerId: string) => void;
  closeDeduction: () => void;
  setCluePanelOpen: (open: boolean) => void;
  /** Toda la evidencia global ya descubierta, de cualquier escena del caso. */
  getGlobalEvidence: () => Clue[];
  /** Marca la investigación de la escena como resuelta y corre su `onSolved`. */
  completeInvestigation: () => void;
  /** Si la zona se le muestra al jugador con el estado actual de la partida
   * (`Hotspot.visibleWhen`). El editor NO la usa: ahí se ven todas. */
  isHotspotVisible: (hotspot: Hotspot) => boolean;
  /** Aviso corto centrado que se borra solo. */
  showTransientMessage: (messageKey: string) => void;
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
  transitioning: false,
  activeActionMenuHotspotId: null,
  combiningHotspotId: null,
  transientMessageKey: null,
  deductionOpen: false,
  cluePanelOpen: false,
  activeBackgroundId: null,
  activeMinigame: null,

  init: (bundle, persisted) => {
    const startingSceneId = bundle.case.startingSceneId;
    const caseState = persisted ?? createEmptyAdventureCaseState(startingSceneId);
    set({
      bundle,
      currentSceneId: caseState.registered ? caseState.currentSceneId : startingSceneId,
      caseState,
      activeDialogueNodeId: null,
      activeInterfaceId: null,
      transitioning: false,
      activeActionMenuHotspotId: null,
      combiningHotspotId: null,
      transientMessageKey: null,
      deductionOpen: false,
      cluePanelOpen: false,
      activeBackgroundId: null,
      activeMinigame: null,
    });
  },

  getActiveScene: () => {
    const { bundle, currentSceneId } = get();
    return bundle?.scenes.find((s) => s.id === currentSceneId) ?? null;
  },

  getActiveBackground: () => {
    const scene = get().getActiveScene();
    if (!scene) return null;
    const effectiveId = get().activeBackgroundId ?? scene.backgrounds[0]?.id ?? null;
    return scene.backgrounds.find((bg) => bg.id === effectiveId) ?? scene.backgrounds[0] ?? null;
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

    // La zona se ve, pero todavía no se puede usar ("no puedo mover esto
    // desde la silla"). Se contesta y no corre nada — es distinto de
    // `visibleWhen`, donde la zona directamente no está.
    if (!evaluateCondition(hotspot.enabledWhen, conditionContextOf(state.caseState, state.bundle?.characters ?? []))) {
      if (hotspot.disabledMessage) get().showTransientMessage(hotspot.disabledMessage);
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
    const hotspot = get().getActiveBackground()?.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return;
    get().runActions(kind === 'examine' ? hotspot.onExamine : hotspot.onInteract);
  },

  selectCombineTarget: (targetHotspotId) => {
    const sourceId = get().combiningHotspotId;
    set({ combiningHotspotId: null });
    if (!sourceId || sourceId === targetHotspotId) return;
    const source = get().getActiveBackground()?.hotspots.find((h) => h.id === sourceId);
    const match = source?.interactWithTargets.find((t) => t.targetObjectId === targetHotspotId);
    if (match) {
      get().runActions(match.onInteract);
      return;
    }
    get().showTransientMessage('interactWith.noMatch');
  },

  showTransientMessage: (messageKey) => {
    set({ transientMessageKey: messageKey });
    window.setTimeout(() => {
      // Solo se limpia si sigue siendo el mismo mensaje: si mientras tanto
      // apareció otro, su propio timer es el que tiene que borrarlo, no este.
      if (get().transientMessageKey === messageKey) set({ transientMessageKey: null });
    }, 1800);
  },

  toggleBackground: (backgroundIdA, backgroundIdB) => {
    const scene = get().getActiveScene();
    const effective = get().activeBackgroundId ?? scene?.backgrounds[0]?.id ?? null;
    set({ activeBackgroundId: effective === backgroundIdA ? backgroundIdB : backgroundIdA });
  },

  setBackground: (backgroundId) => {
    set({ activeBackgroundId: backgroundId });
  },

  completeMinigame: (success) => {
    const minigame = get().activeMinigame;
    set({ activeMinigame: null });
    if (!minigame) return;
    get().runActions(success ? minigame.onSuccess : minigame.onFail);
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
        case 'setVariable':
          get().setVariable(action.name, action.value);
          break;
        case 'discoverClue':
          get().discoverClue(action.clueId);
          break;
        case 'setObjective':
          get().setObjective(action.objective);
          break;
        case 'unlockCharacter':
          get().unlockCharacter(action.characterId);
          break;
        case 'lockCharacter':
          get().lockCharacter(action.characterId);
          break;
        case 'setActiveCharacter':
          get().setActiveCharacter(action.characterId);
          break;
        case 'transitionTo': {
          // Lo que venga después en la lista (p. ej. hacer hablar a un
          // personaje) se difiere hasta que la escena nueva termine de
          // entrar — si no, se disparaba en el mismo tick, antes de que
          // la pantalla llegara a fundirse a la escena nueva.
          const remaining = actions.slice(i + 1);
          const runRemaining = remaining.length > 0 ? () => get().runActions(remaining) : undefined;
          // sceneId puede ser la escena en la que ya se está (ver
          // comentario de backgroundId en el schema) — ahí no tiene
          // sentido un fundido completo ni volver a correr onEnter, así
          // que se resuelve como un simple cambio de fondo instantáneo.
          if (action.sceneId === get().currentSceneId) {
            if (action.backgroundId) get().setBackground(action.backgroundId);
            runRemaining?.();
            return;
          }
          get().transitionToScene(action.sceneId, action.fade, () => {
            if (action.backgroundId) get().setBackground(action.backgroundId);
            runRemaining?.();
          });
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
        case 'setBackground':
          get().setBackground(action.backgroundId);
          break;
        case 'openMinigame':
          set({
            activeMinigame: {
              template: action.template,
              sequenceLength: action.sequenceLength,
              onSuccess: action.onSuccess,
              onFail: action.onFail,
            },
          });
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

  setVariable: (name, value) => {
    set((state) => ({
      caseState: {
        ...state.caseState,
        variables: { ...(state.caseState.variables ?? {}), [name]: value },
      },
    }));
    persistIfRegistered(get().caseState);
  },

  isHotspotVisible: (hotspot) =>
    evaluateCondition(hotspot.visibleWhen, conditionContextOf(get().caseState, get().bundle?.characters ?? [])),

  discoverClue: (clueId) => {
    const { caseState } = get();
    if (caseState.discoveredClueIds.includes(clueId)) return;

    set({
      caseState: { ...caseState, discoveredClueIds: [...caseState.discoveredClueIds, clueId] },
    });
    persistIfRegistered(get().caseState);

    // El aviso usa el texto de la pista, no un "pista descubierta" genérico:
    // enterarse de QUÉ se descubrió es el momento de la escena.
    const clue = get().getActiveScene()?.investigation?.clues.find((c) => c.id === clueId);
    if (clue) get().showTransientMessage(clue.text);
  },

  setObjective: (objective) => {
    set((state) => ({ caseState: { ...state.caseState, objective } }));
    persistIfRegistered(get().caseState);
  },

  unlockCharacter: (characterId) => {
    set((state) => {
      if (state.caseState.availableCharacterIds.includes(characterId)) return state;
      const availableCharacterIds = [...state.caseState.availableCharacterIds, characterId];
      return {
        caseState: {
          ...state.caseState,
          availableCharacterIds,
          // El primero que se desbloquea pasa a ser el activo: si no, el
          // juego arrancaría con un personaje disponible y ninguno elegido, y
          // toda condición que pida capacidades fallaría.
          activeCharacterId: state.caseState.activeCharacterId ?? characterId,
        },
      };
    });
    persistIfRegistered(get().caseState);
  },

  lockCharacter: (characterId) => {
    set((state) => {
      const availableCharacterIds = state.caseState.availableCharacterIds.filter((id) => id !== characterId);
      // Si se bloquea al que estaba activo (el giro Gray/Wraith → Adrian),
      // el activo pasa al primero que quede, o a null si no queda ninguno —
      // nunca a un personaje que el jugador ya no tiene.
      const activeCharacterId =
        state.caseState.activeCharacterId === characterId
          ? (availableCharacterIds[0] ?? null)
          : state.caseState.activeCharacterId;
      return { caseState: { ...state.caseState, availableCharacterIds, activeCharacterId } };
    });
    persistIfRegistered(get().caseState);
  },

  setActiveCharacter: (characterId) => {
    set((state) => ({
      caseState: {
        ...state.caseState,
        activeCharacterId: characterId,
        // Jugar una escena con alguien implica tenerlo: el guion declara
        // `### PERSONAJE: WRAITH` sin acordarse de desbloquearlo antes.
        availableCharacterIds: state.caseState.availableCharacterIds.includes(characterId)
          ? state.caseState.availableCharacterIds
          : [...state.caseState.availableCharacterIds, characterId],
      },
    }));
    persistIfRegistered(get().caseState);
  },

  getActiveCharacter: () => {
    const { bundle, caseState } = get();
    return bundle?.characters.find((character) => character.id === caseState.activeCharacterId) ?? null;
  },

  getAvailableCharacters: () => {
    const { bundle, caseState } = get();
    return caseState.availableCharacterIds
      .map((id) => bundle?.characters.find((character) => character.id === id))
      .filter((character): character is Character => character !== undefined);
  },

  getInvestigation: () => get().getActiveScene()?.investigation ?? null,

  canSolveInvestigation: () => {
    const investigation = get().getInvestigation();
    if (!investigation) return false;
    if (get().caseState.solvedSceneIds.includes(get().currentSceneId)) return false;
    return canSolve(investigation, get().caseState.discoveredClueIds);
  },

  solveInvestigation: () => {
    const investigation = get().getInvestigation();
    if (!investigation || !get().canSolveInvestigation()) return;

    // Con deducción, SOLUCIONAR solo abre la pregunta — resolver de verdad es
    // acertarla. Sin deducción es el "modo simple": se da por resuelta.
    if (investigation.deduction) {
      set({ deductionOpen: true });
      return;
    }
    get().completeInvestigation();
  },

  answerDeduction: (answerId) => {
    const investigation = get().getInvestigation();
    const deduction = investigation?.deduction;
    if (!deduction) return;

    if (answerId !== deduction.correctAnswerId) {
      // Fallar no cuesta progreso ni pistas: la pregunta queda abierta para
      // volver a intentar. Lo que no pasa es avanzar.
      get().showTransientMessage(deduction.wrongMessage);
      return;
    }
    set({ deductionOpen: false });
    get().completeInvestigation();
  },

  closeDeduction: () => {
    set({ deductionOpen: false });
  },

  setCluePanelOpen: (open) => {
    set({ cluePanelOpen: open });
  },

  getGlobalEvidence: () => globalEvidenceOf(get().bundle?.scenes ?? [], get().caseState.discoveredClueIds),

  completeInvestigation: () => {
    const investigation = get().getInvestigation();
    if (!investigation) return;

    const sceneId = get().currentSceneId;
    set((state) => ({
      caseState: state.caseState.solvedSceneIds.includes(sceneId)
        ? state.caseState
        : { ...state.caseState, solvedSceneIds: [...state.caseState.solvedSceneIds, sceneId] },
    }));
    persistIfRegistered(get().caseState);
    get().runActions(investigation.onSolved);
  },

  transitionToScene: (sceneId, fade, onComplete) => {
    set({
      activeDialogueNodeId: null,
      activeInterfaceId: null,
      activeActionMenuHotspotId: null,
      combiningHotspotId: null,
      transientMessageKey: null,
      deductionOpen: false,
      cluePanelOpen: false,
      activeMinigame: null,
      transitioning: true,
    });
    const delay = fade === 'cut' ? 0 : SCENE_FADE_MS;
    window.setTimeout(() => {
      const scene = get().bundle?.scenes.find((s) => s.id === sceneId) ?? null;
      set((state) => ({
        currentSceneId: sceneId,
        activeBackgroundId: null,
        caseState: {
          ...state.caseState,
          currentSceneId: sceneId,
          // El objetivo lo fija la escena a la que se entra; una escena sin
          // investigación lo apaga, para que no quede colgado el de la
          // anterior en el HUD.
          objective: scene?.investigation?.objective ?? null,
          // Lo mismo con el personaje, salvo que acá "ausente" significa
          // seguir con el que venía: cambiar de cuarto no cambia quién sos.
          activeCharacterId: scene?.activeCharacterId ?? state.caseState.activeCharacterId,
          availableCharacterIds:
            scene?.activeCharacterId && !state.caseState.availableCharacterIds.includes(scene.activeCharacterId)
              ? [...state.caseState.availableCharacterIds, scene.activeCharacterId]
              : state.caseState.availableCharacterIds,
        },
      }));
      persistIfRegistered(get().caseState);
      if (scene?.onEnter) get().runActions(scene.onEnter);
      window.setTimeout(
        () => {
          set({ transitioning: false });
          onComplete?.();
        },
        fade === 'fadeToBlack' ? FADE_TO_BLACK_HOLD_MS : 50,
      );
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
      transientMessageKey: null,
      deductionOpen: false,
      cluePanelOpen: false,
      activeBackgroundId: null,
      activeMinigame: null,
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
      transientMessageKey: null,
      deductionOpen: false,
      cluePanelOpen: false,
      activeBackgroundId: null,
      activeMinigame: null,
      caseState: createEmptyAdventureCaseState(''),
      transitioning: false,
    });
  },
}));
