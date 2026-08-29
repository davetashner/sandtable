/**
 * The bibliography, and the card behind a single work (sand-shn.5).
 *
 * **Both are cards, and that is the whole design decision.** ADR 0006 allows
 * three surfaces and says in as many words that sources "render as footnotes
 * under the beat and as a bibliography card"; a list of ninety works is the
 * loudest possible argument for a fourth panel or a separate page, and it does
 * not get one. It gets `?card=bibliography`, a slot beside the eleven card
 * families the URL already carries (ADR 0009), reached from the Sources block
 * of any card and from under any beat — so the apparatus is one click from
 * every claim that rests on it, and nowhere else.
 *
 * The pair is deliberate. The bibliography answers "what does this pack stand
 * on"; the work card answers "what is this thing in the footnote I just read",
 * and it is where a citation lands, because a footnote that scrolls you to the
 * bottom of a list of ninety is not a link, it is a search.
 */
import {
  BIBLIOGRAPHY_CARD,
  bibliography,
  imprint,
  EVIDENCE_RUBRIC,
  EVIDENCE_SHORT,
  type SourceUse,
} from '../engine/bibliography.js';
import type { Source } from '../packs/schema/index.js';
import type { ViewCitation } from '../engine/cite.js';
import { Card } from './Card.js';
import { CopyLink } from './CopyLink.js';
import { EntityLink } from './Prose.js';
import './bibliography.css';

/**
 * The standard the list is built to, in the reader's language rather than the
 * author's. It is hard-coded here and not in the pack because the citation
 * standard belongs to the project, not to 1914 — the same paragraph is true of
 * every era this engine will ever load.
 */
const LEDE =
  'Every date, number and position in this pack cites a work; anything contestable — a strength, a time of day, a position, a quotation — cites the page it is printed on. The works are grouped by how much weight each kind carries when two of them disagree, strongest first, and only the works this pack actually cites are here.';

const CITE_RUBRIC =
  'The address bar is the whole view (ADR 0009): the date, the branch and the ' +
  'open card are all in it, so a reader who follows this link arrives where ' +
  'you were. The second date is the ordinary one — the packs are revised, and ' +
  'a citation says when it was read.';

const FURTHER_READING =
  'There is no separate list. Every entry above carries the registry’s own note on what the work is good for and where it is partisan, and that note is the recommendation — the only one this pack is entitled to make, because it is the only one it has read. Works wanted but not yet opened are tracked in the repository, not printed here: a reading list of books nobody read would look exactly like a bibliography and mean the opposite.';

/** "1,994" — a bibliography is a place for a thousands separator. */
const n = (x: number) => x.toLocaleString('en-GB');

/** "46 citations · 12 with pages" — what the pack does with the work. */
function usageLine(use: SourceUse): string {
  const cites = `${n(use.citations)} citation${use.citations === 1 ? '' : 's'}`;
  return use.withPages > 0 ? `${cites} · ${n(use.withPages)} with pages` : cites;
}

/** Author, title, imprint — the reference line, with the title live. */
function Reference({ source }: { source: Source }) {
  const pub = imprint(source);
  return (
    <p className="bib__ref">
      {source.author ? `${source.author}, ` : null}
      <EntityLink id={source.id}>
        <cite>{source.title}</cite>
      </EntityLink>
      {pub ? ` (${pub})` : null}.
    </p>
  );
}

/**
 * The edition, on a line of its own rather than as a tail on the reference.
 * The registry writes these as sentences — Edmonds's says what the third
 * edition revised and that its pagination differs from the first's, which is
 * the reason the pack cites it at all — and a sentence appended to a citation
 * after a comma reads as a mistake.
 */
function Edition({ source }: { source: Source }) {
  if (!source.edition) return null;
  return <p className="bib__edition">{source.edition}</p>;
}

/** A link to the scan or the paper, where the registry gives one. */
function ReadIt({ source }: { source: Source }) {
  if (!source.url) return null;
  return (
    <p className="bib__online">
      <a className="bib__read" href={source.url} target="_blank" rel="noopener noreferrer">
        Read it online
        <span className="visually-hidden">: {source.title}</span>
      </a>
    </p>
  );
}

