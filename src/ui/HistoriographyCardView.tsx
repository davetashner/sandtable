/**
 * A contested point in the dossier (sand-23b.28, ADR 0017): the question, the
 * positions side by side with their holders named, what is not in dispute,
 * and what evidence would settle it and cannot be read from here.
 *
 * It has no timeline glyph, because it has no moment — the argument about
 * 9 September 1914 has run from 1914 to now. It is reached from the entities
 * it is about, each of which names it in `links.historiography`, and from
 * `?card=<id>`.
 *
 * The positions are an ordered list and not a set of tabs: both sides have to
 * be on screen at once, or the card is a chooser and the reader has picked
 * before they have read.
 */
import type { Historiography, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import './historiography.css';
import { Prose } from './Prose.js';
import { linksToChips, type EntityLabeller } from './TechCardView.js';

export interface HistoriographyCardViewProps {
  point: Historiography;
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

export function HistoriographyCardView({
  point,
  sources,
  labeller,
  onBack,
}: HistoriographyCardViewProps) {
  return (
    <Card
      eyebrow="Historiography · a contested point"
      title={point.title}
      meta={`${point.positions.length} positions — the pack takes none of them`}
      summary={point.question}
      chips={linksToChips(point.links, labeller)}
      citations={point.sources}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      {/* Headings, not landmarks: five aria-labelled regions inside one card
          already make the landmark list useless (sand-pmz.13), and an outline
          is what a reader of an argument wants. */}
      <ol className="hgraphy__positions">
        {point.positions.map((p) => (
          <li className="hgraphy__position" key={p.label}>
            <h3 className="hgraphy__label">{p.label}</h3>
            <p className="hgraphy__who">{p.who}</p>
            <div className="hgraphy__body">
              <Prose>{p.summary}</Prose>
            </div>
          </li>
        ))}
      </ol>
      {point.settled && (
        <section className="hgraphy__aside hgraphy__aside--settled">
          <h3>What is not in dispute</h3>
          <Prose>{point.settled}</Prose>
        </section>
      )}
      {point.unread && (
        <section className="hgraphy__aside hgraphy__aside--unread">
          <h3>What would settle it, and is unread</h3>
          <Prose>{point.unread}</Prose>
        </section>
      )}
    </Card>
  );
}
