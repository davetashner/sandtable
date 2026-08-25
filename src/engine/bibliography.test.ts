import { describe, expect, it } from 'vitest';
import {
  BIBLIOGRAPHY_CARD,
  bibliography,
  countCitations,
  EVIDENCE_LABEL,
  EVIDENCE_ORDER,
  EVIDENCE_RUBRIC,
  EVIDENCE_SHORT,
  imprint,
} from './bibliography.js';
import { Id } from '../packs/schema/primitives.js';
import type { Source } from '../packs/schema/index.js';
import { seed } from '../packs/seed.js';

const work = (id: string, tier: Source['tier'], extra: Partial<Source> = {}): Source => ({
  id,
  kind: 'book',
  tier,
  title: `Title of ${id}`,
  ...extra,
});

describe('countCitations', () => {
  it('counts every citation anywhere in a pack, and how many give pages', () => {
    const pack = {
      battles: [
        { id: 'b', sources: [{ source: 'source:a', pages: '10' }, { source: 'source:b' }] },
        { events: [{ id: 'e', sources: [{ source: 'source:a', pages: '11–12' }] }] },
      ],
      beats: [{ sources: [{ source: 'source:a' }] }],
    };
    const use = countCitations(pack);
    expect(use.get('source:a')).toEqual({ citations: 3, withPages: 2 });
    expect(use.get('source:b')).toEqual({ citations: 1, withPages: 0 });
  });

  it('does not mistake the registry itself for a list of citations', () => {
    // `sources` names both things in the pack: an entity's citations, and the
    // registry of Source entities. A Source has `id`, never `source`.
    const use = countCitations({ sources: [work('source:a', 'study')] });
    expect(use.size).toBe(0);
  });

  it('survives a cycle and an empty pages string', () => {
    const node: Record<string, unknown> = { sources: [{ source: 'source:a', pages: '' }] };
    node.self = node;
    const use = countCitations(node);
    expect(use.get('source:a')).toEqual({ citations: 1, withPages: 0 });
  });
});

describe('bibliography', () => {
  const sources = [
    work('source:zed', 'study', { author: 'Zuber, Terence', year: 2002 }),
    work('source:ack', 'study', { author: 'Albertini, Luigi', year: 1952 }),
    work('source:off', 'official-history', { author: 'Edmonds, J. E.' }),
    work('source:mem', 'memoir', { author: 'Kluck, Alexander von' }),
    work('source:unread', 'general', { author: 'Nobody, A.' }),
  ];
  const use = new Map([
    ['source:zed', { citations: 3, withPages: 1 }],
    ['source:ack', { citations: 1, withPages: 0 }],
    ['source:off', { citations: 9, withPages: 7 }],
    ['source:mem', { citations: 2, withPages: 0 }],
  ]);

  it('groups by the hierarchy of evidence, strongest rung first', () => {
    const bib = bibliography(sources, use);
    expect(bib.groups.map((g) => g.tier)).toEqual(['official-history', 'study', 'memoir']);
    expect(bib.groups[0]!.label).toBe(EVIDENCE_LABEL['official-history']);
    expect(bib.groups[0]!.rubric).toBe(EVIDENCE_RUBRIC['official-history']);
  });

  it('leaves out a registry entry nothing cites', () => {
    const bib = bibliography(sources, use);
    const listed = bib.groups.flatMap((g) => g.entries.map((e) => e.source.id));
    expect(listed).not.toContain('source:unread');
    expect(bib.works).toBe(4);
  });

  it('sorts within a rung by author', () => {
    const bib = bibliography(sources, use);
    const study = bib.groups.find((g) => g.tier === 'study')!;
    expect(study.entries.map((e) => e.source.id)).toEqual(['source:ack', 'source:zed']);
  });

  it('totals the citations behind it, and how many carry pages', () => {
    const bib = bibliography(sources, use);
    expect(bib.citations).toBe(15);
    expect(bib.withPages).toBe(8);
  });

  it('has a label, a short label and a rubric for every rung', () => {
    for (const tier of EVIDENCE_ORDER) {
      expect(EVIDENCE_LABEL[tier]).toBeTruthy();
      expect(EVIDENCE_SHORT[tier]).toBeTruthy();
      expect(EVIDENCE_RUBRIC[tier]).toBeTruthy();
    }
  });
});

describe('imprint', () => {
  it('joins publisher and year, and drops whichever is missing', () => {
    expect(imprint(work('source:a', 'study', { publisher: 'OUP, Oxford', year: 2001 }))).toBe(
      'OUP, Oxford, 2001',
    );
    expect(imprint(work('source:a', 'study', { year: 2001 }))).toBe('2001');
    expect(imprint(work('source:a', 'study'))).toBe('');
  });
});

describe('the bibliography card id', () => {
  it('cannot collide with an entity id, because entity ids are qualified', () => {
    expect(Id.safeParse(BIBLIOGRAPHY_CARD).success).toBe(false);
    expect(seed.sources.some((s) => s.id === BIBLIOGRAPHY_CARD)).toBe(false);
  });
});

describe('the 1914 pack', () => {
  const use = countCitations(seed);

  it('cites nothing that is not in the registry', () => {
    const known = new Set(seed.sources.map((s) => s.id));
    expect([...use.keys()].filter((id) => !known.has(id))).toEqual([]);
  });

  it('builds a bibliography of the works it actually cites, with pages on it', () => {
    const bib = bibliography(seed.sources, use);
    expect(bib.works).toBeGreaterThan(80);
    expect(bib.works).toBeLessThanOrEqual(seed.sources.length);
    // The whole point of the story: the pages exist and are now countable.
    expect(bib.withPages).toBeGreaterThan(200);
    expect(bib.groups.length).toBeGreaterThanOrEqual(5);
  });
});
