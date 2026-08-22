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
import { ClockProvider, useClock, useViewState } from './engine/ClockContext.js';
import { labelNow } from './engine/ticks.js';
import { seed } from './packs/seed.js';
import { Timeline, type TimelineMarker, type TimelinePhase } from './ui/Timeline.js';

// MapLibre + deck.gl are the heaviest dependencies; load them on demand so the
// shell, timeline and dossier paint first.
const MapView = lazy(() => import('./engine/map/MapView.js').then((m) => ({ default: m.MapView })));

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

function MapSurface() {
  const { now, range } = useClock();
  const label = labelNow(now, range);
  return (
    <section className="surface surface--map">
      <Suspense fallback={<p className="surface__hint surface__hint--loading">Loading the map…</p>}>
        <MapView
          camera={seed.pack.camera}
          borderYear={seed.pack.borderYear}
          label={`Map — ${label.date}`}
        />
      </Suspense>
    </section>
  );
}

function DossierPlaceholder() {
  const { now, range } = useClock();
  const branch = useBranch();
  const beat = seed.beats.find((b) => {
    if (b.branch && b.branch !== branch.id) return false;
    const from = Date.parse(b.from);
    const to = Date.parse(b.to);
    return now >= from && (now < to || (now >= range.end && to >= range.end));
  });
  return (
    <aside className="surface surface--dossier" aria-label="Dossier">
      <p className="surface__label">Dossier · {branch.title}</p>
      {beat ? (
        <>
          <h2 className="dossier__title">{beat.title}</h2>
          <p className="dossier__date">{beat.dateLabel}</p>
        </>
      ) : (
        <p className="surface__hint">No narrative beat at this moment.</p>
      )}
      <p className="surface__hint">
        Narrative beats, documents, tech and science cards — <code>sand-a55.12</code>.
      </p>
    </aside>
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
          <p className="eyebrow">Operational study · Western Front, 1914</p>
          <h1>Sandtable</h1>
          <p className="lede">{seed.pack.subtitle ?? seed.pack.title}</p>
        </header>

        <main className="app__main">
          <MapSurface />
          <DossierPlaceholder />
        </main>

        <TimelineSurface />
      </div>
    </ClockProvider>
  );
}
