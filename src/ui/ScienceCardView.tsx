/**
 * A "Meanwhile in the lab" science card (sand-9u2.1): field, date, summary,
 * body, the forward "connections" to later consequences, related chips,
 * sources. Opened from a ✦ glyph on the timeline or a chip; deep-linked as
 * ?card=<id>.
 */
/* eslint-disable react-refresh/only-export-components -- card view + its field table live together */
import type { ScienceCard, ScienceField, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { linksToChips, type EntityLabeller } from './TechCardView.js';

export const SCIENCE_FIELD_LABEL: Record<ScienceField, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  'biology-medicine': 'Biology & medicine',
  'earth-science': 'Earth science',
  mathematics: 'Mathematics',
  'ideas-culture': 'Ideas & culture',
};

export const SCIENCE_FIELDS = Object.keys(SCIENCE_FIELD_LABEL) as ScienceField[];

/** "21 August 1914" / "August 1914" / "1914" from a When value. */
export function whenLabel(when: string): string {
  const [date] = when.split('T');
  const parts = (date ?? '').split('-').map(Number);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  if (parts.length === 3) return `${parts[2]} ${months[parts[1]! - 1]} ${parts[0]}`;
  if (parts.length === 2) return `${months[parts[1]! - 1]} ${parts[0]}`;
  return String(parts[0]);
}

export interface ScienceCardViewProps {
  card: ScienceCard;
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

export function ScienceCardView({ card, sources, labeller, onBack }: ScienceCardViewProps) {
  const chips = [
    ...linksToChips(card.links, labeller),
    ...(card.people ?? [])
      .map((id) => ({ id, label: labeller.label(id), kind: 'person' }))
      .filter((c): c is { id: string; label: string; kind: string } => Boolean(c.label)),
  ];
  return (
    <Card
      eyebrow={`Meanwhile · ${SCIENCE_FIELD_LABEL[card.field]}`}
      title={card.title}
      meta={whenLabel(card.at)}
      summary={card.summary}
      body={card.body}
      chips={chips}
      citations={card.sources}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      {card.connections && card.connections.length > 0 && (
        <section className="card__connections" aria-label="Connections">
          <h3>Connections</h3>
          <ul>
            {card.connections.map((c) => (
              <li key={c.to}>
                <strong>{c.to}</strong>
                {c.note ? <> — {c.note}</> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}
