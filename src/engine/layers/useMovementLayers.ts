/**
 * React glue: routes for the active branch + the clock → deck.gl layers.
 * Composition is memoised per branch; the layers are rebuilt on every tick
 * (cheap — deck diffs props and TripsLayer only updates currentTime).
 */
import type { Layer } from '@deck.gl/core';
import { useMemo, useState } from 'react';
import type { Branch, Formation, Route, Side } from '../../packs/schema/index.js';
import { useClock } from '../ClockContext.js';
import { buildMovementLayers, composeRoutes } from './movement.js';

export interface MovementSource {
  routes: Route[];
  formations: Formation[];
  sides: Side[];
}

export function useMovementLayers(
  source: MovementSource,
  branch: Branch,
): {
  layers: Layer[];
  selected: string | undefined;
  select: (id: string | undefined) => void;
} {
  const { now, range } = useClock();
  const [selected, select] = useState<string | undefined>(undefined);
  const composed = useMemo(
    () => composeRoutes(source.routes, source.formations, source.sides, branch),
    [source, branch],
  );
  const layers = useMemo(
    () =>
      buildMovementLayers({
        routes: composed,
        now,
        rangeStart: range.start,
        sides: source.sides,
        ...(selected ? { highlight: selected } : {}),
        onSelect: (id) => select((cur) => (cur === id ? undefined : id)),
      }),
    [composed, now, range.start, source.sides, selected],
  );
  return { layers, selected, select };
}
