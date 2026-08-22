/**
 * Historical borders layer: the world polygons for a pack's `borderYear`
 * (content/shared/geo/borders/<year>.geojson, served from the assets bucket),
 * drawn as a quiet fill per power and a stroke that softens for approximate
 * frontiers (BORDERPRECISION 1). Pure helpers + a fetch; MapView mounts them.
 */
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { MapTheme } from './style.js';

export const BORDERS_SOURCE = 'borders';
export const BORDERS_BASE_URL = '/assets/geo/borders';

export const bordersUrl = (year: number, base = BORDERS_BASE_URL) => `${base}/${year}.geojson`;

export interface BordersGeoJSON {
  type: 'FeatureCollection';
  targetYear?: number;
  sourceYear?: number;
  attribution?: string;
  caveat?: string;
  features: unknown[];
}

export async function fetchBorders(year: number, base = BORDERS_BASE_URL): Promise<BordersGeoJSON> {
  const res = await fetch(bordersUrl(year, base));
  if (!res.ok) throw new Error(`borders ${year}: HTTP ${res.status}`);
  return (await res.json()) as BordersGeoJSON;
}

/** A stable, quiet fill per power name — same name, same hue, in either theme. */
export function powerHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function bordersLayers(
  theme: MapTheme,
): [FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification] {
  const dark = theme === 'dark';
  const fill: FillLayerSpecification = {
    id: 'borders-fill',
    type: 'fill',
    source: BORDERS_SOURCE,
    paint: {
      // hue from the power's name; washed out so the basemap shows through
      'fill-color': [
        'let',
        'h',
        ['%', ['to-number', ['coalesce', ['get', 'hue'], 0]], 360],
        dark
          ? ['concat', 'hsl(', ['to-string', ['var', 'h']], ', 22%, 24%)']
          : ['concat', 'hsl(', ['to-string', ['var', 'h']], ', 28%, 78%)'],
      ],
      'fill-opacity': dark ? 0.45 : 0.38,
    },
  };
  const line: LineLayerSpecification = {
    id: 'borders-line',
    type: 'line',
    source: BORDERS_SOURCE,
    layout: { 'line-join': 'round' },
    paint: {
      'line-color': dark ? '#c9a24b' : '#8c6d28', // --brass
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 7, 1.4, 10, 2.2],
      'line-opacity': [
        'case',
        ['==', ['to-number', ['coalesce', ['get', 'BORDERPRECISION'], 2]], 1],
        0.45,
        0.85,
      ],
      'line-dasharray': [2, 1.5],
    },
  };
  const label: SymbolLayerSpecification = {
    id: 'borders-label',
    type: 'symbol',
    source: BORDERS_SOURCE,
    minzoom: 3,
    maxzoom: 8,
    layout: {
      'text-field': ['coalesce', ['get', 'NAME'], ''],
      'text-font': ['Noto Sans Italic'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 7, 15],
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.12,
      'text-padding': 24,
    },
    paint: {
      'text-color': dark ? '#c9a24b' : '#8c6d28',
      'text-halo-color': dark ? '#10161a' : '#e6dfcb',
      'text-halo-width': 1.2,
      'text-opacity': 0.8,
    },
  };
  return [fill, line, label];
}

/**
 * Pre-compute the per-power hue on each feature so the fill expression stays
 * cheap. Mutates and returns the collection.
 */
export function decorateBorders(geo: BordersGeoJSON): BordersGeoJSON {
  for (const f of geo.features as { properties?: Record<string, unknown> }[]) {
    const props = (f.properties ??= {});
    const power = String(props['SUBJECTO'] ?? props['NAME'] ?? '');
    props['hue'] = power ? powerHue(power) : 0;
  }
  return geo;
}
