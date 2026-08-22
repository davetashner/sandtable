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

/** "Herwig, Holger H., *The Marne, 1914* (Random House, New York, 2009), pp. 112–115." */
export function formatCitation(source: Source | undefined, slug: string, pages?: string): string {
  if (!source) return `Source \`${slug}\` (not in the registry)`;
  const parts: string[] = [];
  if (source.author) parts.push(source.author);
  parts.push(`*${source.title}*`);
  const pub = [source.publisher, source.year].filter(Boolean).join(', ');
  let text = parts.join(', ') + (pub ? ` (${pub})` : '');
  if (pages) text += `, pp. ${pages}`;
  if (source.url) text += ` — <${source.url}>`;
  return text + '.';
}

/**
 * Append GFM footnote definitions for every cited source so `[^slug]` in the
 * body renders as a footnote with the full citation. Sources cited in the front
 * matter but not inline are still listed, so nothing a beat relies on is hidden.
 */
export function withFootnotes(beat: NarrativeBeat, sources: Source[]): string {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const defs = beat.sources.map((c) => {
    const slug = c.source.split(':')[1] ?? c.source;
    return `[^${slug}]: ${formatCitation(byId.get(c.source), slug, c.pages)}`;
  });
  const cited = new Set([...beat.body.matchAll(/\[\^([^\]\s]+)\]/g)].map((m) => m[1]));
  const uncited = beat.sources
    .map((c) => c.source.split(':')[1] ?? c.source)
    .filter((slug) => !cited.has(slug))
    .map((slug) => `[^${slug}]`)
    .join('');
  const also = uncited ? `\n\n<small class="dossier__also">Also drawing on${uncited}</small>` : '';
  return `${beat.body}${also}\n\n${defs.join('\n')}\n`;
}
