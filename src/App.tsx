/**
 * Application shell.
 *
 * Three surfaces — one map, one dossier, one timeline (sand-neh.5) — driven by
 * one clock (sand-a55.8). The map (sand-a55.9) and dossier (sand-a55.12)
 * are placeholders that already subscribe to the clock, so the wiring they
 * will use is exercised now. Content comes from the bundled seed pack until
 * the lazy loader lands (sand-shn.1).
 */
import {
  Suspense,
  createContext,
  lazy,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ClockProvider,
  useClock,
  useClockControls,
  useViewState,
  useViewStateControls,
} from './engine/ClockContext.js';
import { selectBeat } from './engine/beats.js';
import { linksTouching } from './engine/causal.js';
import {
  battleRange,
  enterNow,
  exitNow,
  movementSourceFor,
  resolveFocus,
  type FocusMemory,
} from './engine/focus.js';
import { seed } from './packs/seed.js';
import {
  TOUR_SPEED,
  diverged,
  dwellMs,
  holdMs,
  resolvePosition,
  stopsForStep,
  tourMinutes,
  viewForStep,
  type TourPosition,
  type TourStop,
} from './engine/tour.js';
import { TourLauncher, TourPanel } from './ui/TourPanel.js';
import { OpeningSequence } from './ui/OpeningSequence.js';
import { useMediaQuery, usePhone } from './engine/useMediaQuery.js';
import { BottomSheet } from './ui/BottomSheet.js';
import { BranchToggle } from './ui/BranchToggle.js';
import { Breadcrumb } from './ui/Breadcrumb.js';
import { Dossier, type CardChipLike } from './ui/Dossier.js';
import { CastStrip, type CastMember } from './ui/CastStrip.js';
import { DecisionCardView } from './ui/DecisionCardView.js';
import { ClockGauges } from './ui/ClockGauges.js';
import { TallyGauges } from './ui/TallyGauges.js';
import { TallyCardView } from './ui/TallyCardView.js';
import { SupplyGauges } from './ui/SupplyGauges.js';
import { SupplyCardView } from './ui/SupplyCardView.js';
import { CasualtyCardView } from './ui/CasualtyCardView.js';
import { HumanCostLine } from './ui/HumanCostLine.js';
import { vignettesFor } from './engine/human.js';
import { ClockCardView } from './ui/ClockCardView.js';
import { decisionCrossed } from './engine/decisions.js';
import { mediaById, portraitFor } from './packs/media-index.js';
import { CausalView } from './ui/CausalView.js';
import { DocumentCardView } from './ui/DocumentCardView.js';
import { PersonCardView } from './ui/PersonCardView.js';
import { MeanwhileFilter } from './ui/MeanwhileFilter.js';
import { ScienceCardView, SCIENCE_FIELDS } from './ui/ScienceCardView.js';
import { TechCardView, type EntityLabeller } from './ui/TechCardView.js';
import { Timeline, type TimelineMarker, type TimelinePhase } from './ui/Timeline.js';
import { parseViewState } from './engine/url-state.js';
import type { Camera, Links, ScienceField } from './packs/schema/index.js';

// MapLibre + deck.gl are the heaviest dependencies; load the whole map surface
// on demand so the shell, timeline and dossier paint first.
const MapSurface = lazy(() => import('./ui/MapSurface.js'));

const RANGE = {
  start: Date.parse(seed.pack.timeRange.start),
  end: Date.parse(seed.pack.timeRange.end),
};

/** Which branch the view is on: the URL's, else the pack default. */
function useBranch() {
  const { branch } = useViewState();
  const known = seed.pack.branches.find((b) => b.id === branch);
  return known ?? seed.pack.branches.find((b) => b.id === seed.pack.defaultBranch)!;
}

/** The pack's cast joined to the shared people and media registries (sand-9ts). */
const CAST_MEMBERS: CastMember[] = seed.cast.map((c) => {
  const person = seed.people.find((p) => p.id === c.person);
  return {
    id: c.id,
    person: c.person,
    name: person?.name ?? c.person,
    role: c.role,
    side: c.side,
    portrait: portraitFor(c.person),
  };
});

const MOVEMENT_SOURCE = {
  routes: seed.routes,
  formations: seed.formations,
  sides: seed.pack.sides,
};

/** The battle the URL's focus slot names, if any. */
function useFocus() {
  const { focus } = useViewState();
  return resolveFocus(seed.battles, focus);
}

