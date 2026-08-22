/**
 * Application shell.
 *
 * Three surfaces — one map, one dossier, one timeline (sand-neh.5) — driven by
 * one clock (sand-a55.8). The map (sand-a55.9) and dossier (sand-a55.12)
 * are placeholders that already subscribe to the clock, so the wiring they
 * will use is exercised now. Content comes from the bundled seed pack until
 * the lazy loader lands (sand-shn.1).
 */
import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import {
  ClockProvider,
  useClockControls,
  useViewState,
  useViewStateControls,
} from './engine/ClockContext.js';
import { battleRange, enterNow, exitNow, resolveFocus, type FocusMemory } from './engine/focus.js';
import { seed } from './packs/seed.js';
import { BranchToggle } from './ui/BranchToggle.js';
import { Breadcrumb } from './ui/Breadcrumb.js';
import { Dossier } from './ui/Dossier.js';
import { Timeline, type TimelineMarker, type TimelinePhase } from './ui/Timeline.js';

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

function MapSection() {
  const branch = useBranch();
  const focus = useFocus();
  const hypothetical = branch.kind === 'counterfactual';
  return (
    <section className="surface surface--map" data-hypothetical={hypothetical || undefined}>
      {hypothetical && <p className="hypothetical-ribbon">Hypothetical · {branch.title}</p>}
      <Suspense fallback={<p className="surface__hint surface__hint--loading">Loading the map…</p>}>
        <MapSurface
          camera={seed.pack.camera}
          borderYear={seed.pack.borderYear}
          branch={branch}
          movement={MOVEMENT_SOURCE}
          region={seed.pack.region}
          focusRegion={focus?.region}
          places={seed.places}
        />
      </Suspense>
    </section>
  );
}

function DossierSurface() {
  const branch = useBranch();
  const focus = useFocus();
  return (
    <div className="surface surface--dossier">
      <Dossier
        beats={seed.beats}
        sources={seed.sources}
        sides={seed.pack.sides}
        branch={branch}
        focus={focus?.id}
        packTitle={focus ? focus.title : seed.pack.title}
      />
    </div>
  );
}

function TimelineSurface() {
  const branch = useBranch();
  const focus = useFocus();
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
  const markers = useMemo<TimelineMarker[]>(
    () =>
      (focus ? (focus.events ?? []) : seed.events)
        .filter((e) => e.significance === 'major' && (!e.branch || e.branch === branch.id))
        .map((e) => ({ id: e.id, title: e.title, at: Date.parse(e.at ?? e.timeRange!.start) })),
    [branch, focus],
  );
  return (
    <footer className="surface surface--timeline" aria-label="Timeline">
      <Timeline title={focus ? focus.title : seed.pack.title} phases={phases} markers={markers} />
    </footer>
  );
}

export function App() {
  return (
    <ClockProvider range={RANGE}>
      <div className="app">
        <header className="app__header">
          <div className="app__header-text">
            <p className="eyebrow">Operational study · Western Front, 1914</p>
            <h1>Sandtable</h1>
            <p className="lede">{seed.pack.subtitle ?? seed.pack.title}</p>
          </div>
          <BranchToggle branches={seed.pack.branches} defaultBranch={seed.pack.defaultBranch} />
        </header>

        <FocusController />
        <FocusBar />

        <main className="app__main">
          <MapSection />
          <DossierSurface />
        </main>

        <TimelineSurface />
      </div>
    </ClockProvider>
  );
}
