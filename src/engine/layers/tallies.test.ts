import { describe, expect, it } from 'vitest';
import type { Tally } from '../../packs/schema/index.js';
import { buildTallyLayers } from './tallies.js';

const tally: Tally = {
  id: '1914:tally-x',
  title: 'Right wing',
  unit: 'corps',
  start: { value: 16, asOf: '1914-08-17T00:00:00Z' },
  entries: [
    { id: 'a', at: '1914-08-20T12:00:00Z', delta: -1, label: 'A', lngLat: [4.45, 51.05] },
    { id: 'b', at: '1914-08-26T00:00:00Z', delta: -2, label: 'B', lngLat: [4.87, 50.47] },
    { id: 'c', at: '1914-08-28T12:00:00Z', delta: 1, label: 'C' },
  ],
  sources: [{ source: 'source:x' }],
};

describe('buildTallyLayers', () => {
  it('shows a marker per positioned entry the clock has passed, labelled with the delta', () => {
    const layers = buildTallyLayers({ tallies: [tally], now: Date.parse('1914-08-22T00:00:00Z') });
    const markers = layers[0]!.props as unknown as { data: { id: string; label: string }[] };
    expect(markers.data.map((d) => d.id)).toEqual(['1914:tally-x/a']);
    expect(markers.data[0]!.label).toBe('−1 corps');
    const later = buildTallyLayers({ tallies: [tally], now: Date.parse('1914-09-01T00:00:00Z') });
    expect((later[0]!.props as unknown as { data: unknown[] }).data).toHaveLength(2); // c has no position
  });
});
