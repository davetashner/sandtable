/**
 * The specimen registry (sand-neh.3): what the gallery shows, in what state,
 * and which component in `src/ui` each specimen stands for.
 *
 * Fixtures come from the bundled 1914 seed pack rather than from invented
 * props, so a specimen is the component doing its real job on real content —
 * a made-up card would look fine while the actual one overflows. Anything the
 * pack cannot supply is a loud failure (`only`), not a silent empty state.
 *
 * `covers` is load-bearing: Gallery.test.tsx fails when a component in
 * `src/ui` appears in no specimen, so the gallery cannot fall behind the
 * library.
 */
/* eslint-disable react-refresh/only-export-components -- the registry is data about components and the stateful specimens are part of the data; they live together by design */
import { useState, type ReactNode } from 'react';
import { sideToken } from '../engine/layers/colors.js';
import { seed } from '../packs/seed.js';
import { mediaById, portraitFor } from '../packs/media-index.js';
import type { ScienceField } from '../packs/schema/index.js';
import { tourMinutes } from '../engine/tour.js';
import { BottomSheet } from '../ui/BottomSheet.js';
import { BranchToggle } from '../ui/BranchToggle.js';
import { Breadcrumb } from '../ui/Breadcrumb.js';
import { Card } from '../ui/Card.js';
import { CastStrip, type CastMember } from '../ui/CastStrip.js';
import { ChapterIndex } from '../ui/ChapterIndex.js';
import { CasualtyCardView } from '../ui/CasualtyCardView.js';
import { CausalView } from '../ui/CausalView.js';
import { ClockCardView } from '../ui/ClockCardView.js';
import { ClockGauges } from '../ui/ClockGauges.js';
import { CommanderToggle } from '../ui/CommanderToggle.js';
import { CopyLink } from '../ui/CopyLink.js';
import { DecisionCardView } from '../ui/DecisionCardView.js';
import { DiagramFigure } from '../ui/DiagramFigure.js';
import { DocumentCardView } from '../ui/DocumentCardView.js';
import { Dossier } from '../ui/Dossier.js';
import { HumanCostLine } from '../ui/HumanCostLine.js';
import { MediaCredit } from '../ui/MediaCredit.js';
import { MediaFigure } from '../ui/MediaFigure.js';
import { MediaLightbox } from '../ui/MediaLightbox.js';
import { MeanwhileFilter } from '../ui/MeanwhileFilter.js';
import { OpeningSequence } from '../ui/OpeningSequence.js';
import { PersonCardView } from '../ui/PersonCardView.js';
import { PlateSet, plateItems } from '../ui/PlateSet.js';
import { PortraitChip } from '../ui/PortraitChip.js';
import { Prose } from '../ui/Prose.js';
import { ScienceCardView, SCIENCE_FIELDS } from '../ui/ScienceCardView.js';
import { ScorePlayer } from '../ui/ScorePlayer.js';
import { SupplyCardView } from '../ui/SupplyCardView.js';
import { SupplyGauges } from '../ui/SupplyGauges.js';
import { TallyCardView } from '../ui/TallyCardView.js';
import { TallyGauges } from '../ui/TallyGauges.js';
import { TechCardView } from '../ui/TechCardView.js';
import { Timeline, type TimelineMarker, type TimelinePhase } from '../ui/Timeline.js';
import { TourLauncher, TourPanel } from '../ui/TourPanel.js';
import { VignetteView } from '../ui/VignetteView.js';

// ------------------------------------------------------------------ fixtures

/** The pack has to supply the specimen; an empty gallery pane is worse than a crash. */
function only<T>(xs: readonly T[], what: string): T {
  const x = xs[0];
  if (!x) throw new Error(`gallery: the seed pack has no ${what}`);
  return x;
}

const { pack, sources } = seed;
const sides = pack.sides;

