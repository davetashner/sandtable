/**
 * The timeline: one strip that shows "now", lets you scrub it, play it, and
 * read the phases and events around it. Era-agnostic — it renders whatever
 * range, phases and markers it is given.
 *
 * Keyboard (when the strip or a control has focus — and globally unless an
 * input is focused): Space play/pause · ←/→ step · Shift+←/→ big step ·
 * Home/End jump · , and . slower/faster.
 *
 * The markers row is the one exception, and it declares it (sand-pmz.12): it
 * is one button per event, about fifty of them, so it is a roving `tabindex` —
 * one tab stop, the arrows to move within it — and taking the arrows means
 * taking them off the transport for as long as focus is in the row.
 *
 * The parts below are each one row of the strip and one rule — the phase
 * bands, the date axis, the transport, the markers row — plus the two hooks
 * that are rules with no row of their own: the speed ladder and the keyboard.
 * `Timeline` itself is the frame that holds them, the scrubber, and the clock
 * they all read.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  speedLabel,
  speedPresetsFor,
  stepFor,
  type ClockRange,
  type SpeedPreset,
} from '../engine/clock.js';
import { useClock, useClockControls } from '../engine/ClockContext.js';
import { usePhone } from '../engine/useMediaQuery.js';
import { labelNow, ticksFor } from '../engine/ticks.js';
import { declaresOwnKeys, ownsKeys, OWNS_KEYS } from '../engine/shortcuts.js';
import { useRoving } from '../engine/roving.js';
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

/** Where an instant sits on the strip, as a CSS percentage. */
type Position = (t: number) => string;

/** How far ←/→ and Shift+←/→ move the clock at this range. */
type Steps = ReturnType<typeof stepFor>;

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

export function Timeline({
  phases = [],
  markers = [],
  title,
  globalShortcuts = true,
  onSelectMarker,
}: TimelineProps) {
  const { now, range, playing } = useClock();
  const clock = useClockControls();
  const id = useId();
  const stripRef = useRef<HTMLDivElement>(null);

  const span = range.end - range.start;
  const pct = useCallback<Position>(
    (t) => `${((Math.min(range.end, Math.max(range.start, t)) - range.start) / span) * 100}%`,
    [range, span],
  );
  const steps = useMemo(() => stepFor(range), [range]);
  const speeds = useSpeedLadder(range);
  const onKey = useTransportKeys({ steps, speeds, globalShortcuts, strip: stripRef });
  const label = labelNow(now, range);
  const activePhase = activePhaseAt(phases, now, range);

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
        <Transport steps={steps} speeds={speeds} />
      </div>

      <div className="timeline__track">
        <PhaseBands phases={phases} active={activePhase} pct={pct} />
        <TickRow range={range} pct={pct} />
        <div className="timeline__progress" style={{ width: pct(now) }} aria-hidden="true" />
        {/* Before the markers, not after them: the rows no longer overlap, so
            nothing paints over anything, and a keyboard reader reaches the
            control the strip is for without tabbing past fifty events to get
            to it (sand-pmz.4). */}
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
        <MarkerRow markers={markers} pct={pct} onSelect={onSelectMarker} />
      </div>
    </div>
  );
}

/**
 * The phase the clock is standing in, which is also the one band drawn active.
 *
 * A phase holds `now` up to but not including its end, so two touching phases
 * cannot both be active — except at the very end of the range, where the clock
 * can sit on `range.end` for good and would otherwise be in no phase at all.
 */
function activePhaseAt(phases: TimelinePhase[], now: number, range: ClockRange) {
  return phases.find(
    (p) => now >= p.from && (now < p.to || (now >= range.end && p.to >= range.end)),
  );
}

