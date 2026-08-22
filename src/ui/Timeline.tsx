/**
 * The timeline: one strip that shows "now", lets you scrub it, play it, and
 * read the phases and events around it. Era-agnostic — it renders whatever
 * range, phases and markers it is given.
 *
 * Keyboard (when the strip or a control has focus — and globally unless an
 * input is focused): Space play/pause · ←/→ step · Shift+←/→ big step ·
 * Home/End jump · , and . slower/faster.
 */
import { useCallback, useEffect, useId, useMemo, useRef, type KeyboardEvent } from 'react';
import { speedPresetsFor, stepFor } from '../engine/clock.js';
import { useClock, useClockControls } from '../engine/ClockContext.js';
import { labelNow, ticksFor } from '../engine/ticks.js';
import './timeline.css';

export interface TimelinePhase {
  id: string;
  title: string;
  /** Epoch ms. */
  from: number;
  to: number;
  hypothetical?: boolean;
}

export type MarkerKind = 'event' | 'battle' | 'decision' | 'tech' | 'science' | 'document';

export interface TimelineMarker {
  id: string;
  title: string;
  /** Epoch ms. */
  at: number;
  /** Glyph family (ADR 0006): ▲ event · ◆ battle · ◇ decision · ⚙ tech · ✦ science · ▢ document. */
  kind?: MarkerKind;
}

// eslint-disable-next-line react-refresh/only-export-components -- glyph table belongs with the strip
export const MARKER_GLYPH: Record<MarkerKind, string> = {
  event: '▲',
  battle: '◆',
  decision: '◇',
  tech: '⚙',
  science: '✦',
  document: '▢',
};

