/**
 * The map surface: MapView + the data layers that ride on it. Loaded lazily
 * by the App so MapLibre and deck.gl stay out of the shell bundle. When a
 * focus region is set (zoom-in), the camera fits it; when cleared, it fits
 * the campaign region again.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useClock } from '../engine/ClockContext.js';
import { DEFAULT_PLACE_KINDS, buildPlacesLayers } from '../engine/layers/places.js';
import { buildStyle, type MapTheme } from '../engine/map/style.js';
import { useMovementLayers, type MovementSource } from '../engine/layers/useMovementLayers.js';
import { MapView, type MapHandle } from '../engine/map/MapView.js';
import { labelNow } from '../engine/ticks.js';
import type { BBox, Branch, Camera, Place } from '../packs/schema/index.js';

export interface MapSurfaceProps {
  camera: Camera;
  borderYear: number;
  branch: Branch;
  movement: MovementSource;
  /** Campaign extent, fitted when leaving a zoom-in. */
  region: BBox;
  /** Battle extent while zoomed in. */
  focusRegion?: BBox | undefined;
  /** Cities and fortresses to label. */
  places?: Place[];
}

export function MapSurface({
  camera,
  borderYear,
  branch,
  movement,
  region,
  focusRegion,
  places = [],
}: MapSurfaceProps) {
  const { now, range } = useClock();
  const label = labelNow(now, range);
  const { layers: movementLayers } = useMovementLayers(movement, branch);
  const placeLayers = useMemo(() => buildPlacesLayers({ places }), [places]);
  // The basemap must not label the cities the pack labels itself (sand-3uq).
  const labelledPoints = useMemo(
    () => places.filter((p) => DEFAULT_PLACE_KINDS.includes(p.kind)).map((p) => p.lngLat),
    [places],
  );
  const styleFor = useCallback(
    (theme: MapTheme, tilesUrl?: string) =>
      buildStyle({
        theme,
        ...(tilesUrl ? { tilesUrl } : {}),
        suppressLocalityLabelsNear: labelledPoints,
      }),
    [labelledPoints],
  );
  const layers = useMemo(() => [...placeLayers, ...movementLayers], [placeLayers, movementLayers]);
  const handle = useRef<MapHandle | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!focusRegion) return; // opening camera already set by MapView
    }
    const h = handle.current;
    if (!h) return;
    if (focusRegion) h.fitRegion(focusRegion, { padding: 48, maxZoom: 11 });
    else h.fitRegion(region, { padding: 24, maxZoom: 8 });
  }, [focusRegion, region]);

  return (
    <MapView
      ref={handle}
      camera={camera}
      borderYear={borderYear}
      label={`Map — ${label.date}`}
      styleFor={styleFor}
      deckLayers={layers}
      onReady={(h) => {
        handle.current = h;
        if (focusRegion) h.fitRegion(focusRegion, { padding: 48, maxZoom: 11, duration: 0 });
      }}
    />
  );
}

export default MapSurface;
