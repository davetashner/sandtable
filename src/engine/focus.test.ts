import { describe, expect, it } from 'vitest';
import type { Battle } from '../packs/schema/index.js';
import { DAY, HOUR, defaultSpeedFor } from './clock.js';
import {
  battleRange,
  enterNow,
  enterSpeed,
  exitNow,
  movementSourceFor,
  resolveFocus,
} from './focus.js';

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
  it('takes the instant a deep link asked for when the clock has already lost it', () => {
    // ?t= is applied while the clock still has the campaign's range, so an
    // instant inside a level with a window of its own never reaches here.
    expect(enterNow(Date.UTC(1914, 7, 2), range, Date.UTC(1914, 8, 8))).toBe(Date.UTC(1914, 8, 8));
    expect(enterNow(Date.UTC(1914, 7, 2), range, Date.UTC(1919, 4, 29))).toBe(range.start);
    // and it never overrides an instant the level already holds
    expect(enterNow(Date.UTC(1914, 8, 7), range, Date.UTC(1914, 8, 10))).toBe(Date.UTC(1914, 8, 7));
  });
  const memory = {
    campaignNow: Date.UTC(1914, 8, 6),
    campaignRange: { start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 10, 25) },
    campaignSpeed: HOUR,
  };
  it('restores the campaign instant on exit unless the viewer moved past it', () => {
    expect(exitNow(memory, Date.UTC(1914, 8, 5, 12))).toBe(Date.UTC(1914, 8, 6));
    expect(exitNow(memory, Date.UTC(1914, 8, 9, 12))).toBe(Date.UTC(1914, 8, 9, 12));
  });
  it('ignores an instant the campaign cannot hold, so an epilogue does not park the reader at the end', () => {
    // The 1915–1919 chapter (ADR 0015) is always "later" than every campaign
    // instant; taking it would leave the reader on 25 November 1914 every time.
    expect(exitNow(memory, Date.UTC(1916, 0, 13))).toBe(memory.campaignNow);
    expect(exitNow(memory, Date.UTC(1905, 11, 1))).toBe(memory.campaignNow);
  });
  it('keeps the pace a range can offer and swaps the one it cannot', () => {
    // A zoom-in and the campaign both read at an hour a second.
    expect(enterSpeed(HOUR, range)).toBe(HOUR);
    expect(enterSpeed(HOUR, memory.campaignRange)).toBe(HOUR);
    // Five years cannot: an hour a second would take a working day to play.
    const epilogue = { start: Date.UTC(1915, 0, 1), end: Date.UTC(1919, 11, 31) };
    expect(enterSpeed(HOUR, epilogue)).toBe(defaultSpeedFor(epilogue));
    expect(enterSpeed(HOUR, epilogue)).toBeGreaterThanOrEqual(DAY);
  });
  it('resolves the focus id against the pack battles', () => {
    expect(resolveFocus([marne], '1914:marne')).toBe(marne);
    expect(resolveFocus([marne], '1914:nope')).toBeUndefined();
    expect(resolveFocus([marne], undefined)).toBeUndefined();
    expect(range.end - range.start).toBe(7 * DAY);
    expect(HOUR * 24).toBe(DAY);
  });
});

describe('movementSourceFor', () => {
  const campaign = {
    routes: [{ id: 'r-army' }],
    formations: [{ id: 'army' }],
    sides: [{ id: 'de', name: 'DE' }],
  } as unknown as Parameters<typeof movementSourceFor>[1];
  it('returns the campaign source when there is no focus or the battle has no routes', () => {
    expect(movementSourceFor(undefined, campaign)).toBe(campaign);
    const bare = { id: '1914:x', routes: [] } as unknown as Parameters<typeof movementSourceFor>[0];
    expect(movementSourceFor(bare, campaign)).toBe(campaign);
  });
  it('animates the battle routes over the battle formations plus the campaign ones inside a zoom-in', () => {
    const battle = {
      id: '1914:marne',
      routes: [{ id: 'r-corps' }],
      formations: [{ id: 'div' }],
    } as unknown as Parameters<typeof movementSourceFor>[0];
    const src = movementSourceFor(battle, campaign);
    expect(src.routes.map((r) => r.id)).toEqual(['r-corps']);
    expect(src.formations.map((f) => f.id)).toEqual(['div', 'army']);
    expect(src.sides).toBe(campaign.sides);
  });
});
