/**
 * A strength ledger card (sand-1l0.19): the summary, the ledger (date, what
 * left or arrived, where, delta, running total, note), the named comparisons
 * as paired bars, and the sources. Opened from the gauge, a map marker or
 * ?card=<id>.
 */
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { withFootnotes } from '../engine/beats.js';
import { deltaLabel, tallyRunning } from '../engine/tally.js';
import type { Source, Tally } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { whenLabel } from './ScienceCardView.js';
import type { EntityLabeller } from './TechCardView.js';
import './clock-card.css';

export interface TallyCardViewProps {
  tally: Tally;
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

export function TallyCardView({ tally, sources, labeller, onBack }: TallyCardViewProps) {
  const body = tally.summary
    ? withFootnotes({ body: tally.summary, sources: tally.sources }, sources)
    : undefined;
  const rows = tallyRunning(tally);
  const maxCmp = Math.max(1, ...(tally.comparisons ?? []).map((c) => c.a + c.b));
  return (
    <Card
      eyebrow="Strength ledger"
      title={tally.title}
      meta={tally.subtitle}
      body={body}
      citations={[]}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      <table className="clock-table">
        <caption className="visually-hidden">Ledger: date, entry, change, running total</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">What</th>
            <th scope="col">Δ</th>
            <th scope="col">Left</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{whenLabel(tally.start.asOf.slice(0, 10))}</td>
            <th scope="row">
              Start
              {tally.start.note && (
                <span className="clock-table__note">
                  <Markdown remarkPlugins={[remarkGfm]}>{tally.start.note}</Markdown>
                </span>
              )}
            </th>
            <td>—</td>
            <td>
              {tally.start.value} {tally.unit}
            </td>
          </tr>
          {rows.map(({ entry, after }) => (
            <tr
              key={entry.id}
              data-sign={entry.delta < 0 ? 'minus' : entry.delta > 0 ? 'plus' : 'zero'}
            >
              <td>{whenLabel(entry.at.slice(0, 10))}</td>
              <th scope="row">
                {entry.label}
                {entry.formations && entry.formations.length > 0 && (
                  <span className="clock-table__note">
                    {entry.formations.map((id) => labeller.label(id) ?? id).join(', ')}
                  </span>
                )}
                {entry.note && (
                  <span className="clock-table__note">
                    <Markdown remarkPlugins={[remarkGfm]}>{entry.note}</Markdown>
                  </span>
                )}
              </th>
              <td>{deltaLabel(entry.delta)}</td>
              <td>{after}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tally.comparisons && tally.comparisons.length > 0 && (
        <section className="ratio" aria-label="Comparisons">
          <h3 className="ratio__title">Right wing against left</h3>
          <ul className="ratio__list">
            {tally.comparisons.map((c) => (
              <li key={c.id} className="ratio__item">
                <span className="ratio__label">{c.label}</span>
                <span className="ratio__bar" aria-hidden="true">
                  <span className="ratio__a" style={{ width: `${(c.a / maxCmp) * 100}%` }} />
                  <span className="ratio__b" style={{ width: `${(c.b / maxCmp) * 100}%` }} />
                </span>
                <span className="ratio__numbers">
                  {c.a} : {c.b}
                  {c.unit ? ` ${c.unit}` : ''} · {(c.a / Math.max(1, c.b)).toFixed(1)} to 1
                </span>
                {c.note && (
                  <span className="ratio__note">
                    <Markdown remarkPlugins={[remarkGfm]}>{c.note}</Markdown>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}
