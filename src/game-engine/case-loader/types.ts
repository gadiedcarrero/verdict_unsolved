import type { CaseBundle } from './schemas';

export type LoadCaseResult = { ok: true; data: CaseBundle } | { ok: false; error: string };
