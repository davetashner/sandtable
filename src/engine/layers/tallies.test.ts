import { describe, expect, it } from 'vitest';
import type { Tally } from '../../packs/schema/index.js';
import { placeLabels } from './places.js';
import { buildTallyLayers, tallyLabelCandidates } from './tallies.js';

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

  it('lays its labels out with the other labels rather than over them', () => {
    // A marker sits where an army passed, so without a shared pass its label
    // lands on the army's own (sand-1l0.15). Two markers 6px apart in screen
    // space: the second must take another slot, or none.
    const now = Date.parse('1914-09-01T00:00:00Z');
    const candidates = tallyLabelCandidates([tally], now);
    expect(candidates.map((c) => c.text)).toEqual(['−1 corps', '−2 corps']);

    const screen = new Map<string, [number, number]>([
      ['1914:tally-x/a', [200, 200]],
      ['1914:tally-x/b', [206, 200]],
    ]);
    const placement = placeLabels(candidates, (p) =>
      p[0] === 4.45 ? screen.get('1914:tally-x/a')! : screen.get('1914:tally-x/b')!,
    );
    const a = placement.get('1914:tally-x/a')!;
    const b = placement.get('1914:tally-x/b')!;
    expect(a.visible).toBe(true);
    expect(b.visible && b.offset).not.toEqual(a.offset);

    // …and a hidden label is dropped from the layer's data, not drawn under another.
    const hiding = new Map(
      [...placement].map(([k, v]) => [k, { ...v, visible: k.endsWith('/b') ? false : v.visible }]),
    );
    const layers = buildTallyLayers({ tallies: [tally], now, placement: hiding, placementKey: 1 });
    const labels = layers[1]!.props as unknown as { data: { id: string }[] };
    expect(labels.data.map((d) => d.id)).toEqual(['1914:tally-x/a']);
  });
});
