import { describe, expect, it, vi } from 'vitest';
import { buildMapRoster, nearestPlaceName } from './map-roster.js';
import type { CommanderDatum } from '../engine/layers/commanders.js';
import type { TokenDatum } from '../engine/layers/movement-layers.js';
import type { MarkerDatum } from '../engine/layers/tallies.js';
import type { Place, Side } from '../packs/schema/index.js';

const place = (id: string, name: string, lngLat: [number, number]): Place => ({
  id,
  name,
  kind: 'city',
  lngLat,
});

// Liège and Namur are about 50 km apart; Brussels is about 50 km from Namur
// and about 85 km from Liège.
const LIEGE: [number, number] = [5.5718, 50.6326];
const NAMUR: [number, number] = [4.8674, 50.4674];
const BRUSSELS: [number, number] = [4.3517, 50.8503];
const PLACES = [place('place:liege', 'Liège', LIEGE), place('place:namur', 'Namur', NAMUR)];

const SIDES: Side[] = [
  { id: 'de', name: 'German Empire', short: 'Germany' },
  { id: 'be', name: 'Belgium' },
];

const token = (over: Partial<TokenDatum> = {}): TokenDatum => ({
  id: 'formation:de-1',
  kind: 'army',
  sideId: 'de',
  label: '1. Armee',
  position: LIEGE,
  color: [0, 0, 0, 255],
  radius: 8,
  phase: 'moving',
  hypothetical: false,
  approximate: false,
  ...over,
});

const commander = (over: Partial<CommanderDatum> = {}): CommanderDatum => ({
  id: 'track:kluck',
  person: 'person:kluck',
  name: 'von Kluck',
  kind: 'journey',
  post: undefined,
  tokenLabel: 'von Kluck',
  position: NAMUR,
  color: [0, 0, 0, 255],
  icon: undefined,
  approximate: false,
  ...over,
});

const marker = (over: Partial<MarkerDatum> = {}): MarkerDatum => ({
  id: 'tally:right-wing/1',
  tallyId: 'tally:right-wing',
  position: LIEGE,
  label: '−2 corps',
  entryLabel: 'to East Prussia',
  sign: 'minus',
  ...over,
});

describe('nearestPlaceName', () => {
  it('names the nearest place, and says "near" when it is close enough to be one', () => {
    expect(nearestPlaceName(PLACES, LIEGE)).toBe('near Liège');
    // A few kilometres west of Liège is still Liège.
    expect(nearestPlaceName(PLACES, [5.5, 50.63])).toBe('near Liège');
  });

  it('gives the distance once the place is a march away rather than a location', () => {
    const where = nearestPlaceName(PLACES, BRUSSELS);
    expect(where).toMatch(/^\d+ km from Namur$/);
  });

  it('says nothing at all past 120 km, rather than something misleading', () => {
    // Berlin: far from every place the pack has labelled.
    expect(nearestPlaceName(PLACES, [13.405, 52.52])).toBeUndefined();
    expect(nearestPlaceName([], LIEGE)).toBeUndefined();
  });
});

describe('buildMapRoster', () => {
  it('lists the formations, the commanders and the strength markers, in that order', () => {
    const roster = buildMapRoster({
      tokens: [token()],
      commanders: [commander()],
      markers: [marker()],
      places: PLACES,
      sides: SIDES,
    });
    expect(roster.map((o) => o.id)).toEqual([
      'formation/formation:de-1',
      'commander/track:kluck',
      'tally/tally:right-wing/1',
    ]);
    expect(roster.map((o) => o.kind)).toEqual(['Army', 'Commander', 'Strength']);
    expect(roster.map((o) => o.where)).toEqual(['near Liège', 'near Namur', 'near Liège']);
  });

  it('names the kind as a reader reads it, and a headquarters as a headquarters', () => {
    const roster = buildMapRoster({
      tokens: [token({ kind: 'army-group' })],
      commanders: [commander({ kind: 'hq', post: 'OHL' })],
      markers: [],
      places: PLACES,
      sides: SIDES,
    });
    expect(roster[0]?.kind).toBe('Army group');
    expect(roster[1]?.kind).toBe('Headquarters');
    expect(roster[1]?.detail).toBe('OHL');
  });

  it("uses a side's short name, and falls back to its id rather than to nothing", () => {
    const roster = buildMapRoster({
      tokens: [token(), token({ id: 'formation:be-3', sideId: 'be' }), token({ sideId: 'ru' })],
      commanders: [],
      markers: [],
      places: PLACES,
      sides: SIDES,
    });
    expect(roster.map((o) => o.detail)).toEqual(['Germany', 'Belgium', 'ru']);
  });

  it('opens what each object is: the formation, the person, the ledger', () => {
    const onSelectFormation = vi.fn();
    const onSelectCommander = vi.fn();
    const onSelectTally = vi.fn();
    const roster = buildMapRoster({
      tokens: [token()],
      commanders: [commander()],
      markers: [marker()],
      places: PLACES,
      sides: SIDES,
      onSelectFormation,
      onSelectCommander,
      onSelectTally,
    });
    for (const o of roster) o.open();
    expect(onSelectFormation).toHaveBeenCalledWith('formation:de-1');
    expect(onSelectCommander).toHaveBeenCalledWith('person:kluck');
    expect(onSelectTally).toHaveBeenCalledWith('tally:right-wing');
  });

  it('is inert when nothing is listening', () => {
    const roster = buildMapRoster({
      tokens: [token()],
      commanders: [commander()],
      markers: [marker()],
      places: PLACES,
      sides: SIDES,
    });
    expect(() => roster.forEach((o) => o.open())).not.toThrow();
  });
});
