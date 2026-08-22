import { describe, expect, it } from 'vitest';
import {
  bordersLayers,
  bordersUrl,
  decorateBorders,
  powerHue,
  type BordersGeoJSON,
} from './borders.js';

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
});
