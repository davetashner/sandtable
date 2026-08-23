import { describe, expect, it } from 'vitest';
import {
  createClock,
  DAY,
  DEFAULT_SPEED,
  defaultSpeedFor,
  HOUR,
  MINUTE,
  speedLabel,
  speedPresetsFor,
  stepFor,
  WEEK,
} from './clock.js';

const START = Date.UTC(1914, 7, 2);
const END = Date.UTC(1914, 10, 25);

/** A controllable scheduler: frames run when we call flush(). */
function scheduler() {
  let wallNow = 0;
  let pending: ((t: number) => void)[] = [];
  return {
    raf: (cb: (t: number) => void) => {
      pending.push(cb);
      return pending.length;
    },
    caf: () => {
      pending = [];
    },
    wall: () => wallNow,
    /** advance wall clock and run one frame */
    frame(ms: number) {
      wallNow += ms;
      const cbs = pending;
      pending = [];
      for (const cb of cbs) cb(wallNow);
    },
    get pendingFrames() {
      return pending.length;
    },
  };
}

describe('createClock', () => {
  it('starts at the range start, clamps seeks and steps', () => {
    const s = scheduler();
    const clock = createClock({ range: { start: START, end: END }, ...s });
    expect(clock.get().now).toBe(START);
    clock.seek(START - DAY);
    expect(clock.get().now).toBe(START);
    clock.seek(END + DAY);
    expect(clock.get().now).toBe(END);
    clock.step(-WEEK);
    expect(clock.get().now).toBe(END - WEEK);
  });

  it('advances by speed × real seconds while playing and stops at the end', () => {
    const s = scheduler();
    const clock = createClock({ range: { start: START, end: START + 2 * DAY }, speed: DAY, ...s });
    const seen: number[] = [];
    clock.subscribe((st) => seen.push(st.now));
    clock.play();
    expect(clock.get().playing).toBe(true);
    s.frame(500); // half a real second → half a day
    expect(clock.get().now).toBe(START + DAY / 2);
    s.frame(1000);
    expect(clock.get().now).toBe(START + 1.5 * DAY);
    s.frame(1000); // would pass the end → clamp + pause
    expect(clock.get().now).toBe(START + 2 * DAY);
    expect(clock.get().playing).toBe(false);
    expect(s.pendingFrames).toBe(0);
    expect(seen.length).toBeGreaterThan(3);
  });

  it('pause cancels the frame; play from the end restarts', () => {
    const s = scheduler();
    const clock = createClock({ range: { start: START, end: START + DAY }, speed: DAY, ...s });
    clock.play();
    clock.pause();
    expect(s.pendingFrames).toBe(0);
    clock.seek(START + DAY);
    clock.play();
    expect(clock.get().now).toBe(START);
    clock.toggle();
    expect(clock.get().playing).toBe(false);
  });

  it('setRange clamps now into the new range; setSpeed ignores nonsense', () => {
    const s = scheduler();
    const clock = createClock({ range: { start: START, end: END }, now: START + 30 * DAY, ...s });
    clock.setRange({ start: START + 40 * DAY, end: START + 41 * DAY });
    expect(clock.get().now).toBe(START + 40 * DAY);
    clock.setSpeed(0);
    expect(clock.get().speed).toBe(DEFAULT_SPEED);
    clock.setSpeed(6 * HOUR);
    expect(clock.get().speed).toBe(6 * HOUR);
  });

  it('dispose drops listeners', () => {
    const s = scheduler();
    const clock = createClock({ range: { start: START, end: END }, ...s });
    let n = 0;
    clock.subscribe(() => n++);
    clock.dispose();
    clock.seek(START + DAY);
    expect(n).toBe(0);
  });
});

describe('presets', () => {
  it('scale with the range span', () => {
    expect(speedPresetsFor({ start: 0, end: 12 * HOUR }).map((p) => p.label)).toContain(
      '10 min / s',
    );
    expect(speedPresetsFor({ start: START, end: END }).map((p) => p.label)).toContain('1 day / s');
    expect(speedPresetsFor({ start: 0, end: 5 * 365 * DAY }).map((p) => p.label)).toContain(
      '1 year / s',
    );
    expect(stepFor({ start: START, end: END })).toEqual({ small: HOUR, large: DAY });
    expect(stepFor({ start: 0, end: 6 * HOUR }).large).toBe(HOUR);
  });

  it('a clock starts at the reading pace, not a skim (sand-1l0.31)', () => {
    // The 1914 campaign: 2 August to 25 November.
    const campaign = { start: START, end: START + 115 * DAY };
    expect(defaultSpeedFor(campaign)).toBe(HOUR);
    expect(createClock({ range: campaign, raf: () => 0, caf: () => {} }).get().speed).toBe(HOUR);
    // A battle offers it too.
    expect(defaultSpeedFor({ start: 0, end: 12 * HOUR })).toBe(HOUR);
  });

  it('the starting pace is always one of the offered presets', () => {
    for (const span of [12 * HOUR, 115 * DAY, 2 * 365 * DAY, 5 * 365 * DAY]) {
      const range = { start: START, end: START + span };
      expect(speedPresetsFor(range).map((p) => p.speed)).toContain(defaultSpeedFor(range));
    }
  });

  it('a range too long to read at falls back to its slowest pace', () => {
    const era = { start: START, end: START + 5 * 365 * DAY };
    expect(defaultSpeedFor(era)).toBe(DAY);
    expect(defaultSpeedFor(era)).not.toBe(DEFAULT_SPEED);
  });

  it('the campaign ladder brackets the reading pace and keeps a scrubbing speed', () => {
    const labels = speedPresetsFor({ start: START, end: END }).map((p) => p.label);
    expect(labels).toEqual(['15 min / s', '1 h / s', '3 h / s', '6 h / s', '12 h / s', '1 day / s']);
  });

  it('speedLabel describes an off-ladder speed', () => {
    expect(speedLabel(HOUR)).toBe('1 h / s');
    expect(speedLabel(45 * MINUTE)).toBe('45 min / s');
    expect(speedLabel(2 * DAY)).toBe('2 days / s');
    expect(speedLabel(WEEK)).toBe('1 week / s');
  });
});
