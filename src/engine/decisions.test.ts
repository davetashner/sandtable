import { describe, expect, it } from 'vitest';
import type { DecisionPoint } from '../packs/schema/index.js';
import { decisionCrossed } from './decisions.js';

const d = (id: string, at: string) =>
  ({
    id,
    at,
    title: id,
    question: 'q',
    options: [],
    historical: 'x',
    reasoning: 'r',
    verdict: 'v',
    sources: [],
  }) as unknown as DecisionPoint;
const decisions = [d('b', '1914-08-30T18:00:00Z'), d('a', '1914-08-25T12:00:00Z')];

describe('decisionCrossed', () => {
  it('returns the earliest unseen decision whose instant the clock just crossed', () => {
    const t = (s: string) => Date.parse(s);
    expect(
      decisionCrossed(decisions, t('1914-08-25T11:00:00Z'), t('1914-08-25T13:00:00Z'), new Set())
        ?.id,
    ).toBe('a');
    // crossing both in one tick → the earlier one
    expect(
      decisionCrossed(decisions, t('1914-08-25T00:00:00Z'), t('1914-09-01T00:00:00Z'), new Set())
        ?.id,
    ).toBe('a');
    // seen ones are skipped
    expect(
      decisionCrossed(
        decisions,
        t('1914-08-25T00:00:00Z'),
        t('1914-09-01T00:00:00Z'),
        new Set(['a']),
      )?.id,
    ).toBe('b');
    // not crossed, or going backwards → nothing
    expect(
      decisionCrossed(decisions, t('1914-08-25T13:00:00Z'), t('1914-08-26T00:00:00Z'), new Set()),
    ).toBeUndefined();
    expect(
      decisionCrossed(decisions, t('1914-08-26T00:00:00Z'), t('1914-08-25T00:00:00Z'), new Set()),
    ).toBeUndefined();
  });
});
