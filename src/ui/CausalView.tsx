/**
 * Causal-chain explorer (sand-ekc.1), minimal version: a dossier mode that
 * shows a chain of CausalLinks around a focal link — upstream causes,
 * the focal claim, downstream consequences — with relation, confidence,
 * evidence and historiography, and the alternatives at each step. Opened
 * from a ⟶ chip on a beat or card; deep-linked as ?card=<link id>.
 */
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatCitation } from '../engine/beats.js';
import { chainAround, chainsFor, fullChain, RELATION_LABEL } from '../engine/causal.js';
import type { CausalLink, Source } from '../packs/schema/index.js';
import './card.css';
import './causal.css';

export interface CausalViewProps {
  links: CausalLink[];
  focal: CausalLink;
  sources: Source[];
  /** Human label for an entity id. */
  label: (id: string) => string | undefined;
  /** Open another link in the explorer. */
  onOpenLink: (linkId: string) => void;
  /** Open the entity itself (seek to an event, open a card, focus a battle) if possible. */
  onOpenEntity?: (id: string) => (() => void) | undefined;
  onBack?: () => void;
}

const CONFIDENCE_LABEL: Record<CausalLink['confidence'], string> = {
  high: 'well established',
  medium: 'probable',
  low: 'tentative',
  contested: 'contested',
};

export function CausalView({
  links,
  focal,
  sources,
  label,
  onOpenLink,
  onOpenEntity,
  onBack,
}: CausalViewProps) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const chain = chainAround(links, focal);
  const whole = fullChain(links, focal);
  const name = (id: string) => label(id) ?? id;

  const Entity = ({ id }: { id: string }) => {
    const open = onOpenEntity?.(id);
    return open ? (
      <button type="button" className="causal__entity" onClick={open}>
        {name(id)}
      </button>
    ) : (
      <span className="causal__entity causal__entity--inert">{name(id)}</span>
    );
  };

  return (
    <article className="card causal" aria-label="Causal chain">
      {onBack && (
        <button type="button" className="card__back" onClick={onBack}>
          ← Back to the narrative
        </button>
      )}
      <p className="card__eyebrow">Causal chain</p>
      <h2 className="card__title">
        {name(focal.from)} → {name(focal.to)}
      </h2>
      {whole.length > chain.length && (
        <nav className="causal__overview" aria-label="The whole chain">
          <p className="causal__overview-title">The whole chain — {whole.length} steps</p>
          <ol>
            {whole.map(({ link: l }, i) => (
              <li key={l.id} data-current={l.id === focal.id || undefined}>
                {l.id === focal.id ? (
                  <span aria-current="step">
                    {i + 1}. {name(l.from)} → {name(l.to)}
                  </span>
                ) : (
                  <button type="button" onClick={() => onOpenLink(l.id)}>
                    {i + 1}. {name(l.from)} → {name(l.to)}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <ol className="causal__chain" aria-label="Chain">
        {chain.map(({ link, depth }) => {
          const alternatives =
            depth <= 0
              ? chainsFor(links, link.to).causes
              : chainsFor(links, link.from).consequences;
          const others = alternatives.filter((l) => l.id !== link.id);
          return (
            <li
              key={link.id}
              className="causal__step"
              data-focal={depth === 0 || undefined}
              data-confidence={link.confidence}
            >
              <div className="causal__heads">
                <Entity id={link.from} />
                <span className="causal__arrow" aria-hidden="true">
                  ⟶
                </span>
                <span className="causal__relation">{RELATION_LABEL[link.relation]}</span>
                <Entity id={link.to} />
                <span className="causal__confidence">{CONFIDENCE_LABEL[link.confidence]}</span>
              </div>
              {depth === 0 ? (
                <div className="causal__claim">
                  <Markdown remarkPlugins={[remarkGfm]}>{link.claim}</Markdown>
                  {link.historiography && (
                    <details className="causal__debate">
                      <summary>The debate</summary>
                      <Markdown remarkPlugins={[remarkGfm]}>{link.historiography}</Markdown>
                    </details>
                  )}
                  <section className="card__sources" aria-label="Evidence">
                    <h3>Evidence</h3>
                    <ol>
                      {link.evidence.map((c, i) => (
                        <li key={`${c.source}-${i}`}>
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {formatCitation(
                              byId.get(c.source),
                              c.source.split(':')[1] ?? c.source,
                              c.pages,
                            ) + (c.note ? ` — ${c.note}` : '')}
                          </Markdown>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              ) : (
                <button type="button" className="causal__open" onClick={() => onOpenLink(link.id)}>
                  {link.claim.length > 140 ? `${link.claim.slice(0, 137)}…` : link.claim}
                </button>
              )}
              {others.length > 0 && (
                <p className="causal__also">
                  Also:{' '}
                  {others.map((l, i) => (
                    <span key={l.id}>
                      {i > 0 ? ' · ' : ''}
                      <button
                        type="button"
                        className="causal__alt"
                        onClick={() => onOpenLink(l.id)}
                      >
                        {depth <= 0 ? name(l.from) : name(l.to)}
                      </button>
                    </span>
                  ))}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
