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

/** `commanders`, `-meanwhile.physics`, `-meanwhile.biology-medicine`. */
const LAYER_TOKEN = /^-?[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

/** Everything the contract names; `extra` is what is left over, not a slot. */
type SlotKey = Exclude<keyof ViewState, 'extra'>;

/**
 * One named slot of the contract: what it is called in the query string, how a
 * value read from there becomes state, and how state becomes a value again.
 */
interface Slot {
  key: SlotKey;
  /** Fold a query value into `state`; leave the slot unset if it is unusable. */
  read(value: string, state: ViewState): void;
  /** `key=value` for a state that fills this slot, or '' for one that does not. */
  write(state: ViewState): string;
}

/**
 * Era-qualified ids keep their colons: `:` is legal in a query string and
 * `%3A` is not readable in a footnote (ADR 0009, rule 1).
 */
const readableColons = (value: string) => encodeURIComponent(value).replace(/%3A/gi, ':');

/** A slot holding a single id, in the URL only while it has one. */
function idSlot(
  key: 'branch' | 'focus' | 'card' | 'pick' | 'tour' | 'step',
  encode: (value: string) => string,
): Slot {
  return {
    key,
    read: (value, state) => {
      if (value) state[key] = value;
    },
    write: (state) => {
      const value = state[key];
      return value ? `${key}=${encode(value)}` : '';
    },
  };
}

/**
 * The slots, in the order they are written. This table is ADR 0009's rule 1
 * stated once instead of three times: the order of the parameters, the
 * encoding each one uses, and the list of names that are *not* `extra` all
 * come from here, so they cannot drift apart. Adding a slot is adding a row.
 */
const SLOTS: Slot[] = [
  {
    // The clock's now, ISO-8601 UTC to the second. A date that will not parse
    // is dropped rather than argued with: the rest of the link still opens.
    key: 't',
    read: (value, state) => {
      const ms = Date.parse(value);
      if (!Number.isNaN(ms)) state.t = ms;
    },
    write: (state) => (state.t === undefined ? '' : `t=${toIsoNoMs(state.t)}`),
  },
  // `branch`, `focus`, `card` and `tour` name era-qualified ids, whose colons
  // stay readable; `pick` and `step` name something inside one pack and so
  // never carry one.
  idSlot('branch', readableColons),
  idSlot('focus', readableColons),
  idSlot('card', readableColons),
  idSlot('pick', encodeURIComponent),
  idSlot('tour', readableColons),
  idSlot('step', encodeURIComponent),
  {
    key: 'layers',
    read: (value, state) => {
      const layers = parseLayers(value);
      if (layers.length) state.layers = layers;
    },
    // Layer names are already URL-safe by their grammar, and commas are legal
    // in a query string: `layers=commanders,-meanwhile.physics` stays readable.
    write: (state) => (state.layers?.length ? `layers=${state.layers.join(',')}` : ''),
  },
];

/**
 * The known slots; everything else in the query string is `extra`. `pack` is
 * absent on purpose — it selects which era's document is loaded rather than a
 * state inside one, so it round-trips as an extra (ADR 0009's amendment).
 */
const KNOWN = new Set<string>(SLOTS.map((slot) => slot.key));

export function parseViewState(search: string): ViewState {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const out: ViewState = {};
  for (const slot of SLOTS) {
    const value = q.get(slot.key);
    if (value !== null) slot.read(value, out);
  }
  const extra: [string, string][] = [];
  for (const [k, v] of q) if (!KNOWN.has(k)) extra.push([k, v]);
  if (extra.length) out.extra = extra;
  return out;
}

/** Split `layers=`, drop malformed tokens, keep the first mention of a name. */
function parseLayers(value: string): string[] {
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
  for (const slot of SLOTS) {
    const part = slot.write(state);
    if (part) parts.push(part);
  }
  // Whatever this build did not recognise goes back out after the known slots,
  // in the order it arrived (ADR 0009, rule 4).
  for (const [k, v] of state.extra ?? [])
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** The view state minus the clock: the slots the binding below owns. */
export type Slots = Omit<ViewState, 't'>;

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
 * The host the binding reads and writes: the browser, unless a test hands it
 * a fake history, a fake clock of its own and a search string it controls.
 */
function hostFor(opts: BindOptions) {
  return {
    history: opts.history ?? window.history,
    location: opts.location ?? (() => window.location.search),
    throttle: opts.throttleMs ?? 400,
    setT: opts.setTimeout ?? ((fn: () => void, ms: number) => window.setTimeout(fn, ms)),
    clearT: opts.clearTimeout ?? ((id: number) => window.clearTimeout(id)),
    addPop:
      opts.addPopState ??
      ((fn: () => void) => {
        window.addEventListener('popstate', fn);
        return () => window.removeEventListener('popstate', fn);
      }),
  };
}

/**
 * Two-way binding: URL → clock on load and popstate; clock/branch/focus → URL
 * (replaceState, throttled while playing).
 */
export function bindUrlState(clock: Clock, opts: BindOptions = {}): UrlBinding {
  const { history, location, throttle, setT, clearT, addPop } = hostFor(opts);

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
    // The clock owns `t` and the binding owns everything else, which is the
    // one split that matters here — no slot needs naming twice to make it.
    const { t, ...fromUrl } = parseViewState(location());
    slots = fromUrl;
    if (t !== undefined) clock.seek(t);
    lastWritten = formatViewState({ t: clock.get().now, ...slots });
    for (const l of listeners) l();
  };
  applyUrl();

  /**
   * Every setter is the same move — change the slots, tell the listeners,
   * write the URL at once — around a different change. A reader's own action
   * is never throttled: only a playing clock is.
   */
  const update = (change: (next: Slots) => void) => {
    const next: Slots = { ...slots };
    change(next);
    slots = next;
    for (const l of listeners) l();
    scheduleWrite(true);
  };

  /** A slot that is in the URL while it has a value and gone when it does not. */
  const setSlot = (
    key: 'branch' | 'focus' | 'card' | 'pick' | 'tour' | 'step',
    value: string | undefined,
  ) =>
    update((next) => {
      if (value) next[key] = value;
      else delete next[key];
    });

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
      update((next) => {
        if (card) next.card = card;
        else delete next.card;
        // a new card forgets the previous decision's pick
        if (card !== slots.card) delete next.pick;
      });
    },
    setPick(pick) {
      setSlot('pick', pick);
    },
    setTour(tour, step) {
      update((next) => {
        if (tour) next.tour = tour;
        else delete next.tour;
        // no tour, no step: leaving one cannot leave the other behind
        if (tour && step) next.step = step;
        else delete next.step;
      });
    },
    setLayer(name, on, byDefault = false) {
      update((next) => {
        const layers = withLayer(slots.layers, name, on, byDefault);
        if (layers.length) next.layers = layers;
        else delete next.layers;
      });
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
