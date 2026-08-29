import { describe, expect, it } from 'vitest';
import { createClock, DAY } from './clock.js';
import { VIEW_SLOTS, namesAView } from '../packs/content-bundle.js';
import {
  KNOWN,
  bindUrlState,
  formatViewState,
  layerOn,
  parseViewState,
  withLayer,
  type ViewState,
} from './url-state.js';

const START = Date.UTC(1914, 7, 2);
const END = Date.UTC(1914, 10, 25);

describe('view state ⇄ query string', () => {
  it('round-trips time, branch and focus with readable colons', () => {
    const q = formatViewState({
      t: Date.UTC(1914, 7, 24, 12),
      branch: '1914:historical',
      focus: '1914:marne',
      card: '1914:tech-x',
    });
    expect(q).toBe(
      '?t=1914-08-24T12:00:00Z&branch=1914:historical&focus=1914:marne&card=1914:tech-x',
    );
    expect(parseViewState(q)).toEqual({
      t: Date.UTC(1914, 7, 24, 12),
      branch: '1914:historical',
      focus: '1914:marne',
      card: '1914:tech-x',
    });
  });

  it('round-trips the decision pick', () => {
    const st = parseViewState('?card=1914:decision-x&pick=keep');
    expect(st).toEqual({ card: '1914:decision-x', pick: 'keep' });
    expect(formatViewState(st)).toBe('?card=1914:decision-x&pick=keep');
  });

  it('ignores garbage and empties', () => {
    expect(parseViewState('?t=not-a-date&branch=')).toEqual({});
    expect(formatViewState({})).toBe('');
  });
});

describe('layer switches (sand-shn.3)', () => {
  it('carries only the switches that differ from their default', () => {
    expect(withLayer(undefined, 'commanders', true)).toEqual(['commanders']);
    // back at the default: the switch leaves the URL rather than saying "off"
    expect(withLayer(['commanders'], 'commanders', false)).toEqual([]);
    // an on-by-default layer is written only when it is turned off
    expect(withLayer(undefined, 'meanwhile.physics', false, true)).toEqual(['-meanwhile.physics']);
    expect(withLayer(['-meanwhile.physics'], 'meanwhile.physics', true, true)).toEqual([]);
  });

  it('answers for a layer whether or not the URL mentions it', () => {
    const layers = ['commanders', '-meanwhile.physics'];
    expect(layerOn(layers, 'commanders')).toBe(true);
    expect(layerOn(layers, 'meanwhile.physics', true)).toBe(false);
    expect(layerOn(layers, 'meanwhile.ideas-culture', true)).toBe(true);
    expect(layerOn(undefined, 'commanders')).toBe(false);
  });

  it('round-trips a comma-separated list', () => {
    const q = formatViewState({ layers: ['commanders', '-meanwhile.biology-medicine'] });
    expect(q).toBe('?layers=commanders,-meanwhile.biology-medicine');
    expect(parseViewState(q)).toEqual({ layers: ['commanders', '-meanwhile.biology-medicine'] });
  });

  it('drops malformed tokens and repeated names', () => {
    expect(parseViewState('?layers=commanders,,Bad Name,-commanders,meanwhile.physics')).toEqual({
      layers: ['commanders', 'meanwhile.physics'],
    });
    expect(parseViewState('?layers=')).toEqual({});
  });
});

describe('unknown parameters (forward compatibility)', () => {
  it('keeps them, in order, through a round trip', () => {
    const st = parseViewState('?t=1914-08-24T00:00:00Z&rail=supply&utm_source=letter');
    expect(st.extra).toEqual([
      ['rail', 'supply'],
      ['utm_source', 'letter'],
    ]);
    expect(formatViewState(st)).toBe('?t=1914-08-24T00:00:00Z&rail=supply&utm_source=letter');
  });
});

