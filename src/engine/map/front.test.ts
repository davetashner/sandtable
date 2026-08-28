/**
 * The front-line layer: picking the snapshot the clock is in, and the layer
 * specs that draw it (sand-g80.1).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  FRONT_LAYER_IDS,
  FRONT_SOURCE,
  fetchFront,
  frontLayers,
  frontUrl,
  only,
  snapshotAt,
  type FrontFeature,
  type FrontGeoJSON,
} from './front.js';

const at = (date: string) => Date.parse(`${date}T00:00:00Z`);

const feature = (date: string, precision: 'high' | 'medium' | 'low' = 'medium'): FrontFeature => ({
  type: 'Feature',
  id: `front:${date}`,
  properties: {
    date,
    at: at(date),
    label: date,
    precision,
    summary: '',
    sources: [{ source: 'source:stevenson-2004' }],
    through: ['Nieuwpoort', 'Pfetterhouse'],
    lengthKm: 700,
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [2.75, 51.13],
      [7.147, 47.503],
    ],
  },
});

const geo: FrontGeoJSON = {
  type: 'FeatureCollection',
  features: ['1914-11-25', '1916-07-11', '1917-04-05', '1918-11-11'].map((d) => feature(d)),
};

afterEach(() => vi.unstubAllGlobals());

describe('snapshotAt', () => {
  it('draws nothing before the first snapshot — there was no continuous front', () => {
    expect(snapshotAt(geo, at('1914-08-02'))).toBeUndefined();
    expect(snapshotAt(geo, at('1914-11-24'))).toBeUndefined();
  });

  it('takes the snapshot in force: the latest one at or before the instant', () => {
    expect(snapshotAt(geo, at('1914-11-25'))!.properties.date).toBe('1914-11-25');
    expect(snapshotAt(geo, at('1915-06-01'))!.properties.date).toBe('1914-11-25');
    expect(snapshotAt(geo, at('1916-07-11'))!.properties.date).toBe('1916-07-11');
    expect(snapshotAt(geo, at('1917-01-01'))!.properties.date).toBe('1916-07-11');
  });

  it('holds the last snapshot after the Armistice', () => {
    expect(snapshotAt(geo, at('1919-06-28'))!.properties.date).toBe('1918-11-11');
  });

  it('is empty for an empty series', () => {
    expect(
      snapshotAt({ type: 'FeatureCollection', features: [] }, at('1916-01-01')),
    ).toBeUndefined();
  });
});

describe('only', () => {
  it('wraps one snapshot as the collection the map source holds', () => {
    expect(only(geo.features[1])).toEqual({
      type: 'FeatureCollection',
      features: [geo.features[1]],
    });
  });

  it('is an empty collection when there is no snapshot yet', () => {
    expect(only(undefined).features).toEqual([]);
  });
});

describe('frontUrl / fetchFront', () => {
  it('addresses the series by name under the assets bucket', () => {
    expect(frontUrl('western-front')).toBe('/assets/geo/front/western-front.geojson');
    expect(frontUrl('western-front', '/stub')).toBe('/stub/western-front.geojson');
  });

  it('names the series in the error when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchFront('western-front')).rejects.toThrow(/western-front: HTTP 404/);
  });
});

describe('frontLayers', () => {
  it('mounts exactly the layers it tears down, all on the one source', () => {
    for (const theme of ['light', 'dark'] as const) {
      const layers = frontLayers(theme);
      expect(layers.map((l) => l.id)).toEqual([...FRONT_LAYER_IDS]);
      for (const l of layers) expect(l.source).toBe(FRONT_SOURCE);
    }
  });

  it('shades the two sides in opposite directions, oxblood east and slate west', () => {
    const layers = frontLayers('dark');
    const central = layers.find((l) => l.id === 'front-wash-central')!;
    const entente = layers.find((l) => l.id === 'front-wash-entente')!;
    // north-to-south geometry: a negative line-offset is the eastern side
    const offsetAt = (l: (typeof layers)[number]) =>
      (l.paint!['line-offset'] as unknown as unknown[]).at(-1) as number;
    expect(offsetAt(central)).toBeLessThan(0);
    expect(offsetAt(entente)).toBeGreaterThan(0);
    expect(central.paint!['line-color']).not.toBe(entente.paint!['line-color']);
  });

  it('draws a loosely-fixed snapshot dashed and the rest solid', () => {
    const layers = frontLayers('light');
    const solid = layers.find((l) => l.id === 'front-line')!;
    const dashed = layers.find((l) => l.id === 'front-line-approx')!;
    expect(solid.filter).toEqual(['!=', ['get', 'precision'], 'low']);
    expect(dashed.filter).toEqual(['==', ['get', 'precision'], 'low']);
    expect(solid.paint!['line-dasharray']).toBeUndefined();
    expect(dashed.paint!['line-dasharray']).toEqual([3, 2]);
  });

  it('uses different ink in the two themes', () => {
    expect(frontLayers('light').find((l) => l.id === 'front-line')!.paint!['line-color']).not.toBe(
      frontLayers('dark').find((l) => l.id === 'front-line')!.paint!['line-color'],
    );
  });
});