/** Labels every id the cards ask about; every chip is live but goes nowhere. */
const labeller = {
  label(id: string): string | undefined {
    return (
      seed.people.find((p) => p.id === id)?.name ??
      seed.formations.find((f) => f.id === id)?.name ??
      seed.places.find((p) => p.id === id)?.name ??
      seed.battles.find((b) => b.id === id)?.title ??
      seed.events.find((e) => e.id === id)?.title ??
      seed.tech.find((t) => t.id === id)?.title ??
      seed.science.find((s) => s.id === id)?.title ??
      seed.documents.find((d) => d.id === id)?.title ??
      seed.decisions.find((d) => d.id === id)?.title ??
      seed.casualties.find((c) => c.id === id)?.title
    );
  },
  open(): () => void {
    // A live-looking chip that navigates nowhere: the gallery reviews the
    // control, not the routing.
    return () => {};
  },
};

const label = (id: string) => labeller.label(id);

/** A view worth citing, for the copy-link glyph — the gallery has no clock in the URL. */
const SHARE_URL =
  'https://sandtable.davetashner.com/?t=1914-09-06T06:00:00Z&branch=1914:historical&focus=1914:marne';

const branch =
  pack.branches.find((b) => b.id === pack.defaultBranch) ?? only(pack.branches, 'branch');
const hypothetical = pack.branches.find((b) => b.kind === 'counterfactual');
const battle = only(seed.battles, 'battle');
const castEntry = only(seed.cast, 'cast entry');
const castPerson =
  seed.people.find((p) => p.id === castEntry.person) ?? only(seed.people, 'person');
const tour = only(seed.tours, 'tour');
const tourStep = only(tour.steps, 'tour step');
const diagram = only(Object.entries(seed.diagrams), 'diagram');
const portrait = portraitFor(castEntry.person);
const photograph =
  seed.beats.map((b) => (b.media ? mediaById(b.media) : undefined)).find((e) => e?.present) ??
  portrait;

/**
 * Two states the seed content cannot supply, built from a real entry so the
 * caption and credit are still the pack's: a picture the build or the bucket
 * is short of, and a manifest that carries the unaltered original as well as
 * the colorization (ADR 0012). No manifest names an `original.file` yet.
 */
const absent = photograph ? { ...photograph, present: false } : undefined;
const paired =
  photograph && photograph.variants.length
    ? { ...photograph, unaltered: photograph.variants }
    : undefined;

/**
 * A comparison the seed pack can really supply: the four armies of the
 * Western Front photographed in the field in 1914, one plate each on a single
 * axis (ADR 0014). The kit cards this pattern was settled for are
 * sand-y0u.5; what the gallery reviews here is the pattern.
 */
const armiesInTheField = plateItems(
  [
    {
      media: 'media:scene/1914-marne-german-infantry/german-infantry-marne-colorized',
      label: 'Germany',
    },
    {
      media: 'media:scene/1914-french-infantry-manoeuvres/french-infantry-charge-1913-colorized',
      label: 'France',
    },
    {
      media: 'media:scene/1914-mons-royal-fusiliers/royal-fusiliers-mons-colorized',
      label: 'Britain',
    },
    {
      media: 'media:scene/1914-liege-herstal/belgian-infantry-herstal-colorized',
      label: 'Belgium',
    },
  ],
  mediaById,
);

const castMembers: CastMember[] = seed.cast.map((c) => {
  const person = seed.people.find((p) => p.id === c.person);
  return {
    id: c.id,
    person: c.person,
    name: person?.name ?? c.person,
    role: c.role,
    side: c.side,
    portrait: portraitFor(c.person),
  };
});

const phases: TimelinePhase[] = seed.beats
  .filter((b) => !b.branch && !b.focus)
  .map((b) => ({ id: b.id, title: b.title, from: Date.parse(b.from), to: Date.parse(b.to) }));

