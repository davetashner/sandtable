/**
 * The arcs the atlas groups its eras into (ADR 0024, `sand-shn.14`).
 *
 * A pack declares which arc it belongs to (`pack.json#arc`); the arc's name
 * and its one-line argument are editorial statements about the *project* —
 * what these campaigns are together — rather than facts about any one era, and
 * they live in **`content/shared/arcs.json`**, not here. Adding an arc is
 * authoring, so it must not require touching the app: that was the remaining
 * half of this bead, and it is why this module now holds only the shape and
 * the grouping, with the table itself arriving through the pack index the
 * atlas already fetches (no second request).
 *
 * An arc with no packs is not shown, so the file can name the shape of the
 * whole thing before the content for it exists: ADR 0019 commits to ten
 * Pacific packs and a European arc after them, and the atlas should not have
 * to be rearranged when the first of them lands.
 *
 * The other axis — `content/threads/`, the learning paths that cut across arcs
 * — waits on there being threads to show (`sand-shn.1`).
 */
export interface Arc {
  id: string;
  title: string;
  /** One line: what this run of campaigns is an argument about. */
  argument: string;
}

/**
 * The eras of each arc, in the order the arcs are given and the order the
 * packs arrived in (the index is already chronological).
 *
 * An era whose arc the table does not name is not dropped — it is collected
 * under `rest`, and the atlas lists it. A pack is a great deal of work, and a
 * front door that silently hides one because of a typo in a slug is worse than
 * one with an untidy last group. `Atlas.test.tsx` is what keeps the tree
 * honest: every era in `content/eras/` must name an arc the file knows.
 */
export function groupByArc<T extends { arc?: string }>(
  packs: readonly T[],
  arcs: readonly Arc[],
): { arc: Arc | null; packs: T[] }[] {
  const groups = arcs
    .map((arc) => ({ arc, packs: packs.filter((p) => p.arc === arc.id) }))
    .filter((g) => g.packs.length > 0);
  const known = new Set(arcs.map((a) => a.id));
  const rest = packs.filter((p) => !p.arc || !known.has(p.arc));
  return rest.length ? [...groups, { arc: null, packs: rest }] : groups;
}
