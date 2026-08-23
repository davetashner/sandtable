/**
 * Causal chains (sand-ekc.1): pure helpers over CausalLink entities.
 * A chain is walked from a link backwards through its `from` entity's causes
 * and forwards through its `to` entity's consequences — a linear/branching
 * view the dossier renders as a mode. Era-agnostic; links may cross packs.
 */
import type { CausalLink } from '../packs/schema/index.js';

export interface EntityChains {
  /** Links whose `to` is the entity: what led to it. */
  causes: CausalLink[];
  /** Links whose `from` is the entity: what it led to. */
  consequences: CausalLink[];
}

export function chainsFor(links: CausalLink[], entityId: string): EntityChains {
  return {
    causes: links.filter((l) => l.to === entityId),
    consequences: links.filter((l) => l.from === entityId),
  };
}

export interface ChainStep {
  link: CausalLink;
  /** 0 = the focal link; negative = upstream causes; positive = downstream consequences. */
  depth: number;
}

/**
 * The linear chain around a link: follow the first cause of `from` upstream
 * and the first consequence of `to` downstream, up to `maxDepth` each way.
 * Branching (several causes/consequences) is exposed via chainsFor() so the
 * view can offer the alternatives at each step.
 */
export function chainAround(links: CausalLink[], focal: CausalLink, maxDepth = 4): ChainStep[] {
  const steps: ChainStep[] = [{ link: focal, depth: 0 }];
  const seen = new Set<string>([focal.id]);
  // upstream
  let cursor: CausalLink | undefined = focal;
  for (let d = -1; d >= -maxDepth && cursor; d--) {
    const prev = links.find((l) => l.to === cursor!.from && !seen.has(l.id));
    if (!prev) break;
    seen.add(prev.id);
    steps.unshift({ link: prev, depth: d });
    cursor = prev;
  }
  // downstream
  cursor = focal;
  for (let d = 1; d <= maxDepth && cursor; d++) {
    const next = links.find((l) => l.from === cursor!.to && !seen.has(l.id));
    if (!next) break;
    seen.add(next.id);
    steps.push({ link: next, depth: d });
    cursor = next;
  }
  return steps;
}

/**
 * The whole chain a link belongs to, end to end: the same walk as
 * chainAround() with no depth limit. Terminates because each link is taken
 * at most once. The July Crisis chain is a dozen links long, well past the
 * depth chainAround() shows, so the explorer uses this for its overview rail
 * while still rendering the depth-limited chain in detail.
 */
export function fullChain(links: CausalLink[], focal: CausalLink): ChainStep[] {
  return chainAround(links, focal, Number.POSITIVE_INFINITY);
}

/** Every link touching any of the given entity ids. */
export function linksTouching(links: CausalLink[], entityIds: Iterable<string>): CausalLink[] {
  const ids = new Set(entityIds);
  return links.filter((l) => ids.has(l.from) || ids.has(l.to));
}

export const RELATION_LABEL: Record<CausalLink['relation'], string> = {
  caused: 'caused',
  enabled: 'enabled',
  accelerated: 'accelerated',
  prevented: 'prevented',
  motivated: 'motivated',
  shaped: 'shaped',
  other: 'led to',
};
