/**
 * The keyboard's copy of the map (sand-pmz.11): the tokens, commanders and
 * strength markers the map is drawing right now, as a list `MapObjects` can
 * walk.
 *
 * Pure, and deliberately fed from the same data the layers are built from —
 * the tokens the movement scene actually drew, the commanders `commandersAt`
 * actually placed, the tally entries the clock has passed — so the roster
 * cannot claim something the map is not showing. Nothing here imports deck.gl
 * or MapLibre; it is types and arithmetic, and it is tested as such.
 */
import { haversineKm } from '../engine/geo.js';
import type { CommanderDatum } from '../engine/layers/commanders.js';
import type { TokenDatum } from '../engine/layers/movement-layers.js';
import type { MarkerDatum } from '../engine/layers/tallies.js';
import type { Place, Side } from '../packs/schema/index.js';
import type { MapObject } from './MapObjects.js';

/** Beyond this a place stops being a location and becomes a direction. */
export const ROSTER_MAX_KM = 120;
/** Under this, "near X" rather than a distance. */
export const ROSTER_NEAR_KM = 12;

/**
 * Where something is, in the map's own vocabulary.
 *
 * A lng/lat pair tells a reader nothing. The nearest town the pack has already
 * labelled does, and beyond a couple of hours' march it stops being a location
 * and becomes a direction, so past that the roster says nothing rather than
 * something misleading.
 */
export function nearestPlaceName(
  places: readonly Place[],
  at: [number, number],
): string | undefined {
  let best: { name: string; km: number } | undefined;
  for (const p of places) {
    const km = haversineKm(at, p.lngLat);
    if (!best || km < best.km) best = { name: p.name, km };
  }
  if (!best || best.km > ROSTER_MAX_KM) return undefined;
  return best.km < ROSTER_NEAR_KM
    ? `near ${best.name}`
    : `${Math.round(best.km)} km from ${best.name}`;
}

/** A side's shortest name, falling back to its id rather than to nothing. */
export function sideNameOf(sides: readonly Side[], id: string): string {
  const s = sides.find((x) => x.id === id);
  return s?.short ?? s?.name ?? id;
}

export interface RosterSources {
  /** The formations the movement scene drew at this instant. */
  tokens: readonly TokenDatum[];
  /** The commanders `commandersAt` placed at this instant. */
  commanders: readonly CommanderDatum[];
  /** The positioned tally entries the clock has passed. */
  markers: readonly MarkerDatum[];
  /** The places the pack labels — the vocabulary `where` is written in. */
  places: readonly Place[];
  sides: readonly Side[];
  onSelectFormation?: ((formationId: string) => void) | undefined;
  onSelectCommander?: ((personId: string) => void) | undefined;
  onSelectTally?: ((tallyId: string) => void) | undefined;
}

/** "sub-formation" → "Sub formation": the token's kind as a reader reads it. */
const kindOf = (k: string) => k.charAt(0).toUpperCase() + k.slice(1).replace('-', ' ');

/** The roster, in the order the map is layered: armies, commanders, strengths. */
export function buildMapRoster({
  tokens,
  commanders,
  markers,
  places,
  sides,
  onSelectFormation,
  onSelectCommander,
  onSelectTally,
}: RosterSources): MapObject[] {
  const where = (at: [number, number]) => nearestPlaceName(places, at);
  const out: MapObject[] = [];
  for (const t of tokens)
    out.push({
      id: `formation/${t.id}`,
      kind: kindOf(t.kind),
      name: t.label,
      detail: sideNameOf(sides, t.sideId),
      where: where(t.position),
      open: () => onSelectFormation?.(t.id),
    });
  for (const c of commanders)
    out.push({
      id: `commander/${c.id}`,
      kind: c.kind === 'hq' ? 'Headquarters' : 'Commander',
      name: c.name,
      detail: c.post,
      where: where(c.position),
      open: () => onSelectCommander?.(c.person),
    });
  for (const m of markers)
    out.push({
      id: `tally/${m.id}`,
      kind: 'Strength',
      name: m.label,
      detail: m.entryLabel,
      where: where(m.position),
      open: () => onSelectTally?.(m.tallyId),
    });
  return out;
}
