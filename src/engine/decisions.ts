/**
 * Decision points (sand-1l0.22): the campaign pauses and asks the viewer to
 * decide as the commander, then reveals what was chosen, what was known and
 * what historians make of it. Pure helpers here; the card is
 * ui/DecisionCardView, the pause is App's DecisionPauser.
 */
import type { DecisionPoint } from '../packs/schema/index.js';

/**
 * The first decision point whose instant the clock has just crossed while
 * playing — `before < at <= now` — that has not already interrupted playback.
 */
export function decisionCrossed(
  decisions: DecisionPoint[],
  before: number,
  now: number,
  seen: ReadonlySet<string>,
): DecisionPoint | undefined {
  if (!(now > before)) return undefined;
  let hit: DecisionPoint | undefined;
  for (const d of decisions) {
    const at = Date.parse(d.at);
    if (before < at && at <= now && !seen.has(d.id) && (!hit || at < Date.parse(hit.at))) hit = d;
  }
  return hit;
}
