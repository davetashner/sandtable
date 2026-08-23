import { describe, expect, it } from 'vitest';
import type { CausalLink } from '../packs/schema/index.js';
import { chainAround, chainsFor, fullChain, linksTouching } from './causal.js';

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

  it('walks the whole chain end to end, past the depth chainAround() shows', () => {
    // a long chain: the depth-limited walk truncates it, fullChain() does not
    const long = [
      link('l:12', '1', '2'),
      link('l:23', '2', '3'),
      link('l:34', '3', '4'),
      link('l:45', '4', '5'),
      link('l:56', '5', '6'),
      link('l:67', '6', '7'),
      link('l:78', '7', '8'),
    ];
    const focal = long[3]!;
    expect(chainAround(long, focal, 1).map((s) => s.link.id)).toEqual(['l:34', 'l:45', 'l:56']);
    expect(fullChain(long, focal).map((s) => s.link.id)).toEqual(long.map((l) => l.id));
    expect(fullChain(long, focal).find((s) => s.depth === 0)!.link.id).toBe('l:45');
  });

  it('terminates on a cycle when walking the whole chain', () => {
    const loop = [link('l:pq', 'p', 'q'), link('l:qp', 'q', 'p')];
    expect(fullChain(loop, loop[0]!).map((s) => s.link.id)).toEqual(['l:qp', 'l:pq']);
  });

  it('finds links touching a set of entities', () => {
    expect(linksTouching(links, ['y', 'x']).map((l) => l.id)).toEqual(['l:xc', 'l:by']);
  });
});
