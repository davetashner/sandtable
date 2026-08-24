/**
 * Commander tracks (sand-1l0.27): the men, as portrait tokens, moving with the
 * clock beside the armies they commanded.
 *
 * Two kinds, and the layer keeps the difference visible. An `hq` track is the
 * headquarters an army was run from — solid ring, and the UI calls it a
 * headquarters, because a pin on Koblenz is not a claim that Moltke was
 * standing there at that hour. A `journey` track is the man himself at the
 * hours the sources give, and rings dashed to say so.
 *
 * Pure, like the other layer builders: the caller supplies the clock, the
 * icons and the screen projection.
 */
import type { Layer } from '@deck.gl/core';
import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { PersonTrack, Side } from '../../packs/schema/index.js';
import { sideColor, tokenColor, type RGBA } from './colors.js';
import { positionAt } from './movement.js';
import { PLACE_SLOTS, type LabelCandidate, type LabelPlacement } from './places.js';

/** Radius of a portrait token in screen pixels; the ring sits just outside it. */
export const COMMANDER_RADIUS = 13;

export interface CommanderDatum {
  /** The track's id — unique, and what a click reports. */
  id: string;
  person: string;
  name: string;
  kind: PersonTrack['kind'];
  /** "OHL", "GQG" — present on an hq track. */
  post: string | undefined;
  /** What the token reads: the name, and the headquarters when there is one. */
  tokenLabel: string;
  position: [number, number];
  color: RGBA;
  /** Data URL of the circular portrait, when one has been made. */
  icon: string | undefined;
}

export interface CommanderLayerOptions {
  tracks: PersonTrack[];
  now: number;
  sides: Side[];
  /**
   * person id → the name for the token. Short: a map at campaign zoom cannot
   * carry "Helmuth von Moltke the Younger" beside every other label.
   */
  label: (personId: string) => string | undefined;
  /** person id → circular portrait data URL, once loaded. */
  icon: (personId: string) => string | undefined;
  /** Screen-space label placement, as for places and tokens. */
  placement?: ReadonlyMap<string, LabelPlacement> | undefined;
  placementKey?: string | number | undefined;
  onSelect?: ((personId: string) => void) | undefined;
}

/**
 * Which commanders are on the map at `now`, and where. A track shows only
 * inside its own span: an hq track that has not begun is not yet a
 * headquarters, and a journey is over when the man got back.
 */
export function commandersAt(o: CommanderLayerOptions): CommanderDatum[] {
  const out: CommanderDatum[] = [];
  for (const tk of o.tracks) {
    const points = tk.waypoints.map(
      (w) => [w[0], w[1], Date.parse(w[2])] as [number, number, number],
    );
    const first = points[0]![2];
    const last = points[points.length - 1]![2];
    if (o.now < first || o.now > last) continue;
    const pos = positionAt(points, o.now);
    const side = tk.side ? o.sides.find((x) => x.id === tk.side) : undefined;
    out.push({
      id: tk.id,
      person: tk.person,
      name: o.label(tk.person) ?? tk.person,
      // An hq pin is a headquarters, not the man, and the token says so: the
      // reader should not read "Moltke" at Luxembourg as Moltke standing there
      // (sand-1l0.27). A journey is the man, and carries his name alone.
      tokenLabel:
        tk.kind === 'hq' && (tk.postShort ?? tk.post)
          ? `${o.label(tk.person) ?? tk.person} · ${tk.postShort ?? tk.post}`
          : (o.label(tk.person) ?? tk.person),
      kind: tk.kind,
      post: tk.post,
      position: pos.lngLat,
      color: side ? sideColor(side, o.sides) : tokenColor('--brass'),
      icon: o.icon(tk.person),
    });
  }
  return out;
}

/** Label candidates for the placement pass — the commander's name, above the token. */
export function commanderLabelCandidates(data: CommanderDatum[]): LabelCandidate[] {
  return data.map((d) => ({
    id: d.id,
    text: d.tokenLabel,
    position: d.position,
    priority: 1,
    size: 11,
    gap: COMMANDER_RADIUS + 5,
    radius: COMMANDER_RADIUS + 2,
  }));
}

export const COMMANDER_SLOTS = PLACE_SLOTS;

export function buildCommanderLayers(o: CommanderLayerOptions): Layer[] {
  const data = commandersAt(o);
  const ink = tokenColor('--ink');
  const panel = tokenColor('--panel');
  const withIcon = data.filter((d) => d.icon);
  const withoutIcon = data.filter((d) => !d.icon);
  const labelData = o.placement
    ? data.filter((d) => o.placement!.get(d.id)?.visible !== false)
    : data;

  return [
    // The ring: side colour, and dashed-looking for a journey — a journey is
    // the man, an hq is a place, and they must not read the same.
    new ScatterplotLayer<CommanderDatum>({
      id: 'commander-rings',
      data,
      getPosition: (d) => d.position,
      getRadius: COMMANDER_RADIUS + 2,
      radiusUnits: 'pixels',
      filled: true,
      getFillColor: () => panel,
      stroked: true,
      getLineColor: (d) => d.color,
      getLineWidth: (d) => (d.kind === 'journey' ? 3 : 2),
      lineWidthUnits: 'pixels',
      pickable: true,
      onClick: (info) => {
        const d = info.object as CommanderDatum | undefined;
        if (d) o.onSelect?.(d.person);
      },
      updateTriggers: { getLineWidth: [o.now] },
    }),
    // A commander whose portrait has not loaded (or who has none) is still on
    // the map — a filled disc in his side's colour, not a hole.
    new ScatterplotLayer<CommanderDatum>({
      id: 'commander-fallback',
      data: withoutIcon,
      getPosition: (d) => d.position,
      getRadius: COMMANDER_RADIUS,
      radiusUnits: 'pixels',
      filled: true,
      getFillColor: (d) => d.color,
      pickable: false,
    }),
    new IconLayer<CommanderDatum>({
      id: 'commander-portraits',
      data: withIcon,
      getPosition: (d) => d.position,
      getIcon: (d) => ({
        url: d.icon!,
        width: 128,
        height: 128,
        id: d.person,
        mask: false,
      }),
      getSize: COMMANDER_RADIUS * 2,
      sizeUnits: 'pixels',
      pickable: false,
      updateTriggers: { getIcon: [withIcon.map((d) => d.icon).join('|')] },
    }),
    new TextLayer<CommanderDatum>({
      id: 'commander-labels',
      data: labelData,
      getPosition: (d) => d.position,
      getText: (d) => d.tokenLabel,
      getSize: 11,
      sizeUnits: 'pixels',
      getColor: () => ink,
      getTextAnchor: (d) => o.placement?.get(d.id)?.anchor ?? 'middle',
      getAlignmentBaseline: (d) => o.placement?.get(d.id)?.baseline ?? 'bottom',
      getPixelOffset: (d) => o.placement?.get(d.id)?.offset ?? [0, -(COMMANDER_RADIUS + 5)],
      updateTriggers: {
        getTextAnchor: o.placementKey,
        getAlignmentBaseline: o.placementKey,
        getPixelOffset: o.placementKey,
      },
      fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
      fontWeight: 600,
      outlineWidth: 3,
      outlineColor: panel,
      fontSettings: { sdf: true },
      characterSet: 'auto',
      pickable: false,
    }),
  ];
}
