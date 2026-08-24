/**
 * Rail against feet (sand-1l0.21): how far an army has marched along its route
 * by an instant, and how far it has got from the railhead that feeds it.
 * Pure; geometry only.
 */
import type { Route, SupplyLine } from '../packs/schema/index.js';
import { haversineKm } from './geo.js';
import { positionAt } from './layers/movement.js';

export { haversineKm };

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

/**
 * The historical (branch-less) route of a formation as [lng, lat, ms] points,
 * if any — every leg of it, in time order, sharing each join once (a route
 * may be written in legs, one per mode; see `composeRoutes`).
 */
export function routePoints(
  routes: Route[],
  formationId: string,
): [number, number, number][] | undefined {
  const legs = routes
    .filter((x) => x.formation === formationId && !x.branch)
    .sort((a, b) => Date.parse(a.waypoints[0]![2]) - Date.parse(b.waypoints[0]![2]));
  if (legs.length === 0) return undefined;
  const out: [number, number, number][] = [];
  for (const leg of legs)
    for (const w of leg.waypoints) {
      const at = Date.parse(w[2]);
      if (out[out.length - 1]?.[2] !== at) out.push([w[0], w[1], at]);
    }
  return out;
}
