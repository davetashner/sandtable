import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUPPRESS_RADIUS_M,
  filterToExpression,
  BASEMAP_SOURCE,
  buildStyle,
  DEFAULT_TILES_URL,
  detectTheme,
  DROPPED_LAYERS,
  MAP_PALETTE,
} from './style.js';

describe('filterToExpression', () => {
  it('rewrites legacy filters into expressions and passes expressions through', () => {
    expect(filterToExpression(['==', 'kind', 'locality'])).toEqual([
      '==',
      ['get', 'kind'],
      'locality',
    ]);
    expect(filterToExpression(['in', 'kind', 'a', 'b'])).toEqual([
      'in',
      ['get', 'kind'],
      ['literal', ['a', 'b']],
    ]);
    expect(filterToExpression(['!in', '$type', 'Point'])).toEqual([
      '!',
      ['in', ['geometry-type'], ['literal', ['Point']]],
    ]);
    expect(
      filterToExpression(['all', ['has', 'name'], ['!has', 'x'], ['>=', 'pmap:rank', 2]]),
    ).toEqual(['all', ['has', 'name'], ['!', ['has', 'x']], ['>=', ['get', 'pmap:rank'], 2]]);
    expect(filterToExpression(['none', ['==', '$id', 1]])).toEqual([
      '!',
      ['any', ['==', ['id'], 1]],
    ]);
    const expr = ['==', ['get', 'kind'], 'locality'];
    expect(filterToExpression(expr)).toBe(expr);
    expect(filterToExpression(undefined)).toEqual(['literal', true]);
  });
});

describe('buildStyle', () => {
  it('drops basemap settlement labels near the places the pack labels itself (sand-3uq)', () => {
    const filterOf = (l: object | undefined) =>
      (l as { filter?: unknown } | undefined)?.filter ?? null;
    const plain = buildStyle();
    const locality = plain.layers.find((l) => l.id === 'places_locality');
    expect(locality).toBeDefined();
    expect(JSON.stringify(filterOf(locality))).not.toContain('distance');

    const paris: [number, number] = [2.3522, 48.8566];
    const style = buildStyle({ suppressLocalityLabelsNear: [paris] });
    const filter = filterOf(style.layers.find((l) => l.id === 'places_locality')) as unknown[];
    // existing filter kept — as an expression, legacy syntax can't mix — and
    // the distance test appended (zoom-dependent radius by default)
    expect(filter[0]).toBe('all');
    expect(filter[1]).toEqual(['==', ['get', 'kind'], 'locality']);
    expect(filter[filter.length - 1]).toEqual([
      '>',
      ['distance', { type: 'MultiPoint', coordinates: [paris] }],
      DEFAULT_SUPPRESS_RADIUS_M,
    ]);
    const fixed = buildStyle({ suppressLocalityLabelsNear: [paris], suppressRadiusM: 5000 });
    const fixedFilter = filterOf(fixed.layers.find((l) => l.id === 'places_locality')) as unknown[];
    expect(fixedFilter[fixedFilter.length - 1]).toEqual([
      '>',
      ['distance', { type: 'MultiPoint', coordinates: [paris] }],
      5000,
    ]);
    // other symbol layers untouched
    const other = style.layers.filter((l) => l.type === 'symbol' && !/^places_/.test(l.id));
    expect(other.every((l) => !JSON.stringify(filterOf(l)).includes('distance'))).toBe(true);
    // no points → no change
    expect(buildStyle({ suppressLocalityLabelsNear: [] }).layers).toEqual(plain.layers);
  });

  it('builds a v8 style with our PMTiles source and themed basemap layers', () => {
    const style = buildStyle();
    expect(style.version).toBe(8);
    const src = style.sources[BASEMAP_SOURCE] as { type: string; url: string; attribution: string };
    expect(src.type).toBe('vector');
    expect(src.url).toBe(`pmtiles://${DEFAULT_TILES_URL}`);
    expect(src.attribution).toMatch(/OpenStreetMap/);
    expect(style.layers.length).toBeGreaterThan(30);
    expect(
      style.layers.every(
        (l) => l.type === 'background' || (l as { source?: string }).source === BASEMAP_SOURCE,
      ),
    ).toBe(true);
    const bg = style.layers.find((l) => l.type === 'background') as {
      paint: { 'background-color': string };
    };
    expect(bg.paint['background-color']).toBe(MAP_PALETTE.light.background);
  });

  it('switches palette with the theme and accepts a custom archive', () => {
    const dark = buildStyle({ theme: 'dark', tilesUrl: 'https://example.org/tiles/x.pmtiles' });
    const bg = dark.layers.find((l) => l.type === 'background') as {
      paint: { 'background-color': string };
    };
    expect(bg.paint['background-color']).toBe(MAP_PALETTE.dark.background);
    expect((dark.sources[BASEMAP_SOURCE] as { url: string }).url).toBe(
      'pmtiles://https://example.org/tiles/x.pmtiles',
    );
  });

  it('detects the theme from data-theme, else the OS setting', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(detectTheme()).toBe('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    expect(detectTheme()).toBe('light');
    document.documentElement.removeAttribute('data-theme');
    expect(['light', 'dark']).toContain(detectTheme());
  });

  it('refines the basemap into a staff map: rivers and rails early, modern political layers gone', () => {
    const style = buildStyle();
    const ids = new Set(style.layers.map((l) => l.id));
    for (const dropped of DROPPED_LAYERS) expect(ids.has(dropped)).toBe(false);
    const river = style.layers.find((l) => l.id === 'water_river')!;
    expect(river.minzoom).toBe(6);
    const rail = style.layers.find((l) => l.id === 'roads_rail')!;
    expect(rail.minzoom).toBe(6);
    expect((rail as { paint: { 'line-dasharray': number[] } }).paint['line-dasharray']).toEqual([
      4, 2,
    ]);
    const label = style.layers.find((l) => l.id === 'water_waterway_label')!;
    expect(label.minzoom).toBe(7);
    expect(style.layers.find((l) => l.id === 'buildings')!.minzoom).toBe(13);
    expect(style.layers.find((l) => l.id === 'places_locality')).toBeDefined();
  });
});