const markers: TimelineMarker[] = [
  ...seed.events
    .filter((e) => e.significance === 'major' && !e.branch)
    .map((e) => ({
      id: e.id,
      title: e.title,
      at: Date.parse(e.at ?? e.timeRange!.start),
      kind: 'event' as const,
    })),
  ...seed.decisions.map((d) => ({
    id: d.id,
    title: d.title,
    at: Date.parse(d.at),
    kind: 'decision' as const,
  })),
  ...seed.tech
    .filter((t) => t.introduced.at)
    .map((t) => ({
      id: t.id,
      title: t.title,
      at: Date.parse(t.introduced.at!),
      kind: 'tech' as const,
    })),
  ...seed.science.map((s) => ({
    id: s.id,
    title: s.title,
    at: Date.parse(s.at),
    kind: 'science' as const,
  })),
  ...seed.documents.map((d) => ({
    id: d.id,
    title: d.title,
    at: Date.parse(d.date),
    kind: 'document' as const,
  })),
];

// -------------------------------------------------------- stateful specimens

/** The dossier's own frame, so the panel is reviewed at the width it lives at. */
function DossierSurface({ children }: { children: ReactNode }) {
  return <div className="surface surface--dossier">{children}</div>;
}

function BranchToggleSpecimen() {
  const [value, setValue] = useState(pack.defaultBranch);
  return (
    <BranchToggle
      branches={pack.branches}
      defaultBranch={pack.defaultBranch}
      value={value}
      onChange={setValue}
    />
  );
}

function CommanderToggleSpecimen() {
  const [on, setOn] = useState(true);
  return <CommanderToggle on={on} onToggle={() => setOn((x) => !x)} available />;
}

function MeanwhileFilterSpecimen() {
  const available = SCIENCE_FIELDS.filter((f) => seed.science.some((c) => c.field === f));
  const [active, setActive] = useState<ReadonlySet<ScienceField>>(new Set(available));
  return (
    <MeanwhileFilter
      available={available}
      active={active}
      onToggle={(field) =>
        setActive((prev) => {
          const next = new Set(prev);
          if (!next.delete(field)) next.add(field);
          return next;
        })
      }
    />
  );
}

function BreadcrumbSpecimen({ inside }: { inside: boolean }) {
  const [focus, setFocus] = useState<string | undefined>(inside ? battle.id : undefined);
  return (
    <Breadcrumb
      campaignTitle={pack.title}
      battles={seed.battles}
      focus={seed.battles.find((b) => b.id === focus)}
      onEnter={setFocus}
      onExit={() => setFocus(undefined)}
    />
  );
}

function ChapterIndexSpecimen() {
  const [entered, setEntered] = useState<string | undefined>(undefined);
  const level = seed.battles.find((b) => b.id === entered);
  // Entering closes the index in the app, where the trail takes over. Here the
  // key remounts it open again, so the specimen stays the thing it is for.
  return (
    <div className="crumbs">
      <span className="crumbs__current">{level ? level.title : pack.title}</span>
      <ChapterIndex key={entered} battles={seed.battles} onEnter={setEntered} defaultOpen />
    </div>
  );
}

function CastStripSpecimen() {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  return (
    <CastStrip
      members={castMembers}
      sides={sides}
      selected={selected}
      onSelect={(id) => setSelected((prev) => (prev === id ? undefined : id))}
    />
  );
}

function DecisionCardSpecimen() {
  const decision = only(seed.decisions, 'decision point');
  const [pick, setPick] = useState<string | undefined>(undefined);
  return (
    <DecisionCardView
      decision={decision}
      sources={sources}
      labeller={labeller}
      pick={pick}
      onPick={setPick}
      onBack={() => {}}
    />
  );
}

