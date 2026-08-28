import { describe, expect, it } from 'vitest';
import type { DecisionPoint, NarrativeBeat, Tour, TourStep } from '../packs/schema/index.js';
import {
  TOUR_SPEED,
  atStop,
  diverged,
  dwellForStop,
  dwellMs,
  holdMs,
  resolvePosition,
  stopsForStep,
  tourCommandFor,
  tourMinutes,
  viewForStep,
} from './tour.js';
import { OWNS_KEYS } from './shortcuts.js';

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

describe('dwellMs and holdMs (sand-1l0.28)', () => {
  it('scales the pause with how much there is to read', () => {
    const short = dwellMs('Four words go here.');
    const long = dwellMs(Array.from({ length: 300 }, () => 'word').join(' '));
    expect(short).toBe(6000); // the floor: a glance still gets a moment
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(45000); // …and the ceiling
    expect(dwellMs(Array.from({ length: 100 }, () => 'word').join(' '))).toBe(30000);
  });
  it('does not count markdown syntax or footnote markers as words', () => {
    expect(dwellMs('**Bold** text.[^herwig-2009]')).toBe(dwellMs('Bold text.'));
  });
  it('holds a still step for the author’s time, else for the narration’s', () => {
    expect(holdMs(step({ id: 'a', hold: 5 }))).toBe(5000);
    const narration = Array.from({ length: 120 }, () => 'word').join(' ');
    expect(holdMs(step({ id: 'a', narration }))).toBe(dwellMs(narration));
  });
});

describe('stopsForStep (sand-1l0.28)', () => {
  const beats = [
    { id: '1914:beat-a', from: '1914-08-04T00:00:00Z', body: 'A.' },
    { id: '1914:beat-b', from: '1914-08-06T00:00:00Z', body: 'B.' },
    { id: '1914:beat-cf', from: '1914-08-07T00:00:00Z', body: 'C.', branch: '1914:concept' },
    { id: '1914:beat-zoom', from: '1914-08-07T12:00:00Z', body: 'Z.', focus: '1914:liege' },
  ] as unknown as NarrativeBeat[];
  const decisions = [
    { id: '1914:decision-x', at: '1914-08-05T12:00:00Z', question: 'Q?', reasoning: 'R.' },
  ] as unknown as DecisionPoint[];
  const ctx = { beats, decisions, defaultBranch: '1914:historical' };

  it('stops at every beat and decision inside the window, then at the step’s end', () => {
    const s = step({ id: 'play', at: '1914-08-04T00:00:00Z', playUntil: '1914-08-09T00:00:00Z' });
    const stops = stopsForStep(s, viewForStep(s, '1914:historical'), ctx);
    expect(stops.map((x) => x.kind)).toEqual(['decision', 'beat', 'step-end']);
    expect(stops[0]!.id).toBe('1914:decision-x');
    expect(stops[1]!.id).toBe('1914:beat-b'); // beat-a starts *at* the window's start
    expect(stops[1]!.text).toBe('B.'); // the dwell reads the beat the reader lands on
  });

  it('only counts the beats the reader will actually see', () => {
    const s = step({ id: 'play', at: '1914-08-04T00:00:00Z', playUntil: '1914-08-09T00:00:00Z' });
    // a counterfactual beat shows on that branch…
    const cf = { ...s, branch: '1914:concept' };
    const onBranch = stopsForStep(cf, viewForStep(cf, '1914:historical'), ctx);
    expect(onBranch.map((x) => x.id)).toContain('1914:beat-cf');
    // …and a zoom-in's beats only inside the zoom-in
    const zoom = { ...s, focus: '1914:liege' };
    expect(
      stopsForStep(zoom, viewForStep(zoom, '1914:historical'), ctx).map((x) => x.id),
    ).toContain('1914:beat-zoom');
  });

  it('stops on a card reveal before playing, and gives a still step one stop', () => {
    const withCard = step({
      id: 'c',
      at: '1914-08-04T00:00:00Z',
      playUntil: '1914-08-05T00:00:00Z',
      card: '1914:tally-right-wing',
    });
    const stops = stopsForStep(withCard, viewForStep(withCard, '1914:historical'), ctx);
    expect(stops[0]).toMatchObject({ kind: 'card', at: T('1914-08-04T00:00:00Z') });
    const still = step({ id: 's', at: '1914-08-04T00:00:00Z' });
    expect(stopsForStep(still, viewForStep(still, '1914:historical'), ctx)).toEqual([
      { at: T('1914-08-04T00:00:00Z'), kind: 'step-end', text: 'Narration.' },
    ]);
  });
});

