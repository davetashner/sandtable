import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createPropertyExpression,
  featureFilter,
  v8,
  validateStyleMin,
} from '@maplibre/maplibre-gl-style-spec';
import {
  BORDERS_ISLAND_FADE,
  BORDERS_ISLAND_MAX_SPAN_DEG,
  BORDERS_MIN_SPAN_DEG,
  bordersLayers,
  bordersMeaningful,
  bordersUrl,
  decorateBorders,
  powerHue,
  ringSpanDeg,
  showBorders,
  type BordersGeoJSON,
} from './borders.js';
import { lngSpan, type Box } from '../geo.js';

describe('borders', () => {
  it('builds the URL for a year', () => {
    expect(bordersUrl(1914)).toBe('/assets/geo/borders/1914.geojson');
  });

  it('hashes powers to stable hues and decorates features', () => {
    expect(powerHue('German Empire')).toBe(powerHue('German Empire'));
    expect(powerHue('German Empire')).not.toBe(powerHue('France'));
    const geo: BordersGeoJSON = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { NAME: 'Alsace-Lorraine', SUBJECTO: 'German Empire' } },
        { type: 'Feature', properties: null },
      ],
    };
    decorateBorders(geo);
    const [a, b] = geo.features as { properties: Record<string, unknown> }[];
    expect(a!.properties['hue']).toBe(powerHue('German Empire'));
    expect(b!.properties['hue']).toBe(0);
  });

  it('emits fill, line and label layers on the borders source in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      const [fill, line, label] = bordersLayers(theme);
      expect(fill.type).toBe('fill');
      expect(line.type).toBe('line');
      expect(label.type).toBe('symbol');
      expect([fill.source, line.source, label.source]).toEqual(['borders', 'borders', 'borders']);
    }
  });

  describe('the scale they are evidence for (sand-neh.32)', () => {
    it('draws at campaign scale, where there is no focused region', () => {
      expect(bordersMeaningful(undefined)).toBe(true);
    });

    it('does not draw for a zoom-in narrower than the data can speak to', () => {
      expect(bordersMeaningful(0.8)).toBe(false); // Oahu
      expect(bordersMeaningful(2.4)).toBe(false); // the Marne
      expect(bordersMeaningful(BORDERS_MIN_SPAN_DEG)).toBe(true);
    });

    it('keeps them for the chapters whose subject they are', () => {
      // The July Crisis is a map of empires; hiding the borders there would
      // remove the point of the chapter.
      expect(bordersMeaningful(4.0)).toBe(true);
    });

    it('splits every declared region in the packs on the right side', () => {
      // The threshold is only worth what the content says. Read the real
      // regions rather than restating them, so a new pack that lands between
      // the two groups fails here rather than in someone's screenshot.
      const eras = [
        '1914-schlieffen-marne',
        '1941-pearl-harbor',
        '1917-russian-revolution',
        '1918-russian-civil-war',
      ];
      const zoomIns: string[] = [];
      const chapters: string[] = [];
      for (const era of eras) {
        const battles = JSON.parse(readFileSync(`content/eras/${era}/battles.json`, 'utf8')) as {
          id: string;
          region?: Box;
        }[];
        for (const b of battles) {
          if (!b.region) continue;
          (bordersMeaningful(lngSpan(b.region)) ? chapters : zoomIns).push(b.id);
        }
      }
      // Every assault-scale level is off; nothing wider than the July Crisis is.
      expect(zoomIns).toContain('1941-pearl-harbor:oahu');
      expect(zoomIns).toContain('1914:liege');
      expect(zoomIns).toContain('1914:marne');
      expect(zoomIns).toContain('1917-russian-revolution:october-petrograd');
      expect(chapters).toContain('1914:july-crisis');
      expect(chapters).toContain('1914:origins');
      expect(chapters).toContain('1918-russian-civil-war:brest-litovsk');
      expect(chapters).toContain('1941-pearl-harbor:the-other-openings');
    });

    it('toggles what is mounted rather than remounting the world', () => {
      const calls: [string, unknown][] = [];
      const host = {
        getSource: () => ({}),
        addSource: () => {},
        removeSource: () => {},
        getLayer: () => ({}),
        addLayer: () => {},
        removeLayer: () => {},
        getStyle: () => ({ layers: [] }),
        setLayoutProperty: (id: string, _n: string, v: unknown) => calls.push([id, v]),
      };
      showBorders(host, false);
      expect(calls).toEqual([
        ['borders-fill', 'none'],
        ['borders-line', 'none'],
        ['borders-label', 'none'],
        ['borders-island-fill', 'none'],
        ['borders-island-line', 'none'],
      ]);
    });

    it('fades out for a reader who zooms in by hand, above every declared view', () => {
      // The deepest declared chapter measured at z8.0; the fade starts at 9.5.
      const [fill, line] = bordersLayers('dark');
      expect(fill.maxzoom).toBe(10.5);
      expect(line.maxzoom).toBe(10.5);
      expect(JSON.stringify(fill.paint?.['fill-opacity'])).toContain('9.5');
    });
  });

  describe('islands, where the basemap draws the real coast (sand-neh.34)', () => {
    const oahuSpanDeg = (): number => {
      const geo = JSON.parse(
        readFileSync('content/shared/geo/borders/1941.geojson', 'utf8'),
      ) as BordersGeoJSON;
      const f = decorateBorders(geo).features as {
        properties: Record<string, unknown>;
        geometry: { coordinates: number[][][] };
      }[];
      const oahu = f.find((x) =>
        x.geometry.coordinates[0]?.some(
          ([lo, la]) => Math.abs((lo ?? 0) + 158.434) < 0.01 && Math.abs((la ?? 0) - 21.452) < 0.01,
        ),
      );
      if (!oahu) throw new Error('Oahu ring not found in 1941 borders');
      return oahu.properties['spanDeg'] as number;
    };

    it('measures a ring by the longer side of its box, corrected for latitude', () => {
      const box = (w: number, lat: number) => [
        [0, lat],
        [w, lat],
        [w, lat + 1],
        [0, lat + 1],
        [0, lat],
      ];
      // 4 degrees of longitude at the equator is 4 degrees on the ground.
      expect(ringSpanDeg(box(4, 0))).toBeCloseTo(4, 3);
      // The same box at 60N is half as wide, which is why Oahu at 21N is
      // measured against its real extent and not its longitude difference.
      expect(ringSpanDeg(box(4, 60))).toBeCloseTo(4 * Math.cos((60.5 * Math.PI) / 180), 3);
      // Taller than it is wide: the latitude side wins.
      expect(ringSpanDeg(box(0.1, 60))).toBeCloseTo(1, 3);
      expect(ringSpanDeg([])).toBe(0);
    });

    it('classifies the ring this bug was reported on as an island', () => {
      // Read the real polygon rather than restating its numbers: if the
      // borders are ever regenerated at a finer simplification, this fails
      // here instead of in someone's screenshot.
      expect(oahuSpanDeg()).toBeLessThan(BORDERS_ISLAND_MAX_SPAN_DEG);
    });

    it('leaves the European frontiers of 1914 on the frontier side', () => {
      // The July Crisis is a map of empires at z8.0. Every power whose border
      // is the subject there must stay above the threshold.
      const geo = JSON.parse(
        readFileSync('content/shared/geo/borders/1914.geojson', 'utf8'),
      ) as BordersGeoJSON;
      const f = decorateBorders(geo).features as { properties: Record<string, unknown> }[];
      const biggest = new Map<string, number>();
      for (const x of f) {
        const name = String(x.properties['NAME'] ?? '');
        biggest.set(name, Math.max(biggest.get(name) ?? 0, x.properties['spanDeg'] as number));
      }
      for (const power of [
        'France',
        'German Empire',
        'Russian Empire',
        'Austro-Hungarian Empire',
      ]) {
        const span = biggest.get(power);
        expect(span, `${power} missing from 1914 borders`).toBeDefined();
        expect(span, power).toBeGreaterThanOrEqual(BORDERS_ISLAND_MAX_SPAN_DEG);
      }
    });

    it('splits a MultiPolygon into rings but still names the power once', () => {
      const geo: BordersGeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'Testland' },
            geometry: {
              type: 'MultiPolygon',
              coordinates: [
                [
                  [
                    [0, 0],
                    [8, 0],
                    [8, 8],
                    [0, 8],
                    [0, 0],
                  ],
                ], // mainland
                [
                  [
                    [40, 0],
                    [40.5, 0],
                    [40.5, 0.5],
                    [40, 0.5],
                    [40, 0],
                  ],
                ], // island
              ],
            },
          },
        ] as unknown[],
      };
      const f = decorateBorders(geo).features as { properties: Record<string, unknown> }[];
      expect(f).toHaveLength(2);
      expect(f.filter((x) => x.properties['labelRing'])).toHaveLength(1);
      // The label goes on the mainland, not the island.
      expect(f.find((x) => x.properties['labelRing'])?.['properties']?.['spanDeg']).toBe(8);
      expect(f.every((x) => x.properties['hue'] === f[0]?.properties['hue'])).toBe(true);
    });

    it('exploding the geometry does not multiply the labels', () => {
      // One label per original feature, exactly as before the split.
      for (const year of [1914, 1941]) {
        const geo = JSON.parse(
          readFileSync(`content/shared/geo/borders/${year}.geojson`, 'utf8'),
        ) as BordersGeoJSON;
        const before = geo.features.length;
        const f = decorateBorders(geo).features as { properties: Record<string, unknown> }[];
        expect(
          f.filter((x) => x.properties['labelRing']),
          String(year),
        ).toHaveLength(before);
      }
    });

    it('fades the islands out below the zoom the bug was seen at', () => {
      const [, , , islandFill, islandLine] = bordersLayers('dark');
      const [fadeIn, fadeOut] = BORDERS_ISLAND_FADE;
      // Reported at about z8.9 on the campaign view; gone well before that.
      expect(fadeOut).toBeLessThan(8.9);
      // Still drawn at the basin-scale campaign camera, where 1941 opens.
      expect(fadeIn).toBeGreaterThan(2.6);
      expect(islandFill.maxzoom).toBe(fadeOut);
      expect(islandLine.maxzoom).toBe(fadeOut);
    });

    it('partitions every ring between the two pairs, with no gap or overlap', () => {
      const [fill, line, , islandFill, islandLine] = bordersLayers('dark');
      // The two filters are complementary comparisons on the same property.
      expect(JSON.stringify(fill.filter)).toContain('>=');
      expect(JSON.stringify(islandFill.filter)).toContain('<');
      expect(fill.filter).toEqual(line.filter);
      expect(islandFill.filter).toEqual(islandLine.filter);
      expect(JSON.stringify(fill.filter).replace('>=', '<')).toEqual(
        JSON.stringify(islandFill.filter),
      );
    });

    it('hides the island layers too when a zoom-in turns the borders off', () => {
      const calls: [string, unknown][] = [];
      const host = {
        getSource: () => ({}),
        addSource: () => {},
        removeSource: () => {},
        getLayer: () => ({}),
        addLayer: () => {},
        removeLayer: () => {},
        getStyle: () => ({ layers: [] }),
        setLayoutProperty: (id: string, _n: string, v: unknown) => calls.push([id, v]),
      };
      showBorders(host, false);
      expect(calls.map(([id]) => id)).toEqual(bordersLayers('dark').map((l) => l.id));
      expect(calls.map(([id]) => id)).toContain('borders-island-fill');
    });
  });

  describe('MapLibre itself agrees, not just the shape of the JSON', () => {
    /**
     * `validateStyleMin` proves a layer is legal; it does not prove the filter
     * selects what it was meant to or that the fade reaches zero where it must.
     * These run the real evaluator over the real Oahu ring, because the whole
     * defect is invisible from outside: MapLibre drops a bad layer silently
     * (`sand-neh.33`) and a filter that matches nothing looks the same as a
     * layer that is correctly empty.
     */
    const ringsOf = (year: number) => {
      const geo = JSON.parse(
        readFileSync(`content/shared/geo/borders/${year}.geojson`, 'utf8'),
      ) as BordersGeoJSON;
      return decorateBorders(geo).features as {
        properties: Record<string, unknown>;
        geometry: { type: string; coordinates: number[][][] };
      }[];
    };
    const oahu = () => {
      const f = ringsOf(1941).find((x) =>
        x.geometry.coordinates[0]?.some(
          ([lo, la]) => Math.abs((lo ?? 0) + 158.434) < 0.01 && Math.abs((la ?? 0) - 21.452) < 0.01,
        ),
      );
      if (!f) throw new Error('Oahu ring not found');
      return f;
    };
    const biggestRingOf = (year: number, name: string) =>
      ringsOf(year)
        .filter((x) => x.properties['NAME'] === name)
        .sort(
          (a, b) => (b.properties['spanDeg'] as number) - (a.properties['spanDeg'] as number),
        )[0]!;

    const matches = (filter: unknown, f: { properties: Record<string, unknown> }, zoom: number) =>
      featureFilter(filter as never, 'layers[0].filter' as never).filter(
        { zoom } as never,
        f as never,
        undefined as never,
      );

    /** Evaluated through MapLibre's own canonical property spec, not a stand-in. */
    const opacityAt = (
      kind: 'fill' | 'line',
      paint: unknown,
      zoom: number,
      f: { properties: Record<string, unknown> },
    ) => {
      const spec = (v8 as unknown as Record<string, Record<string, unknown>>)[`paint_${kind}`]?.[
        `${kind}-opacity`
      ];
      const e = createPropertyExpression(
        paint as never,
        `layers[0].paint.${kind}-opacity` as never,
        spec as never,
      );
      if (e.result === 'error') throw new Error(`bad expression: ${JSON.stringify(e.value)}`);
      return (e.value as { evaluate: (g: unknown, f: unknown) => number }).evaluate({ zoom }, f);
    };

    it('routes the Oahu ring to the island layers and France to the frontier ones', () => {
      const [fill, , , islandFill] = bordersLayers('dark');
      const o = oahu();
      const france = biggestRingOf(1914, 'France');
      expect(matches(islandFill.filter, o, 8.9)).toBe(true);
      expect(matches(fill.filter, o, 8.9)).toBe(false);
      expect(matches(fill.filter, france, 8.0)).toBe(true);
      expect(matches(islandFill.filter, france, 8.0)).toBe(false);
    });

    it('paints the hexagon to nothing at the zoom it was reported at', () => {
      const [, , , islandFill, islandLine] = bordersLayers('dark');
      const o = oahu();
      // The reported view. Both the wash and the dashed stroke must be gone.
      expect(opacityAt('fill', islandFill.paint?.['fill-opacity'], 8.9, o)).toBe(0);
      expect(opacityAt('line', islandLine.paint?.['line-opacity'], 8.9, o)).toBe(0);
      // And at the campaign camera the territory is still shaded.
      expect(opacityAt('fill', islandFill.paint?.['fill-opacity'], 2.6, o)).toBeGreaterThan(0);
      expect(opacityAt('line', islandLine.paint?.['line-opacity'], 2.6, o)).toBeGreaterThan(0);
    });

    it('leaves the July Crisis frontiers drawn at the zoom that chapter sits at', () => {
      const [fill, line] = bordersLayers('dark');
      const france = biggestRingOf(1914, 'France');
      expect(opacityAt('fill', fill.paint?.['fill-opacity'], 8.0, france)).toBeGreaterThan(0);
      expect(opacityAt('line', line.paint?.['line-opacity'], 8.0, france)).toBeGreaterThan(0);
    });
  });

  describe('the layers are valid MapLibre (sand-neh.33)', () => {
    /** The layers as MapLibre actually receives them: inside a whole style. */
    const styleWith = (theme: 'light' | 'dark') => ({
      version: 8 as const,
      sources: {
        borders: {
          type: 'geojson' as const,
          data: { type: 'FeatureCollection' as const, features: [] },
        },
      },
      layers: bordersLayers(theme),
    });

    it.each(['light', 'dark'] as const)('validates against the style spec in %s', (theme) => {
      // MapLibre does not throw on an invalid layer, it DROPS it and logs one
      // warning. So a layer can stop drawing everywhere and every gate stays
      // green: the scene still renders, nothing is on the console at `error`
      // level, and the map is not something the DOM audit can see. That is
      // exactly what happened to `borders-line` — a `zoom` fade nested inside
      // a `*` — and it is why this asserts rather than a screenshot.
      expect(validateStyleMin(styleWith(theme))).toEqual([]);
    });

    it('rejects the shape that broke it, so this test is not a tautology', () => {
      const broken = styleWith('dark');
      (broken.layers[1] as { paint: Record<string, unknown> }).paint['line-opacity'] = [
        '*',
        ['case', ['==', 1, 1], 0.45, 0.85],
        ['interpolate', ['linear'], ['zoom'], 9.5, 1, 10.5, 0],
      ];
      const errors = validateStyleMin(broken);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('top-level');
    });
  });
});
