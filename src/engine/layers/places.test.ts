import { describe, expect, it } from 'vitest';
import type { Place } from '../../packs/schema/index.js';
import {
  TOKEN_SLOTS,
  buildPlacesLayers,
  occupiedBoxes,
  placeLabelCandidates,
  placeLabels,
} from './places.js';

const places: Place[] = [
  { id: 'place:liege', name: 'Liège', kind: 'fortress', lngLat: [5.573, 50.633] },
  { id: 'place:paris', name: 'Paris', kind: 'city', lngLat: [2.352, 48.857] },
  { id: 'place:mons', name: 'Mons', kind: 'town', lngLat: [3.952, 50.454] },
  { id: 'place:meuse', name: 'Meuse', kind: 'river', lngLat: [5, 50] },
];

describe('buildPlacesLayers', () => {
  it('draws cities, towns and fortresses (not rivers) with a ring for fortresses', () => {
    const layers = buildPlacesLayers({ places });
    expect(layers.map((l) => l.id)).toEqual(['places-fort-ring', 'places-dots', 'places-labels']);
    const ring = layers[0]!.props as unknown as { data: { id: string }[] };
    expect(ring.data.map((d) => d.id)).toEqual(['place:liege']);
    const dots = layers[1]!.props as unknown as { data: { id: string }[] };
    expect(dots.data.map((d) => d.id)).toEqual(['place:liege', 'place:paris', 'place:mons']);
  });

  it('honours a kinds filter', () => {
    const layers = buildPlacesLayers({ places, kinds: ['fortress'] });
    const dots = layers[1]!.props as unknown as { data: { id: string }[] };
    expect(dots.data.map((d) => d.id)).toEqual(['place:liege']);
  });

  it('applies a placement map: accessors follow it and hidden labels are dropped', () => {
    const placement = new Map([
      [
        'place:paris',
        {
          anchor: 'end' as const,
          baseline: 'center' as const,
          offset: [-7, 0] as [number, number],
          visible: true,
        },
      ],
      [
        'place:mons',
        {
          anchor: 'start' as const,
          baseline: 'center' as const,
          offset: [7, 0] as [number, number],
          visible: false,
        },
      ],
    ]);
    const layers = buildPlacesLayers({ places, placement, placementKey: 1 });
    const labels = layers[2]!.props as unknown as {
      data: { id: string }[];
      getTextAnchor: (d: { id: string }) => string;
      getPixelOffset: (d: { id: string; fortress: boolean }) => [number, number];
    };
    expect(labels.data.map((d) => d.id)).toEqual(['place:liege', 'place:paris']);
    expect(labels.getTextAnchor({ id: 'place:paris' })).toBe('end');
    expect(labels.getPixelOffset({ id: 'place:paris', fortress: false })).toEqual([-7, 0]);
    expect(labels.getTextAnchor({ id: 'place:liege' })).toBe('start'); // default
    expect(labels.getPixelOffset({ id: 'place:liege', fortress: true })).toEqual([11, 0]);
  });
});

describe('placeLabels', () => {
  // A flat projection: 1° ≈ 100 px, y down.
  const project = (p: [number, number]): [number, number] => [p[0] * 100, -p[1] * 100];
  it('lets the higher priority keep the right-hand slot and flips the neighbour left (Nancy / Toul)', () => {
    const items = placeLabelCandidates([
      { id: 'place:nancy', name: 'Nancy', kind: 'city', lngLat: [6.184, 48.692] },
      { id: 'place:toul', name: 'Toul', kind: 'fortress', lngLat: [5.892, 48.675] },
    ]);
    // 29 px apart on x: Toul's right-hand label would run into Nancy's dot/label.
    const placed = placeLabels(items, project);
    expect(placed.get('place:nancy')).toMatchObject({ anchor: 'start', visible: true });
    expect(placed.get('place:toul')).toMatchObject({
      anchor: 'end',
      offset: [-11, 0],
      visible: true,
    });
  });
  it('hides a label only when every slot is taken; a city with room always shows', () => {
    const crowd = placeLabelCandidates([
      { id: 'place:c', name: 'Capital', kind: 'city', lngLat: [0, 0] },
      // A town boxed in by four neighbours 10 px away on every side.
      { id: 'place:mid', name: 'Middle', kind: 'town', lngLat: [5, 5] },
      { id: 'place:e', name: 'East', kind: 'town', lngLat: [5.1, 5] },
      { id: 'place:w', name: 'West', kind: 'town', lngLat: [4.9, 5] },
      { id: 'place:n', name: 'North', kind: 'town', lngLat: [5, 5.1] },
      { id: 'place:s', name: 'South', kind: 'town', lngLat: [5, 4.9] },
    ]);
    const placed = placeLabels(crowd, project);
    expect(placed.get('place:c')).toMatchObject({ anchor: 'start', visible: true });
    expect(placed.get('place:mid')?.visible).toBe(false);
    expect(placed.get('place:e')?.visible).toBe(true);
    expect(placed.get('place:w')?.visible).toBe(true);
  });

  it('marks unprojectable points hidden and avoids obstacles', () => {
    const items = placeLabelCandidates([
      { id: 'place:a', name: 'Alpha', kind: 'town', lngLat: [1, 1] },
    ]);
    expect(placeLabels(items, () => null).get('place:a')?.visible).toBe(false);
    // An obstacle covering the right side pushes the label left.
    const placed = placeLabels(items, project, [{ x0: 100, y0: -110, x1: 200, y1: -90 }]);
    expect(placed.get('place:a')).toMatchObject({ anchor: 'end', visible: true });
  });

  it('honours a slot preference and reports the boxes it occupies', () => {
    const items = placeLabelCandidates([
      { id: 'place:a', name: 'Alpha', kind: 'town', lngLat: [1, 1] },
    ]);
    const above = placeLabels(items, project, [], TOKEN_SLOTS);
    expect(above.get('place:a')).toMatchObject({
      anchor: 'middle',
      baseline: 'bottom',
      visible: true,
    });
    expect(above.get('place:a')?.box).toBeDefined();
    const boxes = occupiedBoxes(items, above, project);
    // the dot and the label
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual({ x0: 96, y0: -104, x1: 104, y1: -96 });
    expect(boxes[1]!.y1).toBeLessThanOrEqual(-100 - 7);
  });
});
