import { describe, expect, it } from 'vitest';
import type { CausalLink } from '../packs/schema/index.js';
import { chainAround, chainsFor, linksTouching } from './causal.js';

const link = (id: string, from: string, to: string): CausalLink => ({
  id,
  from,
  to,
  relation: 'enabled',
  claim: `${from} → ${to}`,
  confidence: 'high',
  evidence: [{ source: 'source:x' }],
});

// a → b → c → d, with a second cause of c (x → c) and a second consequence of b (b → y)
const links = [
  link('l:ab', 'a', 'b'),
  link('l:bc', 'b', 'c'),
  link('l:cd', 'c', 'd'),
  link('l:xc', 'x', 'c'),
  link('l:by', 'b', 'y'),
];

describe('causal chains', () => {
  it('collects causes and consequences of an entity', () => {
    expect(chainsFor(links, 'c').causes.map((l) => l.id)).toEqual(['l:bc', 'l:xc']);
    expect(chainsFor(links, 'b').consequences.map((l) => l.id)).toEqual(['l:bc', 'l:by']);
  });

  it('walks a linear chain around a focal link, upstream and downstream', () => {
    const chain = chainAround(links, links[1]!);
    expect(chain.map((s) => [s.link.id, s.depth])).toEqual([
      ['l:ab', -1],
      ['l:bc', 0],
      ['l:cd', 1],
    ]);
  });

  it('respects maxDepth and never loops', () => {
    const loop = [link('l:pq', 'p', 'q'), link('l:qp', 'q', 'p')];
    expect(chainAround(loop, loop[0]!, 10).map((s) => s.link.id)).toEqual(['l:qp', 'l:pq']);
    expect(chainAround(links, links[1]!, 0).map((s) => s.link.id)).toEqual(['l:bc']);
  });

  it('finds links touching a set of entities', () => {
    expect(linksTouching(links, ['y', 'x']).map((l) => l.id)).toEqual(['l:xc', 'l:by']);
  });
});
