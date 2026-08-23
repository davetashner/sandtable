/**
 * The human cost card (sand-1l0.24): one record's figures per side and
 * category with their confidence and range, what happened to people, why the
 * figures differ, and — below — what every record completed by the clock
 * adds up to, per side, labelled as a sum of recorded periods only. Nothing
 * here is a score. Opened from the human-cost line or ?card=<id>.
 */
import { useClock } from '../engine/ClockContext.js';
import { withFootnotes } from '../engine/beats.js';
import {
  CATEGORY_LABEL,
  estimate,
  formatEstimate,
  recordsToDate,
  totals,
} from '../engine/human.js';
import type { CasualtyRecord, Citation, Confidence, Side, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { whenLabel } from './ScienceCardView.js';
import { linksToChips, type EntityLabeller } from './TechCardView.js';
import './clock-card.css';
import './human.css';
import { Prose } from './Prose.js';

// eslint-disable-next-line react-refresh/only-export-components -- confidence labels belong with the card
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'documented',
  medium: 'inferred',
  low: 'approximate',
  contested: 'contested',
};

export interface CasualtyCardViewProps {
  record: CasualtyRecord;
  /** Every record in the pack, for the to-date sum. */
  records: CasualtyRecord[];
  sides: Side[];
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

/** Record and figure citations, each source/pages/note once. */
function dedupe(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.source}|${c.pages ?? ''}|${c.note ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function periodLabel(r: CasualtyRecord): string {
  const a = whenLabel(r.timeRange.start.slice(0, 10));
  const b = whenLabel(new Date(Date.parse(r.timeRange.end) - 1).toISOString().slice(0, 10));
  return a === b ? a : `${a} – ${b}`;
}

export function CasualtyCardView({
  record,
  records,
  sides,
  sources,
  labeller,
  onBack,
}: CasualtyCardViewProps) {
  const { now } = useClock();
  const sideName = (id: string) => sides.find((s) => s.id === id)?.name ?? id;
  const body = [
    record.summary,
    record.historiography ? `**The figures.** ${record.historiography}` : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');
  const md = body ? withFootnotes({ body, sources: record.sources }, sources) : undefined;
  const done = recordsToDate(records, now);
  const sums = totals(done);
  return (
    <Card
      eyebrow="Human cost"
      title={record.title}
      meta={periodLabel(record)}
      body={md}
      chips={linksToChips(record.links, labeller)}
      citations={dedupe([...record.sources, ...record.figures.flatMap((f) => f.sources ?? [])])}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      <table className="clock-table human-table">
        <caption className="visually-hidden">
          Figures: side, what is counted, number, confidence
        </caption>
        <thead>
          <tr>
            <th scope="col">Side</th>
            <th scope="col">Counted</th>
            <th scope="col">Number</th>
            <th scope="col">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {record.figures.map((f, i) => (
            <tr key={i} data-confidence={f.confidence}>
              <th scope="row">{sideName(f.side)}</th>
              <td>
                {CATEGORY_LABEL[f.category]}
                {f.note && (
                  <span className="clock-table__note">
                    <Prose>{f.note}</Prose>
                  </span>
                )}
              </td>
              <td className="human-table__n">{formatEstimate(estimate(f))}</td>
              <td className="human-table__conf">{CONFIDENCE_LABEL[f.confidence]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="human-todate" aria-label="To date">
        <h3 className="human-todate__title">
          To date · {done.length} recorded {done.length === 1 ? 'period' : 'periods'}
        </h3>
        {sums.length === 0 ? (
          <p className="human-todate__empty">
            No recorded period has ended yet at this point on the clock.
          </p>
        ) : (
          <ul className="human-todate__list">
            {sums.map((t) => (
              <li key={`${t.side}|${t.category}`} data-confidence={t.confidence}>
                <span className="human-todate__side">{sideName(t.side)}</span>{' '}
                <span className="human-todate__n">{formatEstimate(t.estimate)}</span>{' '}
                <span className="human-todate__cat">{CATEGORY_LABEL[t.category]}</span>{' '}
                <span className="human-todate__conf">· {CONFIDENCE_LABEL[t.confidence]}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="human-todate__note">
          A sum of the recorded periods only, carried at the weakest confidence among them;
          categories are never added together.
        </p>
      </section>
    </Card>
  );
}
