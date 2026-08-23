/**
 * Places layer — cities and fortresses from the shared registry as quiet
 * reference points under the armies: a dot for towns and cities, a ringed
 * dot for fortresses (the fortress rings and the French fortress line are
 * part of the 1914 argument), labels that stay readable over the basemap.
 * Pure; colours from the design tokens.
 */
import type { Layer } from '@deck.gl/core';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Place } from '../../packs/schema/index.js';
import { tokenColor } from './colors.js';

interface PlaceDatum {
  id: string;
  name: string;
  position: [number, number];
  fortress: boolean;
  city: boolean;
}

export interface PlacesLayerOptions {
  places: Place[];
  /** Only these kinds are drawn (default: cities, towns, fortresses). */
  kinds?: Place['kind'][];
  onSelect?: (placeId: string) => void;
  /**
   * Where each label goes (from `placeLabels`, recomputed on map moves);
   * labels without an entry sit to the right of their dot. Pass
   * `placementKey` so deck re-reads the accessors when it changes.
   */
  placement?: ReadonlyMap<string, LabelPlacement> | undefined;
  placementKey?: string | number | undefined;
}

/** Kinds drawn (dot + label) by default; MapSurface also hides basemap labels near these. */
export const DEFAULT_PLACE_KINDS: Place['kind'][] = ['city', 'town', 'fortress'];
const DEFAULT_KINDS = DEFAULT_PLACE_KINDS;

// ---------------------------------------------------------------- placement

/**
 * Label placement — deck's TextLayer has no collision handling under the
 * interleaved MapLibre overlay (its CollisionFilterExtension culls everything
 * there), so we place the pack's few labels ourselves (sand-320): greedy by
 * priority (city > fortress > town), trying right, left, below and above of
 * the dot in screen space, hiding a label only when no slot is free. Pure:
 * the caller projects lng/lat to pixels (MapLibre's `map.project`).
 */
export interface LabelPlacement {
  anchor: 'start' | 'end' | 'middle';
  baseline: 'center' | 'top' | 'bottom';
  /** Pixel offset from the dot. */
  offset: [number, number];
  visible: boolean;
  /** Screen box the label occupies when visible (for later passes to avoid). */
  box?: Box;
}

export type LabelSlot =
  | 'right'
  | 'left'
  | 'below'
  | 'above'
  | 'upper-right'
  | 'upper-left'
  | 'lower-right'
  | 'lower-left';

