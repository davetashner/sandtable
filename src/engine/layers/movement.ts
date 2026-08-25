/**
 * The geometry of movement — where a formation is, and when.
 *
 *   composeRoutes(...)  which waypoints each formation follows in a branch
 *                       (the base route's legs before divergesAt + the branch
 *                       tail), joined into one path that keeps its legs
 *   positionAt(...)     where a formation is at an instant (linear between
 *                       waypoints; parked at the ends)
 *   existsAt/dissolvedBy  whether the formation is on the board at all
 *
 * Pure, era-agnostic, and deliberately free of deck.gl: the supply gauges
 * (`src/engine/logistics.ts`) ask `positionAt` where an army is, and they are
 * part of the dossier, which the reader sees before the map surface has
 * finished loading. While the two lived in one file that single import pulled
 * deck.gl, luma.gl, math.gl and loaders.gl into the eager bundle — 165 kB
 * gzip of WebGL that nothing on screen was using yet (ADR 0016, `sand-pmz.3`).
 * The layers those numbers feed are next door in `movement-layers.ts`.
 */
import type {
  Branch,
  Confidence,
  Formation,
  MovementMode,
  Route,
  Side,
  Waypoint,
} from '../../packs/schema/index.js';
import { waypointConfidence } from '../confidence.js';

/** One stretch of a route covered by one means (sand-23b.8). */
export interface ComposedLeg {
  /** [lng, lat, epoch ms]; a leg shares its first point with the leg before it. */
  points: [number, number, number][];
  /** One per point: the waypoint's own confidence, or its route's (`sand-23b.4`). */
  confidences: Confidence[];
  mode: MovementMode;
}

export interface ComposedRoute {
  formation: Formation;
  side: Side;
  /** Every leg joined into one path: [lng, lat, epoch ms] strictly increasing. */
  points: [number, number, number][];
  /** The path in the pieces it was written in, each with its own mode. */
  legs: ComposedLeg[];
  /** One per point of `points`, aligned with it. */
  confidences: Confidence[];
  /** True when any part of the path comes from a counterfactual branch. */
  hypothetical: boolean;
  confidence: Route['confidence'];
}

const toPoint = (w: Waypoint): [number, number, number] => [w[0], w[1], Date.parse(w[2])];

/** rail, sea and air are transfers: the formation is inside the thing carrying it. */
export function isTransfer(mode: MovementMode): boolean {
  return mode === 'rail' || mode === 'sea' || mode === 'air';
}

/** The mode in force at `now` — the last leg to have begun (the first, before any has). */
export function modeAt(legs: ComposedLeg[], now: number): MovementMode {
  let current = legs[0];
  for (const leg of legs) {
    if (leg.points[0]![2] > now) break;
    current = leg;
  }
  return current?.mode ?? 'march';
}

const byStart = (a: Route, b: Route) =>
  Date.parse(a.waypoints[0]![2]) - Date.parse(b.waypoints[0]![2]);

/** Routes in time order as legs, dropping anything at or after `cut`. */
function legsOf(routes: Route[], cut: number): ComposedLeg[] {
  const out: ComposedLeg[] = [];
  for (const r of [...routes].sort(byStart)) {
    const kept = r.waypoints.filter((w) => Date.parse(w[2]) < cut);
    if (kept.length === 0) continue;
    out.push({
      points: kept.map(toPoint),
      confidences: kept.map((w) => waypointConfidence(w, r.confidence)),
      mode: r.mode ?? 'march',
    });
  }
  return out;
}

/**
 * For each formation: its default route's legs before the branch's
 * divergence, then the branch route's legs (if the branch has one).
 * Formations without a default route in this branch are omitted.
 */
export function composeRoutes(
  routes: Route[],
  formations: Formation[],
  sides: Side[],
  branch: Branch,
): ComposedRoute[] {
  const sideById = new Map(sides.map((s) => [s.id, s]));
  const out: ComposedRoute[] = [];
  for (const f of formations) {
    const base = routes.filter((r) => r.formation === f.id && !r.branch);
    const tail =
      branch.kind === 'counterfactual'
        ? routes.filter((r) => r.formation === f.id && r.branch === branch.id)
        : [];
    if (base.length === 0 && tail.length === 0) continue;
    const side = sideById.get(f.side);
    if (!side) continue;
    const divergesAt = branch.divergesAt ? Date.parse(branch.divergesAt) : Infinity;
    const legs = [...legsOf(base, tail.length ? divergesAt : Infinity), ...legsOf(tail, Infinity)];
    // the legs meet at a shared waypoint; the joined path keeps it once
    const points: [number, number, number][] = [];
    const confidences: Confidence[] = [];
    for (const leg of legs)
      leg.points.forEach((p, i) => {
        if (points[points.length - 1]?.[2] === p[2]) return;
        points.push(p);
        confidences.push(leg.confidences[i] ?? 'medium');
      });
    if (points.length === 0) continue;
    out.push({
      formation: f,
      side,
      points,
      legs,
      confidences,
      hypothetical: tail.length > 0,
      confidence: tail[0]?.confidence ?? base[0]?.confidence ?? 'medium',
    });
  }
  return out;
}

export interface Position {
  lngLat: [number, number];
  /** Heading in degrees clockwise from north, along the current segment. */
  bearing: number;
  /** 'before' the first waypoint, 'moving', or 'after' the last. */
  phase: 'before' | 'moving' | 'after';
}

/** Linear interpolation along the route at `now` (epoch ms). */
export function positionAt(points: [number, number, number][], now: number): Position {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (now <= first[2]) {
    return {
      lngLat: [first[0], first[1]],
      bearing: bearingBetween(first, points[1] ?? first),
      phase: 'before',
    };
  }
  if (now >= last[2]) {
    return {
      lngLat: [last[0], last[1]],
      bearing: bearingBetween(points[points.length - 2] ?? last, last),
      phase: 'after',
    };
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (now <= b[2]) {
      const t = (now - a[2]) / (b[2] - a[2]);
      return {
        lngLat: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        bearing: bearingBetween(a, b),
        phase: 'moving',
      };
    }
  }
  return { lngLat: [last[0], last[1]], bearing: 0, phase: 'after' };
}

function bearingBetween(a: [number, number, number], b: [number, number, number]): number {
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return 0;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

/** Whether a formation has come into being by `now`: from `concentration.asOf` when given, else always. */
export function existsAt(formation: Formation, now: number): boolean {
  const asOf = formation.concentration?.asOf;
  if (!asOf) return true;
  const t = Date.parse(asOf);
  return Number.isFinite(t) ? t <= now : false;
}

/** Whether a formation has ceased to exist by `now` (`dissolved`). */
export function dissolvedBy(formation: Formation, now: number): boolean {
  if (!formation.dissolved) return false;
  const t = Date.parse(formation.dissolved);
  return Number.isFinite(t) ? t <= now : false;
}
