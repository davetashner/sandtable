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
  addControl(c: unknown) {
    this.controls.push(c);
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
    this.sources.set(id, src);
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
