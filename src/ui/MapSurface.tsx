/**
 * The map surface: MapView + the data layers that ride on it. Loaded lazily
 * by the App so MapLibre and deck.gl stay out of the shell bundle. When a
 * focus region is set (zoom-in), the camera fits it; when cleared, it fits
 * the campaign region again.
 *
 * `MapSurface` itself is the assembly: gather the data, build the four layer
 * families from it, render. Every rule it used to hold inline is a hook below
 * it, named for the rule it owns — the screen projection the labels are laid
 * out in, the commander portraits, the order the label passes take, the
 * basemap's deference to the pack's own labels, the keyboard's copy of the
 * map, and what the camera is looking at.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Layer } from '@deck.gl/core';
import { useClock } from '../engine/ClockContext.js';
import {
  DEFAULT_PLACE_KINDS,
  buildPlacesLayers,
  occupiedBoxes,
  placeLabelCandidates,
  placeLabels,
  type Box,
  type LabelPlacement,
} from '../engine/layers/places.js';
import { buildStyle, type MapTheme } from '../engine/map/style.js';
import { tilesUrlFor } from '../engine/map/tiles.js';
import { useMovementLayers, type MovementSource } from '../engine/layers/useMovementLayers.js';
import { buildTallyLayers, tallyLabelCandidates, tallyMarkers } from '../engine/layers/tallies.js';
import {
  buildCommanderLayers,
  commanderLabelCandidates,
  commandersAt,
  type CommanderDatum,
} from '../engine/layers/commanders.js';
import {
  createPortraitIcons,
  type PortraitIcons,
  type PortraitSource,
} from '../engine/layers/portrait-icons.js';
import {
  MapView,
  type CameraTarget,
  type MapHandle,
  type MapInset,
} from '../engine/map/MapView.js';
import { labelNow } from '../engine/ticks.js';
import { publishMapProbe } from '../engine/map-probe.js';
import { lngSpan } from '../engine/geo.js';
import { MapObjects } from './MapObjects.js';
import { buildMapRoster } from './map-roster.js';
import type { TokenDatum } from '../engine/layers/movement-layers.js';
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

/** Screen projection, or nothing while the map has not been drawn yet. */
type Project = (lngLat: [number, number]) => [number, number] | null;
/** What one label pass decided: candidate id → where its text goes. */
type Placement = Map<string, LabelPlacement>;

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
  const { now, range } = useClock();
  const label = labelNow(now, range);
  const handle = useRef<MapHandle | null>(null);
  const { project, viewTick, follow } = useScreenProjection(handle);
  const {
    layers: movementLayers,
    tokens,
    labelBoxes,
  } = useMovementLayers(movement, branch, {
    project: viewTick > 0 ? project : undefined,
    placementKey: viewTick,
    onSelect: onSelectFormation,
  });
  const { commanders, drawCommanders } = useCommanderTokens({
    tracks,
    sides,
    showCommanders,
    labelPerson,
    portrait,
    onSelect: onSelectCommander,
  });
  const placed = useLabelPasses({
    commanders,
    tallies,
    places,
    under: labelBoxes,
    project,
    viewTick,
  });

  // The four layer families, in the order deck draws them: towns under the
  // strength markers, both under the army tokens, commanders on top. Each is
  // independent of the others — only the placements above are ordered.
  const placeLayers = useMemo(
    () => buildPlacesLayers({ places, placement: placed.places, placementKey: viewTick }),
    [places, placed.places, viewTick],
  );
  const tallyLayers = useMemo(
    () =>
      buildTallyLayers({
        tallies,
        now,
        placement: placed.tallies,
        placementKey: viewTick,
        ...(onSelectTally ? { onSelect: onSelectTally } : {}),
      }),
    [tallies, now, placed.tallies, viewTick, onSelectTally],
  );
  const commanderLayers = useMemo(
    () => drawCommanders(placed.commanders, viewTick),
    [drawCommanders, placed.commanders, viewTick],
  );
  const layers = useMemo(
    () => [...placeLayers, ...tallyLayers, ...movementLayers, ...commanderLayers],
    [placeLayers, tallyLayers, movementLayers, commanderLayers],
  );

  // What the map drew, for the visual gate to read (`sand-pmz.9.2`). A no-op
  // unless the harness set `window.__sandtableProbe` before the document
  // existed, which no page load a reader can perform will have done.
  useEffect(() => {
    publishMapProbe({ layers, region, focusRegion });
  }, [layers, region, focusRegion]);

  const { tilesUrl, styleFor } = useBasemapStyle({ places, tiles, focusTiles, focusRegion });
  const objects = useMapRoster({
    tokens,
    commanders,
    tallies,
    places,
    sides,
    onSelectFormation,
    onSelectCommander,
    onSelectTally,
  });
  useMapFraming(handle, { region, focusRegion, insetKey: insetKeyOf(inset), cameraTarget });

  return (
    <MapView
      ref={handle}
      camera={camera}
      borderYear={borderYear}
      // The historical borders are world-scale data; a zoom-in's own region is
      // what decides whether they are evidence for what is on screen
      // (`sand-neh.32`).
      focusSpanDeg={focusRegion ? lngSpan(focusRegion) : undefined}
      inset={inset}
      tilesUrl={tilesUrl}
      frontSeries={frontSeries}
      frontAt={now}
      label={`Map — ${label.date}`}
      styleFor={styleFor}
      deckLayers={layers}
      onReady={(h) => {
        handle.current = h;
        follow(h);
        if (focusRegion) h.fitRegion(focusRegion, { padding: 48, maxZoom: 11, duration: 0 });
      }}
    >
      <MapObjects objects={objects} when={label.date} />
    </MapView>
  );
}

