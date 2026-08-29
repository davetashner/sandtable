/**
 * React glue: routes for the active branch + the clock → deck.gl layers.
 * Composition is memoised per branch; the layers are rebuilt on every tick and
 * deck diffs the props.
 *
 * The trail used to be a `TripsLayer`, where a tick moved only its
 * `currentTime` uniform; it is now a `PathLayer` over a path sliced at the
 * clock (`sand-pmz.40`), so a tick re-uploads the trail geometry.
 *
 * That sounds like it should cost frames and does not. Measured, same command
 * on the same machine: 16.5 fps playing before, 18.3 after, with the frames
 * over 50 ms falling from 99 to 80. Uploading a short sliced path is cheaper
 * than TripsLayer deriving the same trail from timestamps in the shader every
 * frame. The expected trade was checked before the swap was taken, and there
 * was no trade.
 */
import type { Layer } from '@deck.gl/core';
import { useMemo, useState } from 'react';
import type { Branch, Formation, Route, Side } from '../../packs/schema/index.js';
import { useClock } from '../ClockContext.js';
import { composeRoutes } from './movement.js';
import { buildMovementScene, type TokenDatum } from './movement-layers.js';
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
  /**
   * What a click on a token does beyond highlighting it — opening the
   * formation's card (sand-y0u.29). The highlight is the hook's own business
   * and happens either way; this is the caller's.
   */
  onSelect?: ((formationId: string) => void) | undefined;
}

export function useMovementLayers(
  source: MovementSource,
  branch: Branch,
  layout: MovementLayoutOptions = {},
): {
  layers: Layer[];
  /** The formations drawn at this instant — what the keyboard roster reads (sand-pmz.11). */
  tokens: TokenDatum[];
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
  const { project, placementKey, onSelect } = layout;
  const scene = useMemo(
    () =>
      buildMovementScene({
        routes: composed,
        now,
        rangeStart: range.start,
        sides: source.sides,
        ...(selected ? { highlight: selected } : {}),
        onSelect: (id) => {
          select((cur) => (cur === id ? undefined : id));
          onSelect?.(id);
        },
        project,
      }),
    // placementKey is a deliberate extra dependency: same projection function, new camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [composed, now, range.start, source.sides, selected, project, placementKey, onSelect],
  );
  return {
    layers: scene.layers,
    tokens: scene.tokens,
    labelBoxes: scene.labelBoxes,
    selected,
    select,
  };
}
