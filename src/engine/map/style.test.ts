import { describe, expect, it } from 'vitest';
import {
  BASEMAP_SOURCE,
  buildStyle,
  DEFAULT_TILES_URL,
  detectTheme,
  MAP_PALETTE,
} from './style.js';

describe('buildStyle', () => {
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
});
