/**
 * A timetable card (sand-1l0.18): the plan's assumption, then every milestone
 * with the day the plan expected it, the date it was actually reached, the
 * slip, and a note — and the sources. Opened from a gauge under the timeline
 * or as ?card=<id>.
 */
import { withFootnotes } from '../engine/beats.js';
import { dayOf, slipLabel } from '../engine/timetable.js';
import type { Source, Timetable } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { whenLabel } from './ScienceCardView.js';
import './clock-card.css';
import { Prose } from './Prose.js';

export interface ClockCardViewProps {
  clock: Timetable;
  sources: Source[];
  onBack?: () => void;
}

export function ClockCardView({ clock, sources, onBack }: ClockCardViewProps) {
  const dayLabel = clock.dayLabel ?? 'M+';
  const body = withFootnotes({ body: clock.assumption, sources: clock.sources }, sources);
  return (
    <Card
      eyebrow="Plan against reality"
      title={clock.title}
      meta={clock.subtitle}
      body={body}
      citations={[]}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      <table className="clock-table">
        <caption className="visually-hidden">Milestones: planned day, actual date, slip</caption>
        <thead>
          <tr>
            <th scope="col">Milestone</th>
            <th scope="col">Plan</th>
            <th scope="col">Actual</th>
            <th scope="col">Slip</th>
          </tr>
        </thead>
        <tbody>
          {clock.milestones.map((m) => {
            const actualDay = m.actualAt ? dayOf(clock, Date.parse(m.actualAt)) : undefined;
            const slip =
              m.plannedDay !== undefined && actualDay !== undefined
                ? actualDay - m.plannedDay
                : undefined;
            return (
              <tr key={m.id} data-never={(m.plannedDay !== undefined && !m.actualAt) || undefined}>
                <th scope="row">
                  {m.label}
                  {m.note && (
                    <span className="clock-table__note">
                      <Prose>{m.note}</Prose>
                    </span>
                  )}
                </th>
                <td>{m.plannedDay !== undefined ? `${dayLabel}${m.plannedDay}` : '—'}</td>
                <td>
                  {m.actualAt
                    ? `${whenLabel(m.actualAt.slice(0, 10))} (${dayLabel}${Math.floor(actualDay!)})`
                    : m.plannedDay !== undefined
                      ? 'never'
                      : '—'}
                </td>
                <td>
                  {slip !== undefined
                    ? slipLabel(slip)
                    : m.plannedDay !== undefined && !m.actualAt
                      ? 'not reached'
                      : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
