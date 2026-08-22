/**
 * A technology card in the dossier (sand-w9t.1): field, when it mattered,
 * the summary and body, related entities as chips, sources. Opened from a ⚙
 * glyph on the timeline or a chip on a beat/event; deep-linked as ?card=<id>.
 */
/* eslint-disable react-refresh/only-export-components -- card view + its labelling helpers live together */
import type { Links, Source, TechCard, TechField } from '../packs/schema/index.js';
import { Card, type CardChip } from './Card.js';

export const TECH_FIELD_LABEL: Record<TechField, string> = {
  railways: 'Railways',
  artillery: 'Artillery',
  'small-arms': 'Small arms',
  'machine-guns': 'Machine guns',
  aviation: 'Aviation',
  signals: 'Signals',
  naval: 'Naval',
  armour: 'Armour',
  chemistry: 'Chemistry',
  medicine: 'Medicine',
  'motor-transport': 'Motor transport',
  fortification: 'Fortification',
  'industry-logistics': 'Industry & logistics',
  other: 'Technology',
};

export interface EntityLabeller {
  /** Human label for an entity id (formation, event, battle, person, place…) or undefined to skip. */
  label(id: string): string | undefined;
  /** What clicking the chip does (open a card, seek, focus); undefined = inert chip. */
  open?(id: string, kind: keyof Links): (() => void) | undefined;
}

export function linksToChips(links: Links | undefined, labeller: EntityLabeller): CardChip[] {
  if (!links) return [];
  const out: CardChip[] = [];
  for (const kind of Object.keys(links) as (keyof Links)[]) {
    for (const id of links[kind] ?? []) {
      const label = labeller.label(id);
      if (!label) continue;
      const onClick = labeller.open?.(id, kind);
      out.push({
        id,
        label,
        kind: kind.replace(/s$/, '').replace('people', 'person'),
        ...(onClick ? { onClick } : {}),
      });
    }
  }
  return out;
}

export interface TechCardViewProps {
  card: TechCard;
  sources: Source[];
  labeller: EntityLabeller;
  onBack?: () => void;
}

export function TechCardView({ card, sources, labeller, onBack }: TechCardViewProps) {
  return (
    <Card
      eyebrow={`Technology · ${TECH_FIELD_LABEL[card.field]}`}
      title={card.title}
      meta={card.introduced.label}
      summary={card.summary}
      body={card.body}
      chips={linksToChips(card.links, labeller)}
      citations={card.sources}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    />
  );
}
