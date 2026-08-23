/**
 * Focus / zoom-in (sand-a55.14): entering a Battle swaps the clock's range for
 * the battle's, remembers where the campaign clock was, and gives the map a
 * region to fit; leaving restores the campaign range and time. The `focus`
 * slot in the URL is the source of truth (deep-linkable); this module is the
 * pure logic the React controller applies.
 */
import type { Battle, Formation, Route, Side } from '../packs/schema/index.js';
import type { ClockRange } from './clock.js';

export interface FocusMemory {
  /** Campaign "now" when the zoom-in was entered. */
  campaignNow: number;
  /** Campaign range to restore. */
  campaignRange: ClockRange;
}

export const battleRange = (b: Battle): ClockRange => ({
  start: Date.parse(b.timeRange.start),
  end: Date.parse(b.timeRange.end),
});

/**
 * The "now" to use when entering a battle: keep the campaign instant if it
 * already falls inside the battle, otherwise start at the battle's beginning.
 */
export function enterNow(now: number, range: ClockRange): number {
  return now >= range.start && now <= range.end ? now : range.start;
}

/**
 * The "now" to use when leaving: the remembered campaign instant, unless the
 * viewer scrubbed past it inside the battle — then the later of the two, so
 * the story never jumps backwards.
 */
export function exitNow(memory: FocusMemory, battleNow: number): number {
  return Math.max(memory.campaignNow, battleNow);
}

/** The battle a focus id names, if it is one of the pack's. */
export function resolveFocus(battles: Battle[], focus: string | undefined): Battle | undefined {
  return focus ? battles.find((b) => b.id === focus) : undefined;
}

export interface MovementSourceLike {
  routes: Route[];
  formations: Formation[];
  sides: Side[];
}

/**
 * What the map animates: inside a zoom-in that carries its own routes, the
 * battle's routes over the battle's formations plus the campaign's (battle
 * routes may move campaign corps); otherwise the campaign source unchanged.
 * Pure, so MapSection can memoise it (sand-1l0.10).
 */
export function movementSourceFor(
  focus: Battle | undefined,
  campaign: MovementSourceLike,
): MovementSourceLike {
  if (!focus?.routes?.length) return campaign;
  return {
    routes: focus.routes,
    formations: [...(focus.formations ?? []), ...campaign.formations],
    sides: campaign.sides,
  };
}
