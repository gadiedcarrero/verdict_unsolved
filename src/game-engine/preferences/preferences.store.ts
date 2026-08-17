import { create } from 'zustand';

export type TextScale = 'normal' | 'large';

type PreferencesState = {
  textScale: TextScale;
  reduceMotion: boolean;
  setTextScale: (scale: TextScale) => void;
  toggleReduceMotion: () => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  textScale: 'normal',
  reduceMotion: false,
  setTextScale: (scale) => {
    set({ textScale: scale });
  },
  toggleReduceMotion: () => {
    set((state) => ({ reduceMotion: !state.reduceMotion }));
  },
}));
