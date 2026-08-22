/**
 * The map surface: MapView + the data layers that ride on it. Loaded lazily
 * by the App so MapLibre and deck.gl stay out of the shell bundle.
 */
import { useClock } from '../engine/ClockContext.js';
import { useMovementLayers, type MovementSource } from '../engine/layers/useMovementLayers.js';
import { MapView } from '../engine/map/MapView.js';
import { labelNow } from '../engine/ticks.js';
import type { Branch, Camera } from '../packs/schema/index.js';

export interface MapSurfaceProps {
  camera: Camera;
  borderYear: number;
  branch: Branch;
  movement: MovementSource;
}

export function MapSurface({ camera, borderYear, branch, movement }: MapSurfaceProps) {
  const { now, range } = useClock();
  const label = labelNow(now, range);
  const { layers } = useMovementLayers(movement, branch);
  return (
    <MapView
      camera={camera}
      borderYear={borderYear}
      label={`Map — ${label.date}`}
      deckLayers={layers}
    />
  );
}

export default MapSurface;
