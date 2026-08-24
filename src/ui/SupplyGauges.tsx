/**
 * Rail against feet (sand-1l0.21): one row per supply line under the timeline
 * — kilometres marched by the army so far, and the gap back to its railhead,
 * going red past the threshold at which horse-drawn supply failed. Click
 * opens the supply card.
 */
import type { Route, SupplyLine } from '../packs/schema/index.js';
import { useClock } from '../engine/ClockContext.js';
import { routePoints, supplyStatus } from '../engine/logistics.js';
import './clock-gauges.css';

export interface SupplyGaugesProps {
  lines: SupplyLine[];
  routes: Route[];
  /** Label for a formation id (short name). */
  label: (id: string) => string | undefined;
  onSelect?: (id: string) => void;
  selected?: string | undefined;
}

export function SupplyGauges({ lines, routes, label, onSelect, selected }: SupplyGaugesProps) {
  const { now } = useClock();
  if (lines.length === 0) return null;
  return (
    <ul className="clocks clocks--tallies" aria-label="Rail against feet">
      {lines.map((l) => {
        const st = supplyStatus(
          l,
          routePoints(routes, l.army),
          routePoints(routes, l.railhead),
          now,
        );
        const marched = Math.round(st.marchedKm);
        const gap = st.gapKm === undefined ? undefined : Math.round(st.gapKm);
        const pct = Math.min(100, (st.marchedKm / 600) * 100);
        return (
          <li key={l.id}>
            <button
              type="button"
              className="clocks__gauge clocks__gauge--tally"
              data-tone={st.strained ? 'behind' : gap === undefined ? 'none' : 'ontime'}
              data-selected={l.id === selected || undefined}
              onClick={() => onSelect?.(l.id)}
              aria-label={`${label(l.army) ?? l.army}: marched ${marched} km${gap === undefined ? '' : `, railhead ${gap} km behind`}`}
              title={l.title}
            >
              <span className="clocks__title">{label(l.army) ?? l.title}</span>
              <span className="clocks__bars" aria-hidden="true">
                <span className="clocks__row clocks__row--tally">
                  <span className="clocks__fill clocks__fill--march" style={{ width: `${pct}%` }} />
                </span>
              </span>
              <span className="clocks__readout">
                <span className="clocks__day">{marched} km marched</span>
                <span className="clocks__slip">
                  {gap === undefined ? '—' : `railhead ${gap} km behind`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
