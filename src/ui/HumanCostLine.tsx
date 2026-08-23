/**
 * The human-cost line under the timeline (sand-1l0.24): one quiet row of
 * text — no bar, no needle — that reads what the completed records add up to
 * at the clock, per side. Click opens the most recent record's card.
 */
import { useClock } from '../engine/ClockContext.js';
import { CATEGORY_LABEL, formatEstimate, recordsToDate, totals } from '../engine/human.js';
import type { CasualtyRecord, Side } from '../packs/schema/index.js';
import './clock-gauges.css';
import './human.css';

export interface HumanCostLineProps {
  records: CasualtyRecord[];
  sides: Side[];
  onSelect?: (id: string) => void;
  selected?: string | undefined;
}

export function HumanCostLine({ records, sides, onSelect, selected }: HumanCostLineProps) {
  const { now } = useClock();
  if (records.length === 0) return null;
  const done = recordsToDate(records, now);
  const latest = done[done.length - 1];
  const order = (side: string) => {
    const i = sides.findIndex((s) => s.id === side);
    return i < 0 ? sides.length : i;
  };
  const sums = totals(done)
    .filter((t) => t.category === 'casualties' || t.category === 'killed')
    .sort(
      (a, b) =>
        order(a.side) - order(b.side) ||
        (a.category === 'casualties' ? -1 : 1) - (b.category === 'casualties' ? -1 : 1),
    );
  const short = (id: string) => {
    const s = sides.find((x) => x.id === id);
    return s?.short ?? s?.name ?? id;
  };
  const text =
    sums.length === 0
      ? 'No recorded losses yet'
      : sums
          .map(
            (t) => `${short(t.side)} ${formatEstimate(t.estimate)} ${CATEGORY_LABEL[t.category]}`,
          )
          .join(' · ');
  const isSelected = latest !== undefined && latest.id === selected;
  return (
    <div className="clocks clocks--human" role="list" aria-label="Human cost">
      <button
        type="button"
        role="listitem"
        className="clocks__gauge clocks__gauge--human"
        data-selected={isSelected || undefined}
        disabled={!latest}
        onClick={() => latest && onSelect?.(latest.id)}
        aria-label={`Human cost to date: ${text}`}
        title={latest ? `Open: ${latest.title}` : 'No recorded period has ended yet'}
      >
        <span className="clocks__title">Human cost</span>
        <span className="human-line__text">{text}</span>
        <span className="clocks__readout human-line__count">
          {done.length === 0
            ? '—'
            : `${done.length} recorded ${done.length === 1 ? 'period' : 'periods'}`}
        </span>
      </button>
    </div>
  );
}
