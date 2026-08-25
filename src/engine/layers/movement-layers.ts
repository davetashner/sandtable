/**
 * The movement layers — the geometry of `movement.ts` drawn on the map:
 * a faint ghost of the whole route, the travelled trail (TripsLayer), a token
 * at "now" and its label, laid out against the other labels. Colours come
 * from the design tokens.
 *
 * Separate from `movement.ts` because this half imports deck.gl and that half
 * must not: `positionAt` is read by the supply gauges in the dossier, and one
 * import of it used to be enough to put the whole WebGL stack in the bundle
 * the browser downloads before first paint (ADR 0016, `sand-pmz.3`).
 */
import type { Layer } from '@deck.gl/core';
import { TripsLayer } from '@deck.gl/geo-layers';
import { PathStyleExtension, type PathStyleExtensionProps } from '@deck.gl/extensions';
import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Formation, MovementMode, Side } from '../../packs/schema/index.js';
import { APPROX_MARK, confidenceAt, isApproximate } from '../confidence.js';
import { APPROX_HALO_ICON, haloSize } from './approx-halo.js';
import { type RGBA, sideColor, tokenColor } from './colors.js';
import {
  occupiedBoxes,
  placeLabels,
  TOKEN_SLOTS,
  type Box,
  type LabelCandidate,
  type LabelPlacement,
} from './places.js';
import {
  dissolvedBy,
  existsAt,
  isTransfer,
  modeAt,
  positionAt,
  type ComposedRoute,
  type Position,
} from './movement.js';

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
  /**
   * Screen projection (MapLibre's map.project). When given, token labels are
   * laid out against each other — above, then right, left, below of the
   * token; hidden only when boxed in — and `buildMovementScene` reports the
   * boxes they occupy so place labels can keep clear of them (sand-4xz).
   */
  project?: ((lngLat: [number, number]) => [number, number] | null) | undefined;
}

interface RouteDatum {
  id: string;
  mode: MovementMode;
  /** Anything but a march is dashed. */
  dashed: boolean;
  path: [number, number][];
  timestamps: number[];
  color: RGBA;
  hypothetical: boolean;
}

/**
 * How each mode draws. A march is a solid line — the army is on the ground
 * the whole way. A transfer by rail, sea or air is the long dash: the
 * formation is aboard something and off the map until it arrives. The road
 * gets a dash of its own, short and close, so a column of cars reads as
 * movement over the ground but not as a march (sand-23b.8).
 */
const DASH: Record<MovementMode, [number, number]> = {
  march: [0, 0],
  motor: [2, 3],
  rail: [6, 4],
  sea: [6, 4],
  air: [6, 4],
};

