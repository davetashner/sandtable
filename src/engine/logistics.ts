/**
 * Rail against feet (sand-1l0.21): how far an army has marched along its route
 * by an instant, and how far it has got from the railhead that feeds it.
 * Pure; geometry only.
 */
import type { MovementMode, Route, SupplyLine } from '../packs/schema/index.js';
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
  armyLegs: readonly SupplyLeg[] | undefined,
  railheadPoints: [number, number, number][] | undefined,
  now: number,
): SupplyStatus {
  const thresholdKm = line.thresholdKm ?? 100;
  // Distance is per leg and counts only the marching ones; position is along
  // the whole path, because where the army *is* does not care how it got there.
  const marchedKm = armyLegs ? marchedAlongKm(armyLegs, now) : 0;
  const armyPoints = armyLegs ? joinLegs(armyLegs) : undefined;
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

/** One stretch of a formation's route covered by one means (`sand-23b.8`). */
export interface SupplyLeg {
  /** [lng, lat, epoch ms]; a leg shares its join with its neighbour. */
  points: [number, number, number][];
  /** A route that does not say defaults to `march`, as `legsOf` does. */
  mode: MovementMode;
}

/**
 * The historical (branch-less) route of a formation, in the legs it was
 * written in — one per means of movement, in time order.
 *
 * This mirrors `legsOf` in `layers/movement.ts`: each leg keeps its own
 * waypoints, so a join shared by two legs appears in both and contributes no
 * distance between them.
 */
export function routeLegs(routes: Route[], formationId: string): SupplyLeg[] | undefined {
  const legs = routes
    .filter((x) => x.formation === formationId && !x.branch)
    .sort((a, b) => Date.parse(a.waypoints[0]![2]) - Date.parse(b.waypoints[0]![2]));
  if (legs.length === 0) return undefined;
  return legs.map((leg) => ({
    points: leg.waypoints.map((w): [number, number, number] => [w[0], w[1], Date.parse(w[2])]),
    mode: leg.mode ?? 'march',
  }));
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
  const legs = routeLegs(routes, formationId);
  return legs ? joinLegs(legs) : undefined;
}

/** Every leg's points end to end, sharing each join once. */
export function joinLegs(legs: readonly SupplyLeg[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const leg of legs)
    for (const p of leg.points) if (out[out.length - 1]?.[2] !== p[2]) out.push(p);
  return out;
}

/**
 * How far the army has moved **on its feet** by `now` (`sand-23b.12`).
 *
 * The gauge exists to show the cost of walking away from the railhead, so a
 * leg the formation rode has no business in it. `rail`, `sea` and `air` are
 * transfers — the formation is inside the thing carrying it — and `motor` is
 * the road, where the Paris taxis and Hentsch's staff car are riding rather
 * than marching. Only `march` counts.
 *
 * Summing every leg instead would flatter the army in exactly the direction
 * the gauge is meant to expose: a train ride would read as kilometres marched,
 * and the railhead gap would be wrong on the reassuring side.
 */
export function marchedAlongKm(legs: readonly SupplyLeg[], now: number): number {
  let km = 0;
  for (const leg of legs) if (leg.mode === 'march') km += distanceAlongKm(leg.points, now);
  return km;
}