/** Labels and actions for entity ids, shared by cards and beat chips. */
function useLabeller(): EntityLabeller {
  const controls = useViewStateControls();
  const clock = useClockControls();
  return useMemo(
    () => ({
      label(id) {
        return (
          seed.people.find((p) => p.id === id)?.name ??
          seed.decisions.find((d) => d.id === id)?.title ??
          seed.clocks.find((c) => c.id === id)?.title ??
          seed.tallies.find((c) => c.id === id)?.title ??
          seed.supply.find((c) => c.id === id)?.title ??
          seed.casualties.find((c) => c.id === id)?.title ??
          seed.vignettes.find((c) => c.id === id)?.title ??
          seed.tech.find((t) => t.id === id)?.title ??
          seed.science.find((t) => t.id === id)?.title ??
          seed.documents.find((d) => d.id === id)?.title ??
          seed.events.find((e) => e.id === id)?.title ??
          seed.battles.find((b) => b.id === id)?.title ??
          seed.formations.find((f) => f.id === id)?.name ??
          seed.places.find((p) => p.id === id)?.name ??
          seed.beats.find((b) => b.id === id)?.title
        );
      },
      open(id, kind: keyof Links) {
        if (
          kind === 'tech' ||
          kind === 'science' ||
          kind === 'documents' ||
          kind === 'people' ||
          kind === 'casualties'
        )
          return () => controls?.setCard(id);
        if (kind === 'battles') return () => controls?.setFocus(id);
        if (kind === 'events') {
          const e = seed.events.find((x) => x.id === id);
          if (!e) return undefined;
          const at = Date.parse(e.at ?? e.timeRange!.start);
          return () => clock.seek(at);
        }
        return undefined;
      },
    }),
    [controls, clock],
  );
}

/** The card the URL's card slot names, if any — tech, science or document. */
function useCard():
  | { kind: 'tech'; card: (typeof seed.tech)[number] }
  | { kind: 'science'; card: (typeof seed.science)[number] }
  | { kind: 'document'; card: (typeof seed.documents)[number] }
  | { kind: 'causal'; card: (typeof seed.links)[number] }
  | { kind: 'person'; card: (typeof seed.people)[number] }
  | { kind: 'decision'; card: (typeof seed.decisions)[number] }
  | { kind: 'clock'; card: (typeof seed.clocks)[number] }
  | { kind: 'tally'; card: (typeof seed.tallies)[number] }
  | { kind: 'supply'; card: (typeof seed.supply)[number] }
  | { kind: 'casualties'; card: (typeof seed.casualties)[number] }
  | undefined {
  const { card } = useViewState();
  if (!card) return undefined;
  const supply = seed.supply.find((c) => c.id === card);
  if (supply) return { kind: 'supply', card: supply };
  const casualties = seed.casualties.find((c) => c.id === card);
  if (casualties) return { kind: 'casualties', card: casualties };
  const tally = seed.tallies.find((c) => c.id === card);
  if (tally) return { kind: 'tally', card: tally };
  const clock = seed.clocks.find((c) => c.id === card);
  if (clock) return { kind: 'clock', card: clock };
  const decision = seed.decisions.find((d) => d.id === card);
  if (decision) return { kind: 'decision', card: decision };
  const tech = seed.tech.find((t) => t.id === card);
  if (tech) return { kind: 'tech', card: tech };
  const science = seed.science.find((t) => t.id === card);
  if (science) return { kind: 'science', card: science };
  const document = seed.documents.find((d) => d.id === card);
  if (document) return { kind: 'document', card: document };
  const link = seed.links.find((l) => l.id === card);
  if (link) return { kind: 'causal', card: link };
  const person = seed.people.find((p) => p.id === card);
  if (person) return { kind: 'person', card: person };
  return undefined;
}

const MeanwhileCtx = createContext<ReturnType<typeof useMeanwhile> | null>(null);
function useMeanwhileContext() {
  const v = useContext(MeanwhileCtx);
  if (!v) throw new Error('MeanwhileCtx missing');
  return v;
}
function MeanwhileProvider({ children }: { children: ReactNode }) {
  const value = useMeanwhile();
  return <MeanwhileCtx.Provider value={value}>{children}</MeanwhileCtx.Provider>;
}

/** Science fields present in the pack, and which are shown (all, by default). */
function useMeanwhile() {
  const available = useMemo(
    () => SCIENCE_FIELDS.filter((f) => seed.science.some((c) => c.field === f)),
    [],
  );
  const [hidden, setHidden] = useState<ReadonlySet<ScienceField>>(() => new Set());
  const active = useMemo(
    () => new Set(available.filter((f) => !hidden.has(f))),
    [available, hidden],
  );
  const toggle = (f: ScienceField) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  return { available, active, toggle };
}

