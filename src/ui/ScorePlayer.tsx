/**
 * The background score (sand-1l0.34, ADR 0008).
 *
 * Rules the ADR sets and this component keeps:
 *   - never autoplay. Off by default; the first sound follows a click, which
 *     is also what browsers require. The choice is remembered.
 *   - crossfade on a stage change, never restart. Changes settle for a moment
 *     first, so scrubbing the timeline across three stages slides rather than
 *     stutters.
 *   - silence is a cue. Where the score declares it — 22 August — the music
 *     fades out and stays out, and the control says so.
 *   - nothing is signalled by audio alone: the control names the cue in text.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useClock, useViewState } from '../engine/ClockContext.js';
import { bedFor, cueFor } from '../engine/score.js';
import { cueById, sourcesFor } from '../packs/audio-index.js';
import type { ScoreEntry } from '../packs/schema/index.js';
import './score.css';

/** Long enough to be inaudible as a change, short enough to keep up. */
const FADE_MS = 3500;
/** Silence is deliberate, so it arrives more slowly than a change of cue. */
const SILENCE_FADE_MS = 6000;
/** A stage change has to hold this long before the score follows it. */
const SETTLE_MS = 600;
const STEP_MS = 50;
/** The cues are all normalised to −20 LUFS, so one volume serves. */
const VOLUME = 1;

const KEY = 'sandtable:score';

function remembered(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false; // private mode: silent, never crash
  }
}

function remember(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable — the choice just does not survive a reload */
  }
}

/** Ramp an element's volume, then run `done`. Returns a cancel function. */
function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void): () => void {
  const from = el.volume;
  const steps = Math.max(1, Math.round(ms / STEP_MS));
  let i = 0;
  const id = window.setInterval(() => {
    i += 1;
    const v = from + ((to - from) * i) / steps;
    el.volume = Math.min(1, Math.max(0, v));
    if (i >= steps) {
      window.clearInterval(id);
      done?.();
    }
  }, STEP_MS);
  return () => window.clearInterval(id);
}

function play(el: HTMLAudioElement) {
  // Rejections are normal — an autoplay block, or a source not yet ready.
  // Nothing here is worth breaking the page over.
  try {
    const p: unknown = el.play();
    if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
  } catch {
    /* jsdom, and browsers that refuse: leave it silent */
  }
}

/**
 * The on/off choice, remembered. It is false on the first render whatever the
 * reader chose last time — the ADR's "never autoplay" rule is that the first
 * sound follows a click — and the remembered value arrives on mount.
 */
function useRemembered(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(remembered()), []);
  const toggle = useCallback(() => {
    setEnabled((on) => {
      remember(!on);
      return !on;
    });
  }, []);
  return [enabled, toggle];
}

/**
 * The cue, on two elements so one can come up while the other goes down. It
 * returns the two refs to mount and the id of whatever is up, which is what
 * the control names in text. `bed` is here only because turning the score off
 * silences the bed along with the cue; what the bed plays is `useBed`'s.
 */
function useCue(
  enabled: boolean,
  wanted: string | undefined,
  silent: boolean,
  bed: RefObject<HTMLAudioElement | null>,
) {
  const [playing, setPlaying] = useState<string | undefined>(undefined);
  const a = useRef<HTMLAudioElement | null>(null);
  const b = useRef<HTMLAudioElement | null>(null);
  const active = useRef<'a' | 'b'>('a');
  const cancels = useRef<(() => void)[]>([]);

  const stopFades = useCallback(() => {
    for (const c of cancels.current) c();
    cancels.current = [];
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Fade out whatever is up, then stop both.
      stopFades();
      for (const ref of [a, b, bed]) {
        const el = ref.current;
        if (el && !el.paused) cancels.current.push(fade(el, 0, FADE_MS, () => el.pause()));
      }
      setPlaying(undefined);
      return;
    }

    const timer = window.setTimeout(() => {
      const current = active.current === 'a' ? a.current : b.current;
      const idle = active.current === 'a' ? b.current : a.current;

      if (!wanted) {
        if (current && !current.paused) {
          stopFades();
          cancels.current.push(
            fade(current, 0, silent ? SILENCE_FADE_MS : FADE_MS, () => current.pause()),
          );
        }
        setPlaying(undefined);
        return;
      }

      const entry = cueById(wanted);
      if (!entry || !idle) return;
      if (current && !current.paused && current.dataset['cue'] === wanted) {
        setPlaying(wanted);
        return; // already the right cue; leave it alone
      }

      stopFades();
      idle.dataset['cue'] = wanted;
      idle.loop = entry.loop;
      idle.volume = 0;
      const srcs = sourcesFor(entry);
      if (idle.getAttribute('src') !== srcs[0]?.src) idle.setAttribute('src', srcs[0]?.src ?? '');
      play(idle);
      cancels.current.push(fade(idle, VOLUME, FADE_MS));
      if (current && !current.paused) {
        cancels.current.push(fade(current, 0, FADE_MS, () => current.pause()));
      }
      active.current = active.current === 'a' ? 'b' : 'a';
      setPlaying(wanted);
    }, SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, wanted, silent, stopFades, bed]);

  useEffect(() => () => stopFades(), [stopFades]);

  return { a, b, playing };
}

