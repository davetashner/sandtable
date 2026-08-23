import { describe, expect, it } from 'vitest';
import type { SupplyLine } from '../packs/schema/index.js';
import { distanceAlongKm, haversineKm, supplyStatus } from './logistics.js';

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
      army,
      railhead,
      t('1914-08-14T00:00:00Z'),
    );
    expect(s.marchedKm).toBeCloseTo(143, 0);
    expect(s.gapKm).toBeCloseTo(haversineKm([3, 50], [5, 50]), 3);
    expect(s.strained).toBe(true);
    expect(supplyStatus(line, army, railhead, t('1914-08-01T00:00:00Z')).gapKm).toBeUndefined();
    expect(supplyStatus(line, undefined, railhead, t('1914-08-12T00:00:00Z'))).toMatchObject({
      marchedKm: 0,
      strained: false,
    });
  });
});