interface TourValue {
  pos: TourPosition | undefined;
  /** True while the tour is advancing itself. */
  running: boolean;
  /** Stopped at a break in the narrative, waiting to be let on (sand-1l0.28). */
  waiting: boolean;
  /** The break we are stopped at, for the panel's label. */
  stop: TourStop | undefined;
  /** Leave each break on a dwell (lean back) or on a click (read at your own pace). */
  autoAdvance: boolean;
  minutes: number;
  start: () => void;
  exit: () => void;
  goto: (index: number) => void;
  toggle: () => void;
  advance: () => void;
  setAutoAdvance: (on: boolean) => void;
}

const TourCtx = createContext<TourValue | null>(null);
function useTour(): TourValue {
  const v = useContext(TourCtx);
  if (!v) throw new Error('TourCtx missing');
  return v;
}

/**
 * The guided tour (sand-1l0.14). The URL holds where the tour is (`tour`,
 * `step`), so it is resumable and deep-linkable; this provider applies each
 * step's view — slots first, then the clock once the range has caught up with
 * a zoom-in — advances when the step is done, and stops the moment the viewer
 * touches anything the tour did not set. Nothing here knows about 1914.
 */
function TourProvider({ children }: { children: ReactNode }) {
  const { tour: tourSlot, step: stepSlot, focus, branch, card } = useViewState();
  const controls = useViewStateControls();
  const clock = useClockControls();
  const { now, range } = useClock();
  const pos = useMemo(() => resolvePosition(seed.tours, tourSlot, stepSlot), [tourSlot, stepSlot]);
  const expected = useMemo(
    () => (pos ? viewForStep(pos.step, seed.pack.defaultBranch) : undefined),
    [pos],
  );
  const [running, setRunning] = useState(false);
  // Lean back by default; readers who want the wheel turn it off (sand-1l0.28).
  const [autoAdvance, setAutoAdvance] = useState(true);
  // The step whose clock has been applied; state (not a ref) so the advance
  // timers arm only once the view has actually settled on the step.
  const [armed, setArmed] = useState<string | null>(null);
  const slotsFor = useRef<string | null>(null);
  const speedBefore = useRef<number | null>(null);

  const exit = useCallback(() => {
    setRunning(false);
    setArmed(null);
    setWaiting(false);
    setStopIndex(0);
    slotsFor.current = null;
    clock.pause();
    if (speedBefore.current) clock.setSpeed(speedBefore.current);
    speedBefore.current = null;
    controls?.setTour(undefined);
  }, [clock, controls]);

  const goto = useCallback(
    (index: number) => {
      if (!pos) return;
      const step = pos.tour.steps[index];
      if (!step) {
        // Past the last step: hold the final view and hand back control.
        setRunning(false);
        clock.pause();
        return;
      }
      controls?.setTour(pos.tour.id, step.id);
    },
    [pos, controls, clock],
  );

  const start = useCallback(() => {
    const tour = seed.tours[0];
    if (!tour || !controls) return;
    speedBefore.current = clock.get().speed;
    setRunning(true);
    controls.setTour(tour.id, tour.steps[0]!.id);
  }, [controls, clock]);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  // Where this step stops so the reader can catch up, and which one we are at.
  const stops = useMemo(
    () =>
      pos && expected
        ? stopsForStep(pos.step, expected, {
            beats: seed.beats,
            decisions: seed.decisions,
            defaultBranch: seed.pack.defaultBranch,
          })
        : [],
    [pos, expected],
  );
  const [stopIndex, setStopIndex] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const stop = waiting ? stops[stopIndex] : undefined;

  /** Let the tour on from the break it is stopped at — the next stop, or the next step. */
  const advance = useCallback(() => {
    if (!pos) return;
    setRunning(true);
    if (!waiting) return;
    if (stopIndex < stops.length - 1) {
      setStopIndex(stopIndex + 1);
      setWaiting(false);
      return;
    }
    goto(pos.index + 1);
  }, [pos, waiting, stopIndex, stops.length, goto]);

  // 1. the step's slots — branch, zoom-in, card — applied once per step.
  useEffect(() => {
    if (!pos || !expected || !controls) {
      slotsFor.current = null;
      return;
    }
    if (slotsFor.current === pos.key) return;
    slotsFor.current = pos.key;
    setArmed(null);
    setStopIndex(0);
    setWaiting(false);
    controls.setFocus(expected.focus);
    controls.setBranch(expected.branch);
    controls.setCard(expected.card);
  }, [pos, expected, controls]);

  // 2. the clock, once the focus swap has given us the range the step lives in.
  useEffect(() => {
    if (!pos || !expected || armed === pos.key || slotsFor.current !== pos.key) return;
    if ((focus ?? undefined) !== expected.focus) return;
    if (expected.t < range.start || expected.t > range.end) return;
    clock.seek(expected.t);
    clock.setSpeed(pos.step.speed ?? TOUR_SPEED);
    setArmed(pos.key);
    // A step that reveals a card stops on the reveal before it plays.
    setWaiting(stops.length > 0 && stops[0]!.at <= expected.t);
  }, [pos, expected, armed, focus, range.start, range.end, clock, stops]);

  // 3. play up to the next stop, or hold still there.
  useEffect(() => {
    if (!pos || !expected || armed !== pos.key) return;
    const target = stops[stopIndex]?.at;
    const playing = clock.get().playing;
    const wants =
      running && !waiting && expected.playTo !== undefined && target !== undefined && now < target;
    if (wants && !playing) clock.play();
    if (!wants && playing) clock.pause();
  }, [pos, expected, armed, running, waiting, now, clock, stops, stopIndex]);

  // 4. reaching a stop is a pause in the narrative, not the end of the tour.
  useEffect(() => {
    if (!pos || !running || waiting || armed !== pos.key) return;
    const target = stops[stopIndex]?.at;
    if (target === undefined) return;
    if (expected?.playTo === undefined || now >= target) {
      clock.pause();
      setWaiting(true);
    }
  }, [pos, expected, running, waiting, armed, now, clock, stops, stopIndex]);

  // 5. leaving a stop: on a dwell scaled to the reading, or on a click.
  useEffect(() => {
    if (!waiting || !running || !autoAdvance || !pos || armed !== pos.key) return;
    const here = stops[stopIndex];
    const ms = here?.kind === 'step-end' ? holdMs(pos.step) : dwellMs(here?.text);
    const id = window.setTimeout(advance, ms);
    return () => window.clearTimeout(id);
  }, [waiting, running, autoAdvance, pos, armed, stops, stopIndex, advance]);

  // 6. the viewer takes over: anything the tour did not do stops the autoplay.
  useEffect(() => {
    if (!pos || !expected || !running || armed !== pos.key) return;
    if (diverged(expected, { focus, branch, card }, now)) setRunning(false);
  }, [pos, expected, running, armed, focus, branch, card, now]);

  // 7. the keyboard drives the whole tour — no pointer required (sand-1l0.28).
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Escape') {
        exit();
      } else if (e.key === ' ') {
        // Space is the master switch: let a pause go, or pause the playback.
        e.preventDefault();
        if (waiting) advance();
        else setRunning((r) => !r);
      } else if (e.key === 'ArrowRight') {
        // → is always forward: past this break, or on to the next step.
        e.preventDefault();
        if (waiting) advance();
        else goto(pos.index + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goto(pos.index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pos, exit, advance, goto, waiting]);

  const minutes = useMemo(() => (seed.tours[0] ? tourMinutes(seed.tours[0]) : 0), []);
  const value = useMemo<TourValue>(
    () => ({
      pos,
      running,
      waiting,
      stop,
      autoAdvance,
      minutes,
      start,
      exit,
      goto,
      toggle,
      advance,
      setAutoAdvance,
    }),
    [pos, running, waiting, stop, autoAdvance, minutes, start, exit, goto, toggle, advance],
  );
  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}

