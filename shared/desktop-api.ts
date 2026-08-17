import type { SaveData } from './save-data';

export type DesktopApi = {
  saveGame: (data: SaveData) => Promise<void>;
  loadGame: () => Promise<SaveData>;
};
