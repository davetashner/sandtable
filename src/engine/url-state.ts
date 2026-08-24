/**
 * Deep-linkable view state in the URL query string:
 *
 *   ?t=1914-08-24T12:00:00Z&branch=1914:historical&focus=1914:marne&card=1914:tech-…&pick=…
 *   ?tour=1914:tour-the-campaign&step=the-marne
 *   ?layers=commanders,-meanwhile.physics
 *
 * `t` is the clock's "now"; `branch`, `focus` and `card` are the slots the
 * branch toggle (sand-a55.13), the zoom-in (sand-a55.14) and the dossier
 * cards (ADR 0006) fill; `tour` and `step` are where the guided tour has
 * reached (sand-1l0.14), so a tour is resumable and deep-linkable. Reading
 * and writing are pure over a query string; `bindUrlState` wires them to
 * window.history with a throttle so a playing clock does not thrash it.
 *
 * `layers` is the one parameter every on/off switch shares (sand-shn.3, ADR
 * 0009). It carries only the switches that *differ from their default* —
 * `commanders` for an off-by-default layer turned on, `-meanwhile.physics`
 * for an on-by-default one turned off — so the ordinary view has no `layers`
 * at all and a shared link stays short enough to cite. Names are lower-case
 * dotted paths owned by the app, not by the engine: it holds the defaults and
 * asks `layerOn` / `withLayer` about them.
 *
 * Anything else in the query string is carried through untouched (`extra`), so
 * a link written by a newer release survives a write by an older one and no
 * legacy parameter is destroyed by a state change.
 */
import type { Clock } from './clock.js';
import { toIsoNoMs } from './ticks.js';

export interface ViewState {
  /** Epoch ms, when present and valid. */
  t?: number;
  branch?: string;
  focus?: string;
  /** Entity id of the card open in the dossier. */
  card?: string;
  /** The option chosen on an open decision point (sand-1l0.22). */
  pick?: string;
  /** The guided tour being played, and the step it is on (sand-1l0.14). */
  tour?: string;
  step?: string;
  /** Layer switches that differ from their default; `-name` means turned off. */
  layers?: string[];
  /** Query parameters this build does not know, kept in the order they came. */
  extra?: [string, string][];
}

/** The known slots; everything else in the query string is `extra`. */
const KNOWN = ['t', 'branch', 'focus', 'card', 'pick', 'tour', 'step', 'layers'];

/** `commanders`, `-meanwhile.physics`, `-meanwhile.biology-medicine`. */
const LAYER_TOKEN = /^-?[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

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
  const card = q.get('card');
  if (card) out.card = card;
  const pick = q.get('pick');
  if (pick) out.pick = pick;
  const tour = q.get('tour');
  if (tour) out.tour = tour;
  const step = q.get('step');
  if (step) out.step = step;
  const layers = parseLayers(q.get('layers'));
  if (layers.length) out.layers = layers;
  const extra: [string, string][] = [];
  for (const [k, v] of q) if (!KNOWN.includes(k)) extra.push([k, v]);
  if (extra.length) out.extra = extra;
  return out;
}

/** Split `layers=`, drop malformed tokens, keep the first mention of a name. */
function parseLayers(value: string | null): string[] {
  if (!value) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value.split(',')) {
    const token = raw.trim();
    if (!LAYER_TOKEN.test(token)) continue;
    const name = layerName(token);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(token);
  }
  return out;
}

const layerName = (token: string) => (token.startsWith('-') ? token.slice(1) : token);

/** Is `name` showing, given the switches in the URL and the layer's default? */
export function layerOn(
  layers: readonly string[] | undefined,
  name: string,
  byDefault = false,
): boolean {
  for (const token of layers ?? []) {
    if (layerName(token) === name) return !token.startsWith('-');
  }
  return byDefault;
}

/**
 * The switch list with `name` set to `on`. A switch that lands back on its
 * default leaves the URL entirely, so the ordinary view has no `layers`.
 */
