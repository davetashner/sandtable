import { describe, expect, it } from 'vitest';
import { createClock, DAY } from './clock.js';
import { bindUrlState, formatViewState, parseViewState } from './url-state.js';

const START = Date.UTC(1914, 7, 2);
const END = Date.UTC(1914, 10, 25);

describe('view state ⇄ query string', () => {
  it('round-trips time, branch and focus with readable colons', () => {
    const q = formatViewState({
      t: Date.UTC(1914, 7, 24, 12),
      branch: '1914:historical',
      focus: '1914:marne',
    });
    expect(q).toBe('?t=1914-08-24T12:00:00Z&branch=1914:historical&focus=1914:marne');
    expect(parseViewState(q)).toEqual({
      t: Date.UTC(1914, 7, 24, 12),
      branch: '1914:historical',
      focus: '1914:marne',
    });
  });

  it('ignores garbage and empties', () => {
    expect(parseViewState('?t=not-a-date&branch=&x=1')).toEqual({});
    expect(formatViewState({})).toBe('');
  });
});

describe('bindUrlState', () => {
  function harness(initialSearch: string) {
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

  it('updates branch and focus slots immediately', () => {
    const h = harness('');
    h.binding.setFocus('1914:marne');
    expect(h.writes.at(-1)).toMatch(/focus=1914:marne$/);
    h.binding.setBranch('1914:historical');
    expect(h.binding.get()).toEqual({ branch: '1914:historical', focus: '1914:marne' });
    h.binding.setFocus(undefined);
    expect(h.writes.at(-1)).not.toMatch(/focus=/);
    expect(h.writes.at(-1)).toMatch(/branch=1914:historical/);
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
});
