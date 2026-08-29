/**
 * Historical borders layer: the world polygons for a pack's `borderYear`
 * (content/shared/geo/borders/<year>.geojson, served from the assets bucket),
 * drawn as a quiet fill per power and a stroke that softens for approximate
 * frontiers (BORDERPRECISION 1). Pure helpers + a fetch; MapView mounts them.
 */
import type {
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { MapTheme } from './style.js';

export const BORDERS_SOURCE = 'borders';

/**
 * The narrowest declared region, in degrees of longitude, that these borders
 * are evidence for (`sand-neh.32`).
 *
 * The dataset is world/continent scale and its own README says so: it is
 * simplified to 12% (50% for the Pacific years), "borders are basin-scale
 * context in the Pacific; the islands come from the tiles", and "battle
 * zoom-ins draw their own detail". Nothing enforced that, so the fill and the
 * stroke went on drawing at zoom-in scale — where the basemap draws the real
 * coastline beside them and the disagreement is the width of an island.
 * Reported on the 1941 Oahu view, where the territory polygon is a hexagon
 * offset into open water with Honolulu on its corner: seven vertices whose
 * east edge stops at −157.84 against a real coast at about −157.65.
 *
 * The threshold is on the **declared region**, not on the viewport's zoom,
 * and that is the point. Measured, the same Oahu view sits at z8.9 on a phone
 * and z10.6 on a desktop, while the July Crisis chapter — where the borders
 * are the entire subject — sits at z8.0. There is no zoom that separates
 * those. The declared regions separate cleanly and identically on both:
 *
 *   zoom-ins   Petrograd 0.20°, Liège 0.53°, Ypres 0.65°, Oahu 0.80°,
 *              Kronstadt 1.30°, … Marne 2.40°
 *   chapters   July Crisis 4.00°, Brest-Litovsk 4.50°, Tannenberg 4.80°,
 *              Origins 6.70°, the other openings 69°
 *
 * A gap from 2.40° to 4.00°, so 3° sits in the middle of it. Judging the
 * content by the content also means a phone and a desktop show the same map.
 */
export const BORDERS_MIN_SPAN_DEG = 3;

/**
 * Whether the borders are evidence for the region on screen. `undefined` is
 * the campaign view, which always is.
 */
export function bordersMeaningful(focusSpanDeg: number | undefined): boolean {
  return focusSpanDeg === undefined || focusSpanDeg >= BORDERS_MIN_SPAN_DEG;
}
/**
 * A ring this small is an island or an enclave, not a frontier (`sand-neh.34`).
 *
 * `sand-neh.32` gated the layer on the DECLARED region and fixed the zoom-in
 * path. It left the hand-zoom backstop at z9.5, and on the campaign view —
 * where there is no declared region and `bordersMeaningful` is true by design —
 * a reader who zooms to Oahu lands at about z8.9 and gets the whole defect
 * back: a seven-vertex hexagon whose east edge stops at -157.84 against a real
 * coast near -157.65, with Honolulu on its corner.
 *
 * The rule has to be geometric rather than per-pack. Keying it to the arc or
 * the border year would tune it to the one Pacific pack that exists today and
 * misfire on Mukden, whose subject IS a frontier — the restate-and-drift shape
 * `sand-pmz.37` exists to stop. What actually separates the two cases is the
 * ring:
 *
 *   - A small ring traces a COAST, and the basemap draws that same coast from
 *     tile data at full precision right beside it. The disagreement is visible
 *     because the truth is on screen next to the approximation.
 *   - A large ring is a land frontier. Nothing else on the map draws it, so
 *     there is nothing for it to disagree with, and it stays evidence.
 *
 * Measured on the real data: Oahu's rings span 0.42-0.81 deg, every 1914
 * European power spans well past 2, and the 1914 rings under 2 deg are the
 * small islands and enclaves with exactly the same defect. So the threshold
 * does not need to know which war it is looking at.
 */
export const BORDERS_ISLAND_MAX_SPAN_DEG = 2;

/**
 * Where the island rings fade. Well below the z8.9 that provoked this, and
 * well above the basin-scale campaign views (1941 opens at z2.6) where a
 * territory shaded across the Pacific is the whole point.
 */
export const BORDERS_ISLAND_FADE = [6.5, 7.5] as const;

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
): [
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
] {
  const dark = theme === 'dark';
  const isFrontier: FilterSpecification = [
    '>=',
    ['to-number', ['coalesce', ['get', 'spanDeg'], 0]],
    BORDERS_ISLAND_MAX_SPAN_DEG,
  ];
  const isIsland: FilterSpecification = [
    '<',
    ['to-number', ['coalesce', ['get', 'spanDeg'], 0]],
    BORDERS_ISLAND_MAX_SPAN_DEG,
  ];
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
      // The backstop for a reader who zooms in by hand from a campaign view,
      // where no declared region is narrow enough to have turned the layer off.
      // Measured, the deepest declared chapter is z8.0, so a fade that begins
      // at 9.5 cannot touch one.
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9.5, dark ? 0.45 : 0.38, 10.5, 0],
    },
    filter: isFrontier,
    maxzoom: 10.5,
  };
  const line: LineLayerSpecification = {
    id: 'borders-line',
    type: 'line',
    source: BORDERS_SOURCE,
    layout: { 'line-join': 'round' },
    paint: {
      'line-color': dark ? '#c9a24b' : '#8c6d28', // --brass
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 7, 1.4, 10, 2.2],
      // The zoom fade has to BE the top-level expression, with the precision
      // case in its stops. MapLibre allows `zoom` only as the direct input of
      // a top-level `step` or `interpolate`, so wrapping the fade in a `*`
      // alongside the case — which is how this was first written — makes the
      // whole layer invalid and MapLibre drops it. The stroke then draws at no
      // zoom at all: a total failure of the layer, reported as one warning.
      'line-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        9.5,
        ['case', ['==', ['to-number', ['coalesce', ['get', 'BORDERPRECISION'], 2]], 1], 0.45, 0.85],
        10.5,
        0,
      ],
      'line-dasharray': [2, 1.5],
    },
    filter: isFrontier,
    maxzoom: 10.5,
  };
  const label: SymbolLayerSpecification = {
    id: 'borders-label',
    type: 'symbol',
    source: BORDERS_SOURCE,
    filter: ['==', ['get', 'labelRing'], true],
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
  const [fadeIn, fadeOut] = BORDERS_ISLAND_FADE;
  const islandFill: FillLayerSpecification = {
    ...fill,
    id: 'borders-island-fill',
    paint: {
      ...fill.paint,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], fadeIn, dark ? 0.45 : 0.38, fadeOut, 0],
    },
    filter: isIsland,
    maxzoom: fadeOut,
  };
  const islandLine: LineLayerSpecification = {
    ...line,
    id: 'borders-island-line',
    paint: {
      ...line.paint,
      // Same shape as the frontier fade and for the same reason: `zoom` is
      // legal only as the direct input of a top-level `step` or `interpolate`
      // (`sand-neh.33`), so the precision case stays inside the stops.
      'line-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        fadeIn,
        ['case', ['==', ['to-number', ['coalesce', ['get', 'BORDERPRECISION'], 2]], 1], 0.45, 0.85],
        fadeOut,
        0,
      ],
    },
    filter: isIsland,
    maxzoom: fadeOut,
  };
  return [fill, line, label, islandFill, islandLine];
}

