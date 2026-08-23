import { describe, expect, it } from 'vitest';
import type { Tour, TourStep } from '../packs/schema/index.js';
import {
  DEFAULT_HOLD_SECONDS,
  diverged,
  holdMs,
  resolvePosition,
  tourMinutes,
  viewForStep,
} from './tour.js';

const T = (s: string) => Date.parse(s);

const step = (over: Partial<TourStep> & { id: string }): TourStep => ({
  title: 'A step',
  narration: 'Narration.',
  at: '1914-08-04T00:00:00Z',
  ...over,
});

const tour: Tour = {
  id: '1914:tour-campaign',
  title: 'The campaign',
  summary: 'A pass over the campaign.',
  sources: [{ source: 'source:herwig-2009' }],
  steps: [
    step({ id: 'opening' }),
    step({ id: 'liege', at: '1914-08-05T00:00:00Z', focus: '1914:liege' }),
    step({
      id: 'retreat',
      at: '1914-08-25T00:00:00Z',
      playUntil: '1914-08-30T00:00:00Z',
      card: '1914:tally-right-wing',
    }),
    step({ id: 'concept', at: '1914-08-30T00:00:00Z', branch: '1914:schlieffen-concept' }),
  ],
};

describe('resolvePosition', () => {
  it('resolves a tour and step from the URL slots', () => {
    const p = resolvePosition([tour], '1914:tour-campaign', 'retreat');
    expect(p?.index).toBe(2);
    expect(p?.step.id).toBe('retreat');
    expect(p?.key).toBe('1914:tour-campaign|retreat');
  });
  it('falls back to the first step when the step is missing or unknown', () => {
    expect(resolvePosition([tour], '1914:tour-campaign', undefined)?.step.id).toBe('opening');
    expect(resolvePosition([tour], '1914:tour-campaign', 'nope')?.step.id).toBe('opening');
  });
  it('is no tour at all when the tour id is absent or unknown', () => {
    expect(resolvePosition([tour], undefined, 'liege')).toBeUndefined();
    expect(resolvePosition([tour], '1914:tour-missing', undefined)).toBeUndefined();
  });
});

describe('viewForStep', () => {
  const DEFAULT = '1914:historical';
  it('reads the instant and leaves unnamed slots at their defaults', () => {
    expect(viewForStep(step({ id: 'a' }), DEFAULT)).toEqual({ t: T('1914-08-04T00:00:00Z') });
  });
  it('carries focus, card and the play window', () => {
    expect(viewForStep(tour.steps[2]!, DEFAULT)).toEqual({
      t: T('1914-08-25T00:00:00Z'),
      playTo: T('1914-08-30T00:00:00Z'),
      card: '1914:tally-right-wing',
    });
    expect(viewForStep(tour.steps[1]!, DEFAULT).focus).toBe('1914:liege');
  });
  it('treats the default branch as no branch slot, as the toggle does', () => {
    expect(viewForStep(step({ id: 'a', branch: DEFAULT }), DEFAULT).branch).toBeUndefined();
    expect(viewForStep(tour.steps[3]!, DEFAULT).branch).toBe('1914:schlieffen-concept');
  });
});

describe('diverged', () => {
  const expected = viewForStep(tour.steps[2]!, '1914:historical'); // 25 → 30 Aug, a card open
  const inWindow = T('1914-08-27T00:00:00Z');
  const slots = { card: '1914:tally-right-wing' };
  it('is false while the view matches and the clock plays inside the step', () => {
    expect(diverged(expected, slots, inWindow)).toBe(false);
    expect(diverged(expected, slots, T('1914-08-25T00:00:00Z'))).toBe(false);
    expect(diverged(expected, slots, T('1914-08-30T00:00:00Z'))).toBe(false);
  });
  it('is true when the viewer closes or swaps a card, zooms in, or switches branch', () => {
    expect(diverged(expected, {}, inWindow)).toBe(true);
    expect(diverged(expected, { ...slots, focus: '1914:marne' }, inWindow)).toBe(true);
    expect(diverged(expected, { ...slots, branch: '1914:schlieffen-concept' }, inWindow)).toBe(
      true,
    );
  });
  it('is true when the viewer scrubs the clock away from the step', () => {
    expect(diverged(expected, slots, T('1914-09-08T00:00:00Z'))).toBe(true);
    expect(diverged(expected, slots, T('1914-08-20T00:00:00Z'))).toBe(true);
  });
});

describe('holdMs and tourMinutes', () => {
  it('defaults the hold and honours an explicit one', () => {
    expect(holdMs(step({ id: 'a' }))).toBe(DEFAULT_HOLD_SECONDS * 1000);
    expect(holdMs(step({ id: 'a', hold: 5 }))).toBe(5000);
  });
  it('estimates the length from holds and playback speed', () => {
    const day = 24 * 60 * 60 * 1000;
    // three held steps (14 s each) + five days played at one day per second
    expect(tourMinutes(tour, day)).toBe(Math.round((3 * 14 + 5) / 60));
  });
});
