import { describe, expect, it } from 'vitest';
import type { Route, SupplyLine } from '../packs/schema/index.js';
import {
  distanceAlongKm,
  haversineKm,
  joinLegs,
  marchedAlongKm,
  routeLegs,
  routePoints,
  supplyStatus,
} from './logistics.js';

const t = (s: string) => Date.parse(s);
// 1° of longitude at 50°N ≈ 71.5 km
const army: [number, number, number][] = [
  [5, 50, t('1914-08-10T00:00:00Z')],
  [4, 50, t('1914-08-12T00:00:00Z')],
  [3, 50, t('1914-08-14T00:00:00Z')],
];
const railhead: [number, number, number][] = [
  [6, 50, t('1914-08-10T00:00:00Z')],
  [5, 50, t('1914-08-14T00:00:00Z')],
];
/** The same path as `army`, written as one march leg. */
const marchLegs = [{ points: army, mode: 'march' as const }];
const line: SupplyLine = {
  id: '1914:supply-x',
  title: 'x',
  army: '1914:army',
  railhead: '1914:rail',
  sources: [{ source: 'source:x' }],
};

describe('logistics', () => {
  it('measures distance along a route up to an instant', () => {
    expect(distanceAlongKm(army, t('1914-08-09T00:00:00Z'))).toBe(0);
    expect(distanceAlongKm(army, t('1914-08-11T00:00:00Z'))).toBeCloseTo(
      haversineKm([5, 50], [4, 50]) / 2,
      3,
    );
    expect(distanceAlongKm(army, t('1914-09-01T00:00:00Z'))).toBeCloseTo(
      2 * haversineKm([5, 50], [4, 50]),
      3,
    );
  });
  it('reads the railhead gap and the strain against the threshold', () => {
    const s = supplyStatus(
      { ...line, thresholdKm: 100 },
      marchLegs,
      railhead,
      t('1914-08-14T00:00:00Z'),
    );
    expect(s.marchedKm).toBeCloseTo(143, 0);
    expect(s.gapKm).toBeCloseTo(haversineKm([3, 50], [5, 50]), 3);
    expect(s.strained).toBe(true);
    expect(
      supplyStatus(line, marchLegs, railhead, t('1914-08-01T00:00:00Z')).gapKm,
    ).toBeUndefined();
    expect(supplyStatus(line, undefined, railhead, t('1914-08-12T00:00:00Z'))).toMatchObject({
      marchedKm: 0,
      strained: false,
    });
  });

  it('counts only what the army walked — a train ride is not marching (sand-23b.12)', () => {
    // Four points over three degrees, with the middle stretch ridden: the army
    // marches 5→4, entrains 4→3, and marches again 3→2. Legs share their
    // joins, so nothing is counted twice and nothing falls between them.
    const ridden = [
      { points: army.slice(0, 2), mode: 'march' as const },
      {
        points: [
          [4, 50, t('1914-08-12T00:00:00Z')],
          [3, 50, t('1914-08-13T00:00:00Z')],
        ] as [number, number, number][],
        mode: 'rail' as const,
      },
      {
        points: [
          [3, 50, t('1914-08-13T00:00:00Z')],
          [2, 50, t('1914-08-14T00:00:00Z')],
        ] as [number, number, number][],
        mode: 'march' as const,
      },
    ];
    const oneDegree = haversineKm([5, 50], [4, 50]);
    const now = t('1914-08-14T00:00:00Z');

    // Two marched degrees, not the three the army covered.
    expect(marchedAlongKm(ridden, now)).toBeCloseTo(2 * oneDegree, 3);
    // `distanceAlongKm(joinLegs(...))` is exactly what the gauge used to do:
    // it counts the ride, and flatters the army by a whole degree.
    expect(distanceAlongKm(joinLegs(ridden), now)).toBeCloseTo(3 * oneDegree, 3);

    // …and the position is still along the whole path, ride included, because
    // where the army *is* does not care how it got there.
    const s = supplyStatus({ ...line, thresholdKm: 100 }, ridden, railhead, now);
    expect(s.marchedKm).toBeCloseTo(2 * oneDegree, 3);
    expect(s.gapKm).toBeCloseTo(haversineKm([2, 50], [5, 50]), 3);
  });

  it('treats a leg with no mode as a march, as the renderer does', () => {
    const legs = routeLegs(
      [
        {
          id: '1914:route',
          formation: '1914:army',
          waypoints: [
            [5, 50, '1914-08-10T00:00:00Z'],
            [4, 50, '1914-08-12T00:00:00Z'],
          ],
          confidence: 'medium',
          sources: [{ source: 'source:x' }],
        },
      ],
      '1914:army',
    );
    expect(legs?.[0]?.mode).toBe('march');
    expect(marchedAlongKm(legs!, t('1914-08-12T00:00:00Z'))).toBeCloseTo(
      haversineKm([5, 50], [4, 50]),
      3,
    );
  });
  it('takes a formation’s route in all its legs, in time order, joining them once', () => {
    const leg = (id: string, waypoints: Route['waypoints']): Route => ({
      id,
      formation: '1914:army',
      waypoints,
      confidence: 'medium',
      sources: [{ source: 'source:x' }],
    });
    const routes = [
      leg('1914:route-later', [
        [4, 50, '1914-08-12T00:00:00Z'],
        [3, 50, '1914-08-14T00:00:00Z'],
      ]),
      leg('1914:route', [
        [5, 50, '1914-08-10T00:00:00Z'],
        [4, 50, '1914-08-12T00:00:00Z'],
      ]),
      {
        ...leg('1914:route-branch', [
          [3, 50, '1914-08-14T00:00:00Z'],
          [2, 50, '1914-08-16T00:00:00Z'],
        ]),
        branch: '1914:concept',
      },
    ];
    expect(routePoints(routes, '1914:army')).toEqual(army);
    expect(routePoints(routes, '1914:nobody')).toBeUndefined();
  });
});
