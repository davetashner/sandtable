/**
 * Plan-vs-actual gauges (sand-1l0.18): one compact row per timetable under
 * the timeline — the plan's milestones on a day scale, what actually
 * happened beneath, the clock's needle, and the slip read on the milestone
 * furthest along — in days for a plan written in days, in hours or minutes for
 * one that named an hour (sand-lry.24). Click opens the timetable card
 * (?card=<id>).
 */
import type { Timetable } from '../packs/schema/index.js';
import { useClock } from '../engine/ClockContext.js';
import {
  dayOf,
  plannedDayOf,
  plannedLabel,
  slipLabel,
  slipTone,
  timetableStatus,
} from '../engine/timetable.js';
import './clock-gauges.css';

export interface ClockGaugesProps {
  clocks: Timetable[];
  onSelect?: (id: string) => void;
  /** Clock id of the open card, if any. */
  selected?: string | undefined;
}

export function ClockGauges({ clocks, onSelect, selected }: ClockGaugesProps) {
  const { now, range } = useClock();
  if (clocks.length === 0) return null;
  return (
    <ul className="clocks" aria-label="Plan against reality">
      {clocks.map((c) => {
        const st = timetableStatus(c, now);
        const dayLabel = c.dayLabel ?? 'M+';
        const lastDay = Math.max(
          dayOf(c, range.end),
          ...c.milestones.map((m) => plannedDayOf(c, m) ?? 0),
          ...c.milestones.map((m) => (m.actualAt ? dayOf(c, Date.parse(m.actualAt)) : 0)),
        );
        const firstDay = Math.min(0, dayOf(c, range.start));
        const x = (d: number) => `${((d - firstDay) / (lastDay - firstDay)) * 100}%`;
        const slip = st.slipDays;
        const tone = slipTone(slip, st.slipScale);
        return (
          <li key={c.id}>
            <button
              type="button"
              className="clocks__gauge"
              data-tone={tone}
              data-selected={c.id === selected || undefined}
              onClick={() => onSelect?.(c.id)}
              aria-label={`${c.title}: ${dayLabel}${Math.floor(st.day)}, ${slipLabel(slip, st.slipScale)}${st.current ? ` on ${st.current.label}` : ''}`}
              title={c.subtitle ?? c.title}
            >
              <span className="clocks__title">{c.title}</span>
              <span className="clocks__bars" aria-hidden="true">
                <span className="clocks__row clocks__row--plan">
                  {c.milestones
                    .filter((m) => plannedDayOf(c, m) !== undefined)
                    .map((m) => (
                      <i
                        key={m.id}
                        className="clocks__tick clocks__tick--plan"
                        data-due={plannedDayOf(c, m)! <= st.day || undefined}
                        style={{ left: x(plannedDayOf(c, m)!) }}
                        title={`${plannedLabel(c, m, dayLabel)}: ${m.label}`}
                      />
                    ))}
                </span>
                <span className="clocks__row clocks__row--actual">
                  {c.milestones
                    .filter((m) => m.actualAt)
                    .map((m) => (
                      <i
                        key={m.id}
                        className="clocks__tick clocks__tick--actual"
                        data-reached={Date.parse(m.actualAt!) <= now || undefined}
                        style={{ left: x(dayOf(c, Date.parse(m.actualAt!))) }}
                        title={m.label}
                      />
                    ))}
                </span>
                <span className="clocks__needle" style={{ left: x(st.day) }} />
              </span>
              <span className="clocks__readout">
                <span className="clocks__day">
                  {dayLabel}
                  {Math.max(0, Math.floor(st.day))}
                </span>
                <span className="clocks__slip">{slipLabel(slip, st.slipScale)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
