import { describe, expect, it } from 'vitest';
import { DAY, HOUR } from './clock.js';
import { labelNow, labelSpan, pickStep, ticksFor, toIsoNoMs } from './ticks.js';

const AUG2 = Date.UTC(1914, 7, 2);

describe('ticksFor', () => {
  it('picks weekly major ticks for a 16-week campaign and labels the first with its month', () => {
    const range = { start: AUG2, end: Date.UTC(1914, 10, 25) };
    expect(pickStep(range).unit).toBe('week');
    const majors = ticksFor(range).filter((t) => t.major);
    expect(majors.length).toBeGreaterThanOrEqual(8);
    expect(majors.length).toBeLessThanOrEqual(18);
    expect(majors[0]?.label).toMatch(/Aug/);
    expect(majors.every((t) => t.at >= range.start && t.at <= range.end)).toBe(true);
  });

  it('uses hours on a battle sub-timeline and years on an era', () => {
    const battle = { start: Date.UTC(1914, 8, 6), end: Date.UTC(1914, 8, 6, 18) };
    const bt = ticksFor(battle).filter((t) => t.major);
    expect(bt[0]?.label).toBe('6 Sep 00:00');
    expect(bt[1]?.label).toBe('03:00');
    const era = { start: Date.UTC(1914, 6, 28), end: Date.UTC(1918, 10, 11) };
    const et = ticksFor(era).filter((t) => t.major);
    expect(et.map((t) => t.label)).toEqual([
      'Jan 1915',
      'Jul',
      'Jan 1916',
      'Jul',
      'Jan 1917',
      'Jul',
      'Jan 1918',
      'Jul',
    ]);
    const decades = { start: Date.UTC(1870, 0, 1), end: Date.UTC(1953, 6, 27) };
    expect(
      ticksFor(decades)
        .filter((t) => t.major)
        .map((t) => t.label),
    ).toEqual(['1870', '1880', '1890', '1900', '1910', '1920', '1930', '1940', '1950']);
  });

  it('sorts ticks and never duplicates a major as a minor', () => {
    const range = { start: AUG2, end: AUG2 + 42 * DAY };
    const ticks = ticksFor(range);
    const ats = ticks.map((t) => t.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    expect(new Set(ats).size).toBe(ats.length);
  });
});

describe('labelNow', () => {
  it('counts days on a campaign and hours on a battle', () => {
    const campaign = { start: AUG2, end: AUG2 + 100 * DAY };
    const l = labelNow(AUG2 + 22 * DAY + 12 * HOUR, campaign);
    expect(l.counter).toBe('Day 22');
    expect(l.date).toBe('24 August 1914, 12:00');
    expect(l.weekday).toBe('Monday');
    const battle = { start: Date.UTC(1914, 8, 6), end: Date.UTC(1914, 8, 6, 18) };
    expect(labelNow(Date.UTC(1914, 8, 6, 7, 30), battle).counter).toBe('Hour 7');
  });

  it('drops the time of day on multi-year ranges', () => {
    const era = { start: Date.UTC(1914, 0, 1), end: Date.UTC(1918, 11, 31) };
    expect(labelNow(Date.UTC(1916, 1, 21, 7), era).date).toBe('21 February 1916');
  });
});

describe('toIsoNoMs', () => {
  it('formats without milliseconds', () => {
    expect(toIsoNoMs(Date.UTC(1914, 7, 24, 12))).toBe('1914-08-24T12:00:00Z');
  });
});

describe('labelSpan', () => {
  const span = (a: [number, number, number], b: [number, number, number]) =>
    labelSpan({ start: Date.UTC(...a), end: Date.UTC(...b) });

  it('drops what the two ends share', () => {
    // the Marne: one month, one year
    expect(span([1914, 8, 5], [1914, 8, 12])).toBe('5–12 Sep 1914');
    // Belgium beyond Liège: two months, one year
    expect(span([1914, 7, 18], [1914, 8, 14])).toBe('18 Aug – 14 Sep 1914');
    // a span that crosses a new year keeps both
    expect(span([1914, 5, 28], [1915, 1, 3])).toBe('28 Jun 1914 – 3 Feb 1915');
  });

  it('writes a single day once', () => {
    expect(span([1914, 7, 24], [1914, 7, 24])).toBe('24 Aug 1914');
  });

  it('writes whole calendar years as years', () => {
    // the epilogue (ADR 0015): the years, not two dates nobody chose
    expect(span([1915, 0, 1], [1919, 11, 31])).toBe('1915–1919');
    expect(span([1916, 0, 1], [1916, 11, 31])).toBe('1916');
    // one day short of the year is a date range again
    expect(span([1915, 0, 1], [1919, 11, 30])).toBe('1 Jan 1915 – 30 Dec 1919');
  });
});
