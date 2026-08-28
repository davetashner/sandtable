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
  standing = new Map<string, ((e?: unknown) => void)[]>();
  once(ev: string, fn: () => void) {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]);
  }
  on(ev: string, fn: (e?: unknown) => void) {
    this.standing.set(ev, [...(this.standing.get(ev) ?? []), fn]);
  }
  fire(ev: string, e?: unknown) {
    for (const fn of this.handlers.get(ev) ?? []) fn();
    this.handlers.delete(ev);
    for (const fn of this.standing.get(ev) ?? []) fn(e);
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
  styleLoaded = true;
  isStyleLoaded() {
    return this.styleLoaded;
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
      // Padding is per-edge now, because an overlay covers one corner and not
      // the whole frame (sand-neh.29). With no inset every edge is the same.
      expect.objectContaining({ padding: { top: 40, right: 40, bottom: 40, left: 40 } }),
    );
  });

  // sand-lry.22: a Pacific theatre runs east from a bigger number to a smaller
  // one. Handed over as written, the four corners have their minimum at -155
  // and their maximum at 99, and the camera frames the other 254° of the
  // world; unwrapped, the box is an ordinary 106°-wide interval.
  it('unwraps a region that crosses the antimeridian before fitting it', () => {
    const ref = createRef<Handle>();
    render(
      <MapView
        ref={ref}
        camera={{ center: [-175, 30], zoom: 2.6 }}
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
      />,
    );
    const map = maps.at(-1)!;

    ref.current!.fitRegion([99, -12, -155, 52]);
    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [99, -12],
        [205, 52],
      ],
      expect.anything(),
    );

    // An assault box a fifth of a degree wide that happens to straddle 180°.
    ref.current!.fitRegion([179.95, 28.1, -179.95, 28.3], { maxZoom: 11 });
    expect(map.fitBounds).toHaveBeenLastCalledWith(
      [
        [179.95, 28.1],
        [180.05, 28.3],
      ],
      expect.objectContaining({ maxZoom: 11 }),
    );

    // A full longitude band does not cross, and is passed straight through.
    ref.current!.fitRegion([-180, -12, 180, 52]);
    expect(map.fitBounds).toHaveBeenLastCalledWith(
      [
        [-180, -12],
        [180, 52],
      ],
      expect.anything(),
    );
  });

  it('keeps the covered corner clear when an overlay sits on the map (sand-neh.29)', () => {
    const ref = createRef<Handle>();
    render(
      <MapView
        ref={ref}
        camera={{ center: [4, 50], zoom: 6 }}
        inset={{ left: 392, bottom: 96 }}
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
      />,
    );
    const map = maps.at(-1)!;

    // A fit adds the inset to its own padding, so the region lands in what is
    // left of the map — with the lower third bottom-left, up and to the right.
    ref.current!.fitRegion([0, 47, 9, 52], { padding: 48 });
    expect(map.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ padding: { top: 48, right: 48, bottom: 144, left: 440 } }),
    );

    // A tour's own camera answers the panel too, or the framing would change
    // character every time a step set one.
    ref.current!.flyTo({ center: [2.35, 48.86], zoom: 9 });
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ padding: { top: 0, right: 0, bottom: 96, left: 392 } }),
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

  describe('an archive that is not in the bucket (sand-lry.18)', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
    const notice = () => screen.queryByText(/basemap for this map is not on the table/i);

    const mount = (tilesUrl: string) =>
      render(
        <MapView
          camera={{ center: [172.98, 1.35], zoom: 12 }}
          theme="light"
          tilesUrl={tilesUrl}
          styleFor={() => ({ version: 8, sources: {}, layers: [] })}
        />,
      );

    it('says so on the map, once, however many tiles fail', () => {
      const spy = warn();
      mount('/assets/tiles/betio-z14.pmtiles');
      const map = maps[0]!;
      expect(notice()).toBeNull();
      act(() => {
        map.fire('error', { sourceId: 'basemap', error: new Error('404') });
        map.fire('error', { sourceId: 'basemap', error: new Error('404') });
        map.fire('error', { sourceId: 'basemap', error: new Error('404') });
      });
      // The failure has a face, and the campaign underneath is still readable:
      // a line laid on the map, not a page over it.
      expect(notice()).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('region')).toContainElement(notice());
      // One warning for a developer, not one per range request — registering
      // this listener is also what stops MapLibre logging each of them.
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]).toContain('/assets/tiles/betio-z14.pmtiles');
      spy.mockRestore();
    });

    it('leaves an error from anything else alone', () => {
      const spy = warn();
      mount('/assets/tiles/central-europe-z10.pmtiles');
      act(() => {
        maps[0]!.fire('error', { sourceId: 'borders', error: new Error('nope') });
      });
      expect(notice()).toBeNull();
      spy.mockRestore();
    });

    it('asks again when a zoom-in swaps the archive', () => {
      const spy = warn();
      const { rerender } = mount('/assets/tiles/betio-z14.pmtiles');
      act(() => {
        maps[0]!.fire('error', { sourceId: 'basemap', error: new Error('404') });
      });
      expect(notice()).toBeInTheDocument();
      rerender(
        <MapView
          camera={{ center: [172.98, 1.35], zoom: 12 }}
          theme="light"
          tilesUrl="/assets/tiles/central-europe-z10.pmtiles"
          styleFor={() => ({ version: 8, sources: {}, layers: [] })}
        />,
      );
      // The verdict belonged to the archive, not to the map.
      expect(notice()).toBeNull();
      spy.mockRestore();
    });
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

describe('<MapView> front line waits for the style (sand-g80.1)', () => {
  const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const SERIES = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'front:1914-11-25',
        properties: { date: '1914-11-25', at: at('1914-11-25'), precision: 'medium' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.75, 51.13],
            [7.15, 47.5],
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    maps.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => SERIES })),
    );
  });

  /**
   * `styledata` fires long before the style is done, and `addLayer` throws until
   * it is — 46 visual-gate scenes died of exactly this. The layers must wait.
   */
  it('does not touch the map until the style is loaded, then mounts on idle', async () => {
    render(
      <MapView
        camera={{ center: [4, 50], zoom: 6 }}
        styleFor={() => ({ version: 8, sources: {}, layers: [] })}
        frontSeries="western-front"
        frontAt={at('1917-01-01')}
      />,
    );
    const map = maps.at(-1)!;
    map.styleLoaded = false;
    map.addLayer = vi.fn(() => {
      throw new Error('Style is not done loading');
    });

    await act(async () => {
      map.fire('styledata');
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(map.addLayer).not.toHaveBeenCalled();
    expect(map.getSource('front')).toBeUndefined();

    // The style finishes; `idle` is where the work was parked.
    map.styleLoaded = true;
    const added: { id: string }[] = [];
    map.addLayer = vi.fn((l: { id: string }) => added.push(l));
    await act(async () => {
      map.fire('idle');
    });
    expect(added.map((l) => l.id)).toEqual([
      'front-halo',
      'front-wash-central',
      'front-wash-entente',
      'front-line',
      'front-line-approx',
    ]);
  });
});
