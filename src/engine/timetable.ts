/**
 * Plan vs. actual (sand-1l0.18): where a timetable says things should stand
 * at an instant, and how far behind (or ahead) reality is. Pure.
 */
import type { Timetable } from '../packs/schema/index.js';

const DAY = 86_400_000;
type Milestone = Timetable['milestones'][number];

export interface TimetableStatus {
  /** Days since the origin at `now` (fractional). */
  day: number;
  /** Milestones the plan expected by now (plannedDay <= day), in planned order. */
  due: Milestone[];
  /** Milestones that have actually happened by now, in actual order. */
  reached: Milestone[];
  /** The milestone the slip is measured on: the latest that is due or reached. */
  current?: Milestone;
  /** Days behind the plan (+) or ahead (−) on `current`; undefined before anything is due or reached. */
  slipDays?: number;
  /** Next planned milestone still ahead of now. */
  next?: Milestone;
}

export const dayOf = (timetable: Timetable, at: number): number =>
  (at - Date.parse(timetable.origin)) / DAY;

export function timetableStatus(timetable: Timetable, now: number): TimetableStatus {
  const day = dayOf(timetable, now);
  const planned = timetable.milestones
    .filter((m) => m.plannedDay !== undefined)
    .sort((a, b) => a.plannedDay! - b.plannedDay!);
  const due = planned.filter((m) => m.plannedDay! <= day);
  const reached = timetable.milestones
    .filter((m) => m.actualAt && Date.parse(m.actualAt) <= now)
    .sort((a, b) => Date.parse(a.actualAt!) - Date.parse(b.actualAt!));
  const next = planned.find((m) => m.plannedDay! > day);
  // the slip is read on the planned milestone that is furthest along — due, or already reached early
  let current: Milestone | undefined;
  let key = -Infinity;
  for (const m of planned) {
    const actualDay = m.actualAt ? dayOf(timetable, Date.parse(m.actualAt)) : undefined;
    const isDue = m.plannedDay! <= day;
    const isReached = actualDay !== undefined && actualDay <= day;
    if (!isDue && !isReached) continue;
    if (m.plannedDay! > key) {
      key = m.plannedDay!;
      current = m;
    }
  }
  const out: TimetableStatus = { day, due, reached };
  if (current) {
    const actualDay = current.actualAt ? dayOf(timetable, Date.parse(current.actualAt)) : undefined;
    out.current = current;
    out.slipDays =
      (actualDay !== undefined && actualDay <= day ? actualDay : day) - current.plannedDay!;
  }
  if (next) out.next = next;
  return out;
}

/** "on time", "+3 d behind", "25 d ahead". */
export function slipLabel(slipDays: number | undefined): string {
  if (slipDays === undefined) return '—';
  const d = Math.round(slipDays);
  if (d === 0) return 'on time';
  return d > 0 ? `${d} d behind` : `${-d} d ahead`;
}
