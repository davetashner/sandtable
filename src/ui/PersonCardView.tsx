/**
 * A person card (sand-y0u.8): portrait with credit, label and "show
 * original", name, dates, roles in the era, summary, related chips, sources.
 * Opened from a ● chip on beats, events, cards or formations; deep-linked as
 * ?card=person:<slug>.
 *
 * It is also where the map's positions are footnoted (`sand-23b.4`). A
 * commander token is where a reader meets a position; this card is the one it
 * opens, so the `derivation` prose of his tracks — the sentence that says
 * whether this is towns and days or buildings and hours — is read here rather
 * than nowhere.
 */
import { withFootnotes } from '../engine/beats.js';
import { isApproximate, waypointConfidence, APPROX_MARK } from '../engine/confidence.js';
import { portraitFor } from '../packs/media-index.js';
import type { CastEntry, Confidence, Person, PersonTrack, Source } from '../packs/schema/index.js';
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
  /**
   * This person's tracks in the pack (`sand-23b.4`): the card footnotes each
   * one with how its positions were derived, and says which of them the map
   * is drawing as approximate.
   */
  tracks?: PersonTrack[];
  onBack?: () => void;
}

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

/**
 * How positions were derived, per track. The prose is the pack's own — the
 * card adds only the two things a reader cannot get from it: what the
 * confidence word means, and whether that is why the token on the map is
 * drawn open inside a dashed ring.
 */
function Derivations({ tracks }: { tracks: PersonTrack[] }) {
  if (tracks.length === 0) return null;
  return (
    <section className="card__section card__positions" aria-label="Positions on the map">
      <h3>Positions on the map</h3>
      {tracks.map((tk) => {
        const approx =
          isApproximate(tk.confidence) ||
          tk.waypoints.some((w) => isApproximate(waypointConfidence(w, tk.confidence)));
        return (
          <div key={tk.id} className="card__derivation" data-confidence={tk.confidence}>
            <p className="card__derivation-head">
              {KIND_LABEL[tk.kind]}
              {tk.post ? ` · ${tk.post}` : ''} — {CONFIDENCE_LABEL[tk.confidence]}
            </p>
            <p className="card__derivation-prose">{tk.derivation}</p>
            {approx && (
              <p className="card__derivation-note">
                <span aria-hidden="true">{APPROX_MARK}</span> Positions on this track are drawn on
                the map as approximate: an open token inside a dashed ring, and an {APPROX_MARK}{' '}
                before the label.
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
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
  tracks = [],
  onBack,
}: PersonCardViewProps) {
  const portrait = portraitFor(person.id);
  const roles = (person.roles ?? [])
    .map(
      (r) =>
        `${r.title}${r.from || r.to ? ` (${[r.from && whenLabel(r.from), r.to && whenLabel(r.to)].filter(Boolean).join(' – ')})` : ''}`,
    )
    .join(' · ');
  // The formations he commanded, as chips that now go somewhere: since
  // sand-y0u.29 a formation id resolves to a card, so the labeller opens one.
  const chips = commands.map((c) => {
    const onClick = labeller.open?.(c.id, 'formations');
    return { id: c.id, label: c.label, kind: 'formation', ...(onClick ? { onClick } : {}) };
  });
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
        <Derivations tracks={tracks} />
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
      <Derivations tracks={tracks} />
    </Card>
  );
}
