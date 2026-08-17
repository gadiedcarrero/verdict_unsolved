import type { AdventureCaseBundle } from './schemas';

export type LoadAdventureCaseResult =
  | { ok: true; data: AdventureCaseBundle }
  | { ok: false; error: string };