export function withLayer(
  layers: readonly string[] | undefined,
  name: string,
  on: boolean,
  byDefault = false,
): string[] {
  const rest = (layers ?? []).filter((token) => layerName(token) !== name);
  if (on === byDefault) return rest;
  return [...rest, on ? name : `-${name}`];
}

/** Serialise to a query string (leading `?`, or '' when empty). Colons stay readable. */
export function formatViewState(state: ViewState): string {
  const parts: string[] = [];
  if (state.t !== undefined) parts.push(`t=${toIsoNoMs(state.t)}`);
  if (state.branch) parts.push(`branch=${encodeURIComponent(state.branch).replace(/%3A/gi, ':')}`);
  if (state.focus) parts.push(`focus=${encodeURIComponent(state.focus).replace(/%3A/gi, ':')}`);
  if (state.card) parts.push(`card=${encodeURIComponent(state.card).replace(/%3A/gi, ':')}`);
  if (state.pick) parts.push(`pick=${encodeURIComponent(state.pick)}`);
  if (state.tour) parts.push(`tour=${encodeURIComponent(state.tour).replace(/%3A/gi, ':')}`);
  if (state.step) parts.push(`step=${encodeURIComponent(state.step)}`);
  // Layer names are already URL-safe by their grammar, and commas are legal in
  // a query string: `layers=commanders,-meanwhile.physics` stays readable.
  if (state.layers?.length) parts.push(`layers=${state.layers.join(',')}`);
  for (const [k, v] of state.extra ?? [])
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export interface Slots {
  branch?: string;
  focus?: string;
  card?: string;
  pick?: string;
  tour?: string;
  step?: string;
  layers?: string[];
  extra?: [string, string][];
}

export interface UrlBinding {
  /** Current non-clock slots. */
  get(): Slots;
  setBranch(branch: string | undefined): void;
  setFocus(focus: string | undefined): void;
  setCard(card: string | undefined): void;
  setPick(pick: string | undefined): void;
  /** Start, move or leave a guided tour; clearing the tour clears the step. */
  setTour(tour: string | undefined, step?: string | undefined): void;
  /** Turn a layer on or off; back at its default it leaves the URL again. */
  setLayer(name: string, on: boolean, byDefault?: boolean): void;
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

  let slots: Slots = {};
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
    if (s.card) slots.card = s.card;
    if (s.pick) slots.pick = s.pick;
    if (s.tour) slots.tour = s.tour;
    if (s.step) slots.step = s.step;
    if (s.layers) slots.layers = s.layers;
    if (s.extra) slots.extra = s.extra;
    if (s.t !== undefined) clock.seek(s.t);
    lastWritten = formatViewState({ t: clock.get().now, ...slots });
    for (const l of listeners) l();
  };
  applyUrl();

  const setSlot = (
    key: 'branch' | 'focus' | 'card' | 'pick' | 'tour' | 'step',
    value: string | undefined,
  ) => {
    const next: Slots = { ...slots };
    if (value) next[key] = value;
    else delete next[key];
    slots = next;
    for (const l of listeners) l();
    scheduleWrite(true);
  };

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
      setSlot('branch', branch);
    },
    setFocus(focus) {
      setSlot('focus', focus);
    },
    setCard(card) {
      // a new card forgets the previous decision's pick
      const next: Slots = { ...slots };
      if (card) next.card = card;
      else delete next.card;
      if (card !== slots.card) delete next.pick;
      slots = next;
      for (const l of listeners) l();
      scheduleWrite(true);
    },
    setPick(pick) {
      setSlot('pick', pick);
    },
    setTour(tour, step) {
      const next: Slots = { ...slots };
      if (tour) next.tour = tour;
      else delete next.tour;
      if (tour && step) next.step = step;
      else delete next.step;
      slots = next;
      for (const l of listeners) l();
      scheduleWrite(true);
    },
    setLayer(name, on, byDefault = false) {
      const next: Slots = { ...slots };
      const layers = withLayer(slots.layers, name, on, byDefault);
      if (layers.length) next.layers = layers;
      else delete next.layers;
      slots = next;
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
