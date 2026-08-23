import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import type { ScoreEntry } from '../packs/schema/index.js';
import { ScorePlayer } from './ScorePlayer.js';

const START = Date.UTC(1914, 7, 2);
const END = Date.UTC(1914, 10, 25);

// The first cue in the real index, so cueById resolves.
const score: ScoreEntry[] = [
  { from: '1914-08-04T00:00:00Z', to: '1914-08-16T00:00:00Z', cue: 'cue:iron-and-rails' },
  { from: '1914-08-22T00:00:00Z', to: '1914-08-23T00:00:00Z', silence: true },
];

function setup(t: string) {
  window.history.replaceState(null, '', `/?t=${t}`);
  return render(
    <ClockProvider range={{ start: START, end: END }} initialNow={Date.parse(t)}>
      <ScorePlayer score={score} />
    </ClockProvider>,
  );
}

/**
 * This jsdom setup has no localStorage, which is itself worth knowing: the
 * component treats storage as optional and stays silent rather than throwing.
 * The tests need it, so they supply a minimal one.
 */
function stubStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, String(v)),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    },
  });
}

describe('<ScorePlayer>', () => {
  beforeEach(() => {
    stubStorage();
    // jsdom has no media stack; the component must survive that.
    // jsdom implements no media stack; the component must survive that, and
    // the "Not implemented" notice it logs is the proof that it does.
  });

  it('is off by default — a history site does not start playing unasked', () => {
    setup('1914-08-10T00:00:00Z');
    const btn = screen.getByRole('button', { name: /background score/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Score off');
  });

  it('remembers being turned on', () => {
    setup('1914-08-10T00:00:00Z');
    fireEvent.click(screen.getByRole('button', { name: /background score/i }));
    expect(window.localStorage.getItem('sandtable:score')).toBe('1');
  });

  it('starts from the remembered choice on a later visit', () => {
    window.localStorage.setItem('sandtable:score', '1');
    setup('1914-08-10T00:00:00Z');
    expect(screen.getByRole('button', { name: /background score/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('names the cue in text, so nothing is carried by audio alone', () => {
    vi.useFakeTimers();
    try {
      window.localStorage.setItem('sandtable:score', '1');
      setup('1914-08-10T00:00:00Z');
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(screen.getByRole('status')).toHaveTextContent('Iron and Rails');
    } finally {
      vi.useRealTimers();
    }
  });

  it('says why it is silent on 22 August rather than looking broken', () => {
    window.localStorage.setItem('sandtable:score', '1');
    setup('1914-08-22T09:00:00Z');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Silent here');
    expect(status).toHaveTextContent(/bloodiest day in French history/i);
  });

  it('gives the button a real accessible name in both states', () => {
    setup('1914-08-10T00:00:00Z');
    const btn = screen.getByRole('button', { name: /background score/i });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /background score/i })).toBeInTheDocument();
  });
});
