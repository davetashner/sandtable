/**
 * The guided tour's own voice in the dossier (sand-1l0.14): where the tour has
 * got to, what it wants you to notice, and the controls to take over. The
 * controls are always visible — a tour that cannot be stopped is a trap — and
 * the step title is announced politely so a screen reader hears each advance.
 *
 * Presentational: the controller in App.tsx owns the state.
 */
import { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { withFootnotes } from '../engine/beats.js';
import type { Citation, Source, Tour, TourStep } from '../packs/schema/index.js';
import './tour.css';

/**
 * The citations a step actually makes. A tour's `sources` are the whole
 * tour's bibliography; rendering all of them under every step would bury the
 * narration (and repeat fifteen times), so each step footnotes only what it
 * cites.
 */
function citedBy(narration: string, sources: Citation[]): Citation[] {
  const cited = new Set([...narration.matchAll(/\[\^([^\]\s]+)\]/g)].map((m) => m[1]));
  return sources.filter((c) => cited.has(c.source.split(':')[1] ?? c.source));
}

export interface TourPanelProps {
  tour: Tour;
  step: TourStep;
  /** 0-based position of `step` within the tour. */
  index: number;
  /** True while the tour is advancing itself. */
  running: boolean;
  sources: Source[];
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  onToggleRunning: () => void;
  onExit: () => void;
}

export function TourPanel({
  tour,
  step,
  index,
  running,
  sources,
  onPrev,
  onNext,
  onToggleRunning,
  onExit,
}: TourPanelProps) {
  const total = tour.steps.length;
  const narration = useMemo(
    () =>
      withFootnotes(
        { body: step.narration, sources: citedBy(step.narration, tour.sources) },
        sources,
      ),
    [step.narration, tour.sources, sources],
  );
  return (
    <section className="tour" aria-label={`Guided tour — ${tour.title}`}>
      <p className="tour__eyebrow">
        <span>Guided tour</span>
        <span className="tour__count">
          Step {index + 1} of {total}
        </span>
      </p>
      <ol className="tour__progress" aria-hidden="true">
        {tour.steps.map((s, i) => (
          <li
            key={s.id}
            className="tour__pip"
            data-state={i < index ? 'done' : i === index ? 'here' : 'ahead'}
          />
        ))}
      </ol>
      <div aria-live="polite">
        <h2 className="tour__title">{step.title}</h2>
      </div>
      <div className="tour__narration">
        <Markdown remarkPlugins={[remarkGfm]}>{narration}</Markdown>
      </div>
      <div className="tour__controls">
        <button
          type="button"
          className="tour__button"
          onClick={onPrev}
          disabled={!onPrev}
          aria-label="Previous step"
        >
          ‹ Back
        </button>
        <button
          type="button"
          className="tour__button tour__button--primary"
          onClick={onToggleRunning}
          aria-label={running ? 'Pause the tour' : 'Resume the tour'}
        >
          {running ? '❙❙ Pause' : '▶ Resume'}
        </button>
        <button
          type="button"
          className="tour__button"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next step"
        >
          Next ›
        </button>
        <button type="button" className="tour__button tour__button--exit" onClick={onExit}>
          Exit tour
        </button>
      </div>
      <p className="tour__hint">
        {running
          ? 'Playing — move the map or open anything to take over.'
          : 'Paused. Resume, step through it, or leave the tour and explore.'}
      </p>
    </section>
  );
}

export interface TourLauncherProps {
  tour: Tour;
  minutes: number;
  onStart: () => void;
}

/** "Play the story" — the way in, beside the branch toggle. */
export function TourLauncher({ tour, minutes, onStart }: TourLauncherProps) {
  return (
    <button
      type="button"
      className="tour-launch"
      onClick={onStart}
      title={tour.summary}
      aria-label={`Play the story — ${tour.title}, about ${minutes} minutes`}
    >
      <span className="tour-launch__mark" aria-hidden="true">
        ▶
      </span>
      <span className="tour-launch__label">Play the story</span>
      <span className="tour-launch__time" aria-hidden="true">
        {minutes} min
      </span>
    </button>
  );
}
