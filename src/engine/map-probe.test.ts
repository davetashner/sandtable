/**
 * The probe's own test (`sand-pmz.9.2`). The gate asserts on what `mapProbe`
 * returns, so an untested probe would make the assertion a mirror: it would
 * agree with whatever the engine did, including the wrong thing.
 *
 * The case that matters is the one that motivated the bead — PR #161's
 * antimeridian routes — reproduced as data rather than as a browser. The
 * second case that matters is the false positive found while building this:
 * a *correct* Pacific render whose global bounding box measures 361°.
 */
import { describe, expect, it } from 'vitest';
import { enclosingArc, mapProbe, pathSpan } from './map-probe';
import type { Box } from './geo';

/** The 1941 pack's own region: 99°E to 155°W, the short way across 180°. */
const PACIFIC: Box = [99, -12, -155, 52];
/** The 1914 pack's: a corner of western Europe. */
const WESTERN_EUROPE: Box = [0, 47, 9, 52];

const layer = (id: string, data: unknown) => ({ id, props: { data } });
const path = (...lngs: number[]) => ({ path: lngs.map((l) => [l, 30]) });
const at = (lng: number) => ({ position: [lng, 30] });

describe('pathSpan', () => {
  it('is narrow for an unwrapped Pacific route', () => {
    // Hitokappu Bay to Oahu, unwrapped on the way in: −158 has become 202.
    // The short way across the Pacific is 54°, and that is what it measures.
    expect(pathSpan([147.7, 190, 202])).toBeCloseTo(54.3, 1);
  });

  it('is most of the planet for the same route left wrapped — this is PR #161', () => {
    // `unwrapLngs` guarantees no step exceeds 180°. Without it the renderer
    // draws −170 → 147.7 westward across Asia and Europe. 317.7° is the
    // number `sand-pmz.9.2` records for #161 — "about 318 degrees against a
    // declared 106" — which is the corroboration that this is the same defect
    // measured the same way.
    expect(pathSpan([147.7, -170, -158])).toBeCloseTo(317.7, 1);
  });

  it('is zero for a path of one point, and for none', () => {
    expect(pathSpan([12])).toBe(0);
    expect(pathSpan([])).toBe(0);
  });
});

describe('enclosingArc', () => {
  it('measures a Pacific scatter the short way, whichever side of 180° each is on', () => {
    // Tokyo-ish and Oahu-ish, written as the author wrote them. A plain
    // max − min says 302°; the honest answer is the other arc.
    expect(enclosingArc([144.75, -157.85])).toBeCloseTo(57.4, 1);
  });

  it('agrees with max − min when nothing crosses', () => {
    expect(enclosingArc([2, 5, 9])).toBeCloseTo(7, 6);
  });

  it('is zero for one point and for none', () => {
    expect(enclosingArc([42])).toBe(0);
    expect(enclosingArc([])).toBe(0);
  });
});

describe('mapProbe', () => {
  it('counts every layer it was handed, including the empty ones', () => {
    const probe = mapProbe({
      layers: [
        layer('places-dots', [at(2), at(4)]),
        layer('movement-tokens', []),
        layer('tally-markers', undefined),
      ],
      region: WESTERN_EUROPE,
    });
    expect(probe.layers.map((l) => [l.id, l.count])).toEqual([
      ['places-dots', 2],
      ['movement-tokens', 0],
      ['tally-markers', 0],
    ]);
    expect(probe.points).toBe(2);
  });

  it('names the layer holding the widest path', () => {
    const probe = mapProbe({
      layers: [layer('movement-ghost', [path(2, 4)]), layer('movement-trail', [path(2, 40)])],
      region: WESTERN_EUROPE,
    });
    expect(probe.widestPath).toEqual({ layer: 'movement-trail', span: 38 });
  });

  it('is the assertion that would have caught PR #161', () => {
    const good = mapProbe({
      layers: [layer('movement-trail', [path(147.7, 190, 202)])],
      region: PACIFIC,
    });
    expect(good.widestPath!.span).toBeLessThan(60);

    const bad = mapProbe({
      layers: [layer('movement-trail', [path(147.7, -170, -158)])],
      region: PACIFIC,
    });
    expect(bad.widestPath!.span).toBeGreaterThan(180);
  });

  it('does not fire on a correct Pacific render — the false positive that changed the design', () => {
    // Two routes in one layer, unwrapped independently: one ends at 202°, the
    // other sits at −157.99°. They are the same meridian a full turn apart, so
    // a bounding box over both measures 361° on a pack that renders perfectly.
    // Per-path spans are 54° and 0°, and neither is alarming.
    const probe = mapProbe({
      layers: [layer('movement-trail', [path(147.7, 202), path(-157.99, -157.9)])],
      region: PACIFIC,
    });
    expect(probe.widestPath!.span).toBeCloseTo(54.3, 1);
    expect(probe.widestPath!.span).toBeLessThan(180);
  });

  it('measures a declared crossing region the short way', () => {
    // The whole reason `lngSpan` exists: 99°E to 155°W is 106°, not 254°.
    const probe = mapProbe({ layers: [], region: PACIFIC });
    expect(probe.declared.lngSpan).toBe(106);
    expect(probe.widestPath).toBeNull();
    expect(probe.points).toBe(0);
  });

  it('judges a zoom-in against its own region, not the pack’s', () => {
    const probe = mapProbe({
      layers: [layer('places-dots', [at(-157.9)])],
      region: PACIFIC,
      focusRegion: [-158.35, 21.15, -157.55, 21.8],
    });
    expect(probe.declared.bbox).toEqual([-158.35, 21.15, -157.55, 21.8]);
    expect(probe.declared.lngSpan).toBeCloseTo(0.8, 2);
  });
});
