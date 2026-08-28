/**
 * MapLibre style for the basemap: the Protomaps v4 schema rendered with a
 * muted "staff map" palette in light and dark. Tiles come from our own
 * PMTiles archive in the assets bucket (ADR 0002/0004) — no external API.
 *
 * The staff-map refinements (sand-neh.2) live in refineLayers(): rivers and
 * their names first-class from campaign zoom, railways visible, modern
 * boundaries/country names/POIs removed (the 1914 borders layer owns them),
 * roads receding at campaign zoom, buildings from z13. Hillshade where the
 * ground decided events (Grand Couronné, Argonne, the Meuse heights) needs a
 * terrain source and is a follow-up; the fort symbol is the ring in
 * layers/places.ts. The palette below approximates src/styles/tokens.css
 * (MapLibre styles need literal colours).
 */
import type { LayerSpecification, StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import { layersWithPartialCustomTheme, type Theme } from 'protomaps-themes-base';
import { tilesUrlFor } from './tiles.js';

export type MapTheme = 'light' | 'dark';

/** Name of the vector source every basemap layer reads from. */
export const BASEMAP_SOURCE = 'basemap';

/**
 * Default archive: the Central-Europe z≤10 extract (scripts/tiles-extract.sh),
 * what a pack that names no `tiles` archive of its own is drawn on.
 *
 * It replaced the narrower western-europe extract (bbox −1.5,46 → 10.5,53), which
 * stopped short of two chapters the pack now carries — Tannenberg in East
 * Prussia and the July Crisis at Sarajevo both fell outside it and drew as an
 * empty field with place labels on the borders layer. PMTiles is range-read, so
 * a wider archive costs storage, not bandwidth: a viewer still fetches only the
 * tiles under the viewport.
 */
export const DEFAULT_TILES_URL = tilesUrlFor();

/** Palette overrides per theme — desaturated land and sea, quiet roads, brass-ish labels. */
export const MAP_PALETTE: Record<MapTheme, Partial<Theme>> = {
  light: {
    background: '#d6ccae', // --sea
    earth: '#e6dfcb', // --land
    water: '#c9bfa4',
    park_a: '#dfd6b8',
    park_b: '#dbd2b4',
    wood_a: '#d9d0b1',
    wood_b: '#d5ccad',
    scrub_a: '#dfd6b8',
    scrub_b: '#dbd2b4',
    glacier: '#ece6d4',
    sand: '#e2d9bd',
    beach: '#e2d9bd',
    buildings: '#d8cfb1',
    boundaries: '#9a8c68',
    railway: '#a0936f',
    minor_a: '#dcd3b6',
    minor_b: '#d9d0b3',
    minor_service: '#dcd3b6',
    link: '#cfc5a6',
    major: '#cbc1a2',
    highway: '#c5bb9c',
    other: '#ddd4b7',
    pier: '#d8cfb1',
    roads_label_minor: '#8a7f62',
    roads_label_minor_halo: '#e6dfcb',
    roads_label_major: '#6b6354',
    roads_label_major_halo: '#e6dfcb',
    ocean_label: '#8c7f60',
    peak_label: '#6b6354',
    subplace_label: '#5a5140',
    subplace_label_halo: '#e6dfcb',
    city_label: '#241f16',
    city_label_halo: '#e6dfcb',
    state_label: '#8c6d28',
    state_label_halo: '#e6dfcb',
    country_label: '#8c6d28',
    waterway_label: '#6c6a5a',
  } as Partial<Theme>,
  dark: {
    background: '#0b1013', // --sea (dark)
    earth: '#1d262c', // --land (dark)
    water: '#10181d',
    park_a: '#1f2a2c',
    park_b: '#1e282a',
    wood_a: '#1e2829',
    wood_b: '#1c2627',
    scrub_a: '#1f2a2c',
    scrub_b: '#1e282a',
    glacier: '#2a3338',
    sand: '#232d31',
    beach: '#232d31',
    buildings: '#242e34',
    boundaries: '#6e6142',
    railway: '#4a4f53',
    minor_a: '#253036',
    minor_b: '#243035',
    minor_service: '#253036',
    link: '#2b373d',
    major: '#2d3a40',
    highway: '#313f46',
    other: '#243035',
    pier: '#242e34',
    roads_label_minor: '#7b7f78',
    roads_label_minor_halo: '#1d262c',
    roads_label_major: '#93998f',
    roads_label_major_halo: '#1d262c',
    ocean_label: '#6e6142',
    peak_label: '#93998f',
    subplace_label: '#b7ae95',
    subplace_label_halo: '#1d262c',
    city_label: '#e9e1cb',
    city_label_halo: '#10161a',
    state_label: '#c9a24b',
    state_label_halo: '#10161a',
    country_label: '#c9a24b',
    waterway_label: '#8ea6b4',
  } as Partial<Theme>,
};

export interface BuildStyleOptions {
  /** `pmtiles://…` URL of the archive. */
  tilesUrl?: string;
  theme?: MapTheme;
  /** Label language (BCP 47). */
  lang?: string;
  /** Glyphs (fonts) for labels; the default Protomaps PBF glyphs. */
  glyphs?: string;
  /**
   * Basemap city/town labels within `suppressRadiusM` of any of these points
   * are dropped — the pack labels those places itself (layers/places.ts draws
   * them with deck.gl, outside MapLibre's collision system, so both labels
   * would otherwise overprint: "Paris" over "Paris"). [lng, lat] pairs.
   */
  suppressLocalityLabelsNear?: ReadonlyArray<readonly [number, number]>;
  /**
   * Radius for `suppressLocalityLabelsNear`, in metres — a number or a zoom
   * expression. Default: roughly 35 screen pixels at every zoom (56 km at z6,
   * halving per zoom level), so a basemap label is hidden only while it would
   * actually sit on top of the pack's label.
   */
  suppressRadiusM?: number | ExpressionSpecification;
}

/** ≈35 px at latitude ~49°: 56 km at z6 → 28 at z7 → 14 at z8 → … → 0.9 km at z12. */
export const DEFAULT_SUPPRESS_RADIUS_M: ExpressionSpecification = [
  'interpolate',
  ['exponential', 0.5],
  ['zoom'],
  6,
  56000,
  12,
  900,
];

/** Basemap layers that label settlements and must yield to the pack's own labels. */
const LOCALITY_LABEL_LAYERS = new Set(['places_locality', 'places_subplace']);

type LegacyFilter = unknown[];
const LEGACY_COMPARATORS = new Set(['==', '!=', '<', '<=', '>', '>=']);

/**
 * Rewrite a legacy (pre-expression) filter — what Protomaps' layers use — into
 * an expression, so it can be combined with expression filters. Expressions
 * pass through unchanged. Covers the forms the basemap uses: comparisons,
 * `in`/`!in`, `has`/`!has`, `all`/`any`/`none`, plus `$type`/`$id`.
 */
export function filterToExpression(filter: unknown): ExpressionSpecification {
  if (!Array.isArray(filter) || filter.length === 0) return ['literal', true];
  const [op, ...rest] = filter as LegacyFilter;
  const key = (k: unknown): ExpressionSpecification =>
    k === '$type' ? ['geometry-type'] : k === '$id' ? ['id'] : ['get', String(k)];
  if (op === 'all' || op === 'any') {
    return [op, ...rest.map(filterToExpression)] as ExpressionSpecification;
  }
  if (op === 'none') {
    return ['!', ['any', ...rest.map(filterToExpression)]] as ExpressionSpecification;
  }
  if (typeof op === 'string' && LEGACY_COMPARATORS.has(op) && typeof rest[0] === 'string') {
    return [op, key(rest[0]), rest[1]] as ExpressionSpecification;
  }
  if ((op === 'in' || op === '!in') && typeof rest[0] === 'string') {
    const test: ExpressionSpecification = [
      'in',
      key(rest[0]),
      ['literal', rest.slice(1)],
    ] as ExpressionSpecification;
    return op === 'in' ? test : ['!', test];
  }
  if ((op === 'has' || op === '!has') && typeof rest[0] === 'string') {
    const test: ExpressionSpecification = ['has', rest[0]];
    return op === 'has' ? test : ['!', test];
  }
  return filter as ExpressionSpecification; // already an expression
}

/**
 * Hide settlement labels near the given points (the pack's labelled places) by
 * adding a `distance` filter, keeping whatever filter the layer already has.
 * Pure; returns new layer objects for the affected layers only.
 */
export function suppressLocalityLabelsNear(
  layers: LayerSpecification[],
  points: ReadonlyArray<readonly [number, number]>,
  radiusM: number | ExpressionSpecification = DEFAULT_SUPPRESS_RADIUS_M,
): LayerSpecification[] {
  if (points.length === 0) return layers;
  const farFromPackPlaces: ExpressionSpecification = [
    '>',
    ['distance', { type: 'MultiPoint', coordinates: points.map((p) => [p[0], p[1]]) }],
    radiusM,
  ];
  return layers.map((l) => {
    if (!LOCALITY_LABEL_LAYERS.has(l.id) || l.type !== 'symbol') return l;
    const filter: ExpressionSpecification = l.filter
      ? ['all', filterToExpression(l.filter), farFromPackPlaces]
      : farFromPackPlaces;
    return { ...l, filter };
  });
}

/** Layers the staff map does without: modern boundaries and country names (the
 *  historical-borders layer owns them), points of interest, house numbers. */
export const DROPPED_LAYERS = new Set([
  'boundaries_country',
  'boundaries',
  'places_country',
  'places_region',
  'pois',
  'address_label',
]);

/**
 * Staff-map refinements over the Protomaps layers (sand-neh.2):
 * rivers and their names are first-class from campaign zoom, railways show
 * from the start (they are the 1914 terrain), modern political layers go,
 * roads recede until you zoom in, buildings wait for z13. Hillshade where the
 * ground decided events needs a terrain source and is a follow-up.
 */
export function refineLayers(layers: LayerSpecification[], theme: MapTheme): LayerSpecification[] {
  const dark = theme === 'dark';
  const river = dark ? '#3f6073' : '#7f9aa8';
  const rail = dark ? '#6e6142' : '#a0936f';
  const out: LayerSpecification[] = [];
  for (const layer of layers) {
    if (DROPPED_LAYERS.has(layer.id)) continue;
    const l = { ...layer } as LayerSpecification & {
      paint?: Record<string, unknown>;
      layout?: Record<string, unknown>;
    };
    switch (l.id) {
      case 'water_river':
        l.minzoom = 6;
        l.paint = {
          ...l.paint,
          'line-color': river,
          'line-width': [
            'interpolate',
            ['exponential', 1.6],
            ['zoom'],
            6,
            0.8,
            9,
            1.6,
            12,
            3.2,
            14,
            5,
          ],
        };
        break;
      case 'water_stream':
        l.minzoom = 11;
        l.paint = {
          ...l.paint,
          'line-color': river,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 14, 1.4],
        };
        break;
      case 'water_waterway_label':
        l.minzoom = 7;
        l.layout = {
          ...l.layout,
          'text-font': ['Noto Sans Italic'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 10, 12, 13, 14],
          'symbol-spacing': 400,
        };
        break;
      case 'roads_rail':
        l.minzoom = 6;
        l.paint = {
          ...l.paint,
          'line-color': rail,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 9, 1, 12, 1.6],
          'line-dasharray': [4, 2],
        };
        break;
      case 'roads_highway':
      case 'roads_major':
      case 'roads_highway_casing_early':
      case 'roads_major_casing_early':
        // modern motorways and trunk roads recede at campaign zoom
        l.paint = {
          ...l.paint,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.25, 9, 0.6, 11, 1],
        };
        break;
      case 'buildings':
        l.minzoom = 13;
        break;
      case 'places_locality':
        l.layout = {
          ...l.layout,
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 8, 13, 12, 16],
        };
        break;
      default:
        break;
    }
    out.push(l);
  }
  return out;
}

