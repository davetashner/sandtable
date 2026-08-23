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

interface MarkerDatum {
  id: string;
  tallyId: string;
  position: [number, number];
  label: string;
  sign: 'minus' | 'plus' | 'zero';
}

export interface TallyLayerOptions {
  tallies: Tally[];
  now: number;
  onSelect?: (tallyId: string) => void;
}

export function buildTallyLayers(o: TallyLayerOptions): Layer[] {
  const data: MarkerDatum[] = [];
  for (const t of o.tallies) {
    for (const e of t.entries) {
      if (!e.lngLat || Date.parse(e.at) > o.now) continue;
      data.push({
        id: `${t.id}/${e.id}`,
        tallyId: t.id,
        position: e.lngLat,
        label: `${deltaLabel(e.delta)} ${t.unit === 'corps' && Math.abs(e.delta) === 1 ? 'corps' : t.unit}`,
        sign: e.delta < 0 ? 'minus' : e.delta > 0 ? 'plus' : 'zero',
      });
    }
  }
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
      data,
      getPosition: (d) => d.position,
      getText: (d) => d.label,
      getSize: 11,
      sizeUnits: 'pixels',
      getColor: (d) => (d.sign === 'minus' ? red : ink),
      getTextAnchor: 'start',
      getAlignmentBaseline: 'center',
      getPixelOffset: [13, 0],
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
