/**
 * The map surface: MapLibre GL with the PMTiles protocol, the themed basemap
 * style, the historical-borders layer for a year, and a deck.gl overlay
 * (interleaved) ready for data layers (sand-a55.11). Exposes a small camera
 * API through `onReady` / the returned handle for tours and zoom-ins.
 *
 * Era-agnostic: it is given a camera, a border year and (later) deck layers.
 */
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer as DeckLayer } from '@deck.gl/core';
import {
  addProtocol,
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type LngLatBoundsLike,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 resolves its worker as `new URL('./maplibre-gl-worker.mjs',
// import.meta.url)` at runtime, which only works while import.meta.url points
// into node_modules (dev). In a Vite build that URL becomes /app/maplibre-gl-
// worker.mjs, which is never emitted — so no worker, no tiles (sand-2fw).
// `?worker&url` makes Vite bundle the worker (with maplibre-gl-shared) and
// hand us its real URL to register before the first map is created.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Protocol } from 'pmtiles';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { BBox, Camera } from '../../packs/schema/index.js';
import { BORDERS_SOURCE, bordersLayers, decorateBorders, fetchBorders } from './borders.js';
import { buildStyle, detectTheme, type MapTheme } from './style.js';
import './map.css';

let maplibreConfigured = false;
/** One-time MapLibre globals: the bundled worker URL and the PMTiles protocol. */
function ensureMapLibreConfigured() {
  if (maplibreConfigured) return;
  setWorkerUrl(maplibreWorkerUrl);
  const protocol = new Protocol();
  addProtocol('pmtiles', protocol.tile);
  maplibreConfigured = true;
}

/**
 * deck.gl 9.3's `MapboxOverlay` (interleaved) reads the undocumented
 * `map.transform` to derive the near/far planes each frame; maplibre-gl 6
 * moved the camera state to `map._camera.transform`, so without this bridge
 * the overlay throws on every render — no deck layers, and the map's `load`
 * event never fires (so borders never load either). Remove once
 * @deck.gl/mapbox supports maplibre-gl 6 (sand-2fw follow-up).
 */
function bridgeTransformForDeck(map: MapLibreMap) {
  if ('transform' in map) return;
  Object.defineProperty(map, 'transform', {
    configurable: true,
    get: () => (map as unknown as { _camera?: { transform?: unknown } })._camera?.transform,
  });
}

export interface CameraTarget {
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  /** ms; 0 jumps. */
  duration?: number;
}

/** What tours, zoom-ins and the dossier get to drive. */
export interface MapHandle {
  flyTo(target: CameraTarget): void;
  fitRegion(region: BBox, opts?: { padding?: number; duration?: number; maxZoom?: number }): void;
  getMap(): MapLibreMap | null;
  setDeckLayers(layers: DeckLayer[]): void;
}

export interface MapViewProps {
  /** Opening camera. */
  camera: Camera;
  /** Which content/shared/geo/borders/<year>.geojson to draw; omit for none. */
  borderYear?: number;
  /** Light/dark; defaults to the document setting and follows it. */
  theme?: MapTheme;
  /** `pmtiles://` or plain URL of the archive; defaults to the assets-bucket extract. */
  tilesUrl?: string;
  /** deck.gl layers rendered interleaved with the basemap. */
  deckLayers?: DeckLayer[];
  /** Called once the style has loaded. */
  onReady?: (handle: MapHandle) => void;
  /** Imperative handle for tours and zoom-ins. */
  ref?: Ref<MapHandle>;
  /** Accessible label for the region. */
  label?: string;
  /** Build the style (tests inject a stub). */
  styleFor?: (theme: MapTheme, tilesUrl?: string) => StyleSpecification;
}

export function MapView({
  camera,
  borderYear,
  theme,
  tilesUrl,
  deckLayers,
  onReady,
  ref,
  label = 'Map',
  styleFor,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [systemTheme, setSystemTheme] = useState<MapTheme>(() => detectTheme());
  const [ready, setReady] = useState(false);
  const activeTheme = theme ?? systemTheme;

  const handle: MapHandle = {
    flyTo(t) {
      const map = mapRef.current;
      if (!map) return;
      const opts = {
        ...(t.center ? { center: t.center } : {}),
        ...(t.zoom !== undefined ? { zoom: t.zoom } : {}),
        ...(t.bearing !== undefined ? { bearing: t.bearing } : {}),
        ...(t.pitch !== undefined ? { pitch: t.pitch } : {}),
        essential: true,
      };
      if (t.duration === 0) map.jumpTo(opts);
      else map.flyTo({ ...opts, duration: t.duration ?? 1400, curve: 1.3 });
    },
    fitRegion(region, o = {}) {
      const map = mapRef.current;
      if (!map) return;
      const bounds: LngLatBoundsLike = [
        [region[0], region[1]],
        [region[2], region[3]],
      ];
      map.fitBounds(bounds, {
        padding: o.padding ?? 40,
        duration: o.duration ?? 1400,
        maxZoom: o.maxZoom ?? 12,
        essential: true,
      });
    },
    getMap: () => mapRef.current,
    setDeckLayers(layers) {
      overlayRef.current?.setProps({ layers });
    },
  };
  useImperativeHandle(ref, () => handle);

  // Follow the OS / document theme unless a theme prop pins it.
  useEffect(() => {
    if (theme || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(detectTheme());
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      obs.disconnect();
    };
  }, [theme]);

  // Mount the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    ensureMapLibreConfigured();
    const style = (styleFor ?? ((t, u) => buildStyle({ theme: t, ...(u ? { tilesUrl: u } : {}) })))(
      activeTheme,
      tilesUrl,
    );
    const map = new MapLibreMap({
      container,
      style,
      center: camera.center,
      zoom: camera.zoom,
      bearing: camera.bearing ?? 0,
      pitch: camera.pitch ?? 0,
      attributionControl: { compact: true },
      maxPitch: 60,
      dragRotate: false,
      touchPitch: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    bridgeTransformForDeck(map);
    const overlay = new MapboxOverlay({ interleaved: true, layers: deckLayers ?? [] });
    map.addControl(overlay);
    mapRef.current = map;
    overlayRef.current = overlay;
    map.once('load', () => {
      setReady(true);
      onReady?.(handle);
    });
    return () => {
      mapRef.current = null;
      overlayRef.current = null;
      map.remove();
    };
    // Mount once; camera/theme/borders changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch → new style, then re-add borders.
  const firstStyle = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstStyle.current) {
      firstStyle.current = false;
      return;
    }
    const style = (styleFor ?? ((t, u) => buildStyle({ theme: t, ...(u ? { tilesUrl: u } : {}) })))(
      activeTheme,
      tilesUrl,
    );
    map.setStyle(style, { diff: false });
    setReady(false);
    map.once('styledata', () => setReady(true));
  }, [activeTheme, tilesUrl, styleFor]);

  // Borders for the year, (re)added whenever the style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !borderYear) return;
    let cancelled = false;
    fetchBorders(borderYear)
      .then((geo) => {
        if (cancelled || !mapRef.current) return;
        const m = mapRef.current;
        if (m.getSource(BORDERS_SOURCE)) {
          for (const l of bordersLayers(activeTheme)) if (m.getLayer(l.id)) m.removeLayer(l.id);
          m.removeSource(BORDERS_SOURCE);
        }
        m.addSource(BORDERS_SOURCE, {
          type: 'geojson',
          data: decorateBorders(geo) as never,
          attribution: geo.attribution ?? '',
        });
        // Sit below the first label layer so place names stay readable.
        const firstSymbol = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
        for (const l of bordersLayers(activeTheme))
          m.addLayer(l, l.type === 'symbol' ? undefined : firstSymbol);
      })
      .catch((e: unknown) => console.warn('[map] borders', e));
    return () => {
      cancelled = true;
    };
  }, [ready, borderYear, activeTheme]);

  // deck.gl layers.
  useEffect(() => {
    overlayRef.current?.setProps({ layers: deckLayers ?? [] });
  }, [deckLayers]);

  return (
    <div
      ref={containerRef}
      className="mapview"
      role="region"
      aria-label={label}
      data-theme={activeTheme}
    />
  );
}
