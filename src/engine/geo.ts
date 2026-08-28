/**
 * Geometry on the globe, with nothing else attached. Kept apart from
 * `logistics.ts` so the content validator can measure distances without
 * pulling deck.gl into a command-line tool.
 *
 * The antimeridian lives here too (`sand-lry.22`). Longitude is the one
 * coordinate that wraps, and a Pacific theatre is the first content this
 * repository has that straddles the wrap: Hitokappu Bay is 147.7°E and Oahu
 * is 158°W, so the box around them runs *east* from a larger number to a
 * smaller one. A region written that way — `west > east` — is legal and means
 * "the short way across 180°" (RFC 7946 §5.2 writes bounding boxes the same
 * way). Everything that reads a region has to know it, which is why the
 * arithmetic is one place rather than inlined at each reader.
 *
 * The trap worth stating once: the middle of a crossing region is not the mean
 * of its corners. Halfway between 147.7°E and 158°W is 174.85°E, not 5.15°W —
 * which is the whole reason a naive `fitBounds` frames the other 306° of the
 * world. Unwrap first (`unwrapEast`), then do the ordinary arithmetic.
 */

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km between two [lng, lat] points. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** `[west, south, east, north]`, where `west > east` crosses the antimeridian. */
export type Box = readonly [number, number, number, number];

/**
 * Whether a region is written the short way across 180° — its west edge
 * numerically east of its east edge. `[-180, s, 180, n]` is the whole world
 * and does not cross; `[179, s, -179, n]` is two degrees wide and does.
 */
export function crossesAntimeridian(box: Box): boolean {
  return box[0] > box[2];
}

/**
 * The east edge as a number greater than the west edge — 158°W becomes 202°
 * when the box starts at 147°E. This is the form every consumer wants: it
 * makes the box an ordinary interval again, and it is exactly what MapLibre's
 * own `LngLatBounds.adjustAntiMeridian()` produces before it fits a camera.
 */
export function unwrapEast(box: Box): number {
  return crossesAntimeridian(box) ? box[2] + 360 : box[2];
}

/** How wide the region is in degrees of longitude — the short way across 180°. */
export function lngSpan(box: Box): number {
  return unwrapEast(box) - box[0];
}

/** A longitude in [-180, 180). */
export function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Whether a longitude falls inside the region, crossing or not. */
export function containsLng(box: Box, lng: number): boolean {
  const offset = wrapLng(lng - box[0]);
  return offset >= 0 ? offset <= lngSpan(box) : offset + 360 <= lngSpan(box);
}

/** Whether a `[lng, lat]` falls inside the region, crossing or not. */
export function boxContains(box: Box, point: readonly [number, number]): boolean {
  return containsLng(box, point[0]) && point[1] >= box[1] && point[1] <= box[3];
}

/**
 * The same longitudes, made continuous: each one moved by whole turns so that
 * no step between neighbours exceeds 180°.
 *
 * A polyline is a list of points, and every renderer between here and the
 * screen draws the segment between two of them as a straight line in
 * projected space. Hitokappu Bay at 147.672 followed by a standby point at
 * -170 is a step of -317.672, so the line goes *west* over Asia, Europe and
 * America instead of 42° east across the Pacific. Unwrapping makes the second
 * point 190, which is the same place and the short way there. The first point
 * is left where the author put it, so a path that never crosses is untouched —
 * whole turns are counted rather than accumulated, so the coordinates of a
 * path in Picardy come back bit for bit as they were written.
 */
export function unwrapLngs(lngs: readonly number[]): number[] {
  const out: number[] = [];
  let turns = 0;
  let previous: number | undefined;
  for (const lng of lngs) {
    if (previous !== undefined) {
      const step = lng + turns * 360 - previous;
      if (step > 180) turns -= 1;
      else if (step < -180) turns += 1;
    }
    const next = turns === 0 ? lng : lng + turns * 360;
    out.push(next);
    previous = next;
  }
  return out;
}
