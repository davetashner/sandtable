import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Timetable } from '../packs/schema/index.js';
import {
  plannedDayOf,
  plannedLabel,
  scaleOf,
  slipLabel,
  slipTone,
  timetableStatus,
} from './timetable.js';

const plan: Timetable = {
  id: '1914:clock-x',
  title: 'Plan',
  origin: '1914-08-02T00:00:00Z',
  assumption: 'a',
  milestones: [
    { id: 'liege', label: 'Liège', plannedDay: 12, actualAt: '1914-08-16T00:00:00Z' },
    { id: 'brussels', label: 'Brussels', plannedDay: 19, actualAt: '1914-08-20T00:00:00Z' },
    { id: 'decision', label: 'Decision', plannedDay: 39 },
    {
      id: 'russians',
      label: 'Russians effective',
      plannedDay: 40,
      actualAt: '1914-08-17T00:00:00Z',
    },
    { id: 'tannenberg', label: 'Tannenberg', actualAt: '1914-08-30T00:00:00Z' },
  ],
  sources: [{ source: 'source:x' }],
};
const t = (s: string) => Date.parse(s);

describe('timetableStatus', () => {
  it('reads the slip on the milestone furthest along — behind while waiting, then by its actual date', () => {
    expect(timetableStatus(plan, t('1914-08-10T00:00:00Z')).slipDays).toBeUndefined();
    // day 13: Liège due on day 12, not yet taken → 1 day behind and counting
    expect(timetableStatus(plan, t('1914-08-15T00:00:00Z')).slipDays).toBeCloseTo(1);
    // day 15: Liège taken on day 14 → 2 days behind; Russians (planned 40) crossed on day 15 → early, and furthest along
    const s = timetableStatus(plan, t('1914-08-17T12:00:00Z'));
    expect(s.current?.id).toBe('russians');
    expect(s.slipDays).toBeCloseTo(15 - 40);
    expect(s.reached.map((m) => m.id)).toEqual(['liege', 'russians']);
    expect(s.due.map((m) => m.id)).toEqual(['liege']);
    expect(s.next?.id).toBe('brussels');
  });
  it('keeps counting on a milestone that never happened', () => {
    const s = timetableStatus(plan, t('1914-09-12T00:00:00Z')); // day 41
    expect(s.current?.id).toBe('russians');
    expect(
      timetableStatus(
        { ...plan, milestones: plan.milestones.slice(0, 3) },
        t('1914-09-12T00:00:00Z'),
      ).slipDays,
    ).toBeCloseTo(2);
  });
  it('labels the slip', () => {
    expect(slipLabel(undefined)).toBe('—');
    expect(slipLabel(0.2)).toBe('on time');
    expect(slipLabel(2.6)).toBe('3 d behind');
    expect(slipLabel(-25)).toBe('25 d ahead');
  });
});

// ---------------------------------------------------------------- sand-lry.24
// A plan that names an hour, and the proof that a plan that names a day is
// untouched by it.

/** The 1941 shape: Tokyo's one o'clock in Washington, handed over at 2.20. */
const washington: Timetable = {
  id: '1941:clock-washington',
  title: 'The Washington clock',
  origin: '1941-11-26T00:00:00Z',
  dayLabel: 'D+',
  assumption: 'a',
  milestones: [
    {
      id: 'one-oclock',
      label: 'The hour Tokyo ordered',
      plannedAt: '1941-12-07T18:00:00Z',
      actualAt: '1941-12-07T19:20:00Z',
    },
  ],
  sources: [{ source: 'source:x' }],
};

describe('a plan that names an instant (sand-lry.24)', () => {
  it('reads the planned day off plannedAt', () => {
    const m = washington.milestones[0]!;
    expect(plannedDayOf(washington, m)).toBeCloseTo(11 + 18 / 24);
    expect(scaleOf(m)).toBe('clock');
    expect(plannedLabel(washington, m, 'D+')).toBe('D+11 18:00Z');
  });
  it('counts a fractional plannedDay on the clock too', () => {
    expect(scaleOf({ id: 'x', label: 'x', plannedDay: 11.75 })).toBe('clock');
    expect(scaleOf({ id: 'x', label: 'x', plannedDay: 11 })).toBe('day');
    expect(scaleOf({ id: 'x', label: 'x', actualAt: '1941-12-07T18:00:00Z' })).toBe('day');
  });
  it('draws the eighty minutes a day count rounds away', () => {
    const s = timetableStatus(washington, t('1941-12-07T20:00:00Z'));
    expect(s.current?.id).toBe('one-oclock');
    expect(s.slipScale).toBe('clock');
    expect(s.slipDays).toBeCloseTo(80 / 1440);
    expect(slipLabel(s.slipDays, s.slipScale)).toBe('80 min behind');
    expect(slipTone(s.slipDays, s.slipScale)).toBe('behind');
    // the same slip on a day-scale plan is nothing at all — which is the bug
    expect(slipLabel(s.slipDays)).toBe('on time');
    expect(slipTone(s.slipDays)).toBe('ontime');
  });
  it('chooses the unit from the size of the slip', () => {
    const clock = (days: number) => slipLabel(days, 'clock');
    expect(clock(0)).toBe('on time');
    expect(clock(20 / 86400)).toBe('on time'); // twenty seconds is not a minute
    expect(clock(-25 / 1440)).toBe('25 min ahead');
    expect(clock(119 / 1440)).toBe('119 min behind');
    expect(clock(2 / 24)).toBe('2 h behind');
    expect(clock(-13 / 24)).toBe('13 h ahead');
    expect(clock(1.9)).toBe('46 h behind');
    expect(clock(2)).toBe('2 d behind');
    expect(clock(-25)).toBe('25 d ahead');
  });
});

/** The slip label exactly as it read before sand-lry.24, for the sweep below. */
const legacySlipLabel = (slipDays: number | undefined): string => {
  if (slipDays === undefined) return '—';
  const d = Math.round(slipDays);
  if (d === 0) return 'on time';
  return d > 0 ? `${d} d behind` : `${-d} d ahead`;
};
const legacyTone = (slip: number | undefined) =>
  slip === undefined
    ? 'none'
    : Math.round(slip) > 0
      ? 'behind'
      : Math.round(slip) < 0
        ? 'ahead'
        : 'ontime';

describe('whole-day plans are untouched', () => {
  const packClocks = JSON.parse(
    readFileSync('content/eras/1914-schlieffen-marne/clocks.json', 'utf8'),
  ) as Timetable[];
  const HOUR = 3_600_000;

  it('every 1914 milestone is still a whole day', () => {
    for (const c of packClocks)
      for (const m of c.milestones) {
        expect(m.plannedAt).toBeUndefined();
        expect(scaleOf(m)).toBe('day');
        expect(plannedDayOf(c, m)).toBe(m.plannedDay);
        if (m.plannedDay !== undefined)
          expect(plannedLabel(c, m, c.dayLabel ?? 'M+')).toBe(
            `${c.dayLabel ?? 'M+'}${m.plannedDay}`,
          );
      }
  });

  it('reads the same slip, label and tone at every hour of the campaign', () => {
    for (const c of [...packClocks, plan]) {
      const start = Date.parse(c.origin);
      for (let h = 0; h <= 45 * 24; h++) {
        const now = start + h * HOUR;
        const s = timetableStatus(c, now);
        expect(s.slipScale).toBe('day');
        expect(slipLabel(s.slipDays, s.slipScale)).toBe(legacySlipLabel(s.slipDays));
        expect(slipTone(s.slipDays, s.slipScale)).toBe(legacyTone(s.slipDays));
      }
    }
  });
});
