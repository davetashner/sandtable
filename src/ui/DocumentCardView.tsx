/**
 * A primary-document card (sand-1l0.25): the real text in its original
 * language, a translation, who wrote it and when, where it is kept, related
 * chips and sources. Opened from a ▢ glyph or a chip; deep-linked as ?card=.
 */
import type { Document, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { whenLabel } from './ScienceCardView.js';
import { linksToChips, type EntityLabeller } from './TechCardView.js';

const KIND_LABEL: Record<Document['kind'], string> = {
  order: 'Order',
  directive: 'Directive',
  memorandum: 'Memorandum',
  letter: 'Letter',
  telegram: 'Telegram',
  report: 'Report',
  diary: 'Diary',
  speech: 'Speech',
  treaty: 'Treaty',
  proclamation: 'Proclamation',
  other: 'Document',
};

export interface DocumentCardViewProps {
  doc: Document;
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

export function DocumentCardView({ doc, sources, labeller, onBack }: DocumentCardViewProps) {
  const author = doc.author.includes(':') ? (labeller.label(doc.author) ?? doc.author) : doc.author;
  return (
    <Card
      eyebrow={`Document · ${KIND_LABEL[doc.kind]}`}
      title={doc.title}
      meta={`${author} · ${whenLabel(doc.date)}`}
      chips={linksToChips(doc.links, labeller)}
      citations={doc.sources}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      <blockquote className="card__excerpt" lang={doc.language}>
        <p>{doc.excerpt}</p>
      </blockquote>
      {doc.translation && (
        <p className="card__translation">
          <span className="card__translation-label">Translation</span> {doc.translation}
        </p>
      )}
      {doc.archive && <p className="card__archive">{doc.archive}</p>}
    </Card>
  );
}
