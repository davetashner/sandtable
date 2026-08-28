import { describe, expect, it } from 'vitest';
import {
  boxContains,
  containsLng,
  crossesAntimeridian,
  haversineKm,
  lngSpan,
  unwrapEast,
  unwrapLngs,
  wrapLng,
  type Box,
} from './geo.js';

/**
 * The six regions this repository has to be able to frame (`sand-lry.22`).
 * Each is a real box or the shape of one: the 1914 campaign, the central
 * Pacific theatre, the two degenerate ends of the scale, an assault box a
 * few kilometres across that happens to straddle 180°, and the southern
 * hemisphere, where the wrap is the same problem and the latitudes are not.
 */
const MARNE: Box = [0, 47, 9, 52];
/** The 1941 pack's own region: Malaya east to Hawaii, across the date line. */
const PACIFIC: Box = [99, -12, -155, 52];
const WHOLE_WORLD: Box = [-180, -12, 180, 52];
const AT_ANTIMERIDIAN: Box = [-180, 0, -170, 10];
const MIDWAY: Box = [-177.5, 28.15, -177.3, 28.25];
const WAKE_TO_MIDWAY: Box = [166.5, 19, -177.3, 28.4];
const FIJI: Box = [175.8, -20.2, -178.3, -15.4];

describe('a region that crosses the antimeridian', () => {
  it('is the one written west > east', () => {
    expect(crossesAntimeridian(MARNE)).toBe(false);
    expect(crossesAntimeridian(WHOLE_WORLD)).toBe(false);
    expect(crossesAntimeridian(AT_ANTIMERIDIAN)).toBe(false);
    expect(crossesAntimeridian(MIDWAY)).toBe(false);
    expect(crossesAntimeridian(PACIFIC)).toBe(true);
    expect(crossesAntimeridian(WAKE_TO_MIDWAY)).toBe(true);
    expect(crossesAntimeridian(FIJI)).toBe(true);
  });

  it('unwraps its east edge past +180, and leaves an ordinary one alone', () => {
    expect(unwrapEast(MARNE)).toBe(9);
    expect(unwrapEast(WHOLE_WORLD)).toBe(180);
    expect(unwrapEast(AT_ANTIMERIDIAN)).toBe(-170);
    expect(unwrapEast(PACIFIC)).toBeCloseTo(205, 10);
    expect(unwrapEast(FIJI)).toBeCloseTo(181.7, 10);
  });

  it('is as wide as the short way across 180°, not the long way round', () => {
    expect(lngSpan(MARNE)).toBeCloseTo(9, 10);
    expect(lngSpan(WHOLE_WORLD)).toBe(360);
    expect(lngSpan(AT_ANTIMERIDIAN)).toBe(10);
    // The bug in one number: min/max of the corners makes this 254.
    expect(lngSpan(PACIFIC)).toBeCloseTo(106, 10);
    // The assault case — a box a few kilometres across, not most of a globe.
    expect(lngSpan(MIDWAY)).toBeCloseTo(0.2, 10);
    expect(lngSpan(WAKE_TO_MIDWAY)).toBeCloseTo(16.2, 10);
    expect(lngSpan(FIJI)).toBeCloseTo(5.9, 10);
  });
});

