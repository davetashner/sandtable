import { describe, expect, it } from 'vitest';
import type { Timetable } from '../packs/schema/index.js';
import { slipLabel, timetableStatus } from './timetable.js';

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
