/**
 * Which cue plays now (sand-1l0.34). Pure over the pack's score.json; the
 * player in src/ui/ScorePlayer.tsx does the fading and the DOM.
 *
 * Resolution, most specific first:
 *   1. the opening sequence, while it is on screen,
 *   2. the branch, when the view has left history — a hypothetical should
 *      sound hypothetical wherever the reader is standing,
 *   3. the battle, chapter or zoom-in in focus,
 *   4. the narrowest time window containing the clock.
 *
 * Narrowest-wins is what lets a one-day window carve silence out of a
 * three-week cue, which is exactly what 22 August does.
 *
 * Beds are resolved separately by bedFor(): they play *under* the cue rather
 * than instead of it, so they are not part of this contest.
 */
import type { ScoreEntry } from '../packs/schema/index.js';

export interface ScoreState {
  /** Clock instant, epoch ms. */
  t: number;
  /** The battle/chapter in focus, when there is one. */
  focus?: string | undefined;
  /** The branch the view is on, when it is not the pack default. */
  branch?: string | undefined;
  /** True while the opening sequence is on screen. */
  opening?: boolean | undefined;
  /** True while a first-person vignette is on screen. */
  vignette?: boolean | undefined;
}

/** What the player should be doing at a given moment. */
export interface ScoreVerdict {
  /** The cue to play, or undefined for silence. */
  cue?: string;
  /** True when silence is the score's decision, not merely the absence of one. */
  silent: boolean;
  /** The entry that decided it, for debugging and for the credit line. */
  entry?: ScoreEntry;
}

const SILENT: ScoreVerdict = { silent: false };

function windowMs(e: ScoreEntry): number {
  if (!e.from || !e.to) return Infinity;
  return Date.parse(e.to) - Date.parse(e.from);
}

function covers(e: ScoreEntry, t: number): boolean {
  if (!e.from || !e.to) return false;
  const from = Date.parse(e.from);
  const to = Date.parse(e.to);
  // Half-open, so touching windows do not both match at the boundary.
  return t >= from && t < to;
}

function verdict(e: ScoreEntry): ScoreVerdict {
  return e.silence === true ? { silent: true, entry: e } : { cue: e.cue!, silent: false, entry: e };
}

/**
 * The score's decision for this moment. Returns `{ silent: false }` with no
 * cue when the score simply says nothing — distinct from a deliberate silence,
 * which the player treats the same way but which is a choice worth recording.
 */
export function cueFor(score: ScoreEntry[], state: ScoreState): ScoreVerdict {
  if (!score.length) return SILENT;

  if (state.opening) {
    const open = score.find((e) => e.opening);
    if (open) return verdict(open);
  }

  if (state.branch) {
    const branched = score.find((e) => e.branch === state.branch);
    if (branched) return verdict(branched);
  }

  if (state.focus) {
    const focused = score.find((e) => e.focus === state.focus);
    if (focused) return verdict(focused);
  }

  let best: ScoreEntry | undefined;
  for (const e of score) {
    if (e.opening || e.focus || e.branch || e.vignette) continue;
    if (!covers(e, state.t)) continue;
    if (!best || windowMs(e) < windowMs(best)) best = e;
  }
  return best ? verdict(best) : SILENT;
}

/**
 * The bed to play under the cue, if the score has one and the moment calls for
 * it. Beds join the cue rather than replacing it, so this is asked separately.
 */
export function bedFor(score: ScoreEntry[], state: ScoreState): string | undefined {
  if (!state.vignette) return undefined;
  return score.find((e) => e.vignette && e.cue)?.cue;
}

/** Every cue the score can reach, in the order it first names them. */
export function cuesInScore(score: ScoreEntry[]): string[] {
  const out: string[] = [];
  for (const e of score) if (e.cue && !out.includes(e.cue)) out.push(e.cue);
  return out;
}
