/**
 * A decision point in the dossier (sand-1l0.22): the campaign pauses and asks
 * the viewer to choose as the commander; once they have, the card reveals
 * what was actually decided, what was known at the time, what followed and
 * the historians' verdict — and offers to play the chosen option's branch on
 * the map. Opened from a ◇ glyph on the timeline, by playback crossing the
 * instant, or as ?card=<id>&pick=<option>.
 */
import type { DecisionPoint, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { whenLabel } from './ScienceCardView.js';
import { linksToChips, type EntityLabeller } from './TechCardView.js';
import './decision.css';
import { Prose } from './Prose.js';

export interface DecisionCardViewProps {
  decision: DecisionPoint;
  sources: Source[];
  labeller: EntityLabeller;
  /** The option the viewer has chosen (URL `pick`), if any. */
  pick?: string | undefined;
  onPick: (optionId: string | undefined) => void;
  /** Switch the map to a branch (the chosen option's, or back to history). */
  onPlayBranch?: (branchId: string | undefined) => void;
  onBack?: () => void;
}

export function DecisionCardView({
  decision,
  sources,
  labeller,
  pick,
  onPick,
  onPlayBranch,
  onBack,
}: DecisionCardViewProps) {
  const actor = decision.actor ? labeller.label(decision.actor) : undefined;
  const chosen = decision.options.find((o) => o.id === pick);
  const decided = Boolean(chosen);
  return (
    <Card
      eyebrow="Decision point ◇"
      title={decision.title}
      meta={[whenLabel(decision.at), actor ? `${actor} must decide` : undefined]
        .filter(Boolean)
        .join(' — ')}
      summary={decision.question}
      chips={decided ? linksToChips(decision.links, labeller) : []}
      citations={decided ? decision.sources : []}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      <section className="decision" aria-label="Your decision">
        <h3 className="decision__prompt">
          {decided ? 'The options' : actor ? `Decide as ${actor}` : 'Decide'}
        </h3>
        <ul className="decision__options" role={decided ? undefined : 'group'}>
          {decision.options.map((o) => {
            const isPick = o.id === pick;
            const isHistorical = o.id === decision.historical;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  className="decision__option"
                  data-picked={isPick || undefined}
                  data-historical={(decided && isHistorical) || undefined}
                  aria-pressed={decided ? isPick : undefined}
                  onClick={() => onPick(isPick ? undefined : o.id)}
                >
                  <span className="decision__option-label">{o.label}</span>
                  {decided && (
                    <span className="decision__tags">
                      {isPick && (
                        <span className="decision__tag decision__tag--pick">your choice</span>
                      )}
                      {isHistorical && (
                        <span className="decision__tag decision__tag--history">what happened</span>
                      )}
                    </span>
                  )}
                  <span className="decision__option-summary">
                    <Prose>{o.summary}</Prose>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {decided && chosen && (
          <div className="decision__reveal" aria-live="polite">
            {chosen.branch && onPlayBranch && (
              <p className="decision__play">
                <button
                  type="button"
                  className="decision__play-btn"
                  onClick={() => onPlayBranch(chosen.branch)}
                >
                  Play this choice on the map
                </button>
                <span className="decision__play-note">
                  {' '}
                  — a hypothetical branch, labelled as such
                </span>
              </p>
            )}
            <h3>What was known at the time</h3>
            <Prose>{decision.reasoning}</Prose>
            <h3>What happened, and the verdict</h3>
            <Prose>{decision.verdict}</Prose>
            {onPlayBranch && (
              <p className="decision__play">
                <button
                  type="button"
                  className="decision__play-btn"
                  onClick={() => onPlayBranch(undefined)}
                >
                  Compare with what happened
                </button>
              </p>
            )}
          </div>
        )}
      </section>
    </Card>
  );
}
