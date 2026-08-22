/**
 * A person card (sand-y0u.8): portrait with credit, label and "show
 * original", name, dates, roles in the era, summary, related chips, sources.
 * Opened from a ● chip on beats, events, cards or formations; deep-linked as
 * ?card=person:<slug>.
 */
import { portraitFor } from '../packs/media-index.js';
import type { Person, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { MediaFigure } from './MediaFigure.js';
import { whenLabel } from './ScienceCardView.js';
import type { EntityLabeller } from './TechCardView.js';

export interface PersonCardViewProps {
  person: Person;
  sources: Source[];
  labeller: EntityLabeller;
  /** Formations this person commands in the pack, as chips. */
  commands?: { id: string; label: string }[];
  onBack?: () => void;
}

const lifeLabel = (p: Person) => {
  const b = p.born ? whenLabel(p.born) : undefined;
  const d = p.died ? whenLabel(p.died) : undefined;
  if (b && d) return `${b} – ${d}`;
  if (b) return `born ${b}`;
  if (d) return `died ${d}`;
  return undefined;
};

export function PersonCardView({
  person,
  sources,
  labeller,
  commands = [],
  onBack,
}: PersonCardViewProps) {
  const portrait = portraitFor(person.id);
  const roles = (person.roles ?? [])
    .map(
      (r) =>
        `${r.title}${r.from || r.to ? ` (${[r.from && whenLabel(r.from), r.to && whenLabel(r.to)].filter(Boolean).join(' – ')})` : ''}`,
    )
    .join(' · ');
  const chips = commands.map((c) => ({ id: c.id, label: c.label, kind: 'formation' }));
  void labeller;
  return (
    <Card
      eyebrow={`Person${person.nationality ? ` · ${person.nationality}` : ''}`}
      title={person.name}
      meta={[lifeLabel(person), roles].filter(Boolean).join(' — ')}
      summary={person.summary}
      chips={chips}
      citations={person.sources ?? []}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      {portrait && (
        <MediaFigure entry={portrait} width={320} fit="portrait" className="card__portrait" />
      )}
    </Card>
  );
}
