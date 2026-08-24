/**
 * The map surface: MapView + the data layers that ride on it. Loaded lazily
 * by the App so MapLibre and deck.gl stay out of the shell bundle. When a
 * focus region is set (zoom-in), the camera fits it; when cleared, it fits
 * the campaign region again.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClock } from '../engine/ClockContext.js';
import {
  DEFAULT_PLACE_KINDS,
  buildPlacesLayers,
  occupiedBoxes,
  placeLabelCandidates,
  placeLabels,
} from '../engine/layers/places.js';
import { buildStyle, type MapTheme } from '../engine/map/style.js';
import { useMovementLayers, type MovementSource } from '../engine/layers/useMovementLayers.js';
import { buildTallyLayers, tallyLabelCandidates } from '../engine/layers/tallies.js';
import {
  buildCommanderLayers,
  commanderLabelCandidates,
  commandersAt,
} from '../engine/layers/commanders.js';
import { createPortraitIcons, type PortraitSource } from '../engine/layers/portrait-icons.js';
import { MapView, type CameraTarget, type MapHandle } from '../engine/map/MapView.js';
import { labelNow } from '../engine/ticks.js';
import type {
  BBox,
  Branch,
  Camera,
  PersonTrack,
  Place,
  Side,
  Tally,
} from '../packs/schema/index.js';

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
  /** Strength ledgers whose positioned entries appear as markers (sand-1l0.19). */
  tallies?: Tally[];
  /** Where the commanders were, as portrait tokens (sand-1l0.27). */
  tracks?: PersonTrack[];
  /** Sides, for the ring colour on a commander token. */
  sides?: Side[];
  /** Off by default: the portraits are a second population on a busy map. */
  showCommanders?: boolean;
  /** person id → display name, for the commander labels. */
  labelPerson?: ((personId: string) => string | undefined) | undefined;
  /** person id → the portrait to crop into a token. */
  portrait?: ((personId: string) => PortraitSource | undefined) | undefined;
  onSelectCommander?: ((personId: string) => void) | undefined;
  /** Clicking an army token opens that formation's card (sand-y0u.29). */
  onSelectFormation?: ((formationId: string) => void) | undefined;
  /**
   * A camera a guided tour asks for (sand-1l0.14). Applied whenever `key`
   * changes, after the region fit, so a tour step can frame something closer
   * than the campaign or battle extent.
   */
  cameraTarget?: (CameraTarget & { key: string }) | undefined;
  onSelectTally?: ((tallyId: string) => void) | undefined;
}

