/**
 * One vocabulary for how sure the pack is (`sand-23b.4`).
 *
 * `Confidence` is already what a casualty figure and a causal link carry;
 * a position is a claim like any other, so a waypoint carries the same four
 * words rather than a scale of its own. This module holds the ordering, the
 * inheritance rule, and the one question the map asks: is this position good
 * enough to draw as a fact?
 */
import type { Confidence, Waypoint } from '../packs/schema/index.js';

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2, contested: 3 };

/** The weaker of two confidences (contested < low < medium < high). */
export function weakest(a: Confidence | undefined, b: Confidence): Confidence {
  if (!a) return b;
  return CONFIDENCE_RANK[b] > CONFIDENCE_RANK[a] ? b : a;
}

/**
 * A waypoint's own confidence, or the path's. Absent on the waypoint means
 * "as good as the route or track it belongs to" — the general statement lives
 * on the path, beside the `derivation` prose that explains it, and the fourth
 * element of a waypoint is only ever the exception that prose already names.
 */
export function waypointConfidence(w: Waypoint, path: Confidence): Confidence {
  return w[3] ?? path;
}

/**
 * Whether a position should be drawn as approximate. `low` is a position the
 * pack derived rather than read; `contested` is one the sources disagree
 * about. Neither is an error and neither is a guess — both are places where
 * the map owes the reader the qualification, and both get the same treatment,
 * because a reader looking at a token does not need the difference between
 * "roughly here" and "here according to one of two orders" until they open
 * the card that says which.
 */
export function isApproximate(c: Confidence): boolean {
  return c === 'low' || c === 'contested';
}

/**
 * The confidence in force at `now` along a path: the weaker of the two
 * waypoints the clock is between, because an interpolated position is no
 * better than the ends it was interpolated from. Before the first and after
 * the last it is that end's own.
 *
 * `times` are epoch ms, ascending, and `confidences` is the same length —
 * both come out of the composition step so this stays arithmetic.
 */
export function confidenceAt(
  times: number[],
  confidences: Confidence[],
  now: number,
  fallback: Confidence = 'medium',
): Confidence {
  if (times.length === 0) return fallback;
  if (now <= times[0]!) return confidences[0] ?? fallback;
  const last = times.length - 1;
  if (now >= times[last]!) return confidences[last] ?? fallback;
  for (let i = 1; i < times.length; i++) {
    if (now <= times[i]!) return weakest(confidences[i - 1], confidences[i] ?? fallback);
  }
  return confidences[last] ?? fallback;
}

/**
 * The mark an approximate position carries on the map, in front of its label.
 * A glyph, not a colour: a reader who cannot tell the softened token from the
 * solid one still reads "≈ 1. Armee" and knows what it means.
 */
export const APPROX_MARK = '≈';