describe('tourMinutes', () => {
  it('counts playback at one hour per second plus a dwell at each step', () => {
    expect(TOUR_SPEED).toBe(60 * 60 * 1000);
    const minutes = tourMinutes(tour);
    // three still steps + a 5-day window: 120 s of playback, plus four dwells
    expect(minutes).toBe(Math.round((120 + 4 * 6) / 60));
  });
});

describe('atStop (sand-1l0.28)', () => {
  const still = viewForStep(tour.steps[0]!, '1914:historical');
  const playing = viewForStep(tour.steps[2]!, '1914:historical'); // 25 → 30 Aug

  it('is true the moment a still step opens — there is nothing to play through', () => {
    expect(atStop(still, still.t, still.t)).toBe(true);
    expect(atStop(undefined, 0, 0)).toBe(true);
  });

  it('is false while a playing step still has clock to cover, true once it arrives', () => {
    const end = playing.playTo!;
    expect(atStop(playing, end, playing.t)).toBe(false);
    expect(atStop(playing, end, T('1914-08-27T00:00:00Z'))).toBe(false);
    expect(atStop(playing, end, end)).toBe(true);
    expect(atStop(playing, end, end + 1)).toBe(true);
  });
});

describe('dwellForStop (sand-1l0.28)', () => {
  const s = step({ id: 'a', hold: 9, narration: 'Two words.' });

  it('gives the end of a step the author’s hold', () => {
    expect(dwellForStop(s, { at: 0, kind: 'step-end', text: s.narration })).toBe(9000);
  });

  it('gives every other break a dwell scaled to what it put in front of the reader', () => {
    const body = Array.from({ length: 100 }, () => 'word').join(' ');
    expect(dwellForStop(s, { at: 0, kind: 'beat', text: body })).toBe(dwellMs(body));
    expect(dwellForStop(s, { at: 0, kind: 'card' })).toBe(dwellMs(undefined));
    expect(dwellForStop(s, undefined)).toBe(dwellMs(undefined));
  });
});

describe('tourCommandFor (sand-1l0.28, sand-pmz.4)', () => {
  const el = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.firstElementChild!;
  };

  it('maps the tour’s four keys and nothing else', () => {
    const body = document.body;
    expect(tourCommandFor('Escape', body)).toBe('exit');
    expect(tourCommandFor(' ', body)).toBe('toggle');
    expect(tourCommandFor('ArrowRight', body)).toBe('forward');
    expect(tourCommandFor('ArrowLeft', body)).toBe('back');
    expect(tourCommandFor('Home', body)).toBeUndefined();
    expect(tourCommandFor('k', body)).toBeUndefined();
  });

  it('keeps out of the way of a focused control', () => {
    for (const tag of ['button', 'input', 'textarea', 'select']) {
      expect(tourCommandFor(' ', el(`<${tag}></${tag}>`))).toBeUndefined();
    }
  });

  it('keeps out of the way of a surface that drives itself from the keyboard', () => {
    const owner = el(`<div ${OWNS_KEYS}><span>inside</span></div>`);
    expect(tourCommandFor('ArrowRight', owner)).toBeUndefined();
    expect(tourCommandFor('ArrowRight', owner.firstElementChild)).toBeUndefined();
  });
});
