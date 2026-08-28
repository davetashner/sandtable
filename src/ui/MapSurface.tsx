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
import { tilesUrlFor } from '../engine/map/tiles.js';
import { useMovementLayers, type MovementSource } from '../engine/layers/useMovementLayers.js';
import { buildTallyLayers, tallyLabelCandidates, tallyMarkers } from '../engine/layers/tallies.js';
import {
  buildCommanderLayers,
  commanderLabelCandidates,
  commandersAt,
} from '../engine/layers/commanders.js';
import { createPortraitIcons, type PortraitSource } from '../engine/layers/portrait-icons.js';
import {
  MapView,
  type CameraTarget,
  type MapHandle,
  type MapInset,
} from '../engine/map/MapView.js';
import { labelNow } from '../engine/ticks.js';
import { haversineKm } from '../engine/geo.js';
import { MapObjects, type MapObject } from './MapObjects.js';
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
  /** Shared front-line series to draw under the clock (`pack.frontLine`). */
  frontSeries?: string | undefined;
  /** Edges an overlay covers, kept clear by every camera move (sand-neh.29). */
  inset?: MapInset | undefined;
  branch: Branch;
  movement: MovementSource;
  /** Campaign extent, fitted when leaving a zoom-in. */
  region: BBox;
  /** Basemap archive the pack names (`pack.tiles`); omit for the default. */
  tiles?: string | undefined;
  /** Battle extent while zoomed in. */
  focusRegion?: BBox | undefined;
  /**
   * The zoom-in's own archive (`battle.tiles`), for an assault at a scale the
   * campaign's archive does not reach — Betio at z14 is not inside
   * `central-pacific-z10` (ADR 0002). Omit to stay on the pack's.
   */
  focusTiles?: string | undefined;
  /** Cities and fortresses to label. */
  places?: Place[];
  /** Strength ledgers whose positioned entries appear as markers (sand-1l0.19). */
  tallies?: Tally[];
  /** Where the commanders were, as portrait tokens (sand-1l0.27). */
  tracks?: PersonTrack[];
  /** Sides, for the ring colour on a commander token. */
  sides?: Side[];
  /** On by default since sand-neh.30; the switch in the header turns them off. */
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

/** A stable identity for the inset, so an inline literal cannot refit forever. */
const insetKeyOf = (i?: MapInset) =>
  i ? `${i.top ?? 0}:${i.right ?? 0}:${i.bottom ?? 0}:${i.left ?? 0}` : '';

export function MapSurface({
  camera,
  borderYear,
  frontSeries,
  inset,
  branch,
  movement,
  region,
  tiles,
  focusRegion,
  focusTiles,
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
  const insetKey = insetKeyOf(inset);
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
  const {
    layers: movementLayers,
    tokens,
    labelBoxes,
  } = useMovementLayers(movement, branch, {
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
  // Which archive the map is drawn on: the battle's while a zoom-in with one
  // of its own is open, the pack's otherwise, the default when neither names
  // one. Changing it restyles the map, which is why it is a URL rather than a
  // name by the time MapView sees it (sand-lry.18).
  const tilesUrl = useMemo(
    () => tilesUrlFor(focusRegion ? (focusTiles ?? tiles) : tiles),
    [focusRegion, focusTiles, tiles],
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

  // The keyboard's copy of the map (sand-pmz.11). Built from the same data the
  // layers are built from — the tokens the movement scene actually drew, the
  // commanders `commandersAt` actually placed, the tally entries the clock has
  // passed — so the roster cannot claim something the map is not showing.
  const nearest = useCallback(
    (at: [number, number]) => {
      let best: { name: string; km: number } | undefined;
      for (const p of places) {
        const km = haversineKm(at, p.lngLat);
        if (!best || km < best.km) best = { name: p.name, km };
      }
      // A lng/lat pair tells a reader nothing. The nearest town the pack has
      // already labelled is the map's own vocabulary, and beyond a couple of
      // hours' march it stops being a location and becomes a direction, so
      // past that the roster says nothing rather than something misleading.
      if (!best || best.km > 120) return undefined;
      return best.km < 12 ? `near ${best.name}` : `${Math.round(best.km)} km from ${best.name}`;
    },
    [places],
  );
  const sideName = useCallback(
    (id: string) => {
      const s = sides.find((x) => x.id === id);
      return s?.short ?? s?.name ?? id;
    },
    [sides],
  );
  const objects = useMemo<MapObject[]>(() => {
    const kindOf = (k: string) => k.charAt(0).toUpperCase() + k.slice(1).replace('-', ' ');
    const out: MapObject[] = [];
    for (const t of tokens)
      out.push({
        id: `formation/${t.id}`,
        kind: kindOf(t.kind),
        name: t.label,
        detail: sideName(t.sideId),
        where: nearest(t.position),
        open: () => onSelectFormation?.(t.id),
      });
    for (const c of commanders)
      out.push({
        id: `commander/${c.id}`,
        kind: c.kind === 'hq' ? 'Headquarters' : 'Commander',
        name: c.name,
        detail: c.post,
        where: nearest(c.position),
        open: () => onSelectCommander?.(c.person),
      });
    for (const m of tallyMarkers(tallies, now))
      out.push({
        id: `tally/${m.id}`,
        kind: 'Strength',
        name: m.label,
        detail: m.entryLabel,
        where: nearest(m.position),
        open: () => onSelectTally?.(m.tallyId),
      });
    return out;
  }, [
    tokens,
    commanders,
    tallies,
    now,
    nearest,
    sideName,
    onSelectFormation,
    onSelectCommander,
    onSelectTally,
  ]);
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
    // `inset` is a dependency because the framing has to answer the panel:
    // when the tour's lower third appears or goes, the same region wants a
    // different camera (sand-neh.29).
  }, [focusRegion, region, insetKey]);

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
      inset={inset}
      tilesUrl={tilesUrl}
      frontSeries={frontSeries}
      frontAt={now}
      label={`Map — ${label.date}`}
      styleFor={styleFor}
      deckLayers={layers}
      onReady={(h) => {
        handle.current = h;
        onReadyLayout(h);
        if (focusRegion) h.fitRegion(focusRegion, { padding: 48, maxZoom: 11, duration: 0 });
      }}
    >
      <MapObjects objects={objects} when={label.date} />
    </MapView>
  );
}

export default MapSurface;