/**
 * Applies the zoom-in: when the focus changes, swap the clock range for the
 * battle's (remembering the campaign instant) or restore the campaign range
 * and time. URL is the source of truth, so deep links and back/forward work.
 */
function FocusController() {
  const focus = useFocus();
  const clock = useClockControls();
  const memory = useRef<FocusMemory | null>(null);
  const lastFocus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = focus?.id;
    if (id === lastFocus.current) return;
    const st = clock.get();
    if (focus) {
      if (!memory.current) memory.current = { campaignNow: st.now, campaignRange: st.range };
      const range = battleRange(focus);
      clock.setRange(range, enterNow(st.now, range));
    } else if (memory.current) {
      clock.setRange(memory.current.campaignRange, exitNow(memory.current, st.now));
      memory.current = null;
    }
    lastFocus.current = id;
  }, [focus, clock]);
  return null;
}

function FocusBar() {
  const focus = useFocus();
  const controls = useViewStateControls();
  return (
    <Breadcrumb
      campaignTitle={seed.pack.title}
      battles={seed.battles}
      focus={focus}
      onEnter={(id) => controls?.setFocus(id)}
      onExit={() => controls?.setFocus(undefined)}
    />
  );
}

/** The way into the tour; hidden while one is running (the panel has the exit). */
function TourStart() {
  const { pos, minutes, start } = useTour();
  const tour = seed.tours[0];
  if (!tour || pos) return null;
  return <TourLauncher tour={tour} minutes={minutes} onStart={start} />;
}

