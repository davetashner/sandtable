/**
 * Geometry on the globe, with nothing else attached. Kept apart from
 * `logistics.ts` so the content validator can measure distances without
 * pulling deck.gl into a command-line tool.
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
