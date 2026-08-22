/**
 * MapLibre style for the basemap: the Protomaps v4 schema rendered with a
 * muted "staff map" palette in light and dark. Tiles come from our own
 * PMTiles archive in the assets bucket (ADR 0002/0004) — no external API.
 *
 * This is the provisional style; the design-system story (sand-neh.2) makes
 * rivers first-class, adds period-cartography cues, hillshade and the fort
 * symbol, and drives both themes from the token set. The palette below
 * approximates src/styles/tokens.css (MapLibre styles need literal colours).
 */
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { layersWithPartialCustomTheme, type Theme } from 'protomaps-themes-base';

export type MapTheme = 'light' | 'dark';

/** Name of the vector source every basemap layer reads from. */
export const BASEMAP_SOURCE = 'basemap';

/** Default archive: the Western-Europe z≤10 extract (scripts/tiles-extract.sh). */
export const DEFAULT_TILES_URL = '/assets/tiles/western-europe-z10.pmtiles';

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
}

/** A complete MapLibre style: the PMTiles source + themed basemap layers. */
export function buildStyle(opts: BuildStyleOptions = {}): StyleSpecification {
  const theme = opts.theme ?? 'light';
  const tilesUrl = opts.tilesUrl ?? DEFAULT_TILES_URL;
  const layers = layersWithPartialCustomTheme(
    BASEMAP_SOURCE,
    theme,
    MAP_PALETTE[theme],
    opts.lang ?? 'en',
  ) as LayerSpecification[];
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
