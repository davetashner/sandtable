/**
 * The clock — the single source of truth for "now".
 *
 * Every layer (map, dossier, timeline, rails) subscribes to one Clock and
 * reads an absolute instant (epoch milliseconds, UTC). The clock knows the
 * range it may travel (the pack's timeRange, or a battle's), whether it is
 * playing, and how fast: `speed` is simulated milliseconds per real second,
 * so 86_400_000 is "one day per second". Framework-free; React binds to it
 * with useSyncExternalStore (see ClockContext.tsx).
 *
 * Era-agnostic by construction: the same clock runs 42 days in 1914, a
 * twelve-hour battle, or five years of the Eastern Front.
 */

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/**
 * The reading pace: **one simulated hour per real second**, the speed a clock
 * runs at unless something asks for another. Slow enough to read the narrative
 * while the tokens move, which is the whole point (sand-1l0.28, sand-1l0.31) —
 * anything faster turns a dossier into a flicker. The guided tour plays at this
 * speed too (`TOUR_SPEED` in tour.ts).
 *
 * A range too long for it lands on the slowest pace it does offer; see
 * `defaultSpeedFor`.
 */
export const DEFAULT_SPEED = 1 * HOUR;

export interface ClockRange {
  /** Inclusive start, epoch ms. */
  start: number;
  /** Inclusive end, epoch ms. */
  end: number;
}

export interface ClockState {
  readonly now: number;
  readonly range: ClockRange;
  readonly playing: boolean;
  /** Simulated ms per real second. */
  readonly speed: number;
}

export interface SpeedPreset {
  /** Simulated ms per real second. */
  speed: number;
  /** Human label, e.g. "1 day / s". */
  label: string;
}

export type ClockListener = (state: ClockState) => void;

export interface Clock {
  get(): ClockState;
  subscribe(listener: ClockListener): () => void;
  /** Jump to an instant (clamped to the range). Pauses nothing. */
  seek(now: number): void;
  /** Move by a signed delta (clamped). */
  step(deltaMs: number): void;
  play(): void;
  pause(): void;
  toggle(): void;
  setSpeed(speed: number): void;
  /** Swap the range (e.g. entering a battle); `now` is clamped into it. */
  setRange(range: ClockRange, now?: number): void;
  /** Stop the animation loop and drop listeners. */
  dispose(): void;
}

