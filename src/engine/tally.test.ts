import { describe, expect, it } from 'vitest';
import type { Tally } from '../packs/schema/index.js';
import { deltaLabel, tallyRunning, tallyStatus } from './tally.js';

const tally: Tally = {
  id: '1914:tally-x',
  title: 'Right wing',
  unit: 'corps',
  start: { value: 16, asOf: '1914-08-17T00:00:00Z' },
  entries: [
    { id: 'antwerp', at: '1914-08-20T12:00:00Z', delta: -1, label: 'III Reserve to Antwerp' },
    { id: 'east', at: '1914-08-25T12:00:00Z', delta: -2, label: 'Two corps east' },
    { id: 'ix-res', at: '1914-08-28T12:00:00Z', delta: 1, label: 'IX Reserve arrives' },
  ],
  sources: [{ source: 'source:x' }],
};
const t = (s: string) => Date.parse(s);

describe('tallyStatus', () => {
  it('runs the ledger to an instant', () => {
    expect(tallyStatus(tally, t('1914-08-10T00:00:00Z'))).toMatchObject({
      value: 16,
      started: false,
      applied: [],
    });
    const mid = tallyStatus(tally, t('1914-08-26T00:00:00Z'));
    expect(mid.value).toBe(13);
    expect(mid.applied.map((e) => e.id)).toEqual(['antwerp', 'east']);
    expect(mid.next?.id).toBe('ix-res');
    expect(tallyStatus(tally, t('1914-09-05T00:00:00Z')).value).toBe(14);
  });
  it('tabulates running totals and labels deltas', () => {
    expect(tallyRunning(tally).map((r) => r.after)).toEqual([15, 13, 14]);
    expect([deltaLabel(1), deltaLabel(-2), deltaLabel(0)]).toEqual(['+1', '−2', '0']);
  });
});