export function MapSurface({
  camera,
  borderYear,
  branch,
  movement,
  region,
  focusRegion,
  places = [],
  tallies = [],
  tracks = [],
  sides = [],
  showCommanders = false,
  labelPerson,
  portrait,
  onSelectCommander,
  onSelectFormation,
  onSelectTally,
  cameraTarget,
}: MapSurfaceProps) {
  const { now, range } = useClock();
  const label = labelNow(now, range);
  const handle = useRef<MapHandle | null>(null);
  // Labels are laid out in screen space (sand-320, sand-4xz): tokens first,
  // then places around them. `viewTick` bumps on every map move so the layout
  // follows the camera; `project` reads the live map when called.
  const [viewTick, setViewTick] = useState(0);
  const project = useCallback((p: [number, number]): [number, number] | null => {
    const map = handle.current?.getMap();
    if (!map) return null;
    const q = map.project(p);
    return Number.isFinite(q.x) && Number.isFinite(q.y) ? [q.x, q.y] : null;
  }, []);
  const { layers: movementLayers, labelBoxes } = useMovementLayers(movement, branch, {
    project: viewTick > 0 ? project : undefined,
    placementKey: viewTick,
    onSelect: onSelectFormation,
  });
  // Portraits are cropped round on a canvas and cached per person; a redraw
  // when one lands is what puts it on the map (sand-1l0.27).
  const [iconTick, setIconTick] = useState(0);
  const iconsRef = useRef<ReturnType<typeof createPortraitIcons> | null>(null);
  iconsRef.current ??= createPortraitIcons(() => setIconTick((n) => n + 1));
  const icons = iconsRef.current;

  const commanders = useMemo(
    () =>
      showCommanders
        ? commandersAt({
            tracks,
            now,
            sides,
            label: (id) => labelPerson?.(id),
            icon: (id) => icons.get(id),
          })
        : [],
    // iconTick is a deliberate extra dependency: same inputs, a new portrait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showCommanders, tracks, now, sides, labelPerson, icons, iconTick],
  );
  useEffect(() => {
    if (!portrait) return;
    for (const c of commanders) icons.request(c.person, portrait(c.person));
  }, [commanders, portrait, icons]);

  // Four passes, in order of who may not be pushed aside: army tokens first
  // (above), then the commanders, then the tally markers that sit on their
  // route, then the towns. Each avoids the boxes the passes before it took
  // (sand-320, sand-1l0.15, sand-1l0.27).
  const commanderCandidates = useMemo(() => commanderLabelCandidates(commanders), [commanders]);
  const commanderPlacement = useMemo(
    () => (viewTick > 0 ? placeLabels(commanderCandidates, project, labelBoxes) : undefined),
    [commanderCandidates, viewTick, project, labelBoxes],
  );
  const afterCommanders = useMemo(
    () =>
      commanderPlacement
        ? [...labelBoxes, ...occupiedBoxes(commanderCandidates, commanderPlacement, project)]
        : labelBoxes,
    [labelBoxes, commanderCandidates, commanderPlacement, project],
  );
  const tallyCandidates = useMemo(() => tallyLabelCandidates(tallies, now), [tallies, now]);
  const tallyPlacement = useMemo(
    () => (viewTick > 0 ? placeLabels(tallyCandidates, project, afterCommanders) : undefined),
    [tallyCandidates, viewTick, project, afterCommanders],
  );
  const takenBoxes = useMemo(
    () =>
      tallyPlacement
        ? [...afterCommanders, ...occupiedBoxes(tallyCandidates, tallyPlacement, project)]
        : afterCommanders,
    [afterCommanders, tallyCandidates, tallyPlacement, project],
  );
  const commanderLayers = useMemo(
    () =>
      commanders.length
        ? buildCommanderLayers({
            tracks,
            now,
            sides,
            label: (id) => labelPerson?.(id),
            icon: (id) => icons.get(id),
            placement: commanderPlacement,
            placementKey: `${viewTick}:${iconTick}`,
            ...(onSelectCommander ? { onSelect: onSelectCommander } : {}),
          })
        : [],
    [
      commanders,
      tracks,
      now,
      sides,
      labelPerson,
      icons,
      commanderPlacement,
      viewTick,
      iconTick,
      onSelectCommander,
    ],
  );
  const candidates = useMemo(() => placeLabelCandidates(places), [places]);
  const placeLayers = useMemo(() => {
    const placement = viewTick > 0 ? placeLabels(candidates, project, takenBoxes) : undefined;
    return buildPlacesLayers({ places, placement, placementKey: viewTick });
  }, [places, candidates, viewTick, project, takenBoxes]);
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
  const tallyLayers = useMemo(
    () =>
      buildTallyLayers({
        tallies,
        now,
        placement: tallyPlacement,
        placementKey: viewTick,
        ...(onSelectTally ? { onSelect: onSelectTally } : {}),
      }),
    [tallies, now, tallyPlacement, viewTick, onSelectTally],
  );
  const layers = useMemo(
    () => [...placeLayers, ...tallyLayers, ...movementLayers, ...commanderLayers],
    [placeLayers, tallyLayers, movementLayers, commanderLayers],
  );
  const first = useRef(true);

  // Re-lay-out labels as the camera moves (one layout per animation frame at most).
  const onReadyLayout = useCallback((h: MapHandle) => {
    const map = h.getMap();
    if (!map) return;
    let raf = 0;
    const bump = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setViewTick((t) => t + 1);
      });
    };
    map.on('move', bump);
    map.on('resize', bump);
    bump();
  }, []);

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

  // A tour's camera wins over the region fit for as long as the step lasts.
  const lastCameraKey = useRef<string | null>(null);
  useEffect(() => {
    if (!cameraTarget) {
      lastCameraKey.current = null;
      return;
    }
    if (lastCameraKey.current === cameraTarget.key) return;
    const h = handle.current;
    if (!h) return;
    lastCameraKey.current = cameraTarget.key;
    const { key: _key, ...target } = cameraTarget;
    h.flyTo(target);
  }, [cameraTarget]);

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
        onReadyLayout(h);
        if (focusRegion) h.fitRegion(focusRegion, { padding: 48, maxZoom: 11, duration: 0 });
      }}
    />
  );
}

export default MapSurface;