/** A complete MapLibre style: the PMTiles source + themed basemap layers. */
export function buildStyle(opts: BuildStyleOptions = {}): StyleSpecification {
  const theme = opts.theme ?? 'light';
  const tilesUrl = opts.tilesUrl ?? DEFAULT_TILES_URL;
  const layers = suppressLocalityLabelsNear(
    refineLayers(
      layersWithPartialCustomTheme(
        BASEMAP_SOURCE,
        theme,
        MAP_PALETTE[theme],
        opts.lang ?? 'en',
      ) as LayerSpecification[],
      theme,
    ),
    opts.suppressLocalityLabelsNear ?? [],
    opts.suppressRadiusM,
  );
  return {
    version: 8,
    name: `sandtable-${theme}`,
    glyphs:
      opts.glyphs ?? 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`,
    sources: {
      [BASEMAP_SOURCE]: {
        type: 'vector',
        url: tilesUrl.startsWith('pmtiles://') ? tilesUrl : `pmtiles://${tilesUrl}`,
        attribution:
          '<a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers,
  };
}

/** Resolve the active theme from the document (data-theme or the OS setting). */
export function detectTheme(
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
): MapTheme {
  const forced = doc?.documentElement.getAttribute('data-theme');
  if (forced === 'dark' || forced === 'light') return forced;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
    return 'dark';
  return 'light';
}
