import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';

// jsdom has no WebGL: stub maplibre and the deck overlay, keep the rest real.
const maps: FakeMap[] = [];
class FakeMap {
  handlers = new Map<string, (() => void)[]>();
  layers: { id: string; type: string }[] = [];
  sources = new Map<string, unknown>();
  controls: unknown[] = [];
  flyTo = vi.fn();
  jumpTo = vi.fn();
  fitBounds = vi.fn();
  setStyle = vi.fn();
  remove = vi.fn();
  constructor(public opts: Record<string, unknown>) {
    maps.push(this);
  }
  canvas = document.createElement('canvas');
  addControl(c: unknown) {
    this.controls.push(c);
  }
  getCanvas() {
    return this.canvas;
  }
  once(ev: string, fn: () => void) {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]);
  }
  fire(ev: string) {
    for (const fn of this.handlers.get(ev) ?? []) fn();
    this.handlers.delete(ev);
  }
  getSource(id: string) {
    return this.sources.get(id);
  }
  addSource(id: string, src: unknown) {
    const stored = src as { data?: unknown; setData?: (d: unknown) => void };
    stored.setData = (d: unknown) => {
      stored.data = d;
    };
    this.sources.set(id, stored);
  }
  removeSource(id: string) {
    this.sources.delete(id);
  }
  getLayer(id: string) {
    return this.layers.find((l) => l.id === id);
  }
  addLayer(l: { id: string; type: string }) {
    this.layers.push(l);
  }
  removeLayer(id: string) {
    this.layers = this.layers.filter((l) => l.id !== id);
  }
  getStyle() {
    return {
      layers: [
        { id: 'water', type: 'fill' },
        { id: 'places', type: 'symbol' },
      ],
    };
  }
}
vi.mock('maplibre-gl', () => ({
  Map: FakeMap,
  NavigationControl: class {},
  ScaleControl: class {},
  addProtocol: vi.fn(),
  setWorkerUrl: vi.fn(),
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({
  default: '/app/maplibre-gl-worker-bundled.js',
}));
vi.mock('@deck.gl/mapbox', () => ({
  MapboxOverlay: class {
    props: unknown;
    constructor(p: unknown) {
      this.props = p;
    }
    setProps = vi.fn();
  },
}));
vi.mock('pmtiles', () => ({
  Protocol: class {
    tile = vi.fn();
  },
}));

import type { MapHandle as Handle } from './MapView.js';

const { MapView } = await import('./MapView.js');
const { setWorkerUrl } = await import('maplibre-gl');

describe('<MapView>', () => {
  beforeEach(() => {
    maps.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          attribution: 'test',
          features: [{ type: 'Feature', properties: { NAME: 'X', SUBJECTO: 'X' } }],
        }),
      })),
    );
  });

  it('registers the bundled MapLibre worker and bridges map.transform for deck.gl (sand-2fw)', () => {
    render(
      <MapView
        camera={{ center: [4.2, 49.7], zoom: 6.3 }}
        theme="light"
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
      />,
    );
    // Production builds must not resolve the worker relative to the bundle
    // (maplibre-gl 6 default), but to the URL Vite emitted for it.
    expect(vi.mocked(setWorkerUrl)).toHaveBeenCalledWith('/app/maplibre-gl-worker-bundled.js');
    // @deck.gl/mapbox reads map.transform, which maplibre-gl 6 moved to _camera.
    const map = maps[0]! as unknown as { _camera?: unknown; transform?: unknown };
    map._camera = { transform: { height: 480 } };
    expect(map.transform).toEqual({ height: 480 });
  });

  it('mounts with the camera, loads borders after style load, and exposes the camera API', async () => {
    const ref = createRef<Handle>();
    const onReady = vi.fn();
    render(
      <MapView
        ref={ref}
        camera={{ center: [4.2, 49.7], zoom: 6.3 }}
        borderYear={1914}
        theme="light"
        onReady={onReady}
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
      />,
    );
    expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument();
    const map = maps[0]!;
    expect(map.opts['center']).toEqual([4.2, 49.7]);
    expect(map.opts['zoom']).toBe(6.3);

    await act(async () => {
      map.fire('load');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/assets/geo/borders/1914.geojson');
    await vi.waitFor(() => expect(map.getSource('borders')).toBeDefined());
    expect(map.layers.map((l) => l.id)).toEqual(['borders-fill', 'borders-line', 'borders-label']);

    ref.current!.flyTo({ center: [2.35, 48.86], zoom: 9 });
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [2.35, 48.86], zoom: 9 }),
    );
    ref.current!.flyTo({ zoom: 5, duration: 0 });
    expect(map.jumpTo).toHaveBeenCalled();
    ref.current!.fitRegion([0, 47, 9, 52]);
    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [0, 47],
        [9, 52],
      ],
      expect.objectContaining({ padding: 40 }),
    );
  });

  // sand-pmz.4: the canvas is the only focusable thing on the map, MapLibre
  // gives it tabindex but no name, and a camera flight is motion like any
  // other.
  describe('the keyboard and the reader who asked for less motion', () => {
    const mount = () => {
      const ref = createRef<Handle>();
      render(
        <MapView
          ref={ref}
          camera={{ center: [4.2, 49.7], zoom: 6.3 }}
          theme="light"
          styleFor={() => ({ version: 8, sources: {}, layers: [] })}
        />,
      );
      return { ref, map: maps[0]! };
    };

    it('names the canvas and says which keys drive it', () => {
      const { map } = mount();
      expect(map.getCanvas().getAttribute('aria-label')).toMatch(/arrow keys.*plus and minus/i);
    });

    it('keeps the global shortcuts off the map', () => {
      mount();
      expect(screen.getByRole('region', { name: 'Map' })).toHaveAttribute('data-owns-keys');
    });

    it('jumps instead of flying under prefers-reduced-motion', () => {
      // jsdom ships no matchMedia at all, which is why the app treats its
      // absence as "no preference"; install one that has the preference.
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (q: string) => ({ matches: q.includes('reduced-motion'), media: q }),
      });
      const { ref, map } = mount();
      ref.current!.flyTo({ center: [2.35, 48.86], zoom: 9 });
      expect(map.flyTo).not.toHaveBeenCalled();
      expect(map.jumpTo).toHaveBeenCalled();
      ref.current!.fitRegion([0, 47, 9, 52]);
      expect(map.fitBounds).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 0 }),
      );
      delete (window as { matchMedia?: unknown }).matchMedia;
    });
  });

  it('is ready on styledata even when the basemap never finishes loading', async () => {
    // `load` also waits for the first tiles. When the tile source cannot be
    // read it never fires, and the screen-space label layout that hangs off
    // `onReady` never runs — every deck label falls back to its default slot
    // and the army and place names pile up (sand-1l0.15).
    const onReady = vi.fn();
    render(
      <MapView
        camera={{ center: [4.2, 49.7], zoom: 6.3 }}
        borderYear={1914}
        theme="light"
        onReady={onReady}
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
      />,
    );
    const map = maps[0]!;
    await act(async () => {
      map.fire('styledata');
      await Promise.resolve();
    });
    expect(onReady).toHaveBeenCalledTimes(1);

    // …and a `load` that arrives later does not announce a second time.
    await act(async () => {
      map.fire('load');
      await Promise.resolve();
    });
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe('<MapView> front line (sand-g80.1)', () => {
  const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const snapshot = (date: string) => ({
    type: 'Feature',
    id: `front:${date}`,
    properties: { date, at: at(date), label: date, precision: 'medium', sources: [], through: [] },
    geometry: {
      type: 'LineString',
      coordinates: [
        [2.75, 51.13],
        [7.15, 47.5],
      ],
    },
  });
  const SERIES = {
    type: 'FeatureCollection',
    attribution: 'front test',
    features: ['1914-11-25', '1917-04-05', '1918-11-11'].map(snapshot),
  };

  /** Answers the front-line URL with the series and everything else with borders. */
  const stubFetch = () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('/front/')
          ? SERIES
          : { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {} }] },
    }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const mount = async (props: { frontSeries?: string; frontAt?: number }) => {
    const view = render(
      <MapView
        camera={{ center: [4, 50], zoom: 6 }}
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
        {...props}
      />,
    );
    const map = maps.at(-1)!;
    await act(async () => {
      map.fire('load');
      map.fire('styledata');
    });
    return { view, map };
  };

  beforeEach(() => {
    maps.length = 0;
    stubFetch();
  });

  it('draws nothing at all when the pack names no series', async () => {
    const { map } = await mount({ frontAt: at('1917-01-01') });
    expect(vi.mocked(fetch).mock.calls.flat()).not.toContain(
      '/assets/geo/front/western-front.geojson',
    );
    expect(map.layers.filter((l) => l.id.startsWith('front'))).toEqual([]);
  });

  it('fetches the named series and mounts its layers once the style is ready', async () => {
    const { map } = await mount({ frontSeries: 'western-front', frontAt: at('1917-06-01') });
    await vi.waitFor(() => expect(map.getSource('front')).toBeDefined());
    expect(fetch).toHaveBeenCalledWith('/assets/geo/front/western-front.geojson');
    expect(map.layers.filter((l) => l.id.startsWith('front')).map((l) => l.id)).toEqual([
      'front-halo',
      'front-wash-central',
      'front-wash-entente',
      'front-line',
      'front-line-approx',
    ]);
  });

  it('holds the snapshot in force at the clock, not the first or the last', async () => {
    const { map } = await mount({ frontSeries: 'western-front', frontAt: at('1917-06-01') });
    await vi.waitFor(() => expect(map.getSource('front')).toBeDefined());
    const source = map.getSource('front') as { data: { features: { id: string }[] } };
    expect(source.data.features.map((f) => f.id)).toEqual(['front:1917-04-05']);
  });

  it('draws no line before the front was continuous', async () => {
    const { map } = await mount({ frontSeries: 'western-front', frontAt: at('1914-09-06') });
    await vi.waitFor(() => expect(map.getSource('front')).toBeDefined());
    const source = map.getSource('front') as { data: { features: unknown[] } };
    expect(source.data.features).toEqual([]);
  });

  it('moving the clock swaps the snapshot without refetching the series', async () => {
    const { view, map } = await mount({ frontSeries: 'western-front', frontAt: at('1915-01-01') });
    await vi.waitFor(() => expect(map.getSource('front')).toBeDefined());
    const fetches = vi.mocked(fetch).mock.calls.length;

    await act(async () => {
      view.rerender(
        <MapView
          camera={{ center: [4, 50], zoom: 6 }}
          styleFor={() => ({ version: 8, sources: {}, layers: [] })}
          frontSeries="western-front"
          frontAt={at('1918-11-11')}
        />,
      );
    });
    const source = map.getSource('front') as { data: { features: { id: string }[] } };
    expect(source.data.features.map((f) => f.id)).toEqual(['front:1918-11-11']);
    expect(vi.mocked(fetch).mock.calls.length).toBe(fetches);
  });
});