/**
 * The opening sequence (sand-1l0.26). It plays on a cold arrival only: a deep
 * link is someone coming for a particular moment, and putting a cinematic in
 * front of that would be rude. Skipping is remembered for the session, so a
 * reload during a reading session does not replay it.
 */
const OPENING_KEY = 'sandtable:opening-seen';

function openingSeen(): boolean {
  try {
    return window.sessionStorage.getItem(OPENING_KEY) === '1';
  } catch {
    return false; // private mode: show it, never crash
  }
}

function rememberOpening() {
  try {
    window.sessionStorage.setItem(OPENING_KEY, '1');
  } catch {
    /* storage unavailable — the choice just does not survive a reload */
  }
}

interface OpeningValue {
  showing: boolean;
  /** Where the map settles while the premise is read. */
  camera: Camera | undefined;
}

const OpeningCtx = createContext<OpeningValue>({ showing: false, camera: undefined });
function useOpening(): OpeningValue {
  return useContext(OpeningCtx);
}

function OpeningProvider({ children }: { children: ReactNode }) {
  const opening = seed.pack.opening;
  const controls = useViewStateControls();
  const tour = useTour();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Read the URL once, at mount: any slot means the viewer asked for something
  // specific, so the premise stands aside.
  const deepLinked = useRef<boolean | null>(null);
  if (deepLinked.current === null) {
    const v = parseViewState(typeof window === 'undefined' ? '' : window.location.search);
    deepLinked.current = Boolean(
      v.t !== undefined || v.card || v.focus || v.tour || v.pick || v.branch,
    );
  }
  const [dismissed, setDismissed] = useState(() => openingSeen());
  const showing = Boolean(opening) && !dismissed && !deepLinked.current;

  const dismiss = useCallback(() => {
    rememberOpening();
    setDismissed(true);
  }, []);

  const value = useMemo<OpeningValue>(
    () => ({ showing, camera: showing ? opening?.camera : undefined }),
    [showing, opening],
  );

  // The backstory the pack declares, if it has one. Falling back to the first
  // causal link is a guess — in this pack it lands on the wheel to the Marne,
  // which is the end of the story rather than its beginning — so `opening.chain`
  // names the chapter and the link to open (sand-1l0.32).
  const chain = opening?.chain;
  const chainCard = chain?.card ?? seed.links[0]?.id;
  const chainFocus = chain?.focus;
  return (
    <OpeningCtx.Provider value={value}>
      {children}
      {showing && opening && (
        <OpeningSequence
          opening={opening}
          sources={seed.sources}
          reduced={reduced}
          tourMinutes={tour.minutes}
          onPlay={
            seed.tours[0]
              ? () => {
                  dismiss();
                  tour.start();
                }
              : undefined
          }
          onExplore={dismiss}
          {...(chain?.label ? { chainLabel: chain.label } : {})}
          {...(chain?.hint ? { chainHint: chain.hint } : {})}
          onChain={
            (chainCard || chainFocus) && controls
              ? () => {
                  dismiss();
                  // Focus first: the map flies to where the chain begins, then
                  // the card opens over it.
                  if (chainFocus) controls.setFocus(chainFocus);
                  if (chainCard) controls.setCard(chainCard);
                }
              : undefined
          }
          onClaim={
            opening.claim && controls
              ? () => {
                  dismiss();
                  controls.setCard(opening.claim!.card);
                }
              : undefined
          }
        />
      )}
    </OpeningCtx.Provider>
  );
}

