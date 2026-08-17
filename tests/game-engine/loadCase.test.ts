import { describe, expect, it } from 'vitest';
import { loadCase } from '@/game-engine/case-loader/loadCase';
import { caseBundleRaw } from '@/cases/case-001-four-minutes';

describe('loadCase', () => {
  it('loads the demo case bundle successfully', () => {
    const result = loadCase(caseBundleRaw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.case.id).toBe('case-001-four-minutes');
      expect(result.data.characters.length).toBeGreaterThan(0);
      expect(result.data.evidence.length).toBeGreaterThan(0);
      expect(result.data.conversations.length).toBeGreaterThan(0);
    }
  });

  it('fails with a readable error when the case is missing required fields', () => {
    const corrupted = {
      case: { id: 'broken-case' },
      characters: [],
      evidence: [],
      records: [],
      conversations: [],
      conclusions: [],
    };

    const result = loadCase(corrupted);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error).toContain('case.title');
    }
  });

  it('fails when evidence entries have the wrong shape', () => {
    const corrupted = {
      ...caseBundleRaw,
      evidence: [{ id: 'evidence-x', title: 'Sin descripción' }],
    };

    const result = loadCase(corrupted);

    expect(result.ok).toBe(false);
  });
});
