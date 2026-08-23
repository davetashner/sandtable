/**
 * Guided tours (sand-1l0.14): pure helpers over the `Tour` entity.
 *
 * A tour is a list of steps, each a *complete* description of the view — the
 * instant, the branch, the zoom-in, the card, optionally the camera. The
 * engine here answers three questions and holds no state:
 *
 *   where am I            resolvePosition(tours, tourId, stepId)
 *   what should the view be  viewForStep(step, defaultBranch)
 *   has the viewer taken over  diverged(expected, actual, now)
 *
 * Nothing is era- or 1914-specific; the controller in App.tsx applies the
 * view and the panel in ui/TourPanel.tsx renders the narration.
 */
import type { Tour, TourStep } from '../packs/schema/index.js';

/** Seconds a step without `playUntil` holds before advancing. */
export const DEFAULT_HOLD_SECONDS = 14;

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

/** Milliseconds a non-playing step waits before advancing. */
export function holdMs(step: TourStep): number {
  return (step.hold ?? DEFAULT_HOLD_SECONDS) * 1000;
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

/** Whole-tour length in minutes, for the launcher's "about 9 min". */
export function tourMinutes(tour: Tour, speedFallback: number): number {
  const ms = tour.steps.reduce((sum, s) => {
    if (!s.playUntil) return sum + holdMs(s);
    const span = Date.parse(s.playUntil) - Date.parse(s.at);
    const speed = s.speed ?? speedFallback;
    return sum + (span / speed) * 1000;
  }, 0);
  return Math.max(1, Math.round(ms / 60000));
}
