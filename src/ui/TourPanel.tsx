/**
 * The guided tour's own voice in the dossier (sand-1l0.14): where the tour has
 * got to, what it wants you to notice, and the controls to take over. The
 * controls are always visible — a tour that cannot be stopped is a trap — and
 * the step title is announced politely so a screen reader hears each advance.
 *
 * Presentational: the controller in App.tsx owns the state.
 */
import { useMemo } from 'react';
import { withFootnotes } from '../engine/beats.js';
import type { Citation, Source, Tour, TourStep } from '../packs/schema/index.js';
import type { TourStop } from '../engine/tour.js';
import './tour.css';
import { Prose } from './Prose.js';

/** What each kind of break is giving the reader time for. */
const STOP_LABEL: Record<TourStop['kind'], string> = {
  card: 'A card to read',
  beat: 'A new chapter',
  decision: 'A decision point',
  'step-end': 'End of the step',
};

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
  /**
   * Where the panel is mounted (sand-neh.26). `lower-third` is the map's
   * corner — sized to its content, so the narration is no longer squeezed
   * into a 55vh slot it shared with the beat. `stacked` is the phone's sheet,
   * above the beat, which is the shape it has always had.
   */
  variant?: 'lower-third' | 'stacked';
  tour: Tour;
  step: TourStep;
  /** 0-based position of `step` within the tour. */
  index: number;
  /** True while the tour is advancing itself. */
  running: boolean;
  /** Stopped at a break in the narrative, waiting to be let on (sand-1l0.28). */
  waiting?: boolean;
  /** Which break — its kind names what the reader is being given time for. */
  stop?: TourStop | undefined;
  /** Whether breaks end on a dwell or on a click. */
  autoAdvance?: boolean;
  sources: Source[];
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  onToggleRunning: () => void;
  onExit: () => void;
  /** Let the tour on from the break it is stopped at. */
  onContinue?: (() => void) | undefined;
  onSetAutoAdvance?: ((on: boolean) => void) | undefined;
}

export function TourPanel({
  variant = 'stacked',
  tour,
  step,
  index,
  running,
  waiting = false,
  stop,
  autoAdvance = true,
  sources,
  onPrev,
  onNext,
  onToggleRunning,
  onExit,
  onContinue,
  onSetAutoAdvance,
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
    <section className="tour" data-variant={variant} aria-label={`Guided tour — ${tour.title}`}>
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
        <Prose>{narration}</Prose>
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
        {waiting && onContinue ? (
          <button
            type="button"
            className="tour__button tour__button--primary"
            onClick={onContinue}
            aria-label={`Continue${stop ? ` past ${STOP_LABEL[stop.kind].toLowerCase()}` : ''}`}
          >
            ▶ Continue
          </button>
        ) : (
          <button
            type="button"
            className="tour__button tour__button--primary"
            onClick={onToggleRunning}
            aria-label={running ? 'Pause the tour' : 'Resume the tour'}
          >
            {running ? '❙❙ Pause' : '▶ Resume'}
          </button>
        )}
        <button
          type="button"
          className="tour__button"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next step"
        >
          Next ›
        </button>
        {onSetAutoAdvance && (
          <button
            type="button"
            className="tour__button tour__button--toggle"
            aria-pressed={autoAdvance}
            onClick={() => onSetAutoAdvance(!autoAdvance)}
            title={
              autoAdvance ? 'Each pause ends on its own after a moment' : 'Each pause waits for you'
            }
          >
            {autoAdvance ? '◉' : '○'} Auto-advance
          </button>
        )}
        <button type="button" className="tour__button tour__button--exit" onClick={onExit}>
          Exit tour
        </button>
      </div>
      <p className="tour__hint">
        {waiting
          ? `${stop ? STOP_LABEL[stop.kind] : 'A pause'} — ${
              autoAdvance && running ? 'going on shortly' : 'continue when you are ready'
            }. Space or → to go on, ← to go back, Esc to leave.`
          : running
            ? 'Playing — Space to pause, or move the map to take over.'
            : 'Paused. Space to go on, ← to step back, Esc to leave the tour.'}
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
