/**
 * Deep-linkable view state in the URL query string:
 *
 *   ?t=1914-08-24T12:00:00Z&branch=1914:historical&focus=1914:marne
 *
 * `t` is the clock's "now"; `branch` and `focus` are the slots the branch
 * toggle (sand-a55.13) and the zoom-in mechanism (sand-a55.14) fill. Reading
 * and writing are pure over a query string; `bindUrlState` wires them to
 * window.history with a throttle so a playing clock does not thrash it.
 */
import type { Clock } from './clock.js';
import { toIsoNoMs } from './ticks.js';

export interface ViewState {
  /** Epoch ms, when present and valid. */
  t?: number;
  branch?: string;
  focus?: string;
}

export function parseViewState(search: string): ViewState {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const out: ViewState = {};
  const t = q.get('t');
  if (t) {
    const ms = Date.parse(t);
    if (!Number.isNaN(ms)) out.t = ms;
  }
  const branch = q.get('branch');
  if (branch) out.branch = branch;
  const focus = q.get('focus');
  if (focus) out.focus = focus;
  return out;
}

/** Serialise to a query string (leading `?`, or '' when empty). Colons stay readable. */
export function formatViewState(state: ViewState): string {
  const parts: string[] = [];
  if (state.t !== undefined) parts.push(`t=${toIsoNoMs(state.t)}`);
  if (state.branch) parts.push(`branch=${encodeURIComponent(state.branch).replace(/%3A/gi, ':')}`);
  if (state.focus) parts.push(`focus=${encodeURIComponent(state.focus).replace(/%3A/gi, ':')}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export interface UrlBinding {
  /** Current non-clock slots. */
  get(): { branch?: string; focus?: string };
  setBranch(branch: string | undefined): void;
  setFocus(focus: string | undefined): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface BindOptions {
  /** Defaults to window.history / window.location. */
  history?: Pick<History, 'replaceState'>;
  location?: () => string;
  /** ms between URL writes while the clock plays; seeks write immediately. */
  throttleMs?: number;
  setTimeout?: (fn: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
  addPopState?: (fn: () => void) => () => void;
}

/**
 * Two-way binding: URL → clock on load and popstate; clock/branch/focus → URL
 * (replaceState, throttled while playing).
 */
export function bindUrlState(clock: Clock, opts: BindOptions = {}): UrlBinding {
  const history = opts.history ?? window.history;
  const location = opts.location ?? (() => window.location.search);
  const throttle = opts.throttleMs ?? 400;
  const setT = opts.setTimeout ?? ((fn, ms) => window.setTimeout(fn, ms));
  const clearT = opts.clearTimeout ?? ((id) => window.clearTimeout(id));
  const addPop =
    opts.addPopState ??
    ((fn) => {
      window.addEventListener('popstate', fn);
      return () => window.removeEventListener('popstate', fn);
    });

  let slots: { branch?: string; focus?: string } = {};
  const listeners = new Set<() => void>();
  let timer: number | null = null;
  let lastWritten = '';

  const write = () => {
    timer = null;
    const next = formatViewState({ t: clock.get().now, ...slots });
    if (next === lastWritten) return;
    lastWritten = next;
    const url = `${window.location?.pathname ?? '/'}${next}${window.location?.hash ?? ''}`;
    history.replaceState(null, '', url);
  };
  const scheduleWrite = (immediate: boolean) => {
    if (immediate) {
      if (timer !== null) clearT(timer);
      write();
      return;
    }
    if (timer === null) timer = setT(write, throttle);
  };

  const applyUrl = () => {
    const s = parseViewState(location());
    slots = {};
    if (s.branch) slots.branch = s.branch;
    if (s.focus) slots.focus = s.focus;
    if (s.t !== undefined) clock.seek(s.t);
    lastWritten = formatViewState({ t: clock.get().now, ...slots });
    for (const l of listeners) l();
  };
  applyUrl();

  let wasPlaying = clock.get().playing;
  const unsubClock = clock.subscribe((st) => {
    // seeks and pause/play transitions write at once; playback throttles
    const immediate = !st.playing || wasPlaying !== st.playing;
    wasPlaying = st.playing;
    scheduleWrite(immediate);
  });
  const unsubPop = addPop(applyUrl);

  return {
    get: () => slots,
    setBranch(branch) {
      slots = branch
        ? { ...slots, branch }
        : ({ focus: slots.focus } as { branch?: string; focus?: string });
      if (!slots.focus) delete slots.focus;
      for (const l of listeners) l();
      scheduleWrite(true);
    },
    setFocus(focus) {
      slots = focus
        ? { ...slots, focus }
        : ({ branch: slots.branch } as { branch?: string; focus?: string });
      if (!slots.branch) delete slots.branch;
      for (const l of listeners) l();
      scheduleWrite(true);
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose() {
      unsubClock();
      unsubPop();
      if (timer !== null) clearT(timer);
      listeners.clear();
    },
  };
}
