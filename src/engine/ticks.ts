/**
 * Axis ticks and labels for a time range of any span — hours on a battle
 * sub-timeline, days on a campaign, months or years on an era. All UTC.
 */
import { DAY, HOUR, MINUTE, WEEK, type ClockRange } from './clock.js';

export interface Tick {
  /** Epoch ms. */
  at: number;
  /** Short label for the axis. */
  label: string;
  /** Major ticks get a label; minor ticks are marks only. */
  major: boolean;
}

type Unit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

interface Step {
  unit: Unit;
  n: number;
  /** Approximate ms, used to pick a step. */
  approx: number;
}

const STEPS: Step[] = [
  { unit: 'minute', n: 15, approx: 15 * MINUTE },
  { unit: 'minute', n: 30, approx: 30 * MINUTE },
  { unit: 'hour', n: 1, approx: HOUR },
  { unit: 'hour', n: 3, approx: 3 * HOUR },
  { unit: 'hour', n: 6, approx: 6 * HOUR },
  { unit: 'hour', n: 12, approx: 12 * HOUR },
  { unit: 'day', n: 1, approx: DAY },
  { unit: 'day', n: 2, approx: 2 * DAY },
  { unit: 'week', n: 1, approx: WEEK },
  { unit: 'week', n: 2, approx: 2 * WEEK },
  { unit: 'month', n: 1, approx: 30 * DAY },
  { unit: 'month', n: 3, approx: 91 * DAY },
  { unit: 'month', n: 6, approx: 182 * DAY },
  { unit: 'year', n: 1, approx: 365 * DAY },
  { unit: 'year', n: 5, approx: 5 * 365 * DAY },
  { unit: 'year', n: 10, approx: 10 * 365 * DAY },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Round `t` down to the start of its unit (UTC). */
function floorTo(t: number, unit: Unit, n: number): number {
  const d = new Date(t);
  switch (unit) {
    case 'minute':
      return Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        Math.floor(d.getUTCMinutes() / n) * n,
      );
    case 'hour':
      return Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        Math.floor(d.getUTCHours() / n) * n,
      );
    case 'day':
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    case 'week': {
      // ISO weeks start on Monday
      const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const dow = (d.getUTCDay() + 6) % 7;
      return day - dow * DAY;
    }
    case 'month':
      return Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / n) * n, 1);
    case 'year':
      return Date.UTC(Math.floor(d.getUTCFullYear() / n) * n, 0, 1);
  }
}

function advance(t: number, unit: Unit, n: number): number {
  const d = new Date(t);
  switch (unit) {
    case 'minute':
      return t + n * MINUTE;
    case 'hour':
      return t + n * HOUR;
    case 'day':
      return t + n * DAY;
    case 'week':
      return t + n * WEEK;
    case 'month':
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
    case 'year':
      return Date.UTC(d.getUTCFullYear() + n, 0, 1);
  }
}

function labelFor(t: number, unit: Unit, first: boolean): string {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const mon = MONTHS[d.getUTCMonth()]!;
  const day = d.getUTCDate();
  switch (unit) {
    case 'minute':
    case 'hour': {
      const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      return first || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0)
        ? `${day} ${mon} ${hm}`
        : hm;
    }
    case 'day':
    case 'week':
      return first || day === 1 ? `${day} ${mon}` : String(day);
    case 'month':
      return first || d.getUTCMonth() === 0 ? `${mon} ${y}` : mon;
    case 'year':
      return String(y);
  }
}

/** Choose a step so that the range shows at most `maxTicks` major ticks. */
export function pickStep(range: ClockRange, maxTicks = 12): Step {
  const span = range.end - range.start;
  for (const s of STEPS) {
    if (span / s.approx <= maxTicks) return s;
  }
  return STEPS[STEPS.length - 1]!;
}

/** Major ticks across the range at a nice step, plus minor ticks at the next finer step. */
export function ticksFor(range: ClockRange, maxTicks = 12): Tick[] {
  const major = pickStep(range, maxTicks);
  const minorIdx = Math.max(0, STEPS.indexOf(major) - 2);
  const minor = STEPS[minorIdx]!;
  const out: Tick[] = [];
  const majors = new Set<number>();
  let first = true;
  for (
    let t = floorTo(range.start, major.unit, major.n);
    t <= range.end;
    t = advance(t, major.unit, major.n)
  ) {
    if (t < range.start) continue;
    out.push({ at: t, label: labelFor(t, major.unit, first), major: true });
    majors.add(t);
    first = false;
  }
  if (minor !== major) {
    for (
      let t = floorTo(range.start, minor.unit, minor.n);
      t <= range.end;
      t = advance(t, minor.unit, minor.n)
    ) {
      if (t < range.start || majors.has(t)) continue;
      out.push({ at: t, label: '', major: false });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export interface NowLabel {
  /** "Day 20" (0-based from range start) or "Hour 6" for sub-day ranges. */
  counter: string;
  /** "24 August 1914" or "24 August 1914, 14:00" for sub-day ranges. */
  date: string;
  /** "Monday" */
  weekday: string;
  /** Compact for aria: "Day 20 — 24 August 1914" */
  aria: string;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Human labels for "now", resolution chosen by the range span. */
export function labelNow(now: number, range: ClockRange): NowLabel {
  const d = new Date(now);
  const span = range.end - range.start;
  const subDay = span <= 3 * DAY;
  const date = `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const counter = subDay
    ? `Hour ${Math.floor((now - range.start) / HOUR)}`
    : `Day ${Math.floor((now - range.start) / DAY)}`;
  const dateText = subDay || span <= 120 * DAY ? `${date}, ${hm}` : date;
  return {
    counter,
    date: dateText,
    weekday: WEEKDAYS[d.getUTCDay()]!,
    aria: `${counter} — ${dateText}`,
  };
}

/**
 * A whole span in one phrase, for a list rather than an axis: "21–24 Aug
 * 1914", "18 Aug – 14 Sep 1914", "1915–1919". `labelNow` says where the clock
 * is, `ticksFor` marks the strip; this says how long a thing lasted, which is
 * what a table of contents wants beside a title (`sand-neh.23`).
 *
 * It drops what the two ends share, the way a date range is written by hand:
 * the month when both ends are in it, the year when both ends are in that.
 * A run of whole calendar years is written as years — an epilogue from 1
 * January 1915 to 31 December 1919 is "1915–1919", not two dates nobody
 * chose. The dash is tight between bare numbers and spaced between phrases,
 * which is the same typography the packs' own `dateLabel`s use.
 */
export function labelSpan(range: ClockRange): string {
  const a = new Date(range.start);
  const b = new Date(range.end);
  const [ya, yb] = [a.getUTCFullYear(), b.getUTCFullYear()];
  const wholeYears =
    a.getUTCMonth() === 0 &&
    a.getUTCDate() === 1 &&
    a.getUTCHours() === 0 &&
    a.getUTCMinutes() === 0 &&
    b.getUTCMonth() === 11 &&
    b.getUTCDate() === 31;
  if (wholeYears) return ya === yb ? String(ya) : `${ya}–${yb}`;
  const dayA = `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}`;
  const dayB = `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  if (ya !== yb) return `${dayA} ${ya} – ${dayB} ${yb}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${dayA} – ${dayB} ${yb}`;
  if (a.getUTCDate() !== b.getUTCDate()) return `${a.getUTCDate()}–${dayB} ${yb}`;
  return `${dayA} ${yb}`;
}

/** ISO-8601 without milliseconds, for URLs: 1914-08-24T12:00:00Z */
export function toIsoNoMs(t: number): string {
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
}
