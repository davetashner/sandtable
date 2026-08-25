/**
 * Tally markers (sand-1l0.19): a ring where strength left (or arrived) once
 * the clock has passed the entry — with a short label — so the right wing's
 * bleeding is on the map as well as in the ledger. Pure deck.gl layers.
 */
import type { Layer } from '@deck.gl/core';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Tally } from '../../packs/schema/index.js';
import { tokenColor } from './colors.js';
import { deltaLabel } from '../tally.js';
import { PLACE_SLOTS, type LabelCandidate, type LabelPlacement } from './places.js';

export interface MarkerDatum {
  id: string;
  tallyId: string;
  position: [number, number];
  /** What the marker reads: the delta and its unit. */
  label: string;
  /** What the ledger says happened — "to East Prussia" (sand-pmz.11). */
  entryLabel: string;
  sign: 'minus' | 'plus' | 'zero';
}

export interface TallyLayerOptions {
  tallies: Tally[];
  now: number;
  onSelect?: (tallyId: string) => void;
  /**
   * Screen-space label placement, as for places and tokens (sand-320): a
   * marker sits where an army passed, so its label collides with the army's
   * and with the towns around it unless it joins the same layout pass
   * (sand-1l0.15).
   */
  placement?: ReadonlyMap<string, LabelPlacement> | undefined;
  placementKey?: string | number | undefined;
}

/** The markers visible at `now` — the data behind both layers, and the label candidates. */
export function tallyMarkers(tallies: Tally[], now: number): MarkerDatum[] {
  const data: MarkerDatum[] = [];
  for (const t of tallies) {
    for (const e of t.entries) {
      if (!e.lngLat || Date.parse(e.at) > now) continue;
      data.push({
        id: `${t.id}/${e.id}`,
        tallyId: t.id,
        position: e.lngLat,
        label: `${deltaLabel(e.delta)} ${t.unit === 'corps' && Math.abs(e.delta) === 1 ? 'corps' : t.unit}`,
        entryLabel: e.label,
        sign: e.delta < 0 ? 'minus' : e.delta > 0 ? 'plus' : 'zero',
      });
    }
  }
  return data;
}

/** Label candidates for the markers, for `placeLabels`. The ring is 9px. */
export function tallyLabelCandidates(tallies: Tally[], now: number): LabelCandidate[] {
  return tallyMarkers(tallies, now).map((d) => ({
    id: d.id,
    text: d.label,
    position: d.position,
    priority: 2,
    size: 11,
    gap: 13,
    radius: 10,
  }));
}

export const TALLY_SLOTS = PLACE_SLOTS;

export function buildTallyLayers(o: TallyLayerOptions): Layer[] {
  const data = tallyMarkers(o.tallies, o.now);
  const brass = tokenColor('--brass');
  const panel = tokenColor('--panel');
  const ink = tokenColor('--ink');
  const red = tokenColor('--side-central-1');
  return [
    new ScatterplotLayer<MarkerDatum>({
      id: 'tally-markers',
      data,
      getPosition: (d) => d.position,
      getRadius: 9,
      radiusUnits: 'pixels',
      filled: false,
      stroked: true,
      getLineColor: (d) => (d.sign === 'minus' ? red : brass),
      getLineWidth: 2,
      lineWidthUnits: 'pixels',
      pickable: true,
      onClick: (info) => {
        const d = info.object as MarkerDatum | undefined;
        if (d) o.onSelect?.(d.tallyId);
      },
    }),
    new TextLayer<MarkerDatum>({
      id: 'tally-marker-labels',
      data: o.placement ? data.filter((d) => o.placement!.get(d.id)?.visible !== false) : data,
      getPosition: (d) => d.position,
      getText: (d) => d.label,
      getSize: 11,
      sizeUnits: 'pixels',
      getColor: (d) => (d.sign === 'minus' ? red : ink),
      getTextAnchor: (d) => o.placement?.get(d.id)?.anchor ?? 'start',
      getAlignmentBaseline: (d) => o.placement?.get(d.id)?.baseline ?? 'center',
      getPixelOffset: (d) => o.placement?.get(d.id)?.offset ?? [13, 0],
      updateTriggers: {
        getTextAnchor: o.placementKey,
        getAlignmentBaseline: o.placementKey,
        getPixelOffset: o.placementKey,
      },
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      fontWeight: 600,
      outlineWidth: 3,
      outlineColor: panel,
      fontSettings: { sdf: true },
      characterSet: 'auto',
      pickable: false,
    }),
  ];
}