/**
 * The screen space the labels are laid out in (sand-320, sand-4xz).
 *
 * `project` reads the live map when it is called; `viewTick` bumps on every
 * map move so the layout follows the camera, at most once per animation
 * frame. `follow` is what subscribes, once there is a map to subscribe to.
 */
function useScreenProjection(handle: RefObject<MapHandle | null>): {
  project: Project;
  viewTick: number;
  follow: (h: MapHandle) => void;
} {
  const [viewTick, setViewTick] = useState(0);
  const project = useCallback<Project>(
    (p) => {
      const map = handle.current?.getMap();
      if (!map) return null;
      const q = map.project(p);
      return Number.isFinite(q.x) && Number.isFinite(q.y) ? [q.x, q.y] : null;
    },
    [handle],
  );
  const follow = useCallback((h: MapHandle) => {
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
  return { project, viewTick, follow };
}

/**
 * Where the commanders were, as portrait tokens (sand-1l0.27).
 *
 * Portraits are cropped round on a canvas and cached per person, and they land
 * after the tokens that want them; a redraw when one arrives is what puts it
 * on the map, which is all `iconTick` is for. That tick stays inside this hook
 * — hence `drawCommanders` rather than the pieces to build the layers from:
 * the label pass has to run between the commanders and their layers (it needs
 * to know where the names are), and everything else the layers want is the
 * portrait cache's business rather than the map's.
 */
function useCommanderTokens({
  tracks,
  sides,
  showCommanders,
  labelPerson,
  portrait,
  onSelect,
}: {
  tracks: PersonTrack[];
  sides: Side[];
  showCommanders: boolean;
  labelPerson: ((personId: string) => string | undefined) | undefined;
  portrait: ((personId: string) => PortraitSource | undefined) | undefined;
  onSelect: ((personId: string) => void) | undefined;
}): {
  /** The commanders on the map at this instant — what the roster reads. */
  commanders: CommanderDatum[];
  /** Their layers, once the label pass has said where the names go. */
  drawCommanders: (placement: Placement | undefined, viewTick: number) => Layer[];
} {
  const { now } = useClock();
  const [iconTick, setIconTick] = useState(0);
  const iconsRef = useRef<PortraitIcons | null>(null);
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

  const drawCommanders = useCallback(
    (placement: Placement | undefined, viewTick: number) =>
      commanders.length
        ? buildCommanderLayers({
            tracks,
            now,
            sides,
            label: (id) => labelPerson?.(id),
            icon: (id) => icons.get(id),
            placement,
            placementKey: `${viewTick}:${iconTick}`,
            ...(onSelect ? { onSelect } : {}),
          })
        : [],
    [commanders, tracks, now, sides, labelPerson, icons, iconTick, onSelect],
  );

  return { commanders, drawCommanders };
}

/**
 * Four passes over the labels, in order of who may not be pushed aside: army
 * tokens first (laid out with the movement scene, and arriving here as
 * `under`), then the commanders, then the tally markers that sit on their
 * route, then the towns. Each pass avoids the boxes the passes before it took
 * (sand-320, sand-1l0.15, sand-1l0.27).
 *
 * Until the map has been projected once (`viewTick > 0`) there is no screen
 * space to lay anything out in, so every pass is `undefined` and each layer
 * falls back to its static slot.
 */
function useLabelPasses({
  commanders,
  tallies,
  places,
  under,
  project,
  viewTick,
}: {
  commanders: CommanderDatum[];
  tallies: Tally[];
  places: Place[];
  under: Box[];
  project: Project;
  viewTick: number;
}): {
  commanders: Placement | undefined;
  tallies: Placement | undefined;
  places: Placement | undefined;
} {
  const { now } = useClock();

  const commanderCandidates = useMemo(() => commanderLabelCandidates(commanders), [commanders]);
  const commanderPlacement = useMemo(
    () => (viewTick > 0 ? placeLabels(commanderCandidates, project, under) : undefined),
    [commanderCandidates, viewTick, project, under],
  );
  const afterCommanders = useMemo(
    () =>
      commanderPlacement
        ? [...under, ...occupiedBoxes(commanderCandidates, commanderPlacement, project)]
        : under,
    [under, commanderCandidates, commanderPlacement, project],
  );

  const tallyCandidates = useMemo(() => tallyLabelCandidates(tallies, now), [tallies, now]);
  const tallyPlacement = useMemo(
    () => (viewTick > 0 ? placeLabels(tallyCandidates, project, afterCommanders) : undefined),
    [tallyCandidates, viewTick, project, afterCommanders],
  );
  const afterTallies = useMemo(
    () =>
      tallyPlacement
        ? [...afterCommanders, ...occupiedBoxes(tallyCandidates, tallyPlacement, project)]
        : afterCommanders,
    [afterCommanders, tallyCandidates, tallyPlacement, project],
  );

  const placeCandidates = useMemo(() => placeLabelCandidates(places), [places]);
  const placePlacement = useMemo(
    () => (viewTick > 0 ? placeLabels(placeCandidates, project, afterTallies) : undefined),
    [placeCandidates, viewTick, project, afterTallies],
  );

  return useMemo(
    () => ({ commanders: commanderPlacement, tallies: tallyPlacement, places: placePlacement }),
    [commanderPlacement, tallyPlacement, placePlacement],
  );
}

/**
 * The basemap: which archive it is drawn from, and how it is styled.
 *
 * The archive is the battle's while a zoom-in with one of its own is open,
 * the pack's otherwise, and the default when neither names one. Changing it
 * restyles the map, which is why it is a URL rather than a name by the time
 * MapView sees it (sand-lry.18).
 *
 * The style's own rule is that the basemap must not label the cities the pack
 * labels itself (sand-3uq): the pack draws those with deck.gl, outside
 * MapLibre's collision system, so both would otherwise print on top of each
 * other.
 */
function useBasemapStyle({
  places,
  tiles,
  focusTiles,
  focusRegion,
}: {
  places: Place[];
  tiles: string | undefined;
  focusTiles: string | undefined;
  focusRegion: BBox | undefined;
}) {
  const tilesUrl = useMemo(
    () => tilesUrlFor(focusRegion ? (focusTiles ?? tiles) : tiles),
    [focusRegion, focusTiles, tiles],
  );
  const labelledPoints = useMemo(
    () => places.filter((p) => DEFAULT_PLACE_KINDS.includes(p.kind)).map((p) => p.lngLat),
    [places],
  );
  const styleFor = useCallback(
    (theme: MapTheme, url?: string) =>
      buildStyle({
        theme,
        ...(url ? { tilesUrl: url } : {}),
        suppressLocalityLabelsNear: labelledPoints,
      }),
    [labelledPoints],
  );
  return { tilesUrl, styleFor };
}

/**
 * The keyboard's copy of the map (sand-pmz.11) — the rules it follows are in
 * `map-roster.ts`. Built from the same data the layers are built from, at the
 * same instant, so the roster cannot claim something the map is not showing.
 */
function useMapRoster({
  tokens,
  commanders,
  tallies,
  places,
  sides,
  onSelectFormation,
  onSelectCommander,
  onSelectTally,
}: {
  tokens: TokenDatum[];
  commanders: CommanderDatum[];
  tallies: Tally[];
  places: Place[];
  sides: Side[];
  onSelectFormation: ((formationId: string) => void) | undefined;
  onSelectCommander: ((personId: string) => void) | undefined;
  onSelectTally: ((tallyId: string) => void) | undefined;
}) {
  const { now } = useClock();
  const markers = useMemo(() => tallyMarkers(tallies, now), [tallies, now]);
  return useMemo(
    () =>
      buildMapRoster({
        tokens,
        commanders,
        markers,
        places,
        sides,
        onSelectFormation,
        onSelectCommander,
        onSelectTally,
      }),
    [
      tokens,
      commanders,
      markers,
      places,
      sides,
      onSelectFormation,
      onSelectCommander,
      onSelectTally,
    ],
  );
}

/**
 * What the camera is looking at: the campaign region, the battle extent while
 * zoomed in, and a tour's own camera over both.
 */
function useMapFraming(
  handle: RefObject<MapHandle | null>,
  {
    region,
    focusRegion,
    insetKey,
    cameraTarget,
  }: {
    region: BBox;
    focusRegion: BBox | undefined;
    insetKey: string;
    cameraTarget: (CameraTarget & { key: string }) | undefined;
  },
) {
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
    // `inset` is a dependency because the framing has to answer the panel:
    // when the tour's lower third appears or goes, the same region wants a
    // different camera (sand-neh.29).
  }, [handle, focusRegion, region, insetKey]);

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
  }, [handle, cameraTarget]);
}

export default MapSurface;