/**
 * The slice of MapLibre's map this module touches — the same narrow interface
 * the front line uses, for the same reason (sand-pmz.26): mounting a source
 * with its layers is ordinary logic, and inside a React effect it could only
 * be exercised by rendering a component.
 */
export interface BordersHost {
  getSource(id: string): unknown;
  setLayoutProperty?(id: string, name: string, value: unknown): void;
  addSource(id: string, spec: unknown): void;
  removeSource(id: string): void;
  getLayer(id: string): unknown;
  addLayer(layer: { id: string; type: string }, before?: string): void;
  removeLayer(id: string): void;
  getStyle(): { layers: { id: string; type: string }[] };
}

/**
 * Put the year's borders on the map, replacing them if they are already there
 * — which is what a theme change needs, since the layer paint is baked in.
 */
export function mountBorders(map: BordersHost, geo: BordersGeoJSON, theme: MapTheme): void {
  const layers = bordersLayers(theme);
  if (map.getSource(BORDERS_SOURCE)) {
    for (const l of layers) if (map.getLayer(l.id)) map.removeLayer(l.id);
    map.removeSource(BORDERS_SOURCE);
  }
  map.addSource(BORDERS_SOURCE, {
    type: 'geojson',
    data: decorateBorders(geo),
    attribution: geo.attribution ?? '',
  });
  // Sit below the first label layer so place names stay readable.
  const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  for (const l of layers) map.addLayer(l, l.type === 'symbol' ? undefined : firstSymbol);
}

