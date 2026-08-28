import { describe, expect, it } from 'vitest';
import type { MovementMode, PaceTable, Waypoint } from '../schema/index.js';
import {
  MOVEMENT_PACE,
  PACE_CEILING,
  POSITION_TOLERANCE_KM,
  paceFindings,
  paceFor,
  paceMessage,
} from './pace.js';

/** Two positions 85 km apart, a day apart, covered on foot. */
const leg = (a?: Waypoint[3], b?: Waypoint[3]): Waypoint[] => [
  (a ? [2, 49, '1914-08-20T12:00:00Z', a] : [2, 49, '1914-08-20T12:00:00Z']) as Waypoint,
  (b ? [3.16, 49, '1914-08-21T12:00:00Z', b] : [3.16, 49, '1914-08-21T12:00:00Z']) as Waypoint,
];

describe('the pace check reads confidence (sand-23b.4)', () => {
  it('keeps the old slack for the ordinary medium leg', () => {
    expect(POSITION_TOLERANCE_KM.medium).toBe(15);
  });

  it('judges a documented pair more strictly than a derived one', () => {
    expect(paceFindings(leg(), 'march', 'high')[0]?.level).toBe('error');
    expect(paceFindings(leg(), 'march', 'medium')[0]?.level).toBe('error');
    expect(paceFindings(leg(), 'march', 'low')[0]?.level).toBe('warning');
  });

  it('judges a leg at the resolution of its weaker end', () => {
    // one approximate waypoint is enough to buy the leg the wider tolerance
    expect(paceFindings(leg(undefined, 'low'), 'march', 'high')[0]?.level).toBe('warning');
  });

  it('defaults to medium when nobody says otherwise', () => {
    expect(paceFindings(leg(), 'march')).toEqual(paceFindings(leg(), 'march', 'medium'));
  });
});

// ------------------------------------------------------- era-aware bands

/** A leg `km` long on the equator, `hours` apart in time. */
const run = (km: number, hours: number): Waypoint[] => {
  const start = Date.parse('1942-06-04T00:00:00Z');
  const degrees = km / ((6371 * Math.PI) / 180);
  return [
    [0, 0, new Date(start).toISOString()],
    [degrees, 0, new Date(start + hours * 3_600_000).toISOString()],
  ];
};

const band = (sustained: number, limit: number, note: string) => ({
  sustained,
  limit,
  note,
  sources: [{ source: 'source:morison-1949' }],
});

/** What a Pacific pack would declare: 1942 hulls and airframes, nothing else. */
const pacific: PaceTable = {
  sea: band(46, 61, 'US fast carrier task force, 25–33 knots'),
  air: band(250, 550, 'Dauntless cruise to B-29 cruise'),
};

const levels = (f: ReturnType<typeof paceFindings>) => f.map((x) => x.level);

describe('the pace bands are era-aware (ADR 0020, sand-lry.2)', () => {
  it('keeps the 1914 table as the default, to the number', () => {
    expect(MOVEMENT_PACE).toEqual({
      march: { sustained: 1.7, limit: 2.7 },
      motor: { sustained: 45, limit: 70 },
      rail: { sustained: 15, limit: 30 },
      sea: { sustained: 15, limit: 40 },
      air: { sustained: 60, limit: 150 },
    });
  });

  it('judges a pack that declares nothing exactly as it did before', () => {
    for (const mode of Object.keys(MOVEMENT_PACE) as MovementMode[])
      expect(paceFor(mode, {})).toEqual({ ...MOVEMENT_PACE[mode], declared: false });
    expect(paceFindings(leg(), 'march', 'medium', {})).toEqual(paceFindings(leg(), 'march'));
  });

  it('fails a carrier task force and a dive bomber at 1914 — the defect ADR 0019 found', () => {
    // 1,000 km of open ocean in a day is 41.7 km/h: above the 1914 sea *limit*
    expect(levels(paceFindings(run(1000, 24), 'sea'))).toEqual(['error']);
    // a Dauntless strike, 900 km in four hours
    expect(levels(paceFindings(run(900, 4), 'air'))).toEqual(['error']);
  });

  it('passes both once the pack declares the bands it moved at', () => {
    expect(paceFindings(run(1000, 24), 'sea', 'medium', pacific)).toEqual([]);
    expect(paceFindings(run(900, 4), 'air', 'medium', pacific)).toEqual([]);
  });

  it('still catches the transfer written as a march, in the pack that declared bands', () => {
    // the whole reason the check exists: an 85 km day on foot is an error
    // whatever a pack has said about its ships and its aircraft
    expect(levels(paceFindings(leg(), 'march', 'medium', pacific))).toEqual(['error']);
    // and a declared mode still has a bar — 1,600 km in a day is past 33 knots
    expect(levels(paceFindings(run(1600, 24), 'sea', 'medium', pacific))).toEqual(['error']);
    // just over the declared sustained bar is the warning it was before
    expect(levels(paceFindings(run(1200, 24), 'sea', 'medium', pacific))).toEqual(['warning']);
  });

  it('leaves every mode the pack did not declare at 1914', () => {
    for (const mode of ['march', 'motor', 'rail'] as const)
      expect(paceFor(mode, pacific)).toEqual({ ...MOVEMENT_PACE[mode], declared: false });
  });

  it('says which band was broken, and offers the declaration only when there is none', () => {
    const atDefault = paceFindings(run(1000, 24), 'sea')[0]!;
    expect(paceMessage(atDefault, 'sea')).toContain('the default 1914 pace');
    expect(paceMessage(atDefault, 'sea')).toContain('pack.json#pace.sea');

    const atDeclared = paceFindings(run(1600, 24), 'sea', 'medium', pacific)[0]!;
    expect(paceMessage(atDeclared, 'sea')).toContain('this pack’s declared pace');
    expect(paceMessage(atDeclared, 'sea')).toContain('pack.json#pace.sea');
  });

  it('holds every default band under the ceiling no declaration may pass', () => {
    for (const mode of Object.keys(MOVEMENT_PACE) as MovementMode[]) {
      expect(MOVEMENT_PACE[mode].sustained).toBeLessThanOrEqual(PACE_CEILING[mode].sustained);
      expect(MOVEMENT_PACE[mode].limit).toBeLessThanOrEqual(PACE_CEILING[mode].limit);
      expect(PACE_CEILING[mode].sustained).toBeLessThanOrEqual(PACE_CEILING[mode].limit);
    }
    // and every band a Pacific pack honestly needs is under it too
    expect(pacific.sea!.limit).toBeLessThan(PACE_CEILING.sea.limit);
    expect(pacific.air!.limit).toBeLessThan(PACE_CEILING.air.limit);
  });
});
