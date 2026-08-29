/**
 * Plan vs. actual (sand-1l0.18): where a timetable says things should stand
 * at an instant, and how far behind (or ahead) reality is. Pure.
 *
 * A plan is written at the resolution it was made at (sand-lry.24). The
 * Schlieffen timetable is a schedule of whole mobilization days, and the slip
 * on it is a number of days. Tokyo's instruction to deliver the memorandum at
 * one o'clock in Washington is a schedule of minutes, and the slip on it is
 * eighty of them — which a day count rounds to nothing. So a milestone whose
 * plan names an instant (`plannedAt`, or a fractional `plannedDay`) is read on
 * a clock scale, and the unit of the reading is then chosen from the size of
 * the slip: minutes for a morning, hours for a day, days for a campaign.
 * A whole-day milestone is read exactly as it always was.
 */
import type { Timetable } from '../packs/schema/index.js';

const DAY = 86_400_000;
const MINUTE = 1 / 1440;
type Milestone = Timetable['milestones'][number];

/** The resolution a milestone's plan was written at. */
export type SlipScale = 'day' | 'clock';

export interface TimetableStatus {
  /** Days since the origin at `now` (fractional). */
  day: number;
  /** Milestones the plan expected by now (planned day <= day), in planned order. */
  due: Milestone[];
  /** Milestones that have actually happened by now, in actual order. */
  reached: Milestone[];
  /** The milestone the slip is measured on: the latest that is due or reached. */
  current?: Milestone;
  /** Days behind the plan (+) or ahead (−) on `current`; undefined before anything is due or reached. */
  slipDays?: number;
  /** The scale `slipDays` should be read at — `current`'s, or 'day' when there is none. */
  slipScale: SlipScale;
  /** Next planned milestone still ahead of now. */
  next?: Milestone;
}

export const dayOf = (timetable: Timetable, at: number): number =>
  (at - Date.parse(timetable.origin)) / DAY;

/**
 * The day the plan expected a milestone — from `plannedAt` when the plan named
 * an instant, from `plannedDay` when it named a day. Undefined for a
 * reality-only mark.
 */
export const plannedDayOf = (timetable: Timetable, m: Milestone): number | undefined =>
  m.plannedAt !== undefined ? dayOf(timetable, Date.parse(m.plannedAt)) : m.plannedDay;

/** A plan that names an instant, or a fraction of a day, is read on the clock. */
export const scaleOf = (m: Milestone): SlipScale =>
  m.plannedAt !== undefined || (m.plannedDay !== undefined && !Number.isInteger(m.plannedDay))
    ? 'clock'
    : 'day';

export function timetableStatus(timetable: Timetable, now: number): TimetableStatus {
  const day = dayOf(timetable, now);
  const planOf = new Map<Milestone, number>();
  for (const m of timetable.milestones) {
    const d = plannedDayOf(timetable, m);
    if (d !== undefined) planOf.set(m, d);
  }
  const planned = [...planOf.keys()].sort((a, b) => planOf.get(a)! - planOf.get(b)!);
  const due = planned.filter((m) => planOf.get(m)! <= day);
  const reached = timetable.milestones
    .filter((m) => m.actualAt && Date.parse(m.actualAt) <= now)
    .sort((a, b) => Date.parse(a.actualAt!) - Date.parse(b.actualAt!));
  const next = planned.find((m) => planOf.get(m)! > day);
  // the slip is read on the planned milestone that is furthest along — due, or already reached early
  let current: Milestone | undefined;
  let key = -Infinity;
  for (const m of planned) {
    const actualDay = m.actualAt ? dayOf(timetable, Date.parse(m.actualAt)) : undefined;
    const isDue = planOf.get(m)! <= day;
    const isReached = actualDay !== undefined && actualDay <= day;
    if (!isDue && !isReached) continue;
    if (planOf.get(m)! > key) {
      key = planOf.get(m)!;
      current = m;
    }
  }
  const out: TimetableStatus = { day, due, reached, slipScale: 'day' };
  if (current) {
    const actualDay = current.actualAt ? dayOf(timetable, Date.parse(current.actualAt)) : undefined;
    out.current = current;
    out.slipDays =
      (actualDay !== undefined && actualDay <= day ? actualDay : day) - planOf.get(current)!;
    out.slipScale = scaleOf(current);
  }
  if (next) out.next = next;
  return out;
}

/** A slip rounded to the unit its scale and size call for. */
export interface SlipReading {
  /** Whole units, never negative. */
  value: number;
  unit: 'd' | 'h' | 'min';
  /** +1 behind, −1 ahead, 0 on time. */
  sign: -1 | 0 | 1;
}

/**
 * Round a slip to one unit. A day-scale plan is always read in days, as it
 * always was. A clock-scale plan is read in the unit its size calls for:
 * minutes under two hours, hours under two days, days beyond.
 */
export function slipReading(slipDays: number, scale: SlipScale = 'day'): SlipReading {
  const unit: SlipReading['unit'] =
    scale === 'day' || Math.abs(slipDays) >= 2 ? 'd' : Math.abs(slipDays) >= 2 / 24 ? 'h' : 'min';
  const perUnit = unit === 'd' ? 1 : unit === 'h' ? 1 / 24 : MINUTE;
  const n = Math.round(slipDays / perUnit);
  return { value: Math.abs(n), unit, sign: n > 0 ? 1 : n < 0 ? -1 : 0 };
}

/** "on time", "3 d behind", "25 d ahead", "80 min behind". */
export function slipLabel(slipDays: number | undefined, scale: SlipScale = 'day'): string {
  if (slipDays === undefined) return '—';
  const { value, unit, sign } = slipReading(slipDays, scale);
  if (sign === 0) return 'on time';
  return `${value} ${unit} ${sign > 0 ? 'behind' : 'ahead'}`;
}

/** Which way the gauge leans, under the same rounding the label uses. */
export function slipTone(
  slipDays: number | undefined,
  scale: SlipScale = 'day',
): 'none' | 'behind' | 'ahead' | 'ontime' {
  if (slipDays === undefined) return 'none';
  const { sign } = slipReading(slipDays, scale);
  return sign > 0 ? 'behind' : sign < 0 ? 'ahead' : 'ontime';
}

/**
 * The plan's own reading of a milestone: "M+12" for a whole day, "D+11 18:00Z"
 * for one that names an hour. Undefined for a reality-only mark.
 */
export function plannedLabel(
  timetable: Timetable,
  m: Milestone,
  dayLabel: string,
): string | undefined {
  const d = plannedDayOf(timetable, m);
  if (d === undefined) return undefined;
  if (scaleOf(m) === 'day') return `${dayLabel}${d}`;
  return `${dayLabel}${Math.floor(d)} ${clockLabel(Date.parse(timetable.origin) + d * DAY)}`;
}

/** The hour and minute of an instant, in UTC: "18:00Z". */
export function clockLabel(at: number): string {
  const t = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}Z`;
}
