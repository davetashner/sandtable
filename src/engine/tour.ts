/**
 * Guided tours (sand-1l0.14): pure helpers over the `Tour` entity.
 *
 * A tour is a list of steps, each a *complete* description of the view — the
 * instant, the branch, the zoom-in, the card, optionally the camera. The
 * engine here answers three questions and holds no state:
 *
 *   where am I            resolvePosition(tours, tourId, stepId)
 *   what should the view be  viewForStep(step, defaultBranch)
 *   where does it stop       stopsForStep(step, view, ctx)
 *   is it at a stop yet      atStop(view, target, now)
 *   what did that key ask    tourCommandFor(key, target)
 *   has the viewer taken over  diverged(expected, actual, now)
 *
 * Nothing is era- or 1914-specific; the controller in App.tsx applies the
 * view and the panel in ui/TourPanel.tsx renders the narration.
 */
import type { DecisionPoint, NarrativeBeat, Tour, TourStep } from '../packs/schema/index.js';
import { DEFAULT_SPEED } from './clock.js';
import { ownsKeys } from './shortcuts.js';

/**
 * Simulated milliseconds per real second a tour plays at unless a step says
 * otherwise: **one hour per second**. Fast enough that a week is not a wait,
 * slow enough to read the narration while the tokens move (sand-1l0.28).
 *
 * The same reading pace the timeline starts at — defined once in clock.ts so
 * the guided path and the manual one cannot drift apart (sand-1l0.31).
 */
export const TOUR_SPEED = DEFAULT_SPEED;

/** Words a reader gets through in a minute, for dwell timing. */
const WORDS_PER_MINUTE = 200;
/** However short the text, a break lasts at least this long. */
const MIN_DWELL_MS = 6000;
/** …and however long, no longer than this before it auto-advances. */
const MAX_DWELL_MS = 45000;

/**
 * How long an auto-advancing pause should last, from how much there is to
 * read (sand-1l0.28) — a two-line vignette does not need the dwell a full
 * beat does. Markdown syntax and footnote markers are not words.
 */
