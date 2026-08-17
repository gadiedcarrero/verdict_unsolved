import { create } from 'zustand';
import {
  createEmptySave,
  SAVE_SCHEMA_VERSION,
  type AdventureCaseState,
  type SaveData,
} from '@shared/save-data';

type SaveState = SaveData & {
  isLoaded: boolean;
  load: () => Promise<void>;
  persist: () => Promise<void>;
  addMoney: (amount: number) => void;
  addReputation: (amount: number) => void;
  setActiveCase: (caseId: string | null) => void;
  discoverEvidence: (evidenceId: string) => void;
  setAdventureCaseState: (state: AdventureCaseState) => void;
  patchAdventureCaseState: (patch: Partial<AdventureCaseState>) => void;
};

function snapshot(state: SaveState): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    money: state.money,
    reputation: state.reputation,
    activeCaseId: state.activeCaseId,
    discoveredEvidenceIds: state.discoveredEvidenceIds,
    openAppIds: state.openAppIds,
    adventureCaseState: state.adventureCaseState,
  };
}

export const useSaveStore = create<SaveState>((set, get) => ({
  ...createEmptySave(),
  isLoaded: false,

  load: async () => {
    try {
      const data = await window.api.loadGame();
      set({ ...data, isLoaded: true });
    } catch (error) {
      console.error('No se pudo cargar la partida guardada, se inicia con datos vacíos.', error);
      set({ isLoaded: true });
    }
  },

  persist: async () => {
    await window.api.saveGame(snapshot(get()));
  },

  addMoney: (amount) => {
    set((state) => ({ money: state.money + amount }));
  },

  addReputation: (amount) => {
    set((state) => ({ reputation: state.reputation + amount }));
  },

  setActiveCase: (caseId) => {
    set({ activeCaseId: caseId });
  },

  discoverEvidence: (evidenceId) => {
    set((state) =>
      state.discoveredEvidenceIds.includes(evidenceId)
        ? state
        : { discoveredEvidenceIds: [...state.discoveredEvidenceIds, evidenceId] },
    );
  },

  setAdventureCaseState: (adventureCaseState) => {
    set({ adventureCaseState });
  },

  patchAdventureCaseState: (patch) => {
    set((state) =>
      state.adventureCaseState
        ? { adventureCaseState: { ...state.adventureCaseState, ...patch } }
        : state,
    );
  },
}));