export interface TimelineProps {
  /** Phase bands (narrative beats) for the active branch. */
  phases?: TimelinePhase[];
  /** Major events shown as ticks with titles. */
  markers?: TimelineMarker[];
  /** Heading shown at the left of the strip, e.g. the pack title. */
  title?: string;
  /** Listen for shortcuts on window as well as on the strip (default true). */
  globalShortcuts?: boolean;
  /** Called when a marker is clicked (after the clock seeks to it). */
  onSelectMarker?: (marker: TimelineMarker) => void;
}

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function Timeline({
  phases = [],
  markers = [],
  title,
  globalShortcuts = true,
  onSelectMarker,
}: TimelineProps) {
  const { now, range, playing, speed } = useClock();
  const clock = useClockControls();
  const id = useId();
  const stripRef = useRef<HTMLDivElement>(null);

  const span = range.end - range.start;
  const pct = useCallback(
    (t: number) =>
      `${((Math.min(range.end, Math.max(range.start, t)) - range.start) / span) * 100}%`,
    [range, span],
  );
  const ticks = useMemo(() => ticksFor(range), [range]);
  const presets = useMemo(() => speedPresetsFor(range), [range]);
  const steps = useMemo(() => stepFor(range), [range]);
  const label = labelNow(now, range);
  const activePhase = phases.find(
    (p) => now >= p.from && (now < p.to || (now >= range.end && p.to >= range.end)),
  );

  const speedIndex = Math.max(
    0,
    presets.findIndex((p) => p.speed === speed),
  );
  const changeSpeed = useCallback(
    (dir: 1 | -1) => {
      const next = presets[Math.min(presets.length - 1, Math.max(0, speedIndex + dir))];
      if (next) clock.setSpeed(next.speed);
    },
    [clock, presets, speedIndex],
  );

  const onKey = useCallback(
    (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const big = e.shiftKey;
      switch (e.key) {
        case ' ':
        case 'k':
          clock.toggle();
          break;
        case 'ArrowRight':
          clock.step(big ? steps.large : steps.small);
          break;
        case 'ArrowLeft':
          clock.step(-(big ? steps.large : steps.small));
          break;
        case 'Home':
          clock.seek(range.start);
          break;
        case 'End':
          clock.seek(range.end);
          break;
        case ',':
          changeSpeed(-1);
          break;
        case '.':
          changeSpeed(1);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [clock, steps, range, changeSpeed],
  );

  useEffect(() => {
    if (!globalShortcuts) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.target instanceof Node && stripRef.current?.contains(e.target)) return; // handled by onKeyDown
      onKey(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [globalShortcuts, onKey]);

  return (
    <div className="timeline" ref={stripRef} onKeyDown={onKey} data-playing={playing || undefined}>
      <div className="timeline__head">
        <div className="timeline__now" aria-live="off">
          <span className="timeline__counter">{label.counter}</span>
          <span className="timeline__date">
            {label.weekday}, {label.date}
          </span>
          {activePhase && (
            <span
              className="timeline__phase"
              data-hypothetical={activePhase.hypothetical || undefined}
            >
              {activePhase.hypothetical ? 'Hypothetical · ' : ''}
              {activePhase.title}
            </span>
          )}
        </div>
        <div className="timeline__controls" role="group" aria-label="Playback">
          <button
            type="button"
            className="timeline__button"
            onClick={() => clock.seek(range.start)}
            aria-label="Jump to start"
            title="Jump to start (Home)"
          >
            ⏮
          </button>
          <button
            type="button"
            className="timeline__button timeline__button--play"
            onClick={() => clock.toggle()}
            aria-pressed={playing}
            aria-label={playing ? 'Pause' : 'Play'}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            className="timeline__button"
            onClick={() => clock.step(steps.large)}
            aria-label="Step forward"
            title="Step forward (Shift+→)"
          >
            ⏭
          </button>
          <label className="timeline__speed">
            <span className="visually-hidden">Speed</span>
            <select
              value={presets[speedIndex]?.speed ?? speed}
              onChange={(e) => clock.setSpeed(Number(e.target.value))}
              aria-label="Playback speed"
              title="Playback speed (, and .)"
            >
              {presets.map((p) => (
                <option key={p.speed} value={p.speed}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="timeline__track">
        <div className="timeline__phases" aria-hidden="true">
          {phases.map((p) => (
            <div
              key={p.id}
              className="timeline__band"
              data-active={p === activePhase || undefined}
              data-hypothetical={p.hypothetical || undefined}
              style={{ left: pct(p.from), width: `calc(${pct(p.to)} - ${pct(p.from)})` }}
              title={p.title}
            >
              <span className="timeline__band-label">{p.title}</span>
            </div>
          ))}
        </div>
        <div className="timeline__ticks" aria-hidden="true">
          {ticks.map((t) => (
            <div
              key={t.at}
              className={`timeline__tick${t.major ? ' timeline__tick--major' : ''}`}
              style={{ left: pct(t.at) }}
            >
              {t.major && <span className="timeline__tick-label">{t.label}</span>}
            </div>
          ))}
        </div>
        <div className="timeline__markers">
          {markers.map((m) => {
            const kind = m.kind ?? 'event';
            return (
              <button
                type="button"
                key={m.id}
                className="timeline__marker"
                data-kind={kind}
                data-past={m.at <= now || undefined}
                style={{ left: pct(m.at) }}
                onClick={() => {
                  clock.seek(m.at);
                  onSelectMarker?.(m);
                }}
                title={m.title}
                aria-label={`${kind === 'event' ? 'Jump to' : 'Open'} ${m.title}`}
              >
                {kind === 'event' ? (
                  <span className="timeline__marker-dot" />
                ) : (
                  <span className="timeline__marker-glyph" aria-hidden="true">
                    {MARKER_GLYPH[kind]}
                  </span>
                )}
                <span className="timeline__marker-label">{m.title}</span>
              </button>
            );
          })}
        </div>
        <div className="timeline__progress" style={{ width: pct(now) }} aria-hidden="true" />
        <input
          id={`${id}-scrubber`}
          className="timeline__scrubber"
          type="range"
          min={range.start}
          max={range.end}
          step={Math.max(1000, Math.round(span / 2000))}
          value={now}
          onChange={(e) => clock.seek(Number(e.target.value))}
          aria-label={title ? `Time — ${title}` : 'Time'}
          aria-valuetext={label.aria}
        />
      </div>
    </div>
  );
}
