import { describe, expect, it } from 'vitest';
import type { Place } from '../../packs/schema/index.js';
import { buildPlacesLayers } from './places.js';

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
});
