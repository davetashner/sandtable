/**
 * The arcs the atlas groups its eras into, in the order they are shown
 * (ADR 0024, part of `sand-shn.14`).
 *
 * A pack declares which arc it belongs to (`pack.json#arc`); the arc's name
 * and its one-line argument live here, because they are editorial statements
 * about the *project* — what these campaigns are together — rather than facts
 * about any one era. An arc with no packs is not shown, so this list can name
 * the shape of the whole thing before the content for it exists: ADR 0019
 * commits to ten Pacific packs and a European arc after them, and the atlas
 * should not have to be rearranged when the first of them lands.
 *
 * The remaining half of `sand-shn.14` is the other axis — `content/threads/`,
 * the learning paths that cut across arcs — and giving this table a home in
 * `content/` so an author can add an arc without touching the app.
 */
export interface Arc {
  id: string;
  title: string;
  /** One line: what this run of campaigns is an argument about. */
  argument: string;
}

export const ARCS: readonly Arc[] = [
  {
    id: 'prequels',
    title: 'Before the wars',
    argument: 'The campaigns the twentieth century was still arguing with in 1914.',
  },
  {
    id: 'western-front',
    title: 'The Western Front, 1914–1918',
    argument: 'A war of movement that ended in a line, and four years of trying to break it.',
  },
  {
    id: 'eastern-front',
    title: 'The Eastern Front, 1914–1917',
    argument: 'The theatre with the room to manoeuvre, and the empire that could not afford it.',
  },
  {
    id: 'russia',
    title: 'Revolution and civil war in Russia, 1917–1922',
    argument: 'An empire that left one war by starting another, and did not stop for five years.',
  },
  {
    id: 'pacific',
    title: 'The Pacific War, 1931–1945',
    argument: 'An ocean crossed one airfield at a time — beginning ten years early, in Manchuria.',
  },
  {
    id: 'europe-1939',
    title: 'The Second World War in Europe',
    argument: 'The continent that was told what was coming and watched it arrive anyway.',
  },
] as const;

/**
 * The eras of each arc, in the order the arcs are listed and the order the
 * packs arrived in (the index is already chronological).
 *
 * An era whose arc this build does not know is not dropped — it is collected
 * under `rest`, and the atlas lists it. A pack is a great deal of work, and
 * a front door that silently hides one because of a typo in a slug is worse
 * than one with an untidy last group. `Atlas.test.tsx` is what keeps the tree
 * honest: every era in `content/eras/` must name an arc from this table.
 */
export function groupByArc<T extends { arc?: string }>(
  packs: readonly T[],
): { arc: Arc | null; packs: T[] }[] {
  const groups = ARCS.map((arc) => ({ arc, packs: packs.filter((p) => p.arc === arc.id) })).filter(
    (g) => g.packs.length > 0,
  );
  const known = new Set(ARCS.map((a) => a.id));
  const rest = packs.filter((p) => !p.arc || !known.has(p.arc));
  return rest.length ? [...groups, { arc: null, packs: rest }] : groups;
}