/**
 * Show or hide the borders without unmounting them, so the reader crossing
 * into a zoom-in and back does not pay a re-parse of the world each way
 * (`sand-neh.32`).
 */
export function showBorders(map: BordersHost, visible: boolean): void {
  if (!map.setLayoutProperty) return;
  // Asked of the layer builder rather than restated here. This list grew from
  // three to five with the island rings (`sand-neh.34`), and a hardcoded copy
  // that missed them would leave the hexagon on screen inside a zoom-in — the
  // exact bug, one layer down. Ids do not depend on the theme.
  for (const id of bordersLayers('dark').map((l) => l.id)) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
}

interface RingFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}

/** The longer side of a ring's bounding box, in degrees, corrected for latitude. */
export function ringSpanDeg(ring: number[][]): number {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring as [number, number][]) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return 0;
  const midLat = ((minY + maxY) / 2) * (Math.PI / 180);
  return Math.max((maxX - minX) * Math.cos(midLat), maxY - minY);
}

/**
 * Pre-compute the per-power hue, and split every MultiPolygon into one feature
 * per polygon carrying its own `spanDeg` (`sand-neh.34`).
 *
 * The split is what makes the island rule expressible at all. MapLibre styles a
 * FEATURE, and in this dataset the United States is a single MultiPolygon
 * holding the continental land mass, Alaska and every Pacific island at once —
 * so no feature-level filter can reach Oahu without also reaching Montana.
 * One feature per polygon can be filtered on its own size.
 *
 * `labelRing` marks the largest polygon of each original feature, so exploding
 * the geometry does not multiply the labels: the United States is named once,
 * on the continental ring, exactly as before.
 */
export function decorateBorders(geo: BordersGeoJSON): BordersGeoJSON {
  const out: RingFeature[] = [];
  for (const f of geo.features as {
    properties?: Record<string, unknown>;
    geometry?: { type?: string; coordinates?: unknown };
  }[]) {
    const props = (f.properties ??= {});
    const power = String(props['SUBJECTO'] ?? props['NAME'] ?? '');
    props['hue'] = power ? powerHue(power) : 0;
    const g = f.geometry;
    const polys: number[][][][] =
      g?.type === 'MultiPolygon'
        ? (g.coordinates as number[][][][])
        : g?.type === 'Polygon'
          ? [g.coordinates as number[][][]]
          : [];
    if (polys.length === 0) {
      // Nothing to split and nothing to draw, but decorating must not lose a
      // feature: pass it through with a span that classifies it as an island,
      // which is the side that stops drawing first.
      out.push({
        type: 'Feature',
        properties: { ...props, spanDeg: 0, labelRing: true },
        geometry: { type: 'Polygon', coordinates: [] },
      });
      continue;
    }
    let biggest = out.length;
    let biggestSpan = -1;
    for (const poly of polys) {
      const span = ringSpanDeg(poly[0] ?? []);
      if (span > biggestSpan) {
        biggestSpan = span;
        biggest = out.length;
      }
      out.push({
        type: 'Feature',
        properties: { ...props, spanDeg: span, labelRing: false },
        geometry: { type: 'Polygon', coordinates: poly },
      });
    }
    const winner = out[biggest];
    if (winner) winner.properties['labelRing'] = true;
  }
  geo.features = out;
  return geo;
}
