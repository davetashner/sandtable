import { describe, expect, it } from 'vitest';
import type { CasualtyRecord, Vignette } from '../packs/schema/index.js';
import { estimate, formatEstimate, recordsToDate, totals, vignettesFor, weakest } from './human.js';

const T = (s: string) => Date.parse(s);

const vignette = (over: Partial<Vignette>): Vignette => ({
  id: '1914:vignette-x',
  title: 'X',
  at: '1914-08-07T08:00:00Z',
  voice: 'Someone',
  kind: 'memoir',
  text: 'Text.',
  sources: [{ source: 'source:herwig-2009' }],
  ...over,
});

describe('vignettesFor', () => {
  const beat = { from: '1914-08-05T00:00:00Z', to: '1914-08-16T00:00:00Z' };
  const vs = [
    vignette({ id: '1914:vignette-b', at: '1914-08-10T00:00:00Z' }),
    vignette({ id: '1914:vignette-a', at: '1914-08-07T08:00:00Z' }),
    vignette({ id: '1914:vignette-later', at: '1914-08-20T00:00:00Z' }),
    vignette({ id: '1914:vignette-cf', at: '1914-08-08T00:00:00Z', branch: '1914:concept' }),
  ];
  it('returns the beat’s vignettes the clock has passed, in time order', () => {
    expect(
      vignettesFor(vs, beat, T('1914-08-12T00:00:00Z'), '1914:historical').map((v) => v.id),
    ).toEqual(['1914:vignette-a', '1914:vignette-b']);
    expect(
      vignettesFor(vs, beat, T('1914-08-07T08:00:00Z'), '1914:historical').map((v) => v.id),
    ).toEqual(['1914:vignette-a']);
    expect(vignettesFor(vs, beat, T('1914-08-06T00:00:00Z'), '1914:historical')).toEqual([]);
  });
  it('honours the branch and the absence of a beat', () => {
    expect(
      vignettesFor(vs, beat, T('1914-08-12T00:00:00Z'), '1914:concept').map((v) => v.id),
    ).toEqual(['1914:vignette-a', '1914:vignette-cf', '1914:vignette-b']);
    expect(vignettesFor(vs, undefined, T('1914-08-12T00:00:00Z'), '1914:historical')).toEqual([]);
  });
});

describe('casualty arithmetic', () => {
  it('reads a figure as a range', () => {
    expect(estimate({ value: 27000 })).toEqual({ low: 27000, high: 27000, mid: 27000 });
    expect(estimate({ low: 200000, high: 260000 })).toEqual({
      low: 200000,
      high: 260000,
      mid: 230000,
    });
    expect(estimate({ low: 200000, high: 260000, value: 210000 }).mid).toBe(210000);
  });
  it('keeps the weakest confidence', () => {
    expect(weakest('high', 'low')).toBe('low');
    expect(weakest('contested', 'high')).toBe('contested');
    expect(weakest(undefined, 'medium')).toBe('medium');
  });
  const record = (over: Partial<CasualtyRecord>): CasualtyRecord => ({
    id: '1914:casualties-x',
    title: 'X',
    timeRange: { start: '1914-08-22T00:00:00Z', end: '1914-08-23T00:00:00Z' },
    figures: [{ side: 'fr', category: 'killed', value: 27000, confidence: 'medium' }],
    sources: [{ source: 'source:herwig-2009' }],
    ...over,
  });
  const records = [
    record({
      id: '1914:casualties-b',
      timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
      figures: [
        { side: 'fr', category: 'casualties', low: 200000, high: 250000, confidence: 'contested' },
        { side: 'de', category: 'casualties', low: 200000, high: 250000, confidence: 'contested' },
      ],
    }),
    record({ id: '1914:casualties-a' }),
    record({
      id: '1914:casualties-c',
      timeRange: { start: '1914-08-01T00:00:00Z', end: '1914-09-01T00:00:00Z' },
      figures: [{ side: 'fr', category: 'casualties', value: 206515, confidence: 'medium' }],
    }),
  ];
  it('counts only records whose period has elapsed, ordered by end', () => {
    expect(recordsToDate(records, T('1914-09-01T00:00:00Z')).map((r) => r.id)).toEqual([
      '1914:casualties-a',
      '1914:casualties-c',
    ]);
    expect(recordsToDate(records, T('1914-08-22T12:00:00Z'))).toEqual([]);
  });
  it('sums per side and category, never across categories', () => {
    const t = totals(recordsToDate(records, T('1914-09-30T00:00:00Z')));
    const fr = t.filter((x) => x.side === 'fr');
    expect(fr.find((x) => x.category === 'killed')?.estimate.mid).toBe(27000);
    const cas = fr.find((x) => x.category === 'casualties')!;
    expect(cas.estimate).toEqual({ low: 406515, high: 456515, mid: 431515 });
    expect(cas.confidence).toBe('contested');
    expect(cas.records).toEqual(['1914:casualties-c', '1914:casualties-b']);
    expect(t.find((x) => x.side === 'de')?.estimate.low).toBe(200000);
  });
  it('formats ranges', () => {
    expect(formatEstimate({ low: 27000, high: 27000, mid: 27000 })).toBe('27,000');
    expect(formatEstimate({ low: 200000, high: 250000, mid: 225000 })).toBe('200,000–250,000');
  });
});
