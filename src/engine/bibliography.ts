/**
 * The bibliography, derived from the pack rather than written beside it
 * (sand-shn.5).
 *
 * Two facts about the 1914 pack set the shape of this module. There are about
 * two thousand citations in it and two hundred and fifty of them carry page
 * numbers somebody actually read; and the registry holds ninety-two works,
 * each with a `notes` line saying what it is good for and where it is
 * partisan. None of that was reachable by a reader. What follows turns the
 * pack's own citations into a bibliography: **only works the pack cites
 * appear**, grouped by the hierarchy of evidence in `docs/sources.md`, ordered
 * within a group by author.
 *
 * Everything here is pure and era-agnostic. It walks an arbitrary object
 * looking for `sources: Citation[]`, which is the shape every entity in the
 * schema uses, so a pack that adds an entity kind tomorrow is counted without
 * this file knowing the kind exists.
 */
import type { EvidenceTier, Source } from '../packs/schema/index.js';

/**
 * The bibliography's own address: `?card=bibliography` (ADR 0009).
 *
 * Every other card slot holds an entity id, and every entity id is qualified
 * — `<era|kind>:<slug>`, colon required by the schema — so a bare word cannot
 * collide with one, now or after any pack is authored. It is unqualified on
 * purpose: the bibliography is of whatever pack is loaded, so era-qualifying
 * it would make the same view have a different address in every era.
 */
export const BIBLIOGRAPHY_CARD = 'bibliography';

/** The hierarchy of evidence, strongest first (`docs/sources.md`). */
export const EVIDENCE_ORDER: readonly EvidenceTier[] = [
  'primary',
  'official-history',
  'study',
  'unit-history',
  'memoir',
  'general',
  'reference',
] as const;

export const EVIDENCE_LABEL: Record<EvidenceTier, string> = {
  primary: 'Primary sources — the record itself',
  'official-history': 'Official histories and their document annexes',
  study: 'Archive-based modern studies',
  'unit-history': 'Regimental and divisional histories',
  memoir: 'Memoirs and participants’ accounts',
  general: 'General histories, surveys and handbooks',
  reference: 'Institutional and reference records',
};

/** The same seven, short enough for a card's eyebrow. */
export const EVIDENCE_SHORT: Record<EvidenceTier, string> = {
  primary: 'Primary source',
  'official-history': 'Official history',
  study: 'Modern study',
  'unit-history': 'Unit history',
  memoir: 'Memoir',
  general: 'General history',
  reference: 'Reference record',
};

/**
 * One line per rung saying how to weigh it, condensed from `docs/sources.md`.
 * They are the point of the grouping: a reader who knows that the work behind
 * a figure is a memoir rather than an official history can weigh the figure,
 * and that is exactly the judgement the standard asks an author to make.
 */
export const EVIDENCE_RUBRIC: Record<EvidenceTier, string> = {
  primary:
    'Documents, papers and the contemporary record, cited for what they themselves say. An edition is filed here when its job is to print a text, whatever else its editor argues.',
  'official-history':
    'Orders, strengths, positions and times — read knowing that each one defends its own army.',
  study:
    'Archive-based operational and scholarly work: interpretation, and corrections to the official accounts.',
  'unit-history': 'Regimental and divisional histories, for the hourly detail of a battle.',
  memoir:
    'What a participant believed, remembered or wanted remembered — cited as that, never as fact.',
  general:
    'Context, colour and matters of record no specialist disputes. Numbers and positions come from the rungs above.',
  reference:
    'Dates, coordinates, catalogue identifications and what an institution publishes about its own subject. Never a strength, a position or a time of day (docs/sources.md §8).',
};

/** How one work is used by the pack the bibliography is being built from. */
export interface SourceUse {
  /** Citations naming this work, anywhere in the pack. */
  citations: number;
  /** How many of them give a page reference. */
  withPages: number;
}

/** The three keys a `Citation` may carry, and no others — the schema is strict. */
const CITATION_KEYS = new Set(['source', 'pages', 'note']);

/**
 * Is this object a `Citation`, structurally?
 *
 * Matching on the *name* of the property holding the array was the first
 * attempt and it was wrong: entities carry citations under `sources`, but a
 * `CausalLink` carries them under `evidence`, and the eighteen causal links of
 * the 1914 pack — a hundred-odd citations, one of them the only citation a
 * registry entry had — went uncounted. The shape is what a citation is, and
 * `Citation` is `.strict()`, so the shape is exact: a `source` string and
 * nothing outside `pages` and `note`. A `Source` entity has `id` and `title`
 * and is not matched, which is what keeps the registry from counting itself.
 */
function isCitation(value: unknown): value is { source: string; pages?: unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (typeof (value as { source?: unknown }).source !== 'string') return false;
  return keys.every((k) => CITATION_KEYS.has(k));
}

/** Count every citation in an arbitrary pack object, by source id. */
export function countCitations(root: unknown): Map<string, SourceUse> {
  const out = new Map<string, SourceUse>();
  const seen = new Set<object>();
  const walk = (node: unknown) => {
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    if (isCitation(node)) {
      const e = out.get(node.source) ?? { citations: 0, withPages: 0 };
      e.citations += 1;
      if (typeof node.pages === 'string' && node.pages.length > 0) e.withPages += 1;
      out.set(node.source, e);
      return;
    }
    for (const value of Array.isArray(node) ? node : Object.values(node)) walk(value);
  };
  walk(root);
  return out;
}

export interface BibliographyEntry {
  source: Source;
  use: SourceUse;
}

export interface BibliographyGroup {
  tier: EvidenceTier;
  label: string;
  rubric: string;
  entries: BibliographyEntry[];
}

export interface Bibliography {
  groups: BibliographyGroup[];
  /** Works that appear in it. */
  works: number;
  /** Citations behind it. */
  citations: number;
  /** Citations that give a page reference. */
  withPages: number;
}

/** "Herwig, Holger H." → "herwig, holger h."; no author sorts by title. */
const sortKey = (s: Source) => (s.author ?? s.title).toLocaleLowerCase('en');

/**
 * Group the works a pack cites. A registry entry nothing cites is left out
 * entirely — see the decision recorded in `docs/sources.md`: a bibliography is
 * the list of works a piece of writing used, and padding it with works the
 * project has merely heard of would claim they were read.
 */
export function bibliography(
  sources: readonly Source[],
  use: Map<string, SourceUse>,
): Bibliography {
  const groups: BibliographyGroup[] = [];
  let works = 0;
  let citations = 0;
  let withPages = 0;
  for (const tier of EVIDENCE_ORDER) {
    const entries = sources
      .filter((s) => s.tier === tier && use.has(s.id))
      .map((s) => ({ source: s, use: use.get(s.id)! }))
      .sort((a, b) => {
        const byAuthor = sortKey(a.source).localeCompare(sortKey(b.source), 'en');
        return byAuthor !== 0 ? byAuthor : (a.source.year ?? 0) - (b.source.year ?? 0);
      });
    if (entries.length === 0) continue;
    works += entries.length;
    for (const e of entries) {
      citations += e.use.citations;
      withPages += e.use.withPages;
    }
    groups.push({
      tier,
      label: EVIDENCE_LABEL[tier],
      rubric: EVIDENCE_RUBRIC[tier],
      entries,
    });
  }
  return { groups, works, citations, withPages };
}

/** "(Random House, New York, 2009)" — the imprint, where the entry gives one. */
export function imprint(s: Source): string {
  return [s.publisher, s.year === undefined ? '' : String(s.year)].filter(Boolean).join(', ');
}
