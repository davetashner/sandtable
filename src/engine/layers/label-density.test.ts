/**
 * What the commanders layer costs the labels around it (`sand-neh.18`).
 *
 * The layer shipped with four tracks and now has nineteen; in late August
 * eleven portrait tokens are live at once, each with a name, on a map that
 * already carries every place label. Whether the screen-space layout still
 * holds at that density had not been measured since the layer had real data
 * in it, and "it looks fine" is not a measurement — the labels are drawn on a
 * WebGL canvas the a11y gate and the visual gate cannot read.
 *
 * So this reads the real 1914 tracks and the real shared places, finds the
 * busiest day by walking the pack's own span, and runs the same pure
 * placement the app runs (`src/ui/MapSurface.tsx` — commanders, then tallies,
 * then places, each avoiding what the last one took).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { commandersAt, commanderLabelCandidates } from './commanders.js';
import { placeLabels, placeLabelCandidates, occupiedBoxes, type Box } from './places.js';
import type { Place } from '../../packs/schema/index.js';

const ERA = join('content', 'eras', '1914-schlieffen-marne');
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as unknown;

const PLACES = readdirSync(join('content', 'shared', 'places'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => readJson(join('content', 'shared', 'places', f)) as Place);

const PEOPLE = readdirSync(join('content', 'shared', 'people'))
  .filter((f) => f.endsWith('.json'))
  .map(
    (f) =>
      readJson(join('content', 'shared', 'people', f)) as {
        id: string;
        name: string;
        sortName?: string;
      },
  );

/**
 * The surname alone, exactly as `shortPersonName` in `src/App.tsx` derives it.
 * Measuring with anything else measures the wrong label: the text width is
 * what displaces a neighbour, so a stub that returns the full id reports a
 * cost the app never pays.
 */
function shortPersonName(id: string): string | undefined {
  const person = PEOPLE.find((p) => p.id === id);
  if (!person) return undefined;
  const sort = person.sortName;
  if (sort) return (sort.split(',')[0] ?? sort).trim();
  const words = person.name.trim().split(/\s+/);
  return words.at(-1) ?? person.name;
}

/** Web Mercator at a centre and zoom, the way MapLibre's `map.project` does it. */
function projector(center: [number, number], zoom: number, w: number, h: number) {
  const s = (256 * Math.pow(2, zoom)) / 360;
  const my = (lat: number) =>
    (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
  const cx = center[0] * s;
  const cy = my(center[1]) * s;
  return (p: [number, number]): [number, number] | null => [
    p[0] * s - cx + w / 2,
    -(my(p[1]) * s - cy) + h / 2,
  ];
}

/**
 * The measured cost of the commanders layer, in place labels it displaces, on
 * the busiest day of the 1914 pack at its own opening camera.
 *
 * Recorded rather than derived: it is a budget, and the point of a budget is
 * that moving it is a decision somebody makes on purpose. If new content
 * pushes this up, that is worth seeing in a diff.
 */
const PLACE_LABELS_LOST_TO_COMMANDERS = 15;

describe('label density at peak (sand-neh.18)', () => {
  const pack = readJson(join(ERA, 'pack.json')) as {
    camera: { center: [number, number]; zoom: number };
    timeRange: { start: string; end: string };
    sides: { id: string }[];
  };
  const tracks = readJson(join(ERA, 'tracks.json')) as { id: string; person: string }[];
  const opts = (now: number) => ({
    tracks: tracks as never,
    now,
    sides: pack.sides as never,
    label: shortPersonName,
    icon: () => undefined,
  });

  /** The instant with the most commanders on the map, found rather than assumed. */
  const peak = (() => {
    const t0 = Date.parse(pack.timeRange.start);
    const t1 = Date.parse(pack.timeRange.end);
    let best = { n: 0, at: t0 };
    for (let t = t0; t <= t1; t += 86_400_000) {
      const n = commandersAt(opts(t)).length;
      if (n > best.n) best = { n, at: t };
    }
    return best;
  })();

  it('finds the late-August peak the bead describes', () => {
    expect(peak.n).toBeGreaterThanOrEqual(10);
    expect(new Date(peak.at).toISOString().slice(0, 7)).toBe('1914-08');
  });

  it.each([
    ['desktop', 1440, 900],
    ['phone', 390, 844],
  ])('places every commander label at peak on %s', (_name, w, h) => {
    const project = projector(pack.camera.center, pack.camera.zoom, w, h);
    const onScreen = commanderLabelCandidates(commandersAt(opts(peak.at))).filter((c) => {
      const q = project(c.position);
      return q && q[0] >= 0 && q[0] <= w && q[1] >= 0 && q[1] <= h;
    });
    expect(onScreen.length).toBeGreaterThan(0);
    const placed = placeLabels(onScreen, project, []);
    const hidden = onScreen.filter((c) => !placed.get(c.id)?.visible);
    // The layer's own question: at eleven tokens it still finds a slot for
    // each. It is the labels BEHIND it that pay, which the next test measures.
    expect(hidden.map((c) => c.text)).toEqual([]);
  });

  it('costs the place labels behind it a recorded number, and no more', () => {
    const [w, h] = [1440, 900];
    const project = projector(pack.camera.center, pack.camera.zoom, w, h);
    const visible = <T extends { id: string; position: [number, number] }>(cs: T[]) =>
      cs.filter((c) => {
        const q = project(c.position);
        return q && q[0] >= 0 && q[0] <= w && q[1] >= 0 && q[1] <= h;
      });

    const commanders = visible(commanderLabelCandidates(commandersAt(opts(peak.at))));
    const places = visible(placeLabelCandidates(PLACES));

    const cPlaced = placeLabels(commanders, project, []);
    const taken: Box[] = [...occupiedBoxes(commanders, cPlaced, project)];

    const hiddenAlone = places.filter((c) => !placeLabels(places, project, []).get(c.id)?.visible);
    const withCommanders = placeLabels(places, project, taken);
    const hiddenWith = places.filter((c) => !withCommanders.get(c.id)?.visible);

    const cost = hiddenWith.length - hiddenAlone.length;
    expect(
      cost,
      `the commanders layer now hides ${cost} more place labels than the map hides on its own ` +
        `(${hiddenAlone.length} -> ${hiddenWith.length} of ${places.length} on screen). The ` +
        `recorded cost is ${PLACE_LABELS_LOST_TO_COMMANDERS}. If this grew, decide whether that ` +
        `is acceptable and move the number on purpose.`,
    ).toBeLessThanOrEqual(PLACE_LABELS_LOST_TO_COMMANDERS);
    // Report the measurement, so a reader of the run sees the number and not
    // only that it passed.
    console.log(
      `sand-neh.18: ${peak.n} commanders on ${new Date(peak.at).toISOString().slice(0, 10)}; ` +
        `place labels hidden ${hiddenAlone.length} -> ${hiddenWith.length} of ${places.length} ` +
        `on screen (cost ${cost})`,
    );
  });
});
