/**
 * Application shell.
 *
 * Three surfaces — one map, one dossier, one timeline (sand-neh.5) — driven by
 * one clock (sand-a55.8). The map (sand-a55.9) and dossier (sand-a55.12)
 * are placeholders that already subscribe to the clock, so the wiring they
 * will use is exercised now. Content comes from the bundled seed pack until
 * the lazy loader lands (sand-shn.1).
 */
import { lazy, Suspense, useMemo } from 'react';
import { ClockProvider, useViewState } from './engine/ClockContext.js';
import { seed } from './packs/seed.js';
import { BranchToggle } from './ui/BranchToggle.js';
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

function MapSection() {
  const branch = useBranch();
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
        />
      </Suspense>
    </section>
  );
}

function DossierSurface() {
  const branch = useBranch();
  return (
    <div className="surface surface--dossier">
      <Dossier
        beats={seed.beats}
        sources={seed.sources}
        sides={seed.pack.sides}
        branch={branch}
        packTitle={seed.pack.title}
      />
    </div>
  );
}

function TimelineSurface() {
  const branch = useBranch();
  const phases = useMemo<TimelinePhase[]>(
    () =>
      seed.beats
        .filter((b) => !b.branch || b.branch === branch.id)
        .map((b) => ({
          id: b.id,
          title: b.title,
          from: Date.parse(b.from),
          to: Date.parse(b.to),
          ...(branch.kind === 'counterfactual' && b.branch === branch.id
            ? { hypothetical: true }
            : {}),
        })),
    [branch],
  );
  const markers = useMemo<TimelineMarker[]>(
    () =>
      seed.events
        .filter((e) => e.significance === 'major' && (!e.branch || e.branch === branch.id))
        .map((e) => ({ id: e.id, title: e.title, at: Date.parse(e.at ?? e.timeRange!.start) })),
    [branch],
  );
  return (
    <footer className="surface surface--timeline" aria-label="Timeline">
      <Timeline title={seed.pack.title} phases={phases} markers={markers} />
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

        <main className="app__main">
          <MapSection />
          <DossierSurface />
        </main>

        <TimelineSurface />
      </div>
    </ClockProvider>
  );
}
