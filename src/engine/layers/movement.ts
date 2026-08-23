/**
 * The animated movement layer — Routes rendered on the map as the clock runs.
 *
 *   composeRoutes(...)  which waypoints each formation follows in a branch
 *                       (the base route before divergesAt + the branch tail)
 *   positionAt(...)     where a formation is at an instant (linear between
 *                       waypoints; parked at the ends)
 *   buildMovementLayers(...) deck.gl layers: faint ghost of the whole route,
 *                       the travelled trail (TripsLayer), a token at "now"
 *                       and its label. Colours come from the design tokens.
 *
 * Pure and era-agnostic; the React hook (useMovementLayers) feeds it the clock.
 */
import type { Layer } from '@deck.gl/core';
import { TripsLayer } from '@deck.gl/geo-layers';
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Branch, Formation, Route, Side, Waypoint } from '../../packs/schema/index.js';
import { type RGBA, sideColor, tokenColor } from './colors.js';

export interface ComposedRoute {
  formation: Formation;
  side: Side;
  /** [lng, lat, epoch ms] strictly increasing. */
  points: [number, number, number][];
  /** True when any part of the path comes from a counterfactual branch. */
  hypothetical: boolean;
  confidence: Route['confidence'];
}

const toPoint = (w: Waypoint): [number, number, number] => [w[0], w[1], Date.parse(w[2])];

/**
 * For each formation: the default route's waypoints before the branch's
 * divergence, then the branch route's waypoints (if the branch has one).
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
    const base = routes.find((r) => r.formation === f.id && !r.branch);
    const tail =
      branch.kind === 'counterfactual'
        ? routes.find((r) => r.formation === f.id && r.branch === branch.id)
        : undefined;
    if (!base && !tail) continue;
    const side = sideById.get(f.side);
    if (!side) continue;
    const divergesAt = branch.divergesAt ? Date.parse(branch.divergesAt) : Infinity;
    let points: [number, number, number][] = (base?.waypoints ?? []).map(toPoint);
    if (tail) {
      points = [...points.filter((p) => p[2] < divergesAt), ...tail.waypoints.map(toPoint)];
    }
    if (points.length === 0) continue;
    out.push({
      formation: f,
      side,
      points,
      hypothetical: Boolean(tail),
      confidence: tail?.confidence ?? base?.confidence ?? 'medium',
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

export interface MovementLayerOptions {
  routes: ComposedRoute[];
  /** Epoch ms. */
  now: number;
  /** Epoch ms; timestamps are seconds from here (keeps float precision). */
  rangeStart: number;
  sides: Side[];
  /** Highlight one formation (hover/selection). */
  highlight?: string;
  /** Called when a token is clicked. */
  onSelect?: (formationId: string) => void;
}

interface RouteDatum {
  id: string;
  path: [number, number][];
  timestamps: number[];
  color: RGBA;
  hypothetical: boolean;
}

interface TokenDatum {
  id: string;
  label: string;
  position: [number, number];
  color: RGBA;
  radius: number;
  phase: Position['phase'];
  hypothetical: boolean;
}

const RADIUS: Partial<Record<Formation['kind'], number>> = {
  'army-group': 9,
  army: 7.5,
  corps: 6,
  division: 5,
  brigade: 4.5,
  regiment: 4,
  detachment: 4,
  garrison: 5,
  fleet: 7.5,
  squadron: 5,
  flotilla: 4.5,
  other: 5,
};

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

/** deck.gl layers for the current instant. Rebuild every tick; deck diffs props. */
export function buildMovementLayers(o: MovementLayerOptions): Layer[] {
  const routeData: RouteDatum[] = o.routes.map((r) => ({
    id: r.formation.id,
    path: r.points.map((p) => [p[0], p[1]] as [number, number]),
    timestamps: r.points.map((p) => (p[2] - o.rangeStart) / 1000),
    color: sideColor(r.side, o.sides),
    hypothetical: r.hypothetical,
  }));
  const tokens: TokenDatum[] = [];
  for (const r of o.routes) {
    const pos = positionAt(r.points, o.now);
    // Before its route begins a formation shows only once it exists — from
    // its concentration date (an army deploying), never for one not yet
    // formed (the French 6th and 9th Armies, the Army of Alsace).
    if (pos.phase === 'before' && !existsAt(r.formation, o.now)) continue;
    if (dissolvedBy(r.formation, o.now)) continue;
    tokens.push({
      id: r.formation.id,
      label: r.formation.short ?? r.formation.name,
      position: pos.lngLat,
      color: sideColor(r.side, o.sides),
      radius: RADIUS[r.formation.kind] ?? 5,
      phase: pos.phase,
      hypothetical: r.hypothetical,
    });
  }
  const currentTime = (o.now - o.rangeStart) / 1000;
  const ink = tokenColor('--panel');
  const halo = tokenColor('--ink');

  return [
    // the whole route, faint — what is still to come
    new PathLayer<RouteDatum>({
      id: 'movement-ghost',
      data: routeData,
      getPath: (d) => d.path,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], d.hypothetical ? 70 : 55],
      getWidth: 2,
      widthUnits: 'pixels',
      widthMinPixels: 1.5,
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }),
    // the travelled part, revealed by the clock
    new TripsLayer<RouteDatum>({
      id: 'movement-trail',
      data: routeData,
      getPath: (d) => d.path,
      getTimestamps: (d) => d.timestamps,
      getColor: (d) => d.color,
      getWidth: (d) => (o.highlight === d.id ? 5 : 3.5),
      widthUnits: 'pixels',
      widthMinPixels: 2,
      capRounded: true,
      jointRounded: true,
      fadeTrail: false,
      trailLength: Number.MAX_SAFE_INTEGER,
      currentTime,
      pickable: false,
    }),
    // tokens at "now"
    new ScatterplotLayer<TokenDatum>({
      id: 'movement-tokens',
      data: tokens,
      getPosition: (d) => d.position,
      getRadius: (d) => d.radius * (o.highlight === d.id ? 1.3 : 1),
      radiusUnits: 'pixels',
      getFillColor: (d) =>
        d.phase === 'before' ? [d.color[0], d.color[1], d.color[2], 120] : d.color,
      getLineColor: () => ink,
      getLineWidth: 1.5,
      lineWidthUnits: 'pixels',
      stroked: true,
      pickable: true,
      onClick: (info) => {
        const d = info.object as TokenDatum | undefined;
        if (d) o.onSelect?.(d.id);
      },
      updateTriggers: { getRadius: [o.highlight], getFillColor: [o.now] },
    }),
    new TextLayer<TokenDatum>({
      id: 'movement-labels',
      data: tokens,
      getPosition: (d) => d.position,
      getText: (d) => d.label,
      getSize: 12,
      sizeUnits: 'pixels',
      getColor: () => halo,
      getPixelOffset: (d) => [0, -(d.radius + 9)],
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      fontWeight: 600,
      outlineWidth: 3,
      outlineColor: ink,
      fontSettings: { sdf: true },
      characterSet: 'auto',
      pickable: false,
    }),
  ];
}
