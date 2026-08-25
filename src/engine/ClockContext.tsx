/**
 * React binding for the Clock and the URL view state.
 *
 *   <ClockProvider range={...}>            one clock for the whole app
 *     const { now, range, playing, speed } = useClock();   re-renders on change
 *     const clock = useClockControls();      seek/play/pause/setSpeed (stable)
 *     const { branch, focus } = useViewState();
 */
/* eslint-disable react-refresh/only-export-components -- provider + its hooks live together by design */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createClock, type Clock, type ClockRange, type ClockState } from './clock.js';
import { bindUrlState, type Slots, type UrlBinding } from './url-state.js';

interface ClockContextValue {
  clock: Clock;
  url: UrlBinding | null;
}

const ClockCtx = createContext<ClockContextValue | null>(null);

export interface ClockProviderProps {
  range: ClockRange;
  /** Initial instant (the URL's `t` wins when present). */
  initialNow?: number;
  /** Initial speed in simulated ms per real second. */
  initialSpeed?: number;
  /** Bind to the URL (default true; off in tests). */
  syncUrl?: boolean;
  children: ReactNode;
}

export function ClockProvider({
  range,
  initialNow,
  initialSpeed,
  syncUrl = true,
  children,
}: ClockProviderProps) {
  const value = useMemo(() => {
    const clock = createClock({
      range,
      ...(initialNow !== undefined ? { now: initialNow } : {}),
      ...(initialSpeed !== undefined ? { speed: initialSpeed } : {}),
    });
    const url = syncUrl && typeof window !== 'undefined' ? bindUrlState(clock) : null;
    return { clock, url };
    // A provider owns one clock for its lifetime; range changes go through setRange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The clock is created with this range, so applying it again on mount only
  // undoes work: React runs child effects first, and a deep link to a focus
  // (`?focus=1914:marne`) has already swapped the range for that level's by
  // the time this runs. Only a *later* change to the prop is a real change.
  const applied = useRef(range);
  useEffect(() => {
    if (applied.current === range) return;
    applied.current = range;
    value.clock.setRange(range);
  }, [value, range]);

  useEffect(
    () => () => {
      value.url?.dispose();
      value.clock.dispose();
    },
    [value],
  );

  return <ClockCtx.Provider value={value}>{children}</ClockCtx.Provider>;
}

function useCtx(): ClockContextValue {
  const ctx = useContext(ClockCtx);
  if (!ctx) throw new Error('useClock must be used inside <ClockProvider>');
  return ctx;
}

/** The live clock state; re-renders the caller on every change. */
export function useClock(): ClockState {
  const { clock } = useCtx();
  return useSyncExternalStore(clock.subscribe, clock.get, clock.get);
}

/** Stable controls; does not re-render on ticks. */
export function useClockControls(): Clock {
  return useCtx().clock;
}

const noopSubscribe = () => () => {};
const EMPTY = Object.freeze({}) as Slots;

/**
 * Branch, focus, card, tour position and layers from the URL (empty when URL
 * sync is off).
 *
 * These two do not insist on a provider, and the reason is `EntityLink`: a
 * citation now carries a link to its work's card, so every card frame that
 * renders a source list renders one, and a component specimen or a unit test
 * that mounts a card on its own would otherwise crash on a hook it never asked
 * for. `Prose` has always documented that behaviour ("falls back to plain
 * navigation when no URL binding is present") — it now holds. `useClock` and
 * `useClockControls` still throw, because a clock has no honest fallback.
 */
export function useViewState(): Slots {
  const url = useContext(ClockCtx)?.url ?? null;
  return useSyncExternalStore(
    url ? url.subscribe : noopSubscribe,
    url ? url.get : () => EMPTY,
    () => EMPTY,
  );
}

export function useViewStateControls(): Pick<
  UrlBinding,
  'setBranch' | 'setFocus' | 'setCard' | 'setPick' | 'setTour' | 'setLayer'
> | null {
  return useContext(ClockCtx)?.url ?? null;
}
