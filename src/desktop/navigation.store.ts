import { create } from 'zustand';

export type SectionId =
  | 'case-desk'
  | 'evidence'
  | 'people'
  | 'locations'
  | 'timeline'
  | 'analytics'
  | 'messages'
  | 'reports'
  | 'settings';

type NavigationState = {
  activeSection: SectionId;
  setSection: (section: SectionId) => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  activeSection: 'case-desk',
  setSection: (section) => {
    set({ activeSection: section });
  },
}));
