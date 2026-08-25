/**
 * The card frame — every card family (tech, science, document, decision
 * point, person, battle, causal link) renders inside this in the dossier
 * (ADR 0006): eyebrow, title, meta line, body, related chips, sources, and a
 * way back to the beat that was showing.
 */
import type { ReactNode } from 'react';
import { formatCitation } from '../engine/beats.js';
import { BIBLIOGRAPHY_CARD } from '../engine/bibliography.js';
import type { Citation, Source } from '../packs/schema/index.js';
import './card.css';
import './bibliography.css';
import { EntityLink, Prose } from './Prose.js';

export interface CardChip {
  id: string;
  label: string;
  kind: string;
  onClick?: () => void;
}

export interface CardProps {
  /** Family label shown as the eyebrow: "Technology · Artillery". */
  eyebrow: string;
  title: string;
  /** One line under the title: a date, an author, a field. */
  meta?: string | undefined;
  /** Markdown. */
  summary?: string | undefined;
  /** Markdown. */
  body?: string | undefined;
  /** Related entities as chips. */
  chips?: CardChip[];
  citations?: Citation[];
  sources: Source[];
  onBack?: () => void;
  /** Rendered between the meta line and the body — a portrait, a scan. */
  hero?: ReactNode;
  children?: ReactNode;
}

export function Card({
  eyebrow,
  title,
  meta,
  summary,
  body,
  chips = [],
  citations = [],
  sources,
  onBack,
  hero,
  children,
}: CardProps) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const md = [summary, body].filter(Boolean).join('\n\n');
  return (
    <article className="card" aria-label={title}>
      {onBack && (
        <button type="button" className="card__back" onClick={onBack}>
          ← Back to the narrative
        </button>
      )}
      <p className="card__eyebrow">{eyebrow}</p>
      <h2 className="card__title">{title}</h2>
      {meta && <p className="card__meta">{meta}</p>}
      {hero}
      {md && (
        <div className="card__body">
          <Prose>{md}</Prose>
        </div>
      )}
      {children}
      {chips.length > 0 && (
        <ul className="card__chips" aria-label="Related">
          {chips.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="card__chip"
                data-kind={c.kind}
                onClick={c.onClick}
                disabled={!c.onClick}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {citations.length > 0 && (
        <section className="card__sources" aria-label="Sources">
          <h3>Sources</h3>
          <ol>
            {citations.map((c, i) => (
              <li key={`${c.source}-${i}`}>
                <Prose>
                  {formatCitation(byId.get(c.source), c.source.split(':')[1] ?? c.source, c.pages) +
                    (c.note ? ` — ${c.note}` : '')}
                </Prose>
              </li>
            ))}
          </ol>
          {/* The way out of a footnote and into the whole apparatus
              (sand-shn.5). Every card's Sources block carries it, so the
              bibliography is one control away from any claim that rests on
              it — which is the entire reason it does not need a panel or a
              page of its own (ADR 0006). */}
          <p className="bib__door">
            <EntityLink id={BIBLIOGRAPHY_CARD}>All works cited</EntityLink>
          </p>
        </section>
      )}
    </article>
  );
}
