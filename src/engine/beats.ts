/**
 * Beat selection and citation rendering for the dossier — pure and
 * era-agnostic, so the panel, tours and tests share one definition of
 * "which beat is on now" and how a citation reads.
 */
import type { NarrativeBeat, Source } from '../packs/schema/index.js';

/** The beat visible at `now` for a branch and focus (half-open [from, to)). */
export function selectBeat(
  beats: NarrativeBeat[],
  now: number,
  branchId: string,
  focus?: string,
  rangeEnd?: number,
): NarrativeBeat | undefined {
  const visible = beats.filter(
    (b) => (!b.branch || b.branch === branchId) && (b.focus ?? undefined) === (focus ?? undefined),
  );
  return visible.find((b) => {
    const from = Date.parse(b.from);
    const to = Date.parse(b.to);
    return (
      now >= from && (now < to || (rangeEnd !== undefined && now >= rangeEnd && to >= rangeEnd))
    );
  });
}

/**
 * A page locator, as a printed citation writes it: `p. 45` for one page,
 * `pp. 105–120` for a range or a list. The registry's locators are all
 * numeric (`docs/sources.md` §3), so the test is "does it name one number".
 */
export function formatPages(pages: string): string {
  return `${/^\d+$/.test(pages.trim()) ? 'p.' : 'pp.'} ${pages}`;
}

/**
 * "Herwig, Holger H., [*The Marne, 1914*](source:herwig-2009) (Random House,
 * New York, 2009), pp. 112–115."
 *
 * The title is a Markdown link to the work's own card, which is what turns a
 * footnote from a string into something a reader can follow: `Prose` resolves
 * an entity href into a card change without leaving the clock, and the card on
 * the other end carries the work's standing, its `notes` on use and bias, and
 * the link to the scan (sand-shn.5). The URL used to be printed here in full
 * and is not any more — a footnote is not the place for eighty unbreakable
 * characters when the card behind the title has the same link with a name on
 * it.
 */
export function formatCitation(source: Source | undefined, slug: string, pages?: string): string {
  if (!source) return `Source \`${slug}\` (not in the registry)`;
  const parts: string[] = [];
  if (source.author) parts.push(source.author);
  parts.push(`[*${source.title}*](${source.id})`);
  const pub = [source.publisher, source.year].filter(Boolean).join(', ');
  let text = parts.join(', ') + (pub ? ` (${pub})` : '');
  if (pages) text += `, ${formatPages(pages)}`;
  return text + '.';
}

/**
 * Append GFM footnote definitions for every cited source so `[^slug]` in the
 * body renders as a footnote with the full citation. Sources cited in the front
 * matter but not inline are still listed, so nothing a beat relies on is hidden.
 */
export function withFootnotes(
  beat: Pick<NarrativeBeat, 'body' | 'sources'>,
  sources: Source[],
): string {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const defs = beat.sources.map((c) => {
    const slug = c.source.split(':')[1] ?? c.source;
    // The citation's `note` says what this work is standing behind, and where
    // the work supports the claim only at day or part-of-day resolution it is
    // where that is admitted (`docs/sources.md` §3). A card has shown it since
    // the frame was written; a footnote was dropping it on the floor.
    const note = c.note ? ` — ${c.note}` : '';
    return `[^${slug}]: ${formatCitation(byId.get(c.source), slug, c.pages)}${note}`;
  });
  const cited = new Set([...beat.body.matchAll(/\[\^([^\]\s]+)\]/g)].map((m) => m[1]));
  const uncited = beat.sources
    .map((c) => c.source.split(':')[1] ?? c.source)
    .filter((slug) => !cited.has(slug))
    .map((slug) => `[^${slug}]`)
    .join('');
  // Plain Markdown (react-markdown does not render raw HTML): an italic footer with the superscripts.
  const also = uncited ? `\n\n_Also drawing on_${uncited}` : '';
  return `${beat.body}${also}\n\n${defs.join('\n')}\n`;
}
