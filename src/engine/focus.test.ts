import { describe, expect, it } from 'vitest';
import type { Battle } from '../packs/schema/index.js';
import { DAY, HOUR } from './clock.js';
import { battleRange, enterNow, exitNow, resolveFocus } from './focus.js';

const marne: Battle = {
  id: '1914:marne',
  title: 'First Battle of the Marne',
  timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
  region: [2.3, 48.4, 4.7, 49.6],
  camera: { center: [3.4, 48.95], zoom: 8 },
  summary: 's',
  sources: [{ source: 'source:x' }],
};

describe('focus', () => {
  const range = battleRange(marne);
  it('converts a battle to a clock range', () => {
    expect(range).toEqual({ start: Date.UTC(1914, 8, 5), end: Date.UTC(1914, 8, 12) });
  });
  it('keeps the campaign instant when it falls inside the battle, else starts at the beginning', () => {
    expect(enterNow(Date.UTC(1914, 8, 7, 6), range)).toBe(Date.UTC(1914, 8, 7, 6));
    expect(enterNow(Date.UTC(1914, 7, 20), range)).toBe(range.start);
    expect(enterNow(Date.UTC(1914, 9, 1), range)).toBe(range.start);
  });
  it('restores the campaign instant on exit unless the viewer moved past it', () => {
    const memory = {
      campaignNow: Date.UTC(1914, 8, 6),
      campaignRange: { start: 0, end: 99 * DAY },
    };
    expect(exitNow(memory, Date.UTC(1914, 8, 5, 12))).toBe(Date.UTC(1914, 8, 6));
    expect(exitNow(memory, Date.UTC(1914, 8, 9, 12))).toBe(Date.UTC(1914, 8, 9, 12));
  });
  it('resolves the focus id against the pack battles', () => {
    expect(resolveFocus([marne], '1914:marne')).toBe(marne);
    expect(resolveFocus([marne], '1914:nope')).toBeUndefined();
    expect(resolveFocus([marne], undefined)).toBeUndefined();
    expect(range.end - range.start).toBe(7 * DAY);
    expect(HOUR * 24).toBe(DAY);
  });
});
