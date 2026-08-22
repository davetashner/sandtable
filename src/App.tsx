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
  useClock,
  useClockControls,
  useViewState,
  useViewStateControls,
} from './engine/ClockContext.js';
import { selectBeat } from './engine/beats.js';
import { battleRange, enterNow, exitNow, resolveFocus, type FocusMemory } from './engine/focus.js';
import { seed } from './packs/seed.js';
import { BranchToggle } from './ui/BranchToggle.js';
import { Breadcrumb } from './ui/Breadcrumb.js';
import { Dossier, type CardChipLike } from './ui/Dossier.js';
import { TechCardView, type EntityLabeller } from './ui/TechCardView.js';
import { Timeline, type TimelineMarker, type TimelinePhase } from './ui/Timeline.js';
import type { Links } from './packs/schema/index.js';

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

/** Labels and actions for entity ids, shared by cards and beat chips. */
function useLabeller(): EntityLabeller {
  const controls = useViewStateControls();
  const clock = useClockControls();
  return useMemo(
    () => ({
      label(id) {
        return (
          seed.tech.find((t) => t.id === id)?.title ??
          seed.events.find((e) => e.id === id)?.title ??
          seed.battles.find((b) => b.id === id)?.title ??
          seed.formations.find((f) => f.id === id)?.name ??
          seed.places.find((p) => p.id === id)?.name ??
          seed.beats.find((b) => b.id === id)?.title
        );
      },
      open(id, kind: keyof Links) {
        if (kind === 'tech') return () => controls?.setCard(id);
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

/** The tech card the URL's card slot names, if any. */
function useCard() {
  const { card } = useViewState();
  return card ? seed.tech.find((t) => t.id === card) : undefined;
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
  const card = useCard();
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
    for (const id of links.tech ?? []) {
      const label = labeller.label(id);
      if (label) out.push({ id, label, kind: 'tech', onClick: () => controls?.setCard(id) });
    }
    for (const id of links.battles ?? []) {
      const label = labeller.label(id);
      if (label && id !== focus?.id)
        out.push({ id, label, kind: 'battle', onClick: () => controls?.setFocus(id) });
    }
    return out;
  }, [beat, labeller, controls, focus?.id]);
  return (
    <div className="surface surface--dossier">
      <Dossier
        beats={seed.beats}
        sources={seed.sources}
        sides={seed.pack.sides}
        branch={branch}
        focus={focus?.id}
        packTitle={focus ? focus.title : seed.pack.title}
        related={related}
        card={
          card ? (
            <TechCardView
              card={card}
              sources={seed.sources}
              labeller={labeller}
              onBack={() => controls?.setCard(undefined)}
            />
          ) : undefined
        }
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
  const controls = useViewStateControls();
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
    return [...events, ...tech];
  }, [branch, focus]);
  return (
    <footer className="surface surface--timeline" aria-label="Timeline">
      <Timeline
        title={focus ? focus.title : seed.pack.title}
        phases={phases}
        markers={markers}
        onSelectMarker={(m) => {
          if (m.kind === 'tech') controls?.setCard(m.id);
        }}
      />
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