interface TokenDatum {
  id: string;
  label: string;
  position: [number, number];
  color: RGBA;
  radius: number;
  phase: Position['phase'];
  hypothetical: boolean;
  /**
   * The position at this instant is `low` or `contested` (`sand-23b.4`) — the
   * token opens, wears a dashed halo and takes an `≈` in front of its label.
   */
  approximate: boolean;
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

const LABEL_PRIORITY: Partial<Record<Formation['kind'], number>> = {
  'army-group': 6,
  army: 5,
  fleet: 5,
  corps: 4,
  other: 3,
  division: 3,
  squadron: 3,
  garrison: 2,
  brigade: 2,
  flotilla: 2,
  detachment: 1,
  regiment: 1,
};

/** deck.gl layers for the current instant. Rebuild every tick; deck diffs props. */
export function buildMovementLayers(o: MovementLayerOptions): Layer[] {
  return buildMovementScene(o).layers;
}

export interface MovementScene {
  layers: Layer[];
  /** Screen boxes of the token dots and their placed labels (empty without `project`). */
  labelBoxes: Box[];
}

/** Layers plus the screen space the tokens and their labels occupy. */
export function buildMovementScene(o: MovementLayerOptions): MovementScene {
  // one datum per leg, so a route that marched, entrained and marched again
  // draws each stretch the way that stretch was covered
  const routeData: RouteDatum[] = o.routes.flatMap((r) =>
    r.legs
      .filter((leg) => leg.points.length > 1)
      .map((leg) => ({
        id: r.formation.id,
        mode: leg.mode,
        path: leg.points.map((p) => [p[0], p[1]] as [number, number]),
        timestamps: leg.points.map((p) => (p[2] - o.rangeStart) / 1000),
        color: sideColor(r.side, o.sides),
        hypothetical: r.hypothetical,
        dashed: leg.mode !== 'march',
      })),
  );
  const tokens: TokenDatum[] = [];
  for (const r of o.routes) {
    const pos = positionAt(r.points, o.now);
    // Before its route begins a formation shows only once it exists — from
    // its concentration date (an army deploying), never for one not yet
    // formed (the French 6th and 9th Armies, the Army of Alsace).
    if (pos.phase === 'before' && !existsAt(r.formation, o.now)) continue;
    if (dissolvedBy(r.formation, o.now)) continue;
    // a rail/sea/air leg is a transfer: the token exists on the map only while
    // it is under way. A motor leg is not — the column is on the road, and on
    // the map, before and after it drives.
    if (isTransfer(modeAt(r.legs, o.now)) && pos.phase !== 'moving') continue;
    const approximate = isApproximate(
      confidenceAt(
        r.points.map((p) => p[2]),
        r.confidences,
        o.now,
        r.confidence,
      ),
    );
    tokens.push({
      id: r.formation.id,
      label: approximate
        ? `${APPROX_MARK} ${r.formation.short ?? r.formation.name}`
        : (r.formation.short ?? r.formation.name),
      position: pos.lngLat,
      color: sideColor(r.side, o.sides),
      radius: RADIUS[r.formation.kind] ?? 5,
      phase: pos.phase,
      hypothetical: r.hypothetical,
      approximate,
    });
  }
  const currentTime = (o.now - o.rangeStart) / 1000;
  const ink = tokenColor('--panel');
  const halo = tokenColor('--ink');

  // Label layout against each other (sand-4xz); without a projection every
  // label sits above its token as before.
  const kindOf = new Map(o.routes.map((r) => [r.formation.id, r.formation.kind]));
  const candidates: LabelCandidate[] = tokens.map((t) => ({
    id: t.id,
    text: t.label,
    position: t.position,
    priority: LABEL_PRIORITY[kindOf.get(t.id) ?? 'other'] ?? 3,
    size: 12,
    gap: t.radius + 5,
    radius: t.radius + 2,
  }));
  const placement: ReadonlyMap<string, LabelPlacement> | undefined = o.project
    ? placeLabels(candidates, o.project, [], TOKEN_SLOTS)
    : undefined;
  const labelBoxes = o.project && placement ? occupiedBoxes(candidates, placement, o.project) : [];
  const labelData = placement
    ? tokens.filter((t) => placement.get(t.id)?.visible !== false)
    : tokens;

  const layers: Layer[] = [
    // the whole route, faint — what is still to come
    new PathLayer<RouteDatum, PathStyleExtensionProps<RouteDatum>>({
      id: 'movement-ghost',
      data: routeData,
      getPath: (d) => d.path,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], d.hypothetical ? 70 : 55],
      getWidth: 2,
      widthUnits: 'pixels',
      widthMinPixels: 1.5,
      capRounded: true,
      extensions: [new PathStyleExtension({ dash: true })],
      getDashArray: (d) => DASH[d.mode],
      dashJustified: true,
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
    // The dashed halo of an approximate position (`sand-23b.4`): the token is
    // the middle of a zone, not a pin. Drawn under the token so the token
    // keeps its edge, and in the side's own colour so it reads as part of the
    // token rather than as a warning.
    new IconLayer<TokenDatum>({
      id: 'movement-approx',
      data: tokens.filter((d) => d.approximate),
      getPosition: (d) => d.position,
      getIcon: () => APPROX_HALO_ICON,
      getSize: (d) => haloSize(d.radius * (o.highlight === d.id ? 1.3 : 1)),
      sizeUnits: 'pixels',
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 200],
      pickable: false,
      updateTriggers: { getSize: [o.highlight] },
    }),
    // tokens at "now"
    new ScatterplotLayer<TokenDatum>({
      id: 'movement-tokens',
      data: tokens,
      getPosition: (d) => d.position,
      getRadius: (d) => d.radius * (o.highlight === d.id ? 1.3 : 1),
      radiusUnits: 'pixels',
      // A closed disc is a position the sources give. An approximate one opens
      // — the fill all but empties and the outline, in the side's colour,
      // becomes the token — so the two do not differ by colour alone.
      getFillColor: (d) => {
        const alpha = d.phase === 'before' ? 120 : 255;
        return d.approximate
          ? [d.color[0], d.color[1], d.color[2], Math.round(alpha * 0.22)]
          : alpha === 255
            ? d.color
            : [d.color[0], d.color[1], d.color[2], alpha];
      },
      getLineColor: (d) => (d.approximate ? d.color : ink),
      getLineWidth: (d) => (d.approximate ? 2 : 1.5),
      lineWidthUnits: 'pixels',
      stroked: true,
      pickable: true,
      onClick: (info) => {
        const d = info.object as TokenDatum | undefined;
        if (d) o.onSelect?.(d.id);
      },
      updateTriggers: {
        getRadius: [o.highlight],
        getFillColor: [o.now],
        getLineColor: [o.now],
        getLineWidth: [o.now],
      },
    }),
    new TextLayer<TokenDatum>({
      id: 'movement-labels',
      data: labelData,
      getPosition: (d) => d.position,
      getText: (d) => d.label,
      getSize: 12,
      sizeUnits: 'pixels',
      getColor: () => halo,
      getTextAnchor: (d) => placement?.get(d.id)?.anchor ?? 'middle',
      getAlignmentBaseline: (d) => placement?.get(d.id)?.baseline ?? 'bottom',
      getPixelOffset: (d) => placement?.get(d.id)?.offset ?? [0, -(d.radius + 5)],
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      fontWeight: 600,
      outlineWidth: 3,
      outlineColor: ink,
      fontSettings: { sdf: true },
      characterSet: 'auto',
      pickable: false,
    }),
  ];
  return { layers, labelBoxes };
}