describe('what a region contains', () => {
  it('holds an ordinary box to its own edges', () => {
    expect(boxContains(MARNE, [4.5, 49])).toBe(true);
    expect(boxContains(MARNE, [0, 47])).toBe(true);
    expect(boxContains(MARNE, [9, 52])).toBe(true);
    expect(boxContains(MARNE, [20, 60])).toBe(false);
    expect(boxContains(MARNE, [4.5, 60])).toBe(false);
  });

  it('holds both sides of a crossing box, and nothing on the far side', () => {
    // Singapore, Hitokappu Bay, the standby point, Midway, Oahu — every
    // position the 1941 pack puts on the map is in the theatre.
    expect(boxContains(PACIFIC, [103.8333, 1.2833])).toBe(true);
    expect(boxContains(PACIFIC, [147.672, 44.965])).toBe(true);
    expect(boxContains(PACIFIC, [-170, 42])).toBe(true);
    expect(boxContains(PACIFIC, [-177.4, 28.2])).toBe(true);
    expect(boxContains(PACIFIC, [-157.977, 21.3])).toBe(true);
    expect(boxContains(PACIFIC, [180, 30])).toBe(true);
    expect(boxContains(PACIFIC, [-180, 30])).toBe(true);
    // Washington, Delhi, Berlin: outside, and a min/max reading of the same
    // box would say Berlin was inside and Midway was not.
    expect(boxContains(PACIFIC, [-77, 38.9])).toBe(false);
    expect(boxContains(PACIFIC, [77.2, 28.6])).toBe(false);
    expect(boxContains(PACIFIC, [13.4, 52])).toBe(false);
  });

  it('holds everything inside a full longitude band', () => {
    for (const lng of [-180, -90, 0, 90, 180]) {
      expect(boxContains(WHOLE_WORLD, [lng, 20])).toBe(true);
    }
    expect(boxContains(WHOLE_WORLD, [0, 60])).toBe(false);
  });

  it('holds a southern crossing box by latitude as well as longitude', () => {
    expect(boxContains(FIJI, [178.4, -18])).toBe(true);
    expect(boxContains(FIJI, [-179.9, -16])).toBe(true);
    expect(boxContains(FIJI, [170, -18])).toBe(false);
    // South of the box, on a meridian that runs through it: the longitude is
    // inside and the point is not, which is the pair the check has to keep
    // apart when the hemisphere is the southern one.
    expect(containsLng(FIJI, 178.4)).toBe(true);
    expect(boxContains(FIJI, [178.4, -25])).toBe(false);
  });

  it('holds a tiny crossing box only just', () => {
    const tiny: Box = [179.95, 28.1, -179.95, 28.3];
    expect(lngSpan(tiny)).toBeCloseTo(0.1, 10);
    expect(boxContains(tiny, [180, 28.2])).toBe(true);
    expect(boxContains(tiny, [-179.96, 28.2])).toBe(true);
    expect(boxContains(tiny, [179.9, 28.2])).toBe(false);
    expect(boxContains(tiny, [-179.9, 28.2])).toBe(false);
  });
});

describe('wrapLng', () => {
  it('brings any longitude back into [-180, 180)', () => {
    expect(wrapLng(0)).toBe(0);
    expect(wrapLng(202)).toBeCloseTo(-158, 10);
    expect(wrapLng(-190)).toBeCloseTo(170, 10);
    expect(wrapLng(180)).toBe(-180);
    expect(wrapLng(-180)).toBe(-180);
    expect(wrapLng(540)).toBe(-180);
  });
});

describe('unwrapLngs', () => {
  it('leaves a path that never crosses exactly where it was', () => {
    expect(unwrapLngs([2.35, 3.1, 4.4, 5.2])).toEqual([2.35, 3.1, 4.4, 5.2]);
  });

  it('takes the Kido Butai east across the Pacific, not west over Europe', () => {
    const track = [147.672, -170, -157, -157.977, -157.99, -168];
    const out = unwrapLngs(track);
    expect(out[0]).toBe(147.672);
    expect(out[1]).toBeCloseTo(190, 10);
    expect(out[2]).toBeCloseTo(203, 10);
    expect(out[3]).toBeCloseTo(202.023, 10);
    // Every step is the short way: none of them is most of a circumference.
    for (let i = 1; i < out.length; i++) {
      expect(Math.abs(out[i]! - out[i - 1]!)).toBeLessThanOrEqual(180);
    }
  });

  it('unwraps westward as readily as eastward', () => {
    const out = unwrapLngs([-175, 175, 170]);
    expect(out).toEqual([-175, -185, -190]);
  });

  it('accumulates over several crossings rather than snapping back', () => {
    const out = unwrapLngs([170, -170, 170, -170]);
    expect(out).toEqual([170, 190, 170, 190]);
  });

  it('is a no-op on the empty path and on a single point', () => {
    expect(unwrapLngs([])).toEqual([]);
    expect(unwrapLngs([-179])).toEqual([-179]);
  });
});

describe('haversineKm across the antimeridian', () => {
  it('measures the short way, whichever side the longitudes are written on', () => {
    const a: [number, number] = [179.5, 0];
    const b: [number, number] = [-179.5, 0];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm([179.5, 0], [180.5, 0]), 6);
    expect(haversineKm(a, b)).toBeLessThan(120);
  });
});