function MapSection() {
  const branch = useBranch();
  const focus = useFocus();
  const controls = useViewStateControls();
  const { pos } = useTour();
  const opening = useOpening();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const hypothetical = branch.kind === 'counterfactual';
  // A tour step may frame something closer than the region fit (sand-1l0.14);
  // before either, the opening settles the map on what the premise is about
  // (sand-1l0.26). One-shot: the key never changes, so it flies once and then
  // leaves the region fit alone.
  const cameraTarget = useMemo(() => {
    if (opening.camera) {
      return {
        key: 'opening',
        center: opening.camera.center,
        zoom: opening.camera.zoom,
        ...(opening.camera.bearing !== undefined ? { bearing: opening.camera.bearing } : {}),
        ...(opening.camera.pitch !== undefined ? { pitch: opening.camera.pitch } : {}),
        ...(reduced ? { duration: 0 } : {}),
      };
    }
    const c = pos?.step.camera;
    if (!c || !pos) return undefined;
    return {
      key: pos.key,
      center: c.center,
      zoom: c.zoom,
      ...(c.bearing !== undefined ? { bearing: c.bearing } : {}),
      ...(c.pitch !== undefined ? { pitch: c.pitch } : {}),
      ...(reduced ? { duration: 0 } : {}),
    };
  }, [pos, reduced, opening.camera]);
  // Inside a zoom-in with its own routes the map animates those (sand-1l0.10).
  const movement = useMemo(() => movementSourceFor(focus, MOVEMENT_SOURCE), [focus]);
  return (
    <section className="surface surface--map" data-hypothetical={hypothetical || undefined}>
      {hypothetical && <p className="hypothetical-ribbon">Hypothetical · {branch.title}</p>}
      <Suspense fallback={<p className="surface__hint surface__hint--loading">Loading the map…</p>}>
        <MapSurface
          camera={seed.pack.camera}
          borderYear={seed.pack.borderYear}
          branch={branch}
          movement={movement}
          region={seed.pack.region}
          focusRegion={focus?.region}
          places={seed.places}
          tallies={focus ? [] : seed.tallies}
          cameraTarget={cameraTarget}
          onSelectTally={(id) => controls?.setCard(id)}
        />
      </Suspense>
    </section>
  );
}

/**
 * The campaign pauses at a decision point (sand-1l0.22): when playback crosses
 * one on the historical branch outside a zoom-in with no card open, the clock
 * stops and the decision card opens. Each decision interrupts once per visit.
 */
function DecisionPauser() {
  const { now } = useClock();
  const clock = useClockControls();
  const branch = useBranch();
  const focus = useFocus();
  const { card } = useViewState();
  const controls = useViewStateControls();
  // A guided tour opens the decisions it wants, in its own order (sand-1l0.14).
  const touring = useTour().pos !== undefined;
  const before = useRef(now);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const prev = before.current;
    before.current = now;
    if (touring || !clock.get().playing || branch.kind !== 'historical' || focus || card) return;
    const hit = decisionCrossed(seed.decisions, prev, now, seen.current);
    if (!hit) return;
    seen.current.add(hit.id);
    clock.pause();
    controls?.setCard(hit.id);
  }, [now, clock, branch.kind, focus, card, controls, touring]);
  return null;
}