export interface ClockOptions {
  range: ClockRange;
  now?: number;
  speed?: number;
  /** Injected scheduler for tests; defaults to requestAnimationFrame. */
  raf?: (cb: (t: number) => void) => number;
  caf?: (id: number) => void;
  /** Injected wall clock for tests; defaults to performance.now. */
  wall?: () => number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function createClock(opts: ClockOptions): Clock {
  const raf = opts.raf ?? ((cb) => globalThis.requestAnimationFrame(cb));
  const caf = opts.caf ?? ((id) => globalThis.cancelAnimationFrame(id));
  const wall = opts.wall ?? (() => performance.now());

  let state: ClockState = {
    range: { ...opts.range },
    now: clamp(opts.now ?? opts.range.start, opts.range.start, opts.range.end),
    playing: false,
    speed: opts.speed ?? defaultSpeedFor(opts.range),
  };
  const listeners = new Set<ClockListener>();
  let frame: number | null = null;
  let lastWall = 0;

  const emit = () => {
    for (const l of listeners) l(state);
  };
  const set = (patch: Partial<ClockState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const tick = (_t: number) => {
    frame = null;
    if (!state.playing) return;
    const t = wall();
    const dt = Math.max(0, t - lastWall) / SECOND; // real seconds
    lastWall = t;
    const next = state.now + dt * state.speed;
    if (next >= state.range.end) {
      set({ now: state.range.end, playing: false }); // stop at the end of the range
      return;
    }
    set({ now: next });
    frame = raf(tick);
  };

  const play = () => {
    if (state.playing) return;
    // Replay from the start if we are parked at the end.
    const now = state.now >= state.range.end ? state.range.start : state.now;
    lastWall = wall();
    set({ playing: true, now });
    frame = raf(tick);
  };
  const pause = () => {
    if (frame !== null) caf(frame);
    frame = null;
    if (state.playing) set({ playing: false });
  };

  return {
    get: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    seek(now) {
      set({ now: clamp(now, state.range.start, state.range.end) });
    },
    step(delta) {
      set({ now: clamp(state.now + delta, state.range.start, state.range.end) });
    },
    play,
    pause,
    toggle() {
      if (state.playing) pause();
      else play();
    },
    setSpeed(speed) {
      if (speed > 0 && speed !== state.speed) set({ speed });
    },
    setRange(range, now) {
      set({ range: { ...range }, now: clamp(now ?? state.now, range.start, range.end) });
    },
    dispose() {
      pause();
      listeners.clear();
    },
  };
}

/**
 * Speed presets that suit a range: hours-per-second for a battle, days or
 * weeks per second for a campaign, months for a multi-year era.
 *
 * Every ladder short enough to read at brackets `DEFAULT_SPEED`, so the pace a
 * clock starts at is always one of the choices offered — see `defaultSpeedFor`.
 * The fast end is kept for scrubbing: at 1 day/s the whole 1914 campaign sweeps
 * past in two minutes, which is how you find a moment rather than read one.
 */
export function speedPresetsFor(range: ClockRange): SpeedPreset[] {
  const span = range.end - range.start;
  if (span <= 3 * DAY) {
    return [
      { speed: 1 * MINUTE, label: '1 min / s' },
      { speed: 10 * MINUTE, label: '10 min / s' },
      { speed: 30 * MINUTE, label: '30 min / s' },
      { speed: 1 * HOUR, label: '1 h / s' },
      { speed: 3 * HOUR, label: '3 h / s' },
    ];
  }
  if (span <= 120 * DAY) {
    return [
      { speed: 15 * MINUTE, label: '15 min / s' },
      { speed: 1 * HOUR, label: '1 h / s' },
      { speed: 3 * HOUR, label: '3 h / s' },
      { speed: 6 * HOUR, label: '6 h / s' },
      { speed: 12 * HOUR, label: '12 h / s' },
      { speed: 1 * DAY, label: '1 day / s' },
    ];
  }
  if (span <= 3 * 365 * DAY) {
    return [
      { speed: 12 * HOUR, label: '12 h / s' },
      { speed: 1 * DAY, label: '1 day / s' },
      { speed: 3 * DAY, label: '3 days / s' },
      { speed: 1 * WEEK, label: '1 week / s' },
      { speed: 4 * WEEK, label: '4 weeks / s' },
    ];
  }
  return [
    { speed: 1 * DAY, label: '1 day / s' },
    { speed: 1 * WEEK, label: '1 week / s' },
    { speed: 4 * WEEK, label: '4 weeks / s' },
    { speed: 13 * WEEK, label: '3 months / s' },
    { speed: 52 * WEEK, label: '1 year / s' },
  ];
}

/**
 * The pace a clock over this range should start at: the reading pace where the
 * range is short enough to offer it, otherwise the slowest pace it does — a
 * five-year era at an hour a second would take a fortnight to watch.
 *
 * Derived from `speedPresetsFor` rather than restated, so the starting speed is
 * always selectable in the timeline's own control and the two cannot drift.
 */
export function defaultSpeedFor(range: ClockRange): number {
  const presets = speedPresetsFor(range);
  const reading = presets.find((p) => p.speed === DEFAULT_SPEED);
  return reading?.speed ?? presets[0]?.speed ?? DEFAULT_SPEED;
}

/**
 * Label an arbitrary speed the way the presets are labelled. Only needed for a
 * speed that is not on the current ladder — a tour step's own pace, or a speed
 * carried in from a wider range — so the control can show what is really running.
 */
export function speedLabel(speed: number): string {
  const n = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  if (speed >= WEEK) {
    const w = speed / WEEK;
    return `${n(w)} week${w === 1 ? '' : 's'} / s`;
  }
  if (speed >= DAY) {
    const d = speed / DAY;
    return `${n(d)} day${d === 1 ? '' : 's'} / s`;
  }
  if (speed >= HOUR) return `${n(speed / HOUR)} h / s`;
  if (speed >= MINUTE) return `${n(speed / MINUTE)} min / s`;
  return `${n(speed / SECOND)} s / s`;
}

/** A sensible keyboard step for a range: an hour for battles, a day for campaigns, a week for eras. */
export function stepFor(range: ClockRange): { small: number; large: number } {
  const span = range.end - range.start;
  if (span <= 3 * DAY) return { small: 15 * MINUTE, large: HOUR };
  if (span <= 120 * DAY) return { small: HOUR, large: DAY };
  if (span <= 3 * 365 * DAY) return { small: DAY, large: WEEK };
  return { small: WEEK, large: 4 * WEEK };
}
