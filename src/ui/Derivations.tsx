/**
 * How the map's positions were derived (`sand-23b.4`) — the footnote, on the
 * card the token opens.
 *
 * Routes and commander tracks have carried a `derivation` since they were
 * written: a sentence saying in as many words what the citation is good for,
 * "towns and days, not buildings and hours". Until this section it was
 * authored, validated, and rendered nowhere. A reader who sees a token drawn
 * as approximate is owed the sentence that explains why, and ADR 0006 says
 * where it goes: not a fourth surface, not a tooltip — the card.
 *
 * The component adds only what the prose cannot say for itself: what the
 * confidence word means, and whether that is why the map is drawing this path
 * open inside a dashed ring.
 *
 * There is one component and two adapters — `trackDerivations` for a
 * commander's tracks, `routeDerivations` for a formation's legs — because the
 * footnote is one thing wherever it is read. A third caller supplies
 * `Derivation[]`; it does not write a second section.
 */
/* eslint-disable react-refresh/only-export-components -- the section and the two adapters that feed it are one unit, as in FormationCardView */
import { isApproximate, waypointConfidence, APPROX_MARK } from '../engine/confidence.js';
import type {
  Confidence,
  MovementMode,
  PersonTrack,
  Route,
  Waypoint,
} from '../packs/schema/index.js';
import './card.css';

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'documented',
  medium: 'inferred from the sources',
  low: 'approximate',
  contested: 'the sources disagree',
};

const KIND_LABEL: Record<PersonTrack['kind'], string> = {
  hq: 'Headquarters',
  journey: 'Journey',
};

const MODE_LABEL: Record<MovementMode, string> = {
  march: 'On foot',
  motor: 'By road',
  rail: 'By rail',
  sea: 'By sea',
  air: 'By air',
};

/** One path's worth of footnote, whoever it belongs to. */
export interface Derivation {
  id: string;
  /** What this path is, in a few words: "Headquarters · OHL", "By rail". */
  head: string;
  confidence: Confidence;
  /** The pack's own sentence. Absent on routes that never wrote one. */
  derivation: string | undefined;
  /** The map draws this path, or part of it, as an approximate position. */
  approximate: boolean;
}

const approximateAnywhere = (waypoints: readonly Waypoint[], confidence: Confidence) =>
  isApproximate(confidence) ||
  waypoints.some((w) => isApproximate(waypointConfidence(w, confidence)));

/** A commander's tracks, as footnotes. */
export function trackDerivations(tracks: readonly PersonTrack[]): Derivation[] {
  return tracks.map((tk) => ({
    id: tk.id,
    head: tk.post ? `${KIND_LABEL[tk.kind]} · ${tk.post}` : KIND_LABEL[tk.kind],
    confidence: tk.confidence,
    derivation: tk.derivation,
    approximate: approximateAnywhere(tk.waypoints, tk.confidence),
  }));
}

/**
 * A formation's historical route legs, in the order it covered them. Branch
 * routes are left out: a counterfactual is labelled as one where it is shown,
 * and its derivation is a statement about a line nobody marched.
 */
export function routeDerivations(routes: readonly Route[]): Derivation[] {
  return routes
    .filter((r) => !r.branch)
    .slice()
    .sort((a, b) => Date.parse(a.waypoints[0]![2]) - Date.parse(b.waypoints[0]![2]))
    .map((r) => ({
      id: r.id,
      head: MODE_LABEL[r.mode ?? 'march'],
      confidence: r.confidence,
      derivation: r.derivation,
      approximate: approximateAnywhere(r.waypoints, r.confidence),
    }));
}

export function Derivations({ items }: { items: Derivation[] }) {
  if (items.length === 0) return null;
  return (
    <section className="card__section card__positions" aria-label="Positions on the map">
      <h3>Positions on the map</h3>
      {items.map((d) => (
        <div key={d.id} className="card__derivation" data-confidence={d.confidence}>
          <p className="card__derivation-head">
            {d.head} — {CONFIDENCE_LABEL[d.confidence]}
          </p>
          {d.derivation && <p className="card__derivation-prose">{d.derivation}</p>}
          {d.approximate && (
            <p className="card__derivation-note">
              <span aria-hidden="true">{APPROX_MARK}</span> Positions here are drawn on the map as
              approximate: an open token inside a dashed ring, and an {APPROX_MARK} before the
              label.
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