export interface BibliographyViewProps {
  /** The whole registry; only the works `use` knows about are listed. */
  sources: Source[];
  /** Citation counts for the loaded pack (`countCitations`). */
  use: Map<string, SourceUse>;
  /**
   * A citation for the view the reader is on (`sand-shn.5.1`). Passed in
   * rather than built here: it needs the clock, the pack and the address bar,
   * and this card is otherwise a pure function of its props.
   */
  cite?: ViewCitation | undefined;
  onBack?: () => void;
}

export function BibliographyView({ sources, use, cite, onBack }: BibliographyViewProps) {
  const bib = bibliography(sources, use);
  return (
    <Card
      eyebrow="Sources"
      title="Works cited"
      meta={`${n(bib.works)} works · ${n(bib.citations)} citations · ${n(bib.withPages)} with pages`}
      summary={LEDE}
      sources={sources}
      {...(onBack ? { onBack } : {})}
    >
      {/* Headings, not `aria-label`ed sections: a card already puts about five
          landmarks inside the dossier's one (sand-pmz.13) and a bibliography
          would add seven more. A screen reader gets these from the heading
          list, which is what a document outline is for. */}
      {bib.groups.map((g) => (
        <div className="bib__group" key={g.tier}>
          <h3 className="bib__heading">{g.label}</h3>
          <p className="bib__rubric">{g.rubric}</p>
          <ul className="bib__works">
            {g.entries.map(({ source, use: u }) => (
              <li key={source.id}>
                <Reference source={source} />
                <Edition source={source} />
                {source.notes ? <p className="bib__note">{source.notes}</p> : null}
                <p className="bib__use">{usageLine(u)}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="bib__group">
        <h3 className="bib__heading">Further reading</h3>
        <p className="bib__rubric">{FURTHER_READING}</p>
      </div>
      {cite ? <CiteThisView cite={cite} /> : null}
    </Card>
  );
}

/**
 * The citation for the reader's own view (`sand-shn.5.1`). It sits last
 * because it is apparatus about this page rather than a work the pack cites,
 * and it is in the bibliography rather than beside the copy-link glyph
 * because it is the scholarly form of that act.
 */
function CiteThisView({ cite }: { cite: ViewCitation }) {
  return (
    <div className="bib__group">
      <h3 className="bib__heading">Cite this view</h3>
      <p className="bib__rubric">{CITE_RUBRIC}</p>
      {/* The visible citation italicises the title the way every other
          reference on this card does; the copy button hands over the plain
          string, because an asterisk pasted into a footnote is not emphasis. */}
      <p className="bib__cite">
        {cite.work}, <em>{cite.title}</em>, the view at {cite.when} (accessed {cite.accessed}).{' '}
        <span className="bib__cite-url">{cite.url}</span>
      </p>
      <CopyLink href={() => cite.text} what="citation" />
    </div>
  );
}

export interface SourceCardViewProps {
  source: Source;
  /** How the loaded pack uses it; absent when it uses it not at all. */
  use?: SourceUse | undefined;
  onBack?: () => void;
}

/** One work: where it stands, what it is good for, and where to read it. */
export function SourceCardView({ source, use, onBack }: SourceCardViewProps) {
  const meta = [source.author, source.year === undefined ? '' : String(source.year)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      eyebrow={`Source · ${EVIDENCE_SHORT[source.tier]}`}
      title={source.title}
      {...(meta ? { meta } : {})}
      sources={[]}
      {...(onBack ? { onBack } : {})}
    >
      <p className="bib__rubric">{EVIDENCE_RUBRIC[source.tier]}</p>
      {source.notes ? <p className="bib__note bib__note--card">{source.notes}</p> : null}
      {source.publisher ? <p className="bib__imprint">{imprint(source)}</p> : null}
      <Edition source={source} />
      <p className="bib__use">
        {use ? `${usageLine(use)} in this pack` : 'In the registry; this pack cites it nowhere'}
      </p>
      <ReadIt source={source} />
      <p className="bib__all">
        <EntityLink id={BIBLIOGRAPHY_CARD}>All works this pack cites</EntityLink>
      </p>
    </Card>
  );
}
