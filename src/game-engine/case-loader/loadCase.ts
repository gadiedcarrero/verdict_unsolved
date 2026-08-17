import { CaseBundleSchema } from './schemas';
import type { LoadCaseResult } from './types';

export function loadCase(rawBundle: unknown): LoadCaseResult {
  const result = CaseBundleSchema.safeParse(rawBundle);

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
