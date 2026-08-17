import { AdventureCaseBundleSchema } from './schemas';
import type { LoadAdventureCaseResult } from './types';

export function loadAdventureCase(rawBundle: unknown): LoadAdventureCaseResult {
  const result = AdventureCaseBundleSchema.safeParse(rawBundle);

  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; '),
    };
  }

  return { ok: true, data: result.data };
}