/**
 * The bed rides on top of whatever the cue is doing, and answers only to
 * whether a vignette is on screen.
 */
function useBed(
  enabled: boolean,
  wantedBed: string | undefined,
  el: RefObject<HTMLAudioElement | null>,
) {
  const fades = useRef<(() => void)[]>([]);

  useEffect(() => {
    const bed = el.current;
    if (!bed) return;
    for (const c of fades.current) c();
    fades.current = [];

    if (!enabled || !wantedBed) {
      if (!bed.paused) fades.current.push(fade(bed, 0, FADE_MS, () => bed.pause()));
      return;
    }
    const entry = cueById(wantedBed);
    if (!entry) return;
    bed.loop = entry.loop;
    const srcs = sourcesFor(entry);
    if (bed.getAttribute('src') !== srcs[0]?.src) {
      bed.setAttribute('src', srcs[0]?.src ?? '');
      bed.volume = 0;
    }
    if (bed.paused) {
      bed.volume = 0;
      play(bed);
    }
    // The -9 dB trim is baked in at encode time, so the element plays at full.
    fades.current.push(fade(bed, VOLUME, FADE_MS));
    return;
  }, [enabled, wantedBed, el]);

  useEffect(
    () => () => {
      for (const c of fades.current) c();
    },
    [],
  );
}

export interface ScorePlayerProps {
  score: ScoreEntry[];
  /** True while the opening sequence is on screen. */
  opening?: boolean;
  /** True while a first-person vignette is on screen; brings the bed in. */
  vignette?: boolean;
}

export function ScorePlayer({ score, opening, vignette }: ScorePlayerProps) {
  const { now } = useClock();
  const { focus, branch } = useViewState();
  const [enabled, toggle] = useRemembered();

  const state = useMemo(
    () => ({ t: now, focus, branch, opening, vignette }),
    [now, focus, branch, opening, vignette],
  );
  const verdict = useMemo(() => cueFor(score, state), [score, state]);
  const wanted = verdict.cue;
  const wantedBed = useMemo(() => bedFor(score, state), [score, state]);

  // A bed joins the cue rather than replacing it, so it gets its own element —
  // and it is declared here because both hooks reach for it: the bed follows
  // the vignette, and turning the score off silences cue and bed together.
  const bed = useRef<HTMLAudioElement | null>(null);
  const { a, b, playing } = useCue(enabled, wanted, verdict.silent, bed);
  useBed(enabled, wantedBed, bed);

  const nowPlaying = playing ? cueById(playing) : undefined;
  const label = !enabled
    ? 'Score off'
    : verdict.silent
      ? 'Silent here'
      : nowPlaying
        ? nowPlaying.title
        : 'Score on';

  return (
    <div className="score">
      <button
        type="button"
        className="score__toggle"
        // The name says what the control is; the state is aria-pressed and the
        // cue is announced separately. A name that changed to the cue title
        // would leave a screen reader user with a button that renames itself.
        aria-label="Background score"
        aria-pressed={enabled}
        onClick={toggle}
        title={
          enabled ? 'Turn the background score off' : 'Play the background score (off by default)'
        }
      >
        <span aria-hidden="true" className="score__glyph">
          ♪
        </span>
        <span aria-hidden="true" className="score__label">
          {label}
        </span>
      </button>
      {/* Whatever the score is doing is also readable — and announced, so it
          is not carried by sound alone (ADR 0008). */}
      <p className="score__status" role="status">
        <span className="score__status-text">{label}</span>
        {enabled && verdict.silent ? (
          <span className="score__note">
            The score stops here: 22 August 1914 was the bloodiest day in French history.
          </span>
        ) : null}
      </p>
      {/* Two elements, so a cue can come up while the last one goes down. */}
      <audio ref={a} preload="none" />
      <audio ref={b} preload="none" />
      <audio ref={bed} preload="none" />
    </div>
  );
}

export default ScorePlayer;