function MediaLightboxSpecimen() {
  const [open, setOpen] = useState(false);
  if (!photograph) throw new Error('gallery: the media index has no image to show');
  return (
    <>
      <button type="button" className="gallery__action" onClick={() => setOpen(true)}>
        Open full size
      </button>
      <MediaLightbox
        entry={photograph}
        name={photograph.person ? label(photograph.person) : undefined}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function TourPanelSpecimen({ waiting }: { waiting: boolean }) {
  const [running, setRunning] = useState(!waiting);
  return (
    <TourPanel
      tour={tour}
      step={tourStep}
      index={0}
      running={running}
      waiting={waiting}
      {...(waiting
        ? { stop: { at: Date.parse(tourStep.at), kind: 'beat' as const, text: tourStep.title } }
        : {})}
      autoAdvance={!waiting}
      sources={sources}
      onPrev={undefined}
      onNext={() => {}}
      onToggleRunning={() => setRunning((x) => !x)}
      onExit={() => {}}
      onContinue={() => {}}
      onSetAutoAdvance={() => {}}
    />
  );
}

/**
 * Mounted on demand. The opening takes focus when it opens — it is a takeover,
 * and that is correct in the app — but two of them mounting on page load drag
 * the gallery down to the last section before the reader has seen the first.
 */
function OpeningSpecimen() {
  const [shown, setShown] = useState(false);
  const opening = pack.opening;
  if (!opening) throw new Error('gallery: the seed pack has no opening sequence');
  if (!shown)
    return (
      <button type="button" className="gallery__action" onClick={() => setShown(true)}>
        Open the sequence
      </button>
    );
  return (
    <OpeningSequence
      opening={opening}
      sources={sources}
      reduced
      onPlay={() => {}}
      onExplore={() => {}}
      onChain={() => {}}
      chainLabel={opening.chain?.label}
      chainHint={opening.chain?.hint}
      onClaim={() => {}}
      tourMinutes={tourMinutes(tour)}
    />
  );
}

// ------------------------------------------------------------------ registry

export interface Specimen {
  id: string;
  title: string;
  /** One line: what this state is, and what to look at. */
  note: string;
  /** Component file stems in src/ui this specimen stands for. */
  covers: string[];
  render: () => ReactNode;
  /**
   * The component positions itself against the viewport. The frame becomes
   * its containing block (a `transform` on an ancestor does that for
   * `position: fixed`), so it pins to the specimen instead of the page.
   */
  contained?: boolean;
  /** Render at the dossier's real column width rather than filling the pane. */
  column?: boolean;
}

export interface GallerySection {
  id: string;
  title: string;
  note: string;
  specimens: Specimen[];
}

export const SECTIONS: GallerySection[] = [
  {
    id: 'chrome',
    title: 'Shell chrome',
    note: 'The thin header row above the three surfaces, and the phone sheet the dossier rides in.',
    specimens: [
      {
        id: 'branch-toggle',
        title: 'Branch toggle',
        note: 'Segmented control; the counterfactual options carry the dashed brass ? mark.',
        covers: ['BranchToggle'],
        render: () => <BranchToggleSpecimen />,
      },
      {
        id: 'commander-toggle',
        title: 'Commander toggle',
        note: 'Pressed and unpressed; the glyph is the only thing that moves.',
        covers: ['CommanderToggle'],
        render: () => <CommanderToggleSpecimen />,
      },
      {
        id: 'copy-link',
        title: 'Copy link',
        note: 'The ⧉ glyph beside the other switches; press it for the confirmed state.',
        covers: ['CopyLink'],
        render: () => <CopyLink href={() => SHARE_URL} write={async () => {}} />,
      },
      {
        id: 'copy-link-manual',
        title: 'Copy link — the clipboard refused',
        note: 'No clipboard (plain http, or a browser that says no): the link appears selected, to copy by hand.',
        covers: ['CopyLink'],
        render: () => (
          <CopyLink
            href={() => SHARE_URL}
            write={() => Promise.reject(new Error('gallery: no clipboard'))}
          />
        ),
      },
      {
        id: 'score-player',
        title: 'Score player',
        note: 'Off by default (ADR 0008). The note line is the cue that would play.',
        covers: ['ScorePlayer'],
        render: () => <ScorePlayer score={seed.score} />,
      },
      {
        id: 'crumbs-campaign',
        title: 'Breadcrumb — campaign',
        note: 'At the campaign level the trail is one item and the index rests as one control.',
        covers: ['Breadcrumb'],
        render: () => <BreadcrumbSpecimen inside={false} />,
      },
      {
        id: 'crumbs-focus',
        title: 'Breadcrumb — inside a level',
        note: 'Two levels, the kind of the one you are in, and the exit ✕.',
        covers: ['Breadcrumb'],
        render: () => <BreadcrumbSpecimen inside />,
      },
      {
        id: 'chapter-index',
        title: 'Chapter index — open',
        note: 'The pack in campaign order, each entry named for what it is (ADR 0013).',
        covers: ['ChapterIndex'],
        render: () => <ChapterIndexSpecimen />,
      },
      {
        id: 'bottom-sheet',
        title: 'Bottom sheet (phone dossier)',
        note: 'Peek detent. Drag the grip or press ↑/↓ on it for half and full.',
        covers: ['BottomSheet'],
        contained: true,
        render: () => (
          <BottomSheet initial="peek" label="Dossier">
            <Dossier beats={seed.beats} sources={sources} sides={sides} branch={branch} />
          </BottomSheet>
        ),
      },
    ],
  },
  {
    id: 'dossier',
    title: 'The dossier',
    note: 'One panel, 340px on desktop: the beat, the cast, the prose, and whatever card is open.',
    specimens: [
      {
        id: 'dossier-beat',
        title: 'Dossier — the beat',
        note: 'Eyebrow, date range, title, body with footnote references, sources, side legend.',
        covers: ['Dossier', 'Prose'],
        column: true,
        render: () => (
          <DossierSurface>
            <Dossier
              beats={seed.beats}
              sources={sources}
              sides={sides}
              branch={branch}
              packTitle={pack.title}
              resolveMedia={mediaById}
              resolveDiagram={(file) => seed.diagrams[file]}
              cast={<CastStripSpecimen />}
            />
          </DossierSurface>
        ),
      },
      {
        id: 'dossier-hypothetical',
        title: 'Dossier — a hypothetical branch',
        note: 'Brass and dashed, never red: the about-this-branch panel above the beat.',
        covers: ['Dossier'],
        column: true,
        render: () => (
          <DossierSurface>
            <Dossier
              beats={seed.beats}
              sources={sources}
              sides={sides}
              branch={hypothetical ?? branch}
              packTitle={pack.title}
            />
          </DossierSurface>
        ),
      },
      {
        id: 'cast-strip',
        title: 'Cast strip',
        note: 'Portraits keyed to the side colours; click a face to select it. The selected face stays in colour.',
        covers: ['CastStrip'],
        render: () => <CastStripSpecimen />,
      },
      {
        id: 'portrait-chip',
        title: 'Portrait chip',
        note: 'A face at name size, in the three sizes the app uses and with the initials fallback. Hover one for the name and the colour.',
        covers: ['PortraitChip'],
        render: () => (
          <div className="gallery__row">
            <PortraitChip entry={portrait} name={castPerson.name} role={castEntry.role} size={26} />
            <PortraitChip
              entry={portrait}
              name={castPerson.name}
              role={castEntry.role}
              ring={`var(${sideToken(sides[0]!, sides)})`}
              onSelect={() => {}}
              pressed
            />
            <PortraitChip entry={portrait} name={castPerson.name} size={44} />
            <PortraitChip name="Nobody Photographed" size={44} />
          </div>
        ),
      },
      {
        id: 'prose',
        title: 'Prose',
        note: 'Markdown with entity links and footnotes — the beat body without the panel.',
        covers: ['Prose'],
        column: true,
        render: () => <Prose>{only(seed.beats, 'beat').body}</Prose>,
      },
      {
        id: 'media-figure',
        title: 'Media figure',
        note: 'Archive photograph with caption and credit; colorized images say so (ADR 0007). Toned at rest — hover it, or tab to it, for full colour (ADR 0012).',
        covers: ['MediaFigure', 'MediaCredit'],
        column: true,
        render: () =>
          photograph ? (
            <MediaFigure entry={photograph} width={320} name={undefined} />
          ) : (
            <p className="gallery__missing">No image in the media index.</p>
          ),
      },
      {
        id: 'media-hero',
        title: 'Media figure — the hero slot',
        note: 'One picture per beat, cropped to a 3:2 band on the focal point, so a tall portrait and a wide scene open a beat the same way. Click it for the whole picture.',
        covers: ['MediaFigure'],
        column: true,
        render: () =>
          photograph ? (
            <MediaFigure
              entry={photograph}
              width={360}
              fit="band"
              zoomable
              className="dossier__hero"
            />
          ) : (
            <p className="gallery__missing">No image in the media index.</p>
          ),
      },
      {
        id: 'media-absent',
        title: 'Media figure — the picture is missing',
        note: 'The build or the bucket is short of the file. The frame keeps its place, the credit still shows, and nothing renders a broken-image glyph.',
        covers: ['MediaFigure'],
        column: true,
        render: () =>
          absent ? (
            <MediaFigure entry={absent} width={320} fit="band" />
          ) : (
            <p className="gallery__missing">No image in the media index.</p>
          ),
      },
      {
        id: 'media-credit',
        title: 'Credit line',
        note: 'What travels with every picture (ADR 0007): the colorized label, the credit exactly as the archive asks for it, and the way to the unaltered original.',
        covers: ['MediaCredit'],
        column: true,
        render: () =>
          photograph ? (
            <span className="media__caption">
              <MediaCredit entry={photograph} />
            </span>
          ) : (
            <p className="gallery__missing">No image in the media index.</p>
          ),
      },
      {
        id: 'media-original',
        title: 'Show original — in place',
        note: 'Where the project holds the unaltered original as well as the colorization, the credit line swaps the picture rather than sending the reader to the archive. No manifest carries one yet, so this pairs the picture with itself.',
        covers: ['MediaFigure', 'MediaCredit'],
        column: true,
        render: () =>
          paired ? (
            <MediaFigure entry={paired} width={320} fit="band" />
          ) : (
            <p className="gallery__missing">No image in the media index.</p>
          ),
      },
      {
        id: 'plate-set',
        title: 'Plate set — a comparison at the cap',
        note: 'Four pictures on one axis, all of them visible at once, one crop for the set and a label on each. Bounded at four and never on a beat, which is what keeps it from being a gallery (ADR 0014).',
        covers: ['PlateSet'],
        column: true,
        render: () =>
          armiesInTheField.length >= 2 ? (
            <PlateSet axis="In the field, 1914" items={armiesInTheField} />
          ) : (
            <p className="gallery__missing">No images in the media index.</p>
          ),
      },
      {
        id: 'plate-set-portrait',
        title: 'Plate set — the floor, and the other crop',
        note: 'Two plates is the smallest set the schema allows; below that a picture is a plate. `portrait` is the other fit a set may take — one frame for all of them either way.',
        covers: ['PlateSet'],
        column: true,
        render: () =>
          armiesInTheField.length >= 2 ? (
            <PlateSet
              axis="Germany and France"
              items={armiesInTheField.slice(0, 2)}
              fit="portrait"
            />
          ) : (
            <p className="gallery__missing">No images in the media index.</p>
          ),
      },
      {
        id: 'media-lightbox',
        title: 'Media lightbox',
        note: 'A native modal dialog, so it opens in the top layer and follows the page theme — use Light/Dark above to review it.',
        covers: ['MediaLightbox'],
        render: () => <MediaLightboxSpecimen />,
      },
      {
        id: 'diagram',
        title: 'Diagram figure',
        note: 'Concept schematics are inline SVG so they take the tokens with the theme.',
        covers: ['DiagramFigure'],
        column: true,
        render: () => (
          <DiagramFigure
            svg={diagram[1]}
            caption={`The ${diagram[0].replace(/-/g, ' ')} schematic.`}
            alt={`Schematic: ${diagram[0].replace(/-/g, ' ')}.`}
          />
        ),
      },
      {
        id: 'vignette',
        title: 'Vignette',
        note: 'A first-person voice at reading size in the display serif (sand-1l0.24).',
        covers: ['VignetteView'],
        column: true,
        render: () => (
          <VignetteView
            vignettes={seed.vignettes.slice(0, 1)}
            sources={sources}
            label={label}
            portrait={portraitFor}
          />
        ),
      },
    ],
  },
  {
    id: 'cards',
    title: 'Cards',
    note: 'Every family renders in one frame: eyebrow, title, meta, body, chips, sources, a way back.',
    specimens: [
      {
        id: 'card-frame',
        title: 'Card frame',
        note: 'The frame itself, with each chip kind: ◆ battle ▲ event ⚙ tech ● person ○ place.',
        covers: ['Card'],
        column: true,
        render: () => (
          <Card
            eyebrow="Card frame · Every part"
            title="The frame every card family renders inside"
            meta="Eyebrow, title, meta line, body, chips, sources"
            summary="The summary paragraph reads a step larger than the body, so a card opens with a sentence rather than a wall."
            body="Body copy sits at `--fs-md` on `--lh-body`. Chips below are the card's links; the sources are footnoted the same way the beat's are."
            chips={[
              { id: 'c1', label: battle.title, kind: 'battle', onClick: () => {} },
              { id: 'c2', label: castPerson.name, kind: 'person', onClick: () => {} },
              {
                id: 'c3',
                label: only(seed.tech, 'tech card').title,
                kind: 'tech',
                onClick: () => {},
              },
              { id: 'c4', label: 'An inert chip', kind: 'place' },
            ]}
            citations={only(seed.tech, 'tech card').sources}
            sources={sources}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-person',
        title: 'Person card',
        note: 'A cast profile: the headshot leads, the period role and biography before the era-neutral summary.',
        covers: ['PersonCardView'],
        column: true,
        render: () => (
          <PersonCardView
            person={castPerson}
            sources={sources}
            labeller={labeller}
            cast={castEntry}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-tech',
        title: 'Technology card',
        note: 'Introduced-at line, effect, the links back to the moments it changed.',
        covers: ['TechCardView'],
        column: true,
        render: () => (
          <TechCardView
            card={only(seed.tech, 'tech card')}
            sources={sources}
            labeller={labeller}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-science',
        title: 'Science card',
        note: 'The "Meanwhile" family: French eyebrow, connections forward rather than chips.',
        covers: ['ScienceCardView'],
        column: true,
        render: () => (
          <ScienceCardView
            card={only(seed.science, 'science card')}
            sources={sources}
            labeller={labeller}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-document',
        title: 'Document card',
        note: 'The excerpt in the display serif with a brass rule, the translation under it, the archive line.',
        covers: ['DocumentCardView'],
        column: true,
        render: () => (
          <DocumentCardView
            doc={only(seed.documents, 'document')}
            sources={sources}
            labeller={labeller}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-decision',
        title: 'Decision point',
        note: 'Pick an option: the chosen one is marked and offers its branch. Hypothetical = brass + dashed.',
        covers: ['DecisionCardView'],
        column: true,
        render: () => <DecisionCardSpecimen />,
      },
      {
        id: 'card-clock',
        title: 'Timetable card',
        note: 'Plan against reality, milestone by milestone; the readout table never breaks a figure.',
        covers: ['ClockCardView'],
        column: true,
        render: () => (
          <ClockCardView
            clock={only(seed.clocks, 'timetable')}
            sources={sources}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-tally',
        title: 'Strength ledger',
        note: 'The running total and every entry that moved it.',
        covers: ['TallyCardView'],
        column: true,
        render: () => (
          <TallyCardView
            tally={only(seed.tallies, 'tally')}
            sources={sources}
            labeller={labeller}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-supply',
        title: 'Supply line',
        note: 'Rail against feet: railhead, march distance, and what the gap costs.',
        covers: ['SupplyCardView'],
        column: true,
        render: () => (
          <SupplyCardView
            line={only(seed.supply, 'supply line')}
            routes={seed.routes}
            sources={sources}
            labeller={labeller}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-casualty',
        title: 'Human cost',
        note: 'Figures with their confidence, the to-date sum, and the counted-as note. No gore, no drama.',
        covers: ['CasualtyCardView'],
        column: true,
        render: () => (
          <CasualtyCardView
            record={only(seed.casualties, 'casualty record')}
            records={seed.casualties}
            sides={sides}
            sources={sources}
            labeller={labeller}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'card-causal',
        title: 'Causal chain',
        note: 'Cause ⟶ effect with the mechanism between them, and the links either side.',
        covers: ['CausalView'],
        column: true,
        render: () => (
          <CausalView
            links={seed.links}
            focal={only(seed.links, 'causal link')}
            sources={sources}
            label={label}
            onOpenLink={() => {}}
            onOpenEntity={() => () => {}}
            onBack={() => {}}
          />
        ),
      },
      {
        id: 'meanwhile-filter',
        title: 'Meanwhile filter',
        note: 'A dossier control, not a bar: which science fields are on the timeline.',
        covers: ['MeanwhileFilter'],
        render: () => <MeanwhileFilterSpecimen />,
      },
    ],
  },
  {
    id: 'timeline',
    title: 'The timeline and its instruments',
    note: 'The clock, its bands and glyphs, and the gauges that read the campaign against its plan.',
    specimens: [
      {
        id: 'timeline',
        title: 'Timeline',
        note: 'Phase bands, marker glyphs by family, the day counter and the transport. Space plays it when the strip has focus.',
        covers: ['Timeline'],
        render: () => (
          <footer className="surface surface--timeline">
            <Timeline
              title={pack.title}
              phases={phases}
              markers={markers}
              globalShortcuts={false}
            />
          </footer>
        ),
      },
      {
        id: 'clock-gauges',
        title: 'Plan-vs-actual gauges',
        note: 'One row per timetable: planned ticks above, actual below, the needle at now.',
        covers: ['ClockGauges'],
        render: () => <ClockGauges clocks={seed.clocks} />,
      },
      {
        id: 'tally-gauges',
        title: 'Strength gauges',
        note: 'The bar shortens as entries bite; the readout is the running figure.',
        covers: ['TallyGauges'],
        render: () => <TallyGauges tallies={seed.tallies} />,
      },
      {
        id: 'supply-gauges',
        title: 'Supply gauges',
        note: 'Rail against feet, per formation, with the marching gap in days.',
        covers: ['SupplyGauges'],
        render: () => <SupplyGauges lines={seed.supply} routes={seed.routes} label={label} />,
      },
      {
        id: 'human-cost',
        title: 'Human cost line',
        note: 'The running total by side, in muted type. It states; it does not shout.',
        covers: ['HumanCostLine'],
        render: () => <HumanCostLine records={seed.casualties} sides={sides} />,
      },
    ],
  },
  {
    id: 'takeovers',
    title: 'Takeovers',
    note: 'The two things allowed to cover the map: the opening thirty seconds, and a guided tour.',
    specimens: [
      {
        id: 'opening',
        title: 'Opening sequence',
        note: 'Opens on demand — it takes focus, as a takeover should. Shown with the staged reveal off, as a reduced-motion reader gets it.',
        covers: ['OpeningSequence'],
        contained: true,
        render: () => <OpeningSpecimen />,
      },
      {
        id: 'tour-launcher',
        title: 'Tour launcher',
        note: 'The brass pill in the header row: play the story, and how long it takes.',
        covers: ['TourPanel'],
        render: () => <TourLauncher tour={tour} minutes={tourMinutes(tour)} onStart={() => {}} />,
      },
      {
        id: 'tour-running',
        title: 'Tour panel — running',
        note: 'Narration, progress through the steps, and the transport.',
        covers: ['TourPanel'],
        column: true,
        render: () => <TourPanelSpecimen waiting={false} />,
      },
      {
        id: 'tour-waiting',
        title: 'Tour panel — stopped at a break',
        note: 'Held at a beat, waiting to be let on (sand-1l0.28).',
        covers: ['TourPanel'],
        column: true,
        render: () => <TourPanelSpecimen waiting />,
      },
    ],
  },
];

/**
 * Components with no specimen, and why. Gallery.test.tsx reads this, so an
 * exemption has to be written down rather than merely forgotten.
 */
export const NOT_IN_GALLERY: Record<string, string> = {
  MapSurface:
    'The map itself — a MapLibre canvas over PMTiles and deck.gl layers, which needs the assets bucket, a camera and the whole clock to mean anything. It is reviewed in the app (scripts/visual-review.mjs), not in a 400px pane.',
};