describe('the whole contract round-trips', () => {
  const states: ViewState[] = [
    {},
    { t: Date.UTC(1914, 7, 2) },
    { t: Date.UTC(1914, 8, 6, 6), branch: '1914:schlieffen-concept' },
    { branch: '1914:historical', focus: '1914:marne', card: '1914:battle-marne' },
    { card: '1914:decision-hentsch', pick: 'withdraw' },
    { tour: '1914:tour-the-campaign', step: 'the-marne' },
    { layers: ['commanders'] },
    { layers: ['commanders', '-meanwhile.physics', '-meanwhile.ideas-culture'] },
    { extra: [['rail', 'supply']] },
    {
      t: Date.UTC(1914, 8, 9, 12),
      branch: '1914:schlieffen-concept',
      focus: '1914:marne',
      card: '1914:science-freundlich-eclipse',
      pick: 'hold',
      tour: '1914:tour-the-campaign',
      step: 'the-marne',
      layers: ['commanders', '-meanwhile.physics'],
      extra: [['rail', 'supply']],
    },
  ];

  it.each(states)('parse(format(%o)) is the state it started as', (state) => {
    expect(parseViewState(formatViewState(state))).toEqual(state);
  });

  /**
   * The contract is only as strong as its weakest slot, so this walks every
   * combination of them rather than the ten a reader happened to think of:
   * one representative value per slot, 2^9 states, each one written out and
   * read back. It also asserts the other direction — writing what was just
   * read changes nothing — because a citation that rewrites itself on the
   * first click is not a citation.
   */
  it('every combination of slots survives a round trip, both ways', () => {
    const values: ViewState[] = [
      { t: Date.UTC(1914, 8, 9, 12, 30) },
      { branch: '1914:schlieffen-concept' },
      { focus: '1914:marne' },
      { card: '1914:decision-hentsch' },
      { pick: 'withdraw' },
      { tour: '1914:tour-the-campaign' },
      { step: 'the-marne' },
      { layers: ['commanders', '-meanwhile.physics'] },
      { pack: '1915-attrition' },
      { extra: [['utm_source', 'a-footnote']] },
    ];
    for (let mask = 0; mask < 1 << values.length; mask += 1) {
      const state = values.reduce<ViewState>(
        (acc, value, i) => (mask & (1 << i) ? { ...acc, ...value } : acc),
        {},
      );
      const q = formatViewState(state);
      expect(parseViewState(q)).toEqual(state);
      expect(formatViewState(parseViewState(q))).toBe(q);
    }
  });

  it('stays short enough to cite', () => {
    // the deepest state above, on the production origin
    const url = `https://sandtable.davetashner.com/${formatViewState(states.at(-1)!)}`;
    expect(url.length).toBeLessThan(300);
  });
});

describe('bindUrlState', () => {
  function harness(initialSearch: string, pack?: string) {
    const writes: string[] = [];
    let search = initialSearch;
    const timers: (() => void)[] = [];
    const clock = createClock({
      range: { start: START, end: END },
      raf: () => 1,
      caf: () => {},
      wall: () => 0,
    });
    const binding = bindUrlState(clock, {
      ...(pack ? { pack } : {}),
      history: {
        replaceState: (_s: unknown, _t: string, url?: string | URL | null) => {
          const u = String(url ?? '');
          search = u.includes('?') ? u.slice(u.indexOf('?')) : '';
          writes.push(u);
        },
      },
      location: () => search,
      setTimeout: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimeout: () => {},
      addPopState: () => () => {},
      throttleMs: 400,
    });
    return { clock, binding, writes, timers, search: () => search };
  }

  it('reads the URL on bind and writes on seek', () => {
    const h = harness('?t=1914-08-24T00:00:00Z&branch=1914:schlieffen-concept');
    expect(h.clock.get().now).toBe(Date.UTC(1914, 7, 24));
    expect(h.binding.get()).toEqual({ branch: '1914:schlieffen-concept' });
    h.clock.seek(START + DAY);
    expect(h.writes.at(-1)).toMatch(/\?t=1914-08-03T00:00:00Z&branch=1914:schlieffen-concept$/);
  });

  /**
   * The migration ADR 0024 leaves behind: a link written before `/` was the
   * atlas names no era, resolves to the seed one, and gets that era written
   * into its address on the first state change — so the link the reader copies
   * back out says which campaign it is of.
   */
  it('writes the era this page loaded into every address it produces', () => {
    const h = harness('?t=1914-08-24T00:00:00Z', '1914-schlieffen-marne');
    expect(h.binding.get()).toEqual({ pack: '1914-schlieffen-marne' });
    h.clock.seek(START + DAY);
    expect(h.writes.at(-1)).toBe('/?pack=1914-schlieffen-marne&t=1914-08-03T00:00:00Z');
  });

  it('updates branch and focus slots immediately', () => {
    const h = harness('');
    h.binding.setFocus('1914:marne');
    expect(h.writes.at(-1)).toMatch(/focus=1914:marne$/);
    h.binding.setBranch('1914:historical');
    expect(h.binding.get()).toEqual({ branch: '1914:historical', focus: '1914:marne' });
    h.binding.setFocus(undefined);
    expect(h.writes.at(-1)).not.toMatch(/focus=/);
    expect(h.writes.at(-1)).toMatch(/branch=1914:historical/);
    h.binding.setCard('1914:tech-x');
    expect(h.binding.get()).toEqual({ branch: '1914:historical', card: '1914:tech-x' });
    expect(h.writes.at(-1)).toMatch(/card=1914:tech-x$/);
  });

  it('throttles writes while playing', () => {
    const h = harness('');
    h.clock.play(); // transition → immediate write
    const n = h.writes.length;
    h.clock.seek(START + DAY); // playing: throttled
    h.clock.seek(START + 2 * DAY);
    expect(h.writes.length).toBe(n);
    expect(h.timers.length).toBe(1);
    h.timers[0]!();
    expect(h.writes.length).toBe(n + 1);
    expect(h.writes.at(-1)).toMatch(/t=1914-08-04T00:00:00Z/);
  });

  it('starts, moves and leaves a guided tour (sand-1l0.14)', () => {
    const h = harness('');
    h.binding.setTour('1914:tour-the-campaign', 'liege');
    expect(h.binding.get()).toEqual({ tour: '1914:tour-the-campaign', step: 'liege' });
    expect(h.writes.at(-1)).toMatch(/tour=1914:tour-the-campaign&step=liege$/);
    h.binding.setTour('1914:tour-the-campaign', 'the-marne');
    expect(h.writes.at(-1)).toMatch(/step=the-marne$/);
    h.binding.setTour(undefined);
    expect(h.binding.get()).toEqual({});
    expect(h.writes.at(-1)).not.toMatch(/tour=|step=/);
  });

  it('turns layers on and off in one parameter (sand-shn.3)', () => {
    const h = harness('');
    h.binding.setLayer('commanders', true);
    expect(h.writes.at(-1)).toMatch(/layers=commanders$/);
    h.binding.setLayer('meanwhile.physics', false, true);
    expect(h.binding.get().layers).toEqual(['commanders', '-meanwhile.physics']);
    expect(h.writes.at(-1)).toMatch(/layers=commanders,-meanwhile\.physics$/);
    h.binding.setLayer('commanders', false);
    expect(h.writes.at(-1)).toMatch(/layers=-meanwhile\.physics$/);
    h.binding.setLayer('meanwhile.physics', true, true);
    expect(h.binding.get()).toEqual({});
    expect(h.writes.at(-1)).not.toMatch(/layers=/);
  });

  it('never destroys a parameter it does not understand', () => {
    const h = harness('?t=1914-08-24T00:00:00Z&rail=supply');
    expect(h.binding.get().extra).toEqual([['rail', 'supply']]);
    h.binding.setFocus('1914:marne');
    expect(h.writes.at(-1)).toMatch(/\?t=1914-08-24T00:00:00Z&focus=1914:marne&rail=supply$/);
  });
});

