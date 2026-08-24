import { describe, expect, it } from 'vitest';
import type { Waypoint } from '../schema/index.js';
import { POSITION_TOLERANCE_KM, paceFindings } from './pace.js';

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
