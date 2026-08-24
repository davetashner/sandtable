import { describe, expect, it } from 'vitest';
import type { Waypoint } from '../packs/schema/index.js';
import { confidenceAt, isApproximate, waypointConfidence, weakest } from './confidence.js';

const w = (t: string, c?: 'high' | 'medium' | 'low' | 'contested'): Waypoint =>
  (c ? [1, 2, t, c] : [1, 2, t]) as Waypoint;

describe('waypointConfidence', () => {
  it('inherits the path when the waypoint says nothing', () => {
    expect(waypointConfidence(w('1914-08-04T00:00:00Z'), 'high')).toBe('high');
    expect(waypointConfidence(w('1914-08-04T00:00:00Z'), 'low')).toBe('low');
  });

  it('lets one waypoint be worse than the path it sits on', () => {
    expect(waypointConfidence(w('1914-08-04T00:00:00Z', 'low'), 'high')).toBe('low');
  });
});

describe('isApproximate', () => {
  it('is the two words that mean "do not read this as a pin"', () => {
    expect(isApproximate('low')).toBe(true);
    expect(isApproximate('contested')).toBe(true);
    expect(isApproximate('medium')).toBe(false);
    expect(isApproximate('high')).toBe(false);
  });
});

describe('weakest', () => {
  it('orders contested below low below medium below high', () => {
    expect(weakest('high', 'low')).toBe('low');
    expect(weakest('low', 'contested')).toBe('contested');
    expect(weakest(undefined, 'medium')).toBe('medium');
  });
});

describe('confidenceAt', () => {
  const times = [0, 10, 20];

  it('is the weaker of the two waypoints the clock is between', () => {
    const c = ['high', 'low', 'high'] as const;
    expect(confidenceAt(times, [...c], 5)).toBe('low');
    expect(confidenceAt(times, [...c], 15)).toBe('low');
  });

  it('is that end’s own outside the path', () => {
    const c = ['high', 'low', 'medium'] as const;
    expect(confidenceAt(times, [...c], -5)).toBe('high');
    expect(confidenceAt(times, [...c], 99)).toBe('medium');
  });

  it('falls back when there is nothing to read', () => {
    expect(confidenceAt([], [], 5, 'low')).toBe('low');
  });
});
