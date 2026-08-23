/**
 * Rail against feet (sand-1l0.21): how far an army has marched along its route
 * by an instant, and how far it has got from the railhead that feeds it.
 * Pure; geometry only.
 */
import type { Route, SupplyLine } from '../packs/schema/index.js';
import { positionAt } from './layers/movement.js';

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

/** Distance in km marched along `points` ([lng, lat, ms]) up to `now` (0 before the start). */
export function distanceAlongKm(points: [number, number, number][], now: number): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (now <= a[2]) break;
    const seg = haversineKm([a[0], a[1]], [b[0], b[1]]);
    if (now >= b[2]) km += seg;
    else {
      const f = (now - a[2]) / (b[2] - a[2]);
      km += seg * f;
      break;
    }
  }
  return km;
}

export interface SupplyStatus {
  /** km the army has marched along its route by now. */
  marchedKm: number;
  /** km between the army and its railhead at now (undefined before either route begins). */
  gapKm?: number;
  /** True once the gap exceeds the threshold. */
  strained: boolean;
  thresholdKm: number;
}

export function supplyStatus(
  line: SupplyLine,
  armyPoints: [number, number, number][] | undefined,
  railheadPoints: [number, number, number][] | undefined,
  now: number,
): SupplyStatus {
  const thresholdKm = line.thresholdKm ?? 100;
  const marchedKm = armyPoints ? distanceAlongKm(armyPoints, now) : 0;
  const out: SupplyStatus = { marchedKm, strained: false, thresholdKm };
  if (armyPoints && railheadPoints && armyPoints.length && railheadPoints.length) {
    const a = positionAt(armyPoints, now);
    const r = positionAt(railheadPoints, now);
    if (a.phase !== 'before' && r.phase !== 'before') {
      out.gapKm = haversineKm(a.lngLat, r.lngLat);
      out.strained = out.gapKm > thresholdKm;
    }
  }
  return out;
}

/** The historical (branch-less) route of a formation as [lng, lat, ms] points, if any. */
export function routePoints(
  routes: Route[],
  formationId: string,
): [number, number, number][] | undefined {
  const r = routes.find((x) => x.formation === formationId && !x.branch);
  return r?.waypoints.map((w) => [w[0], w[1], Date.parse(w[2])] as [number, number, number]);
}
