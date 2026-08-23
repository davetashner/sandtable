/**
 * A supply-line card (sand-1l0.21): the argument (footnoted), then the live
 * numbers for this line at the clock — kilometres marched, the railhead gap,
 * the threshold — and the sources. Opened from the gauge or ?card=<id>.
 */
import { withFootnotes } from '../engine/beats.js';
import { useClock } from '../engine/ClockContext.js';
import { routePoints, supplyStatus } from '../engine/logistics.js';
import type { Route, Source, SupplyLine } from '../packs/schema/index.js';
import { Card } from './Card.js';
import type { EntityLabeller } from './TechCardView.js';
import './clock-card.css';

export interface SupplyCardViewProps {
  line: SupplyLine;
  routes: Route[];
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

export function SupplyCardView({ line, routes, sources, labeller, onBack }: SupplyCardViewProps) {
  const { now } = useClock();
  const st = supplyStatus(
    line,
    routePoints(routes, line.army),
    routePoints(routes, line.railhead),
    now,
  );
  const body = line.summary
    ? withFootnotes({ body: line.summary, sources: line.sources }, sources)
    : undefined;
  return (
    <Card
      eyebrow="Rail against feet"
      title={line.title}
      meta={labeller.label(line.army)}
      body={body}
      citations={[]}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      <table className="clock-table">
        <caption className="visually-hidden">
          At the clock: marched, railhead gap, threshold
        </caption>
        <tbody>
          <tr>
            <th scope="row">Marched so far</th>
            <td>{Math.round(st.marchedKm)} km</td>
          </tr>
          <tr data-never={st.strained || undefined}>
            <th scope="row">Railhead behind the army</th>
            <td>{st.gapKm === undefined ? '—' : `${Math.round(st.gapKm)} km`}</td>
          </tr>
          <tr>
            <th scope="row">Horse-drawn supply fails beyond</th>
            <td>{st.thresholdKm} km</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
