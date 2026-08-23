/**
 * A person card (sand-y0u.8): portrait with credit, label and "show
 * original", name, dates, roles in the era, summary, related chips, sources.
 * Opened from a ● chip on beats, events, cards or formations; deep-linked as
 * ?card=person:<slug>.
 */
import { withFootnotes } from '../engine/beats.js';
import { portraitFor } from '../packs/media-index.js';
import type { CastEntry, Person, Source } from '../packs/schema/index.js';
import { Card } from './Card.js';
import { MediaFigure } from './MediaFigure.js';
import { whenLabel } from './ScienceCardView.js';
import type { EntityLabeller } from './TechCardView.js';
import { Prose } from './Prose.js';

export interface PersonCardViewProps {
  person: Person;
  sources: Source[];
  labeller: EntityLabeller;
  /** Formations this person commands in the pack, as chips. */
  commands?: { id: string; label: string }[];
  /**
   * The pack's cast entry for this person (sand-9ts): when present the card is
   * a profile — the headshot leads, the period role and biography replace the
   * era-neutral summary, which moves to "In brief".
   */
  cast?: CastEntry | undefined;
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
  cast,
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
  if (cast) {
    const bio = withFootnotes({ body: cast.bio, sources: cast.sources }, sources);
    return (
      <Card
        eyebrow={`Person${person.nationality ? ` · ${person.nationality}` : ''}`}
        title={person.name}
        meta={[cast.role, lifeLabel(person)].filter(Boolean).join(' — ')}
        body={bio}
        hero={
          portrait && (
            <MediaFigure
              entry={portrait}
              width={320}
              fit="portrait"
              name={person.name}
              zoomable
              className="card__hero"
            />
          )
        }
        chips={chips}
        citations={person.sources ?? []}
        sources={sources}
        {...(onBack ? { onBack } : {})}
      >
        <section className="card__section" aria-label="In brief">
          <h3>In brief</h3>
          <Prose>{person.summary}</Prose>
        </section>
      </Card>
    );
  }
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
        <MediaFigure
          entry={portrait}
          width={320}
          fit="portrait"
          name={person.name}
          zoomable
          className="card__portrait"
        />
      )}
    </Card>
  );
}
