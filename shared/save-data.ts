/**
 * Shared between the Electron main process and the renderer (via preload).
 * Kept dependency-free and framework-agnostic on purpose.
 */
export const SAVE_SCHEMA_VERSION = 3 as const;

/**
 * Estados persistentes del Caso 001 "La última llamada" (ver
 * docs/verdict-unsolved/00-guion-original.md, sección 4).
 * Antes de `registered = true` (Escena 2, aceptar el caso) este objeto vive
 * solo en memoria del runtime; a partir de ahí cada cambio se persiste.
 */
export type AgentId = 'ghost' | 'patch' | 'rook';

/** Valor de una variable de guion. A propósito solo estos tres tipos: son los
 * que un guion sabe escribir y una condición sabe comparar. */
export type VariableValue = string | number | boolean;

export type AdventureCaseState = {
  registered: boolean;
  currentSceneId: string;
  selectedAgent: AgentId | null;
  agentTrust: number;
  agentInjured: boolean;
  agentAlive: boolean;
  danielAlive: boolean;
  janusRecovered: boolean;
  clientTruthDiscovered: boolean;
  alarmLevel: number;
  equipmentOwned: string[];
  equipmentLost: string[];
  wraithIdentitySuspicion: number;
  mirrorHintsUsed: number;
  casePayment: number;
  /** Marcas narrativas menores (tono, tries de sondeo) sin rango fijo en el guion. */
  flags: string[];
  /** Variables libres del guion, por nombre (LENA_LIED, HALCYON_ACTIVE,
   * THEO_TRAITOR...). Los campos de arriba son de VERDICT: UNSOLVED y
   * quedaron cableados acá cuando había un solo juego; este saco es el
   * equivalente genérico, y es lo que debe usar un juego nuevo — la
   * plataforma no puede tener un campo por variable de cada guion. Los
   * campos viejos se quedan porque escenas y paneles ya guardados dependen
   * de ellos; migrarlos es un trabajo aparte.
   *
   * Puede faltar en partidas guardadas antes de que esto existiera: usar
   * siempre `normalizeAdventureCaseState` al leer de disco. */
  variables: Record<string, VariableValue>;
};

export type SaveData = {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  money: number;
  reputation: number;
  activeCaseId: string | null;
  discoveredEvidenceIds: string[];
  openAppIds: string[];
  adventureCaseState: AdventureCaseState | null;
};

export function createEmptyAdventureCaseState(startingSceneId: string): AdventureCaseState {
  return {
    registered: false,
    currentSceneId: startingSceneId,
    selectedAgent: null,
    agentTrust: 0,
    agentInjured: false,
    agentAlive: true,
    danielAlive: true,
    janusRecovered: false,
    clientTruthDiscovered: false,
    alarmLevel: 0,
    equipmentOwned: [],
    equipmentLost: [],
    wraithIdentitySuspicion: 0,
    mirrorHintsUsed: 0,
    casePayment: 0,
    flags: [],
    variables: {},
  };
}

function isVariableRecord(value: unknown): value is Record<string, VariableValue> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}

/** Rellena lo que una partida guardada más vieja no tenga. Se aplica al leer
 * de disco: sin esto, `variables` llega `undefined` desde un save anterior a
 * este campo y cualquier condición que lo consulte revienta. No sube
 * `SAVE_SCHEMA_VERSION` a propósito — nada del formato viejo cambió de
 * significado, así que subirlo solo lograría descartar partidas válidas. */
export function normalizeAdventureCaseState(state: AdventureCaseState): AdventureCaseState {
  return { ...state, variables: state.variables ?? {} };
}

export function createEmptySave(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    money: 0,
    reputation: 0,
    activeCaseId: null,
    discoveredEvidenceIds: [],
    openAppIds: [],
    adventureCaseState: null,
  };
}

function isAdventureCaseState(value: unknown): value is AdventureCaseState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['registered'] === 'boolean' &&
    typeof v['currentSceneId'] === 'string' &&
    (v['selectedAgent'] === null || typeof v['selectedAgent'] === 'string') &&
    typeof v['agentTrust'] === 'number' &&
    typeof v['agentInjured'] === 'boolean' &&
    typeof v['agentAlive'] === 'boolean' &&
    typeof v['danielAlive'] === 'boolean' &&
    typeof v['janusRecovered'] === 'boolean' &&
    typeof v['clientTruthDiscovered'] === 'boolean' &&
    typeof v['alarmLevel'] === 'number' &&
    Array.isArray(v['equipmentOwned']) &&
    Array.isArray(v['equipmentLost']) &&
    typeof v['wraithIdentitySuspicion'] === 'number' &&
    typeof v['mirrorHintsUsed'] === 'number' &&
    typeof v['casePayment'] === 'number' &&
    Array.isArray(v['flags']) &&
    // Ausente = partida guardada antes de que existiera el campo; se rellena
    // en normalizeAdventureCaseState, no se rechaza el save entero.
    (v['variables'] === undefined || isVariableRecord(v['variables']))
  );
}

export function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v['schemaVersion'] === SAVE_SCHEMA_VERSION &&
    typeof v['money'] === 'number' &&
    typeof v['reputation'] === 'number' &&
    (typeof v['activeCaseId'] === 'string' || v['activeCaseId'] === null) &&
    Array.isArray(v['discoveredEvidenceIds']) &&
    Array.isArray(v['openAppIds']) &&
    (v['adventureCaseState'] === null || isAdventureCaseState(v['adventureCaseState']))
  );
}
