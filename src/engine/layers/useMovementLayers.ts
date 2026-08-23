/**
 * React glue: routes for the active branch + the clock → deck.gl layers.
 * Composition is memoised per branch; the layers are rebuilt on every tick
 * (cheap — deck diffs props and TripsLayer only updates currentTime).
 */
import type { Layer } from '@deck.gl/core';
import { useMemo, useState } from 'react';
import type { Branch, Formation, Route, Side } from '../../packs/schema/index.js';
import { useClock } from '../ClockContext.js';
import { buildMovementScene, composeRoutes } from './movement.js';
import type { Box } from './places.js';

export interface MovementSource {
  routes: Route[];
  formations: Formation[];
  sides: Side[];
}

export interface MovementLayoutOptions {
  /** Screen projection for label layout (MapLibre's map.project); omit for the static layout. */
  project?: ((lngLat: [number, number]) => [number, number] | null) | undefined;
  /** Bump when the projection changes (map moves) so labels re-lay-out while the clock is paused. */
  placementKey?: number | undefined;
}

export function useMovementLayers(
  source: MovementSource,
  branch: Branch,
  layout: MovementLayoutOptions = {},
): {
  layers: Layer[];
  /** Screen boxes of token dots and labels — obstacles for the place labels. */
  labelBoxes: Box[];
  selected: string | undefined;
  select: (id: string | undefined) => void;
} {
  const { now, range } = useClock();
  const [selected, select] = useState<string | undefined>(undefined);
  const composed = useMemo(
    () => composeRoutes(source.routes, source.formations, source.sides, branch),
    [source, branch],
  );
  const { project, placementKey } = layout;
  const scene = useMemo(
    () =>
      buildMovementScene({
        routes: composed,
        now,
        rangeStart: range.start,
        sides: source.sides,
        ...(selected ? { highlight: selected } : {}),
        onSelect: (id) => select((cur) => (cur === id ? undefined : id)),
        project,
      }),
    // placementKey is a deliberate extra dependency: same projection function, new camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [composed, now, range.start, source.sides, selected, project, placementKey],
  );
  return { layers: scene.layers, labelBoxes: scene.labelBoxes, selected, select };
}