describe('the guided-tour slots (sand-1l0.14)', () => {
  it('round-trips tour and step', () => {
    const st = parseViewState('?tour=1914:tour-the-campaign&step=the-marne');
    expect(st.tour).toBe('1914:tour-the-campaign');
    expect(st.step).toBe('the-marne');
    expect(formatViewState(st)).toBe('?tour=1914:tour-the-campaign&step=the-marne');
  });
});

describe('the pack slot (sand-shn.1, promoted by ADR 0024)', () => {
  it('survives a state write, so scrubbing the clock does not leave the era', () => {
    const state = parseViewState('?pack=1915-attrition&t=1915-04-22T17:00:00Z');
    expect(state.pack).toBe('1915-attrition');
    const written = formatViewState({ ...state, t: Date.UTC(1915, 4, 1) });
    // First, because it names the document the other slots are read against.
    expect(written).toBe('?pack=1915-attrition&t=1915-05-01T00:00:00Z');
  });

  it('is the same list the boot script branches on, so `/` cannot mean two things', () => {
    // `url-state.ts` owns how each slot is read and written; `content-bundle.ts`
    // owns the names, because the boot script in <head> cannot import this
    // module. If they drift, a URL could name a view the campaign app would
    // render and the boot script would answer with the atlas.
    expect([...KNOWN].sort()).toEqual([...VIEW_SLOTS].sort());
  });

  it('a bare view is the atlas, and anything that fills a slot is not (ADR 0024)', () => {
    expect(namesAView('')).toBe(false);
    expect(namesAView('?utm_source=a-footnote')).toBe(false);
    // An empty value fills nothing — the same reading `resolvePackUrl` gives.
    expect(namesAView('?t=')).toBe(false);
    expect(namesAView('?pack=1915-attrition')).toBe(true);
    expect(namesAView('?t=1914-08-20T00:00:00Z&focus=1914:marne')).toBe(true);
    expect(namesAView('?layers=commanders')).toBe(true);
  });

  it('writes nothing when the page has no era, so a bare state stays bare', () => {
    expect(formatViewState(parseViewState(''))).toBe('');
  });
});
