/**
 * A formation card in the dossier (sand-y0u.29): who this army was, who
 * commanded it, what it was made of, where it assembled — and, when the pack
 * has one, the "who is who" plate set of what it wore and carried (ADR 0014).
 *
 * It is the card the map has been pointing at since the tokens were drawn.
 * Every army on the map is a labelled dot with a name and a colour and no way
 * in; every commander card already lists the formations he commanded, as
 * chips that went nowhere; and `[1. Armee](1914:army-de-1)` in a beat has
 * always been a valid entity link with nothing on the other end. This is the
 * other end. Opened from a token, from the legend where a side is one army,
 * from those chips, and deep-linked as `?card=<formation id>`.
 *
 * It renders no picture of its own. The formation's own slot is a
 * `MediaFigure`, the commander is a `PortraitChip`, and the set is `PlateSet`
 * — the three placements ADR 0012 and ADR 0014 allow, and no fourth.
 */
/* eslint-disable react-refresh/only-export-components -- the card view and the kind labels it renders live together, as in TechCardView */
import { sideToken } from '../engine/layers/colors.js';
import { portraitFor, type MediaIndexEntry } from '../packs/media-index.js';
import type { Citation, Formation, Side, Source } from '../packs/schema/index.js';
import { Card, type CardChip } from './Card.js';
import { MediaFigure } from './MediaFigure.js';
import { PlateSet, plateItems } from './PlateSet.js';
import { PortraitChip } from './PortraitChip.js';
import { whenLabel } from './ScienceCardView.js';
import type { EntityLabeller } from './TechCardView.js';
import './clock-card.css';

export const FORMATION_KIND_LABEL: Record<Formation['kind'], string> = {
  'army-group': 'Army group',
  army: 'Army',
  corps: 'Corps',
  division: 'Division',
  brigade: 'Brigade',
  regiment: 'Regiment',
  detachment: 'Detachment',
  garrison: 'Garrison',
  fleet: 'Fleet',
  squadron: 'Squadron',
  flotilla: 'Flotilla',
  other: 'Formation',
};

/** Thousands separated, so 320000 men reads as a number rather than a string of noughts. */
const figure = (n: number) => n.toLocaleString('en-GB');

/**
 * Every citation the card shows, once. A formation cites its own sources, and
 * its strength and its concentration area cite theirs — three lists that in
 * practice overlap, and a Sources block that repeats Herwig three times is a
 * block nobody reads.
 */
function citationsOf(f: Formation): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const c of [
    ...(f.sources ?? []),
    ...(f.strength?.sources ?? []),
    ...(f.concentration?.sources ?? []),
  ]) {
    const key = `${c.source}|${c.pages ?? ''}|${c.note ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export interface FormationCardViewProps {
  formation: Formation;
  sources: Source[];
  labeller: EntityLabeller;
  /** The pack's sides — for the side's name in the meta line and its colour on the commander's ring. */
  sides?: Side[];
  /** The formations immediately under this one, as chips. */
  subordinates?: { id: string; label: string }[];
  /** Resolves a manifest id to the index entry a plate renders (ADR 0014). */
  resolveMedia?: ((id: string) => MediaIndexEntry | undefined) | undefined;
  onBack?: () => void;
}

export function FormationCardView({
  formation,
  sources,
  labeller,
  sides = [],
  subordinates = [],
  resolveMedia,
  onBack,
}: FormationCardViewProps) {
  const side = sides.find((s) => s.id === formation.side);
  const commanderName = formation.commander ? labeller.label(formation.commander) : undefined;
  const portrait = formation.commander ? portraitFor(formation.commander) : undefined;
  const strength = formation.strength;
  const concentration = formation.concentration;
  const plates = formation.plates;
  // ADR 0012: an entity's `media` array is the pictures it has, of which a
  // renderer shows one. The set below is the comparison; this is the card's
  // own picture, and they are different slots on purpose.
  const own = resolveMedia
    ? (formation.media ?? []).map((id) => resolveMedia(id)).find((e) => e)
    : undefined;

  const chips: CardChip[] = [];
  const parentLabel = formation.parent ? labeller.label(formation.parent) : undefined;
  if (formation.parent && parentLabel) {
    const onClick = labeller.open?.(formation.parent, 'formations');
    chips.push({
      id: formation.parent,
      label: parentLabel,
      kind: 'formation',
      ...(onClick ? { onClick } : {}),
    });
  }
  for (const s of subordinates) {
    const onClick = labeller.open?.(s.id, 'formations');
    chips.push({ id: s.id, label: s.label, kind: 'formation', ...(onClick ? { onClick } : {}) });
  }

  const rows: [string, string][] = [];
  if (strength?.men !== undefined) rows.push(['Men', figure(strength.men)]);
  if (strength?.divisions !== undefined)
    rows.push(['Infantry divisions', figure(strength.divisions)]);
  if (strength?.corps !== undefined) rows.push(['Corps-equivalents', figure(strength.corps)]);
  if (strength?.guns !== undefined) rows.push(['Guns', figure(strength.guns)]);

  return (
    <Card
      eyebrow={`Formation · ${FORMATION_KIND_LABEL[formation.kind]}`}
      title={formation.name}
      meta={[
        side?.name,
        formation.short && formation.short !== formation.name
          ? `“${formation.short}” on the map`
          : undefined,
        formation.dissolved ? `Dissolved ${whenLabel(formation.dissolved)}` : undefined,
      ]
        .filter(Boolean)
        .join(' — ')}
      summary={formation.summary}
      hero={
        own && <MediaFigure entry={own} width={320} fit="band" zoomable className="card__hero" />
      }
      chips={chips}
      citations={citationsOf(formation)}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      {formation.commander && commanderName && (
        <section className="card__section" aria-label="Commander">
          <h3>Commander</h3>
          <PortraitChip
            entry={portrait}
            name={commanderName}
            size={40}
            entity={formation.commander}
            {...(side ? { ring: `var(${sideToken(side, sides)})` } : {})}
          />
        </section>
      )}

      {plates && resolveMedia && (
        <PlateSet
          axis={plates.axis}
          items={plateItems(plates.items, resolveMedia)}
          {...(plates.fit ? { fit: plates.fit } : {})}
        />
      )}

      {rows.length > 0 && (
        <section className="card__section" aria-label="Strength">
          <h3>{strength?.asOf ? `Strength, ${whenLabel(strength.asOf)}` : 'Strength'}</h3>
          {/* No caption: the heading above already names the table and its
              date, and a visually-hidden caption saying the same thing is a
              second announcement of one thing. */}
          <table className="clock-table">
            <tbody>
              {rows.map(([head, value]) => (
                <tr key={head}>
                  <th scope="row">{head}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {concentration && (
        <section className="card__section" aria-label="Concentration">
          <h3>
            {concentration.asOf
              ? `Concentration, ${whenLabel(concentration.asOf)}`
              : 'Concentration'}
          </h3>
          <p>{concentration.area}</p>
        </section>
      )}
    </Card>
  );
}