/** ⏮ ▶ ⏭ and the speed select — everything the transport does with a pointer. */
function Transport({ steps, speeds }: { steps: Steps; speeds: SpeedLadder }) {
  const { range, playing, speed } = useClock();
  const clock = useClockControls();
  return (
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
          value={speed}
          onChange={(e) => clock.setSpeed(Number(e.target.value))}
          aria-label="Playback speed"
          title="Playback speed (, and .)"
        >
          {speeds.options.map((p) => (
            <option key={p.speed} value={p.speed}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** The narrative beats as bands under the strip; decoration, so `aria-hidden`. */
function PhaseBands({
  phases,
  active,
  pct,
}: {
  phases: TimelinePhase[];
  active: TimelinePhase | undefined;
  pct: Position;
}) {
  return (
    <div className="timeline__phases" aria-hidden="true">
      {phases.map((p) => (
        <div
          key={p.id}
          className="timeline__band"
          data-active={p === active || undefined}
          data-hypothetical={p.hypothetical || undefined}
          style={{ left: pct(p.from), width: `calc(${pct(p.to)} - ${pct(p.from)})` }}
          title={p.title}
        />
      ))}
    </div>
  );
}

/** The date axis. */
function TickRow({ range, pct }: { range: ClockRange; pct: Position }) {
  // The date labels read at the type floor like everything else (ADR 0010);
  // twelve of them at 11.5px collide on a 330px strip, so a phone gets half
  // as many rather than half-size type (sand-pmz.4).
  const phone = usePhone();
  const ticks = useMemo(() => ticksFor(range, phone ? 6 : 12), [range, phone]);
  return (
    <div className="timeline__ticks" aria-hidden="true">
      {ticks.map((t) => (
        <div
          key={t.at}
          className={`timeline__tick${t.major ? ' timeline__tick--major' : ''}`}
          style={{ left: pct(t.at) }}
          // A label is centred on its tick, so one sitting exactly on an
          // edge hangs half of itself off the strip and gives the page a
          // horizontal scrollbar. That happens whenever a range ends on a
          // round step — a two-day chapter window, a seven-day zoom-in —
          // so the edge labels align inwards instead of centring.
          data-edge={t.at <= range.start ? 'start' : t.at >= range.end ? 'end' : undefined}
        >
          {t.major && <span className="timeline__tick-label">{t.label}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * One button per event, and one tab stop for all of them (sand-pmz.12): the
 * row owns ←/→ while the keyboard is inside it, which is what `data-owns-keys`
 * keeps the transport's hands off.
 *
 * The glyph families are ADR 0006's: an event is a plain dot, and everything
 * that opens a card carries its family's mark.
 */
function MarkerRow({
  markers,
  pct,
  onSelect,
}: {
  markers: TimelineMarker[];
  pct: Position;
  onSelect: ((marker: TimelineMarker) => void) | undefined;
}) {
  const { now } = useClock();
  const clock = useClockControls();
  // Where Tab lands in the row before the reader has moved: the last event the
  // clock has passed, so entering the row puts them at "now" rather than at the
  // outbreak of the war.
  const entry = useMemo(() => {
    let i = 0;
    for (let k = 0; k < markers.length; k++) if (markers[k]!.at <= now) i = k;
    return i;
  }, [markers, now]);
  const roving = useRoving<HTMLDivElement>(markers.length, { orientation: 'horizontal', entry });
  return (
    <div
      className="timeline__markers"
      role="group"
      aria-label="Events — walk them with the arrow keys"
      ref={roving.ref}
      onKeyDown={roving.onKeyDown}
      {...{ [OWNS_KEYS]: '' }}
    >
      {markers.map((m, i) => {
        const kind = m.kind ?? 'event';
        return (
          <button
            type="button"
            key={m.id}
            {...roving.itemProps(i)}
            className="timeline__marker"
            data-kind={kind}
            data-past={m.at <= now || undefined}
            style={{ left: pct(m.at) }}
            onClick={() => {
              clock.seek(m.at);
              onSelect?.(m);
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
  );
}

interface SpeedLadder {
  /** What the select offers, slowest first. */
  options: SpeedPreset[];
  /** One rung slower (-1) or faster (1); the ends are ends, not a wrap. */
  change: (dir: 1 | -1) => void;
}

/**
 * The speeds this range offers, and stepping along them with , and .
 *
 * A tour step, or a speed carried in from a wider range, can sit off the
 * ladder. Show it rather than mislabelling what is actually running.
 */
function useSpeedLadder(range: ClockRange): SpeedLadder {
  const { speed } = useClock();
  const clock = useClockControls();
  const presets = useMemo(() => speedPresetsFor(range), [range]);
  const options = useMemo(
    () =>
      presets.some((p) => p.speed === speed)
        ? presets
        : [...presets, { speed, label: speedLabel(speed) }].sort((a, b) => a.speed - b.speed),
    [presets, speed],
  );
  const index = Math.max(
    0,
    options.findIndex((p) => p.speed === speed),
  );
  const change = useCallback(
    (dir: 1 | -1) => {
      const next = options[Math.min(options.length - 1, Math.max(0, index + dir))];
      if (next) clock.setSpeed(next.speed);
    },
    [clock, options, index],
  );
  return { options, change };
}

/**
 * The transport's keyboard, in both of the places it listens.
 *
 * On the strip it is an ordinary `onKeyDown`; on `window` it is the same
 * handler with two exemptions in front of it, because the arrows are scarce.
 * Returns the handler for the strip.
 */
function useTransportKeys({
  steps,
  speeds,
  globalShortcuts,
  strip,
}: {
  steps: Steps;
  speeds: SpeedLadder;
  globalShortcuts: boolean;
  strip: RefObject<HTMLDivElement | null>;
}) {
  const { range } = useClock();
  const clock = useClockControls();
  const changeSpeed = speeds.change;

  const onKey = useCallback(
    (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      // A row inside the strip that took its own keys — the markers
      // (sand-pmz.12). `declaresOwnKeys` rather than `ownsKeys` on purpose:
      // the scrubber is an `<input>` and would own its keys by that rule,
      // and ←/→ on the scrubber are the clock's step, not the range's.
      if (declaresOwnKeys(e.target)) return;
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
      // A text field, or a surface with keys of its own — the map (sand-pmz.4).
      if (ownsKeys(e.target)) return;
      if (e.target instanceof Node && strip.current?.contains(e.target)) return; // handled by onKeyDown
      onKey(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [globalShortcuts, onKey, strip]);

  return onKey;
}
