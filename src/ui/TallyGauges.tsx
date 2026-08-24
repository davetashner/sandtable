/**
 * Strength gauges (sand-1l0.19): one row per tally under the timeline — the
 * running value against its start, a bar that shortens as entries bite, the
 * entries as ticks, and the clock's needle. Click opens the ledger card.
 */
import type { Tally } from '../packs/schema/index.js';
import { useClock } from '../engine/ClockContext.js';
import { deltaLabel, tallyStatus } from '../engine/tally.js';
import './clock-gauges.css';

export interface TallyGaugesProps {
  tallies: Tally[];
  onSelect?: (id: string) => void;
  selected?: string | undefined;
}

export function TallyGauges({ tallies, onSelect, selected }: TallyGaugesProps) {
  const { now, range } = useClock();
  if (tallies.length === 0) return null;
  const span = range.end - range.start;
  const x = (at: number) => `${Math.min(100, Math.max(0, ((at - range.start) / span) * 100))}%`;
  return (
    <ul className="clocks clocks--tallies" aria-label="Strength">
      {tallies.map((c) => {
        const st = tallyStatus(c, now);
        // scale: the largest running total the ledger ever reaches
        let running = c.start.value;
        let max = c.start.value;
        for (const e of c.entries) {
          running += e.delta;
          max = Math.max(max, running);
        }
        const pct = max > 0 ? Math.min(100, (st.value / max) * 100) : 0;
        const lost = c.start.value - st.value;
        const grows = c.start.value === 0;
        return (
          <li key={c.id}>
            <button
              type="button"
              className="clocks__gauge clocks__gauge--tally"
              data-tone={lost > 0 ? 'behind' : lost < 0 ? 'ahead' : 'none'}
              data-selected={c.id === selected || undefined}
              onClick={() => onSelect?.(c.id)}
              aria-label={
                grows
                  ? `${c.title}: ${st.value} ${c.unit}${lost < 0 ? `, ${-lost} gained` : ''}`
                  : `${c.title}: ${st.value} of ${c.start.value} ${c.unit}${lost > 0 ? `, ${lost} gone` : ''}`
              }
              title={c.subtitle ?? c.title}
            >
              <span className="clocks__title">{c.title}</span>
              <span className="clocks__bars" aria-hidden="true">
                <span className="clocks__row clocks__row--tally">
                  <span className="clocks__fill" style={{ width: `${pct}%` }} />
                  {c.entries.map((e) => (
                    <i
                      key={e.id}
                      className="clocks__tick clocks__tick--entry"
                      data-sign={e.delta < 0 ? 'minus' : e.delta > 0 ? 'plus' : 'zero'}
                      data-reached={Date.parse(e.at) <= now || undefined}
                      style={{ left: x(Date.parse(e.at)) }}
                      title={`${deltaLabel(e.delta)} ${e.label}`}
                    />
                  ))}
                </span>
                <span className="clocks__needle" style={{ left: x(now) }} />
              </span>
              <span className="clocks__readout">
                <span className="clocks__day">
                  {grows ? `${st.value} ${c.unit}` : `${st.value} / ${c.start.value} ${c.unit}`}
                </span>
                <span className="clocks__slip">
                  {lost > 0 ? `${lost} gone` : lost < 0 ? `${-lost} gained` : 'at full weight'}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
