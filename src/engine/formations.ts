/**
 * Formations, as the surfaces need to find them (sand-y0u.29).
 *
 * Three questions, none of which belongs in a component. Which formations
 * exist at all — the campaign's order of battle plus the corps and divisions
 * a zoom-in brings with it, because a token clicked inside a battle is one of
 * those. Which formation stands under another. And the one the legend asks:
 * **which formation stands for a side.**
 *
 * That last one has no answer in general, and this module says so rather than
 * guessing. A legend names sides; a formation card is one army's. Where a
 * side put a single army in the field the legend can open it — the BEF,
 * the Belgian Field Army — and where it put nine there is no card called
 * "France", so the entry stays what it has always been: a swatch and a name.
 * The rule is the pack's rather than the component's, which is why it is a
 * function of the formations and not a field somebody has to keep true.
 *
 * Era-agnostic: nothing here knows about 1914.
 */
import type { Battle, Formation } from '../packs/schema/index.js';

/**
 * The kinds that can stand for a side in the field. A garrison cannot — three
 * Belgian fortresses are top-level formations and none of them is "Belgium" —
 * and neither can a corps, which always has an army over it somewhere.
 */
const FIELD_KINDS: ReadonlySet<Formation['kind']> = new Set(['army-group', 'army', 'fleet']);

/**
 * Every formation the pack holds: the campaign's, then the battle-level ones
 * a zoom-in adds, first declaration winning if a battle repeats an id.
 */
export function allFormations(
  campaign: readonly Formation[],
  battles: readonly Battle[] = [],
): Formation[] {
  const out = new Map<string, Formation>();
  for (const f of campaign) if (!out.has(f.id)) out.set(f.id, f);
  for (const b of battles) for (const f of b.formations ?? []) if (!out.has(f.id)) out.set(f.id, f);
  return [...out.values()];
}

/**
 * The formation that stands for a side, or `undefined` when the pack does not
 * give exactly one: the side's only top-level field formation. Two candidates
 * are no answer, and picking the first would be an assertion the pack never
 * made.
 */
export function sideFormation(
  formations: readonly Formation[],
  sideId: string,
): Formation | undefined {
  const candidates = formations.filter(
    (f) => f.side === sideId && !f.parent && FIELD_KINDS.has(f.kind),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

/** The formations immediately under one, in the pack's order. */
export function subordinatesOf(formations: readonly Formation[], id: string): Formation[] {
  return formations.filter((f) => f.parent === id);
}
