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
}

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
}

interface Box {
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

const SLOTS: Omit<LabelPlacement, 'visible' | 'offset'>[] = [
  { anchor: 'start', baseline: 'center' },
  { anchor: 'end', baseline: 'center' },
  { anchor: 'middle', baseline: 'top' },
  { anchor: 'middle', baseline: 'bottom' },
];

function boxFor(slot: (typeof SLOTS)[number], gap: number, w: number, h: number): Box {
  switch (slot.anchor) {
    case 'start':
      return { x0: gap, y0: -h / 2, x1: gap + w, y1: h / 2 };
    case 'end':
      return { x0: -gap - w, y0: -h / 2, x1: -gap, y1: h / 2 };
    default:
      return slot.baseline === 'top'
        ? { x0: -w / 2, y0: gap, x1: w / 2, y1: gap + h }
        : { x0: -w / 2, y0: -gap - h, x1: w / 2, y1: -gap };
  }
}

export function placeLabels(
  items: LabelCandidate[],
  project: (lngLat: [number, number]) => [number, number] | null,
  /** Pixel boxes that labels must also avoid (tokens, other labels). */
  obstacles: Box[] = [],
): Map<string, LabelPlacement> {
  const out = new Map<string, LabelPlacement>();
  const placed: Box[] = [...obstacles];
  const order = [...items].sort(
    (a, b) => b.priority - a.priority || a.text.localeCompare(b.text) || a.id.localeCompare(b.id),
  );
  // Dots themselves are obstacles for every label (a label must not cover another dot).
  const dots: Box[] = [];
  const px = new Map<string, [number, number]>();
  for (const it of order) {
    const p = project(it.position);
    if (!p) continue;
    px.set(it.id, p);
    dots.push({ x0: p[0] - 4, y0: p[1] - 4, x1: p[0] + 4, y1: p[1] + 4 });
  }
  for (const it of order) {
    const p = px.get(it.id);
    if (!p) {
      out.set(it.id, { anchor: 'start', baseline: 'center', offset: [it.gap, 0], visible: false });
      continue;
    }
    const w = textWidth(it.text, it.size);
    const h = it.size + 2;
    let chosen: LabelPlacement | undefined;
    for (const slot of SLOTS) {
      const rel = boxFor(slot, it.gap, w, h);
      const box: Box = {
        x0: p[0] + rel.x0,
        y0: p[1] + rel.y0,
        x1: p[0] + rel.x1,
        y1: p[1] + rel.y1,
      };
      const hitsDot = dots.some(
        (d) => !(d.x0 === p[0] - 4 && d.y0 === p[1] - 4) && overlaps(box, d),
      );
      if (hitsDot || placed.some((b) => overlaps(box, b))) continue;
      const offset: [number, number] =
        slot.anchor === 'start'
          ? [it.gap, 0]
          : slot.anchor === 'end'
            ? [-it.gap, 0]
            : slot.baseline === 'top'
              ? [0, it.gap]
              : [0, -it.gap];
      chosen = { ...slot, offset, visible: true };
      placed.push(box);
      break;
    }
    out.set(
      it.id,
      chosen ?? { anchor: 'start', baseline: 'center', offset: [it.gap, 0], visible: false },
    );
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
