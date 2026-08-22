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
}

/** Kinds drawn (dot + label) by default; MapSurface also hides basemap labels near these. */
export const DEFAULT_PLACE_KINDS: Place['kind'][] = ['city', 'town', 'fortress'];
const DEFAULT_KINDS = DEFAULT_PLACE_KINDS;

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
      data,
      getPosition: (d) => d.position,
      getText: (d) => d.name,
      getSize: (d) => (d.city ? 12 : 11),
      sizeUnits: 'pixels',
      getColor: (d) => (d.fortress ? brass : muted),
      getTextAnchor: 'start',
      getAlignmentBaseline: 'center',
      getPixelOffset: (d) => [d.fortress ? 11 : 7, 0],
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
