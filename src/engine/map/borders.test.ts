import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import {
  BORDERS_MIN_SPAN_DEG,
  bordersLayers,
  bordersMeaningful,
  bordersUrl,
  decorateBorders,
  powerHue,
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
