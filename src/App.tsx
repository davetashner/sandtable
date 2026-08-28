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
import { allFormations, sideFormation, subordinatesOf } from './engine/formations.js';
import {
  battleRange,
  enterNow,
  enterSpeed,
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
import { ScorePlayer } from './ui/ScorePlayer.js';
import { CommanderToggle } from './ui/CommanderToggle.js';
import { CopyLink } from './ui/CopyLink.js';
import { Breadcrumb } from './ui/Breadcrumb.js';
import { Dossier, type CardChipLike } from './ui/Dossier.js';
import { SideKey } from './ui/SideKey.js';
import { CastStrip, type CastMember } from './ui/CastStrip.js';
import { DecisionCardView } from './ui/DecisionCardView.js';
import { ClockGauges } from './ui/ClockGauges.js';
import { TallyGauges } from './ui/TallyGauges.js';
import { TallyCardView } from './ui/TallyCardView.js';
import { SupplyGauges } from './ui/SupplyGauges.js';
import { SupplyCardView } from './ui/SupplyCardView.js';
import { CasualtyCardView } from './ui/CasualtyCardView.js';
import { HumanCostLine } from './ui/HumanCostLine.js';
import { vignetteNear, vignettesFor } from './engine/human.js';
import { ClockCardView } from './ui/ClockCardView.js';
import { decisionCrossed } from './engine/decisions.js';
import { largestSrc, mediaById, portraitFor } from './packs/media-index.js';
import { CausalView } from './ui/CausalView.js';
import { DocumentCardView } from './ui/DocumentCardView.js';
import { HistoriographyCardView } from './ui/HistoriographyCardView.js';
import { PersonCardView } from './ui/PersonCardView.js';
import { FormationCardView } from './ui/FormationCardView.js';
import { MeanwhileFilter } from './ui/MeanwhileFilter.js';
import { ScienceCardView, SCIENCE_FIELDS } from './ui/ScienceCardView.js';
import { TechCardView, type EntityLabeller } from './ui/TechCardView.js';
import { Timeline, type TimelineMarker, type TimelinePhase } from './ui/Timeline.js';
import { BibliographyView, SourceCardView } from './ui/Bibliography.js';
import { BIBLIOGRAPHY_CARD, countCitations, type SourceUse } from './engine/bibliography.js';
import { layerOn, parseViewState } from './engine/url-state.js';
import { ownsKeys } from './engine/shortcuts.js';
import type { Battle, Camera, Links, ScienceField } from './packs/schema/index.js';
import type { ClockRange } from './engine/clock.js';

// MapLibre + deck.gl are the heaviest dependencies; load the whole map surface
// on demand so the shell, timeline and dossier paint first.
const MapSurface = lazy(() => import('./ui/MapSurface.js'));

/**
 * How often the pack cites each work, counted once and lazily (sand-shn.5).
 *
 * It is a walk of the whole pack, and nothing needs it until a reader opens
 * the bibliography or a work's card, so it does not run on boot.
 */
let citationUse: Map<string, SourceUse> | null = null;
const sourceUse = () => (citationUse ??= countCitations(seed));

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

/**
 * Every formation a card slot can name: the campaign's order of battle plus
 * the corps and divisions a zoom-in brings with it, because a token clicked
 * inside a battle is one of those (sand-y0u.29).
 */
const FORMATIONS = allFormations(seed.formations, seed.battles);

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
          seed.historiography.find((h) => h.id === id)?.title ??
          seed.events.find((e) => e.id === id)?.title ??
          seed.battles.find((b) => b.id === id)?.title ??
          FORMATIONS.find((f) => f.id === id)?.name ??
          seed.places.find((p) => p.id === id)?.name ??
          seed.beats.find((b) => b.id === id)?.title
        );
      },
      open(id, kind: keyof Links) {
        if (
          kind === 'tech' ||
          kind === 'science' ||
          kind === 'documents' ||
          kind === 'historiography' ||
          kind === 'people' ||
          kind === 'casualties' ||
          kind === 'formations'
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

/** The card the URL's card slot names, if any — tech, science, document, formation… */
function useCard():
  | { kind: 'bibliography'; card: { id: string } }
  | { kind: 'source'; card: (typeof seed.sources)[number] }
  | { kind: 'tech'; card: (typeof seed.tech)[number] }
  | { kind: 'science'; card: (typeof seed.science)[number] }
  | { kind: 'document'; card: (typeof seed.documents)[number] }
  | { kind: 'historiography'; card: (typeof seed.historiography)[number] }
  | { kind: 'causal'; card: (typeof seed.links)[number] }
  | { kind: 'person'; card: (typeof seed.people)[number] }
  | { kind: 'decision'; card: (typeof seed.decisions)[number] }
  | { kind: 'clock'; card: (typeof seed.clocks)[number] }
  | { kind: 'tally'; card: (typeof seed.tallies)[number] }
  | { kind: 'supply'; card: (typeof seed.supply)[number] }
  | { kind: 'casualties'; card: (typeof seed.casualties)[number] }
  | { kind: 'formation'; card: (typeof FORMATIONS)[number] }
  | undefined {
  const { card } = useViewState();
  if (!card) return undefined;
  // The two source families first, and the reserved word before the registry
  // lookups: `bibliography` is the one card id with no entity behind it, and
  // the schema's `Id` requires a colon, so no entity can ever claim it.
  if (card === BIBLIOGRAPHY_CARD) return { kind: 'bibliography', card: { id: card } };
  const source = seed.sources.find((s) => s.id === card);
  if (source) return { kind: 'source', card: source };
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
  const point = seed.historiography.find((h) => h.id === card);
  if (point) return { kind: 'historiography', card: point };
  const link = seed.links.find((l) => l.id === card);
  if (link) return { kind: 'causal', card: link };
  const person = seed.people.find((p) => p.id === card);
  if (person) return { kind: 'person', card: person };
  const formation = FORMATIONS.find((f) => f.id === card);
  if (formation) return { kind: 'formation', card: formation };
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

/** The layer switch a science field answers to: `meanwhile.physics`. */
const meanwhileLayer = (field: ScienceField) => `meanwhile.${field}`;

/**
 * The window the strip in front of the reader is showing: the campaign's, or —
 * inside a focus — that level's own, which is the range `FocusController` hands
 * the clock on the way in.
 */
const stripRange = (focus: Battle | undefined): ClockRange => (focus ? battleRange(focus) : RANGE);

/**
 * "Meanwhile" reaches outside the campaign — special relativity in 1905,
 * Eddington's eclipse in 1919 — and the strip clamps anything outside its
 * range to an edge, which would pile half the layer on the last pixel. Only
 * cards the strip can place honestly get a ✦; the rest are reached from the
 * beat that names them (`links.science`) or from `?card=`.
 *
 * The rule is the strip's, not the campaign's: the ✦ layer means "at the same
 * time as what you are looking at", so it follows whichever window is drawn.
 * That is what gives the six post-1914 cards somewhere to be — the epilogue
 * chapter keeps its own 1915–1919 window (ADR 0015) and can place every one of
 * them where it belongs.
 */
const onTheStrip = (c: (typeof seed.science)[number], range: ClockRange) => {
  const at = Date.parse(c.at);
  return at >= range.start && at <= range.end;
};

/**
 * Science fields the timeline can show, and which are shown (all, by default).
 * The switches live in the URL so a link carries the timeline you filtered,
 * not the one the app opens with (sand-shn.3); on by default, so only the
 * fields you hid are written, as `-meanwhile.<field>`. A field with nothing on
 * the strip in front of the reader gets no chip, because the chip would toggle
 * nothing — mathematics has one card, Noether's, so its chip appears in the
 * epilogue chapter and nowhere else.
 */
function useMeanwhile() {
  const focus = useFocus();
  const range = useMemo(() => stripRange(focus), [focus]);
  const available = useMemo(
    () =>
      SCIENCE_FIELDS.filter((f) => seed.science.some((c) => c.field === f && onTheStrip(c, range))),
    [range],
  );
  const { layers } = useViewState();
  const controls = useViewStateControls();
  const active = useMemo(
    () => new Set(available.filter((f) => layerOn(layers, meanwhileLayer(f), true))),
    [available, layers],
  );
  const toggle = (f: ScienceField) => controls?.setLayer(meanwhileLayer(f), !active.has(f), true);
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
  /** Bumped to ask effect 1 to apply a step's view again (sand-pmz.25). */
  const [reapply, setReapply] = useState(0);
  /** Set by a resume out of a diverged view: play once the step is armed again. */
  const runWhenArmed = useRef(false);
  const speedBefore = useRef<number | null>(null);

  const exit = useCallback(() => {
    setRunning(false);
    setArmed(null);
    setWaiting(false);
    setStopIndex(0);
    slotsFor.current = null;
    runWhenArmed.current = false;
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

  /**
   * Pause, or resume — and resuming means "put me back where the tour was".
   *
   * Effect 6 pauses whenever the view diverges from the step, which is right:
   * the reader opened a card, switched branch or left the zoom-in, and has
   * taken over. Turning `running` straight back on could never work, because
   * effect 6 has `running` in its dependencies: it re-ran, found the same
   * divergence, and switched it off again in the same tick. The button did
   * nothing, however often it was pressed, and nothing said why (sand-pmz.25).
   *
   * So a resume out of a diverged view does not set `running` at all. It drops
   * effect 1's one-application-per-step latch and asks it to run again, which
   * restores the step's focus, branch and card; effect 2 re-seeks the clock and
   * arms the step; and only then — with the view actually back on the step —
   * does the tour start playing. Setting `running` any earlier would just hand
   * effect 6 a diverged view again, which is the bug.
   *
   * A plain pause and resume, with nothing taken over, keeps carrying on from
   * where it stopped rather than jumping back to the top of the step.
   */
  const toggle = useCallback(() => {
    if (running) {
      setRunning(false);
      return;
    }
    if (expected && diverged(expected, { focus, branch, card }, now)) {
      slotsFor.current = null;
      runWhenArmed.current = true;
      setReapply((n) => n + 1);
      return;
    }
    setRunning(true);
  }, [running, expected, focus, branch, card, now]);

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
  }, [pos, expected, controls, reapply]);

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
    // A resume that had to rebuild the view waited for this moment to play.
    if (runWhenArmed.current) {
      runWhenArmed.current = false;
      setRunning(true);
    }
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
      // …and any surface that drives itself from the keyboard (sand-pmz.4).
      if (ownsKeys(e.target)) return;
      if (e.key === 'Escape') {
        exit();
      } else if (e.key === ' ') {
        // Space is the master switch: let a pause go, or pause the playback.
        e.preventDefault();
        if (waiting) advance();
        else toggle();
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
  }, [pos, exit, advance, goto, waiting, toggle]);

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
 * battle's (remembering the campaign instant and pace) or restore the campaign
 * range, time and pace. URL is the source of truth, so deep links and
 * back/forward work.
 *
 * The pace is part of it because a level may be a different length of thing
 * (ADR 0015): the campaign and its zoom-ins all read at an hour a second, but
 * a chapter spanning 1915–1919 cannot, so it is entered at a pace its own
 * ladder offers and the campaign's is put back on the way out.
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
      if (!memory.current)
        memory.current = { campaignNow: st.now, campaignRange: st.range, campaignSpeed: st.speed };
      const range = battleRange(focus);
      const wanted = parseViewState(window.location.search).t;
      clock.setRange(range, enterNow(st.now, range, wanted));
      clock.setSpeed(enterSpeed(st.speed, range));
    } else if (memory.current) {
      clock.setRange(memory.current.campaignRange, exitNow(memory.current, st.now));
      clock.setSpeed(memory.current.campaignSpeed);
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

/**
 * Whether the commander portraits are on the map (sand-1l0.27). The switch is
 * in the header and the layer is in the map section, which are siblings, so
 * the state is a context rather than a prop threaded through both. It is held
 * in the URL as `-commanders` when it is switched off — **on by default**
 * (sand-neh.30), so an ordinary link says nothing about it and a reader who
 * never touches the switch still sees who was where. The portraits were off
 * for as long as it took to be sure they could be read on a busy map; they
 * can, so the default catches up with them (sand-shn.3).
 */
const COMMANDERS_LAYER = 'commanders';

const COMMANDERS_DEFAULT = true;

const CommandersCtx = createContext<{ on: boolean; toggle: () => void }>({
  on: COMMANDERS_DEFAULT,
  toggle: () => {},
});

/**
 * The surname alone, for a map token. `sortName` is "Moltke, Helmuth von (the
 * Younger)" and the full name is longer still; a campaign-zoom map already
 * carries a label for every army and every town (sand-1l0.27).
 */
function shortPersonName(id: string): string | undefined {
  const person = seed.people.find((p) => p.id === id);
  if (!person) return undefined;
  const sort = person.sortName;
  if (sort) return (sort.split(',')[0] ?? sort).trim();
  const words = person.name.trim().split(/\s+/);
  return words.at(-1) ?? person.name;
}

function CommanderSwitch() {
  const { on, toggle } = useContext(CommandersCtx);
  return <CommanderToggle on={on} onToggle={toggle} available={seed.tracks.length > 0} />;
}

function CommandersProvider({ children }: { children: ReactNode }) {
  const { layers } = useViewState();
  const controls = useViewStateControls();
  const on = layerOn(layers, COMMANDERS_LAYER, COMMANDERS_DEFAULT);
  const toggle = useCallback(
    // The default goes to `setLayer` too, or switching back to it would write
    // a redundant token instead of leaving the URL clean.
    () => controls?.setLayer(COMMANDERS_LAYER, !on, COMMANDERS_DEFAULT),
    [controls, on],
  );
  const value = useMemo(() => ({ on, toggle }), [on, toggle]);
  return <CommandersCtx.Provider value={value}>{children}</CommandersCtx.Provider>;
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
      v.t !== undefined || v.card || v.focus || v.tour || v.pick || v.branch || v.layers?.length,
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

/**
 * The tour's voice, wired to the tour context so either surface can mount it
 * (sand-neh.26). On the map it is a lower third — a narrator standing at the
 * table, pointing at it — and on a phone, whose map is too short to give a
 * corner away, it stays stacked above the beat in the sheet.
 */
function TourNarrator({ variant }: { variant: 'lower-third' | 'stacked' }) {
  const tour = useTour();
  if (!tour.pos) return null;
  const { pos } = tour;
  return (
    <TourPanel
      variant={variant}
      tour={pos.tour}
      step={pos.step}
      index={pos.index}
      running={tour.running}
      waiting={tour.waiting}
      stop={tour.stop}
      autoAdvance={tour.autoAdvance}
      onContinue={tour.advance}
      onSetAutoAdvance={tour.setAutoAdvance}
      sources={seed.sources}
      onPrev={pos.index > 0 ? () => tour.goto(pos.index - 1) : undefined}
      onNext={pos.index < pos.tour.steps.length - 1 ? () => tour.goto(pos.index + 1) : undefined}
      onToggleRunning={tour.toggle}
      onExit={tour.exit}
    />
  );
}

/**
 * Which side is which, and what a dashed ring means — on the map, because it
 * is a key to the map's colours (sand-neh.26, amending ADR 0006).
 */
function MapKey() {
  const controls = useViewStateControls();
  // The key names sides; a formation card is one army's. Where a side put a
  // single army in the field the entry opens it — the BEF, the Belgian Field
  // Army — and where it put nine there is no card called "France", so the
  // entry stays a swatch and a name (sand-y0u.29).
  const openSide = useCallback(
    (sideId: string) => {
      const f = sideFormation(FORMATIONS, sideId);
      return f ? { label: f.name, onClick: () => controls?.setCard(f.id) } : undefined;
    },
    [controls],
  );
  return <SideKey sides={seed.pack.sides} openSide={openSide} />;
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
  const commanders = useContext(CommandersCtx);
  const phone = usePhone();
  const tour = useTour();
  /**
   * The lower third is mounted, so it is covering the map's bottom-left corner
   * (sand-neh.29). The camera is told, and frames the step's geography into
   * what is left — up and to the right — instead of putting it under the panel.
   * The numbers are the panel's own: 360px wide at 16px from the edge, and
   * enough below to clear the shortest useful height of it.
   */
  const narrating = !phone && Boolean(tour.pos);
  const inset = useMemo(() => (narrating ? { left: 392, bottom: 96 } : undefined), [narrating]);
  return (
    <section className="surface surface--map" data-hypothetical={hypothetical || undefined}>
      {hypothetical && <p className="hypothetical-ribbon">Hypothetical · {branch.title}</p>}
      {/* The two things the map owns that are not the map: the narrator and
          the key. Both are laid over the terrain rather than stacked in the
          reading rail, which is what ADR 0006 used to say (sand-neh.26). */}
      {narrating && (
        <div className="map-overlay map-overlay--narrator">
          <TourNarrator variant="lower-third" />
        </div>
      )}
      <div className="map-overlay map-overlay--key">
        <MapKey />
      </div>
      <Suspense fallback={<p className="surface__hint surface__hint--loading">Loading the map…</p>}>
        <MapSurface
          camera={seed.pack.camera}
          borderYear={seed.pack.borderYear}
          frontSeries={seed.pack.frontLine}
          branch={branch}
          movement={movement}
          region={seed.pack.region}
          inset={inset}
          focusRegion={focus?.region}
          places={seed.places}
          tallies={focus ? [] : seed.tallies}
          tracks={seed.tracks}
          showCommanders={commanders.on}
          labelPerson={(id) => shortPersonName(id)}
          portrait={(id) => {
            const entry = portraitFor(id);
            if (!entry) return undefined;
            return {
              src: largestSrc(entry),
              ...(entry.focalPoint ? { focalPoint: entry.focalPoint } : {}),
            };
          }}
          onSelectCommander={(id) => controls?.setCard(id)}
          onSelectFormation={(id) => controls?.setCard(id)}
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
  const dossier = (
    <>
      {/* On a phone the map is too short to give a corner to the narrator, so
          the tour stays here, above the beat (sand-neh.26). Everywhere else it
          is a lower third on the map. */}
      {phone && <TourNarrator variant="stacked" />}
      <Dossier
        beats={seed.beats}
        sources={seed.sources}
        branch={branch}
        focus={focus?.id}
        packTitle={focus ? focus.title : seed.pack.title}
        related={related}
        vignettes={voices}
        label={(id) => labeller.label(id)}
        resolvePortrait={portraitFor}
        resolveMedia={mediaById}
        resolveDiagram={(file) => seed.diagrams[file]}
        castLabel={`${CAST_MEMBERS.length} in the cast`}
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
          card?.kind === 'bibliography' ? (
            <BibliographyView
              sources={seed.sources}
              use={sourceUse()}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'source' ? (
            <SourceCardView
              source={card.card}
              use={sourceUse().get(card.card.id)}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'tech' ? (
            <TechCardView
              card={card.card}
              sources={seed.sources}
              labeller={labeller}
              resolveMedia={mediaById}
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
          ) : card?.kind === 'historiography' ? (
            <HistoriographyCardView
              point={card.card}
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
              tracks={seed.tracks.filter((t) => t.person === card.card.id)}
              cast={seed.cast.find((c) => c.person === card.card.id)}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : card?.kind === 'formation' ? (
            <FormationCardView
              formation={card.card}
              sources={seed.sources}
              labeller={labeller}
              sides={seed.pack.sides}
              subordinates={subordinatesOf(FORMATIONS, card.card.id).map((f) => ({
                id: f.id,
                label: f.short ?? f.name,
              }))}
              routes={seed.routes.filter((r) => r.formation === card.card.id)}
              resolveMedia={mediaById}
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
  // A card is far longer than a beat — a portrait alone is taller than the
  // pane the dossier gets at medium widths. Both layouts need telling
  // (sand-neh.9): the sheet raises itself off peek, where the body is clipped
  // to 112px, and the surface is allowed more height while a card is open.
  const cardKey = card ? `${card.kind}:${card.card.id}` : undefined;
  return phone ? (
    <BottomSheet initial="peek" raiseFor={cardKey}>
      {dossier}
    </BottomSheet>
  ) : (
    <div className="surface surface--dossier" data-card={card ? '' : undefined}>
      {dossier}
    </div>
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
    // The one marker family that is not suppressed inside a focus. The others
    // are the campaign's own furniture; "Meanwhile" is a layer that runs
    // alongside whatever window is on the strip, and the epilogue chapter is a
    // window drawn for it (ADR 0015).
    const science: TimelineMarker[] = seed.science
      .filter((c) => onTheStrip(c, stripRange(focus)) && meanwhile.active.has(c.field))
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
  // The score's bed follows the vignettes, not the dossier: it marks the
  // moment a first-person voice arrives, wherever the reader is looking.
  const { now } = useClock();
  const { branch: branchId } = useViewState();
  const vignetteMoment = vignetteNear(seed.vignettes, now, branchId ?? seed.pack.defaultBranch);
  // A zoom-in widens the reading rail (sand-neh.27); the shell is where both
  // columns are, so it is the element that carries the state.
  const zoomedIn = useFocus();
  return (
    <div className="app" inert={showing || undefined}>
      <header className="app__header">
        <div className="app__header-text">
          <p className="eyebrow">Operational study · Western Front, 1914</p>
          <h1 className="brand">
            {/* The name is on the link, not on whichever lockup the theme
                happens to be showing: the light image carried the `alt`, and
                in dark mode CSS takes it out of the accessibility tree, so the
                first tab stop on the page — and the document's only h1 — had
                no name at all (sand-pmz.4). Both images are decoration now. */}
            <a className="brand__link" href="/">
              <span className="visually-hidden">Sandtable</span>
              <img
                className="brand__wordmark brand__wordmark--light"
                src="/brand/wordmark-light.png"
                alt=""
                aria-hidden="true"
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
          <ScorePlayer score={seed.score} opening={showing} vignette={vignetteMoment} />
          <CopyLink />
          <CommanderSwitch />
          <TourStart />
          <BranchToggle branches={seed.pack.branches} defaultBranch={seed.pack.defaultBranch} />
        </div>
      </header>

      <FocusController />
      <FocusBar />

      <main className="app__main" data-focus={zoomedIn ? '' : undefined}>
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
          <CommandersProvider>
            <OpeningProvider>
              <AppShell />
            </OpeningProvider>
          </CommandersProvider>
        </MeanwhileProvider>
      </TourProvider>
    </ClockProvider>
  );
}