export interface LabelCandidate {
  id: string;
  text: string;
  position: [number, number];
  /** Higher wins. */
  priority: number;
  /** Font size in px. */
  size: number;
  /** Gap between dot and text in px (fortress rings need more). */
  gap: number;
  /** Radius of the dot itself in px (an obstacle for every other label); default 4. */
  radius?: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const PAD = 2;
const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 + PAD && a.x1 + PAD > b.x0 && a.y0 < b.y1 + PAD && a.y1 + PAD > b.y0;

/** Rough text extent: IBM Plex Sans at ~0.55em per glyph. */
export const textWidth = (text: string, size: number) => Math.ceil(text.length * size * 0.55) + 2;

const SLOT_DEFS: Record<LabelSlot, Omit<LabelPlacement, 'visible' | 'offset' | 'box'>> = {
  right: { anchor: 'start', baseline: 'center' },
  left: { anchor: 'end', baseline: 'center' },
  below: { anchor: 'middle', baseline: 'top' },
  above: { anchor: 'middle', baseline: 'bottom' },
  'upper-right': { anchor: 'start', baseline: 'bottom' },
  'upper-left': { anchor: 'end', baseline: 'bottom' },
  'lower-right': { anchor: 'start', baseline: 'top' },
  'lower-left': { anchor: 'end', baseline: 'top' },
};
/** Places read best to the right of their dot; tokens carry their label above; diagonals last. */
export const PLACE_SLOTS: LabelSlot[] = [
  'right',
  'left',
  'below',
  'above',
  'upper-right',
  'lower-right',
  'upper-left',
  'lower-left',
];
export const TOKEN_SLOTS: LabelSlot[] = [
  'above',
  'right',
  'left',
  'below',
  'upper-right',
  'upper-left',
  'lower-right',
  'lower-left',
];
/** Diagonal slots sit at gap/√2 on each axis. */
const DIAG = Math.SQRT1_2;

function offsetFor(name: LabelSlot, gap: number): [number, number] {
  const g = gap * DIAG;
  switch (name) {
    case 'right':
      return [gap, 0];
    case 'left':
      return [-gap, 0];
    case 'below':
      return [0, gap];
    case 'above':
      return [0, -gap];
    case 'upper-right':
      return [g, -g];
    case 'upper-left':
      return [-g, -g];
    case 'lower-right':
      return [g, g];
    default:
      return [-g, g];
  }
}

function boxFor(name: LabelSlot, gap: number, w: number, h: number): Box {
  const slot = SLOT_DEFS[name];
  const [dx, dy] = offsetFor(name, gap);
  const x0 = slot.anchor === 'start' ? dx : slot.anchor === 'end' ? dx - w : dx - w / 2;
  const y0 = slot.baseline === 'top' ? dy : slot.baseline === 'bottom' ? dy - h : dy - h / 2;
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}

export function placeLabels(
  items: LabelCandidate[],
  project: (lngLat: [number, number]) => [number, number] | null,
  /** Pixel boxes that labels must also avoid (tokens, other labels). */
  obstacles: Box[] = [],
  slots: LabelSlot[] = PLACE_SLOTS,
): Map<string, LabelPlacement> {
  const out = new Map<string, LabelPlacement>();
  const placed: Box[] = [...obstacles];
  const order = [...items].sort(
    (a, b) => b.priority - a.priority || a.text.localeCompare(b.text) || a.id.localeCompare(b.id),
  );
  // Dots themselves are obstacles for every label (a label must not cover another dot).
  const dots = new Map<string, Box>();
  const px = new Map<string, [number, number]>();
  for (const it of order) {
    const p = project(it.position);
    if (!p) continue;
    px.set(it.id, p);
    const r = it.radius ?? 4;
    dots.set(it.id, { x0: p[0] - r, y0: p[1] - r, x1: p[0] + r, y1: p[1] + r });
  }
  const hidden = (it: LabelCandidate): LabelPlacement => ({
    anchor: 'start',
    baseline: 'center',
    offset: [it.gap, 0],
    visible: false,
  });
  for (const it of order) {
    const p = px.get(it.id);
    if (!p) {
      out.set(it.id, hidden(it));
      continue;
    }
    const w = textWidth(it.text, it.size);
    const h = it.size + 2;
    let chosen: LabelPlacement | undefined;
    for (const name of slots) {
      const slot = SLOT_DEFS[name];
      const rel = boxFor(name, it.gap, w, h);
      const box: Box = {
        x0: p[0] + rel.x0,
        y0: p[1] + rel.y0,
        x1: p[0] + rel.x1,
        y1: p[1] + rel.y1,
      };
      let hitsDot = false;
      for (const [id, d] of dots) {
        if (id !== it.id && overlaps(box, d)) {
          hitsDot = true;
          break;
        }
      }
      if (hitsDot || placed.some((b) => overlaps(box, b))) continue;
      chosen = { ...slot, offset: offsetFor(name, it.gap), visible: true, box };
      placed.push(box);
      break;
    }
    out.set(it.id, chosen ?? hidden(it));
  }
  return out;
}

/** Screen boxes occupied by placed labels and by the dots themselves — obstacles for a later pass. */
export function occupiedBoxes(
  items: LabelCandidate[],
  placement: ReadonlyMap<string, LabelPlacement>,
  project: (lngLat: [number, number]) => [number, number] | null,
): Box[] {
  const out: Box[] = [];
  for (const it of items) {
    const p = project(it.position);
    if (p) {
      const r = it.radius ?? 4;
      out.push({ x0: p[0] - r, y0: p[1] - r, x1: p[0] + r, y1: p[1] + r });
    }
    const pl = placement.get(it.id);
    if (pl?.visible && pl.box) out.push(pl.box);
  }
  return out;
}

/** The label candidates for the drawn places (shared by MapSurface and tests). */
export function placeLabelCandidates(
  places: Place[],
  kinds = DEFAULT_PLACE_KINDS,
): LabelCandidate[] {
  const set = new Set(kinds);
  return places
    .filter((p) => set.has(p.kind))
    .map((p) => ({
      id: p.id,
      text: p.name,
      position: p.lngLat,
      priority: p.kind === 'city' ? 2 : p.kind === 'fortress' ? 1 : 0,
      size: p.kind === 'city' ? 12 : 11,
      gap: p.kind === 'fortress' ? 11 : 7,
    }));
}

export function buildPlacesLayers(o: PlacesLayerOptions): Layer[] {
  const kinds = new Set(o.kinds ?? DEFAULT_KINDS);
  const data: PlaceDatum[] = o.places
    .filter((p) => kinds.has(p.kind))
    .map((p) => ({
      id: p.id,
      name: p.name,
      position: p.lngLat,
      fortress: p.kind === 'fortress',
      city: p.kind === 'city',
    }));
  const ink = tokenColor('--ink');
  const panel = tokenColor('--panel');
  const brass = tokenColor('--brass');
  const muted = tokenColor('--muted');

  return [
    // fortress ring
    new ScatterplotLayer<PlaceDatum>({
      id: 'places-fort-ring',
      data: data.filter((d) => d.fortress),
      getPosition: (d) => d.position,
      getRadius: 7,
      radiusUnits: 'pixels',
      filled: false,
      stroked: true,
      getLineColor: brass,
      getLineWidth: 1.5,
      lineWidthUnits: 'pixels',
      pickable: false,
    }),
    new ScatterplotLayer<PlaceDatum>({
      id: 'places-dots',
      data,
      getPosition: (d) => d.position,
      getRadius: (d) => (d.city ? 3.2 : 2.4),
      radiusUnits: 'pixels',
      getFillColor: (d) => (d.fortress ? brass : ink),
      getLineColor: panel,
      getLineWidth: 1,
      lineWidthUnits: 'pixels',
      stroked: true,
      pickable: true,
      onClick: (info) => {
        const d = info.object as PlaceDatum | undefined;
        if (d) o.onSelect?.(d.id);
      },
    }),
    new TextLayer<PlaceDatum>({
      id: 'places-labels',
      data: o.placement ? data.filter((d) => o.placement!.get(d.id)?.visible !== false) : data,
      getPosition: (d) => d.position,
      getText: (d) => d.name,
      getSize: (d) => (d.city ? 12 : 11),
      sizeUnits: 'pixels',
      getColor: (d) => (d.fortress ? brass : muted),
      getTextAnchor: (d) => o.placement?.get(d.id)?.anchor ?? 'start',
      getAlignmentBaseline: (d) => o.placement?.get(d.id)?.baseline ?? 'center',
      getPixelOffset: (d) => o.placement?.get(d.id)?.offset ?? [d.fortress ? 11 : 7, 0],
      updateTriggers: {
        getTextAnchor: o.placementKey,
        getAlignmentBaseline: o.placementKey,
        getPixelOffset: o.placementKey,
      },
      fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
      fontWeight: 500,
      outlineWidth: 3,
      outlineColor: panel,
      fontSettings: { sdf: true },
      characterSet: 'auto',
      pickable: false,
    }),
  ];
}