function DossierSurface() {
  const branch = useBranch();
  const focus = useFocus();
  const card = useCard();
  const { pick } = useViewState();
  const meanwhile = useMeanwhileContext();
  const controls = useViewStateControls();
  const labeller = useLabeller();
  const { now, range } = useClock();
  const beat = useMemo(
    () => selectBeat(seed.beats, now, branch.id, focus?.id, range.end),
    [now, branch.id, focus?.id, range.end],
  );
  const related = useMemo<CardChipLike[]>(() => {
    const links = beat?.links;
    if (!links) return [];
    const out: CardChipLike[] = [];
    for (const [kind, ids] of [
      ['person', links.people],
      ['tech', links.tech],
      ['science', links.science],
      ['document', links.documents],
      ['casualties', links.casualties],
    ] as const) {
      for (const id of ids ?? []) {
        const label = labeller.label(id);
        if (label) out.push({ id, label, kind, onClick: () => controls?.setCard(id) });
      }
    }
    for (const id of links.battles ?? []) {
      const label = labeller.label(id);
      if (label && id !== focus?.id)
        out.push({ id, label, kind: 'battle', onClick: () => controls?.setFocus(id) });
    }
    for (const l of linksTouching(seed.links, [
      ...(links.events ?? []),
      ...(links.battles ?? []),
    ])) {
      const from = labeller.label(l.from) ?? l.from;
      const to = labeller.label(l.to) ?? l.to;
      out.push({
        id: l.id,
        label: `${from} → ${to}`,
        kind: 'causal',
        onClick: () => controls?.setCard(l.id),
      });
    }
    return out;
  }, [beat, labeller, controls, focus?.id]);
  const voices = useMemo(
    () => vignettesFor(seed.vignettes, beat, now, branch.id),
    [beat, now, branch.id],
  );
  const phone = usePhone();
  const tour = useTour();
  const dossier = (
    <>
      {tour.pos && (
        <TourPanel
          tour={tour.pos.tour}
          step={tour.pos.step}
          index={tour.pos.index}
          running={tour.running}
          waiting={tour.waiting}
          stop={tour.stop}
          autoAdvance={tour.autoAdvance}
          onContinue={tour.advance}
          onSetAutoAdvance={tour.setAutoAdvance}
          sources={seed.sources}
          onPrev={tour.pos.index > 0 ? () => tour.goto(tour.pos!.index - 1) : undefined}
          onNext={
            tour.pos.index < tour.pos.tour.steps.length - 1
              ? () => tour.goto(tour.pos!.index + 1)
              : undefined
          }
          onToggleRunning={tour.toggle}
          onExit={tour.exit}
        />
      )}
      <Dossier
        beats={seed.beats}
        sources={seed.sources}
        sides={seed.pack.sides}
        branch={branch}
        focus={focus?.id}
        packTitle={focus ? focus.title : seed.pack.title}
        related={related}
        vignettes={voices}
        label={(id) => labeller.label(id)}
        resolvePortrait={portraitFor}
        resolveMedia={mediaById}
        cast={
          <CastStrip
            members={CAST_MEMBERS}
            sides={seed.pack.sides}
            selected={card?.kind === 'person' ? card.card.id : undefined}
            onSelect={(id) =>
              controls?.setCard(card?.kind === 'person' && card.card.id === id ? undefined : id)
            }
          />
        }
        card={
          card?.kind === 'tech' ? (
            <TechCardView
              card={card.card}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'science' ? (
            <ScienceCardView
              card={card.card}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'document' ? (
            <DocumentCardView
              doc={card.card}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'person' ? (
            <PersonCardView
              person={card.card}
              sources={seed.sources}
              labeller={labeller}
              commands={seed.formations
                .filter((f) => f.commander === card.card.id)
                .map((f) => ({ id: f.id, label: f.name }))}
              cast={seed.cast.find((c) => c.person === card.card.id)}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'supply' ? (
            <SupplyCardView
              line={card.card}
              routes={seed.routes}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'casualties' ? (
            <CasualtyCardView
              record={card.card}
              records={seed.casualties}
              sides={seed.pack.sides}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'tally' ? (
            <TallyCardView
              tally={card.card}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'clock' ? (
            <ClockCardView
              clock={card.card}
              sources={seed.sources}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'decision' ? (
            <DecisionCardView
              decision={card.card}
              sources={seed.sources}
              labeller={labeller}
              pick={pick}
              onPick={(id) => controls?.setPick(id)}
              onPlayBranch={(b) => controls?.setBranch(b)}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'causal' ? (
            <CausalView
              links={seed.links}
              focal={card.card}
              sources={seed.sources}
              label={(id) => labeller.label(id)}
              onOpenLink={(id) => controls?.setCard(id)}
              onOpenEntity={(id) => {
                if (seed.events.some((e) => e.id === id)) return labeller.open?.(id, 'events');
                if (seed.battles.some((b) => b.id === id)) return labeller.open?.(id, 'battles');
                if (seed.tech.some((t) => t.id === id)) return labeller.open?.(id, 'tech');
                return undefined;
              }}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : undefined
        }
      />
      <MeanwhileFilter
        available={meanwhile.available}
        active={meanwhile.active}
        onToggle={meanwhile.toggle}
      />
    </>
  );
  return phone ? (
    <BottomSheet initial="peek">{dossier}</BottomSheet>
  ) : (
    <div className="surface surface--dossier">{dossier}</div>
  );
}

function TimelineSurface() {
  const branch = useBranch();
  const focus = useFocus();
  const meanwhile = useMeanwhileContext();
  const focusId = focus?.id;
  const phases = useMemo<TimelinePhase[]>(
    () =>
      seed.beats
        .filter((b) => (!b.branch || b.branch === branch.id) && (b.focus ?? undefined) === focusId)
        .map((b) => ({
          id: b.id,
          title: b.title,
          from: Date.parse(b.from),
          to: Date.parse(b.to),
          ...(branch.kind === 'counterfactual' && b.branch === branch.id
            ? { hypothetical: true }
            : {}),
        })),
    [branch, focusId],
  );
  const controls = useViewStateControls();
  const { card: viewCard } = useViewState();
  const markers = useMemo<TimelineMarker[]>(() => {
    const events: TimelineMarker[] = (focus ? (focus.events ?? []) : seed.events)
      .filter((e) => e.significance === 'major' && (!e.branch || e.branch === branch.id))
      .map((e) => ({
        id: e.id,
        title: e.title,
        at: Date.parse(e.at ?? e.timeRange!.start),
        kind: 'event' as const,
      }));
    const tech: TimelineMarker[] = focus
      ? []
      : seed.tech
          .filter((t) => t.introduced.at)
          .map((t) => ({
            id: t.id,
            title: t.title,
            at: Date.parse(t.introduced.at!),
            kind: 'tech' as const,
          }));
    const science: TimelineMarker[] = focus
      ? []
      : seed.science
          .filter((c) => meanwhile.active.has(c.field))
          .map((c) => ({
            id: c.id,
            title: c.title,
            at: Date.parse(c.at),
            kind: 'science' as const,
          }));
    const documents: TimelineMarker[] = focus
      ? []
      : seed.documents.map((d) => ({
          id: d.id,
          title: d.title,
          at: Date.parse(d.date),
          kind: 'document' as const,
        }));
    const decisions: TimelineMarker[] = focus
      ? []
      : seed.decisions.map((d) => ({
          id: d.id,
          title: d.title,
          at: Date.parse(d.at),
          kind: 'decision' as const,
        }));
    return [...events, ...decisions, ...tech, ...science, ...documents];
  }, [branch, focus, meanwhile.active]);
  return (
    <footer className="surface surface--timeline" aria-label="Timeline">
      <Timeline
        title={focus ? focus.title : seed.pack.title}
        phases={phases}
        markers={markers}
        onSelectMarker={(m) => {
          if (
            m.kind === 'tech' ||
            m.kind === 'science' ||
            m.kind === 'document' ||
            m.kind === 'decision'
          )
            controls?.setCard(m.id);
        }}
      />
      {!focus && (
        <>
          <ClockGauges
            clocks={seed.clocks}
            selected={viewCard}
            onSelect={(id) => controls?.setCard(viewCard === id ? undefined : id)}
          />
          <TallyGauges
            tallies={seed.tallies}
            selected={viewCard}
            onSelect={(id) => controls?.setCard(viewCard === id ? undefined : id)}
          />
          <SupplyGauges
            lines={seed.supply}
            routes={seed.routes}
            label={(id) => seed.formations.find((f) => f.id === id)?.short}
            selected={viewCard}
            onSelect={(id) => controls?.setCard(viewCard === id ? undefined : id)}
          />
          <HumanCostLine
            records={seed.casualties}
            sides={seed.pack.sides}
            selected={viewCard}
            onSelect={(id) => controls?.setCard(viewCard === id ? undefined : id)}
          />
        </>
      )}
    </footer>
  );
}

function AppShell() {
  // While the premise is up, the app behind it is inert: nothing under the
  // dialog takes focus or a click (sand-1l0.26).
  const { showing } = useOpening();
  return (
    <div className="app" inert={showing || undefined}>
      <header className="app__header">
        <div className="app__header-text">
          <p className="eyebrow">Operational study · Western Front, 1914</p>
          <h1 className="brand">
            <a className="brand__link" href="/">
              <img
                className="brand__wordmark brand__wordmark--light"
                src="/brand/wordmark-light.png"
                alt="Sandtable"
                width="872"
                height="122"
                decoding="async"
              />
              <img
                className="brand__wordmark brand__wordmark--dark"
                src="/brand/wordmark-dark.png"
                alt=""
                aria-hidden="true"
                width="859"
                height="122"
                decoding="async"
              />
            </a>
          </h1>
          <p className="lede">{seed.pack.subtitle ?? seed.pack.title}</p>
        </div>
        <div className="app__header-controls">
          <TourStart />
          <BranchToggle branches={seed.pack.branches} defaultBranch={seed.pack.defaultBranch} />
        </div>
      </header>

      <FocusController />
      <FocusBar />

      <main className="app__main">
        <MapSection />
        <DossierSurface />
        <DecisionPauser />
      </main>

      <TimelineSurface />
    </div>
  );
}

export function App() {
  return (
    <ClockProvider range={RANGE}>
      <TourProvider>
        <MeanwhileProvider>
          <OpeningProvider>
            <AppShell />
          </OpeningProvider>
        </MeanwhileProvider>
      </TourProvider>
    </ClockProvider>
  );
}