export function dwellMs(text: string | undefined): number {
  if (!text) return MIN_DWELL_MS;
  const words = text
    .replace(/\[\^[^\]\s]+\]/g, '')
    .replace(/[#*_>`[\]()|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  const ms = (words / WORDS_PER_MINUTE) * 60 * 1000;
  return Math.min(MAX_DWELL_MS, Math.max(MIN_DWELL_MS, Math.round(ms)));
}

export interface TourPosition {
  tour: Tour;
  step: TourStep;
  index: number;
  /** Stable key for "this visit to this step" — the controller applies once per key. */
  key: string;
}

/**
 * Resolve the URL's `tour`/`step` slots. An unknown tour is not a tour; an
 * unknown or missing step falls back to the first, so `?tour=…` alone starts
 * at the beginning.
 */
export function resolvePosition(
  tours: Tour[],
  tourId: string | undefined,
  stepId: string | undefined,
): TourPosition | undefined {
  if (!tourId) return undefined;
  const tour = tours.find((t) => t.id === tourId);
  if (!tour) return undefined;
  const found = stepId ? tour.steps.findIndex((s) => s.id === stepId) : -1;
  const index = found >= 0 ? found : 0;
  const step = tour.steps[index]!;
  return { tour, step, index, key: `${tour.id}|${step.id}` };
}

/** The step before / after this one, or undefined at the ends. */
export function stepAt(tour: Tour, index: number): TourStep | undefined {
  return tour.steps[index];
}

export interface TourView {
  /** Epoch ms the clock should read when the step opens. */
  t: number;
  /** Epoch ms the step plays to, when it plays. */
  playTo?: number;
  focus?: string;
  branch?: string;
  card?: string;
}

/**
 * The view a step asks for. Absent slots mean the default — the campaign map,
 * the pack's default branch, no card — never "whatever was there before", so
 * that a deep link to any step rebuilds the same view.
 */
export function viewForStep(step: TourStep, defaultBranch: string): TourView {
  const view: TourView = { t: Date.parse(step.at) };
  if (step.playUntil) view.playTo = Date.parse(step.playUntil);
  if (step.focus) view.focus = step.focus;
  // The default branch travels as "no branch slot", matching BranchToggle.
  if (step.branch && step.branch !== defaultBranch) view.branch = step.branch;
  if (step.card) view.card = step.card;
  return view;
}

/**
 * Milliseconds a still step waits before advancing: the author's `hold` if
 * they set one, otherwise scaled to the narration in front of the reader.
 */
export function holdMs(step: TourStep): number {
  return step.hold !== undefined ? step.hold * 1000 : dwellMs(step.narration);
}

// ------------------------------------------------------------------- stops

export type StopKind = 'card' | 'beat' | 'decision' | 'step-end';

/** A place the tour stops mid-step so the reader can catch up (sand-1l0.28). */
export interface TourStop {
  at: number;
  kind: StopKind;
  id?: string;
  /** What the reader has in front of them here, for the dwell. */
  text?: string;
}

export interface StopContext {
  beats: NarrativeBeat[];
  decisions: DecisionPoint[];
  /** The pack's default branch, for steps that do not name one. */
  defaultBranch: string;
}

/**
 * Every break in the narrative a step passes through, in order: the card it
 * reveals on arrival, each beat that begins inside its window, each decision
 * point it crosses, and the end of the step itself. Playback stops at each
 * one; `continue` (or a dwell, when auto-advance is on) moves to the next.
 *
 * A still step has one stop — its own end.
 */
export function stopsForStep(step: TourStep, view: TourView, ctx: StopContext): TourStop[] {
  const start = view.t;
  const end = view.playTo;
  // The branch and zoom-in are the step's own, so the beats counted here are
  // exactly the ones the reader will be shown.
  const branch = view.branch ?? ctx.defaultBranch;
  const focus = view.focus;
  const stops: TourStop[] = [];
  if (step.card) stops.push({ at: start, kind: 'card', id: step.card, text: step.narration });
  if (end !== undefined) {
    const visible = ctx.beats.filter(
      (b) => (!b.branch || b.branch === branch) && (b.focus ?? undefined) === focus,
    );
    for (const b of visible) {
      const at = Date.parse(b.from);
      if (at > start && at < end) stops.push({ at, kind: 'beat', id: b.id, text: b.body });
    }
    for (const d of ctx.decisions) {
      const at = Date.parse(d.at);
      if (at > start && at < end)
        stops.push({ at, kind: 'decision', id: d.id, text: `${d.question} ${d.reasoning}` });
    }
    stops.sort((a, b) => a.at - b.at || (a.kind === 'decision' ? -1 : 1));
  }
  stops.push({ at: end ?? start, kind: 'step-end', text: step.narration });
  // One stop per instant: a decision on a beat boundary is one pause, not two.
  return stops.filter((s, i) => i === 0 || s.at !== stops[i - 1]!.at || s.kind === 'step-end');
}

/**
 * Has playback arrived at the break it is heading for?
 *
 * A still step is at its stop the moment it opens — there is nothing to play
 * through — and a step with a `playUntil` when the clock reaches the stop.
 * One predicate, because the two effects that use it have to agree: one plays
 * up to the break, the other declares the tour stopped there, and if they read
 * the instant differently the tour either overruns the stop or never leaves it.
 */
export function atStop(view: TourView | undefined, target: number, now: number): boolean {
  return view?.playTo === undefined || now >= target;
}

/**
 * How long a break lasts for a reader who has left auto-advance on: the
 * author's `hold` at the end of a step (`holdMs`), and at every other break a
 * dwell scaled to whatever text that break put in front of them.
 */
export function dwellForStop(step: TourStep, stop: TourStop | undefined): number {
  return stop?.kind === 'step-end' ? holdMs(step) : dwellMs(stop?.text);
}

// ---------------------------------------------------------------- keyboard

/** What a key press asks the tour to do. */
export type TourCommand = 'exit' | 'toggle' | 'forward' | 'back';

/**
 * The tour's four keys (docs/accessibility.md). Space is the master switch —
 * let a break go, or stop the playback; → is always forward, past this break
 * or on to the next step; ← is always back a step; Escape always leaves. The
 * whole tour is drivable without a pointer (sand-1l0.28).
 */
const TOUR_KEYS: Record<string, TourCommand> = {
  Escape: 'exit',
  ' ': 'toggle',
  ArrowRight: 'forward',
  ArrowLeft: 'back',
};

/**
 * What this press asks of the tour, or nothing at all.
 *
 * Driving a tour from the keyboard means listening on the window, so the first
 * question is whether the press was ours to hear. A focused control has its
 * own meaning for Space and the arrows, and so does any surface that declares
 * it drives itself from the keyboard (sand-pmz.4); the tour keeps out of the
 * way of both.
 */
export function tourCommandFor(key: string, target: EventTarget | null): TourCommand | undefined {
  if (target instanceof Element && /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    return undefined;
  if (ownsKeys(target)) return undefined;
  return TOUR_KEYS[key];
}

/**
 * Has the viewer taken the wheel? True when a slot no longer matches what the
 * tour applied, or when the clock has been moved outside the step's window
 * (a scrub). Playback inside the window is the tour's own doing, so a small
 * tolerance keeps a playing step from tripping it.
 */
export function diverged(
  expected: TourView,
  actual: { focus?: string | undefined; branch?: string | undefined; card?: string | undefined },
  now: number,
  toleranceMs = 60 * 60 * 1000,
): boolean {
  if ((actual.focus ?? undefined) !== expected.focus) return true;
  if ((actual.branch ?? undefined) !== expected.branch) return true;
  if ((actual.card ?? undefined) !== expected.card) return true;
  const end = expected.playTo ?? expected.t;
  return now < expected.t - toleranceMs || now > end + toleranceMs;
}

/**
 * Whole-tour length in minutes, for the launcher's "about 14 min": the clock
 * time each step plays through, plus a dwell at every step's own break.
 */
export function tourMinutes(tour: Tour, speedFallback = TOUR_SPEED): number {
  const ms = tour.steps.reduce((sum, s) => {
    const dwell = holdMs(s);
    if (!s.playUntil) return sum + dwell;
    const span = Date.parse(s.playUntil) - Date.parse(s.at);
    return sum + (span / (s.speed ?? speedFallback)) * 1000 + dwell;
  }, 0);
  return Math.max(1, Math.round(ms / 60000));
}
