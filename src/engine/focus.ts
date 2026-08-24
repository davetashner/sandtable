/**
 * Focus / zoom-in (sand-a55.14): entering a Battle swaps the clock's range for
 * the battle's, remembers where the campaign clock was, and gives the map a
 * region to fit; leaving restores the campaign range and time. The `focus`
 * slot in the URL is the source of truth (deep-linkable); this module is the
 * pure logic the React controller applies.
 */
import type { Battle, Formation, Route, Side } from '../packs/schema/index.js';
import { defaultSpeedFor, speedPresetsFor, type ClockRange } from './clock.js';

export interface FocusMemory {
  /** Campaign "now" when the zoom-in was entered. */
  campaignNow: number;
  /** Campaign range to restore. */
  campaignRange: ClockRange;
  /** Campaign pace to restore; a chapter of its own length may need another. */
  campaignSpeed: number;
}

export const battleRange = (b: Battle): ClockRange => ({
  start: Date.parse(b.timeRange.start),
  end: Date.parse(b.timeRange.end),
});

/**
 * The "now" to use when entering a battle: keep the campaign instant if it
 * already falls inside the battle, otherwise start at the battle's beginning.
 *
 * `wanted` is the instant a deep link asked for, and it is a second chance
 * rather than a duplicate. The URL binding seeks the clock to `?t=` while the
 * clock still has the campaign's range, so an instant inside a level that
 * keeps a window of its own (ADR 0015) — anything in 1915–1919 — has already
 * been clamped away by the time this runs. The URL still has it, and without
 * it a link copied from inside the epilogue would not reopen where it was
 * copied (ADR 0009).
 */
export function enterNow(now: number, range: ClockRange, wanted?: number): number {
  const inside = (t: number) => t >= range.start && t <= range.end;
  if (inside(now)) return now;
  if (wanted !== undefined && inside(wanted)) return wanted;
  return range.start;
}

/**
 * The pace to run at inside a range: the one already running where that range
 * can offer it, otherwise the range's own default. The campaign and every
 * zoom-in in it read at an hour a second and keep it; a chapter that spans
 * four years cannot — at an hour a second it would take a working day to play,
 * and the reader would be handed a scrubber that does not move.
 */
export function enterSpeed(speed: number, range: ClockRange): number {
  return speedPresetsFor(range).some((p) => p.speed === speed) ? speed : defaultSpeedFor(range);
}

/**
 * The "now" to use when leaving: the remembered campaign instant, unless the
 * viewer scrubbed past it inside the battle — then the later of the two, so
 * the story never jumps backwards.
 *
 * An instant the campaign cannot hold does not count. A chapter set outside
 * the campaign — a prologue, an epilogue (ADR 0015) — is always "later" or
 * always earlier than every campaign instant, so taking its clock would park
 * every reader who looked at the epilogue on the last day of the pack.
 */
export function exitNow(memory: FocusMemory, battleNow: number): number {
  const { campaignNow, campaignRange } = memory;
  if (battleNow < campaignRange.start || battleNow > campaignRange.end) return campaignNow;
  return Math.max(campaignNow, battleNow);
}

/** The battle a focus id names, if it is one of the pack's. */
export function resolveFocus(battles: Battle[], focus: string | undefined): Battle | undefined {
  return focus ? battles.find((b) => b.id === focus) : undefined;
}

/**
 * A **chapter** is a Battle that carries no routes of its own (the convention
 * PR #63 introduced, written down in the pack README). With no routes
 * `movementSourceFor` leaves the campaign tokens on their campaign movement,
 * so it reads as narrative plus static markers rather than a reconstruction
 * that plays; a **zoom-in** brings its own routes and replays the engagement.
 * The engine's answer, so the chrome can name each battle for what it is
 * instead of calling the whole row one thing (sand-neh.7).
 */
export const isChapter = (b: Battle): boolean => !b.routes?.length;

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
  if (!focus || isChapter(focus)) return campaign;
  return {
    routes: focus.routes ?? [],
    formations: [...(focus.formations ?? []), ...campaign.formations],
    sides: campaign.sides,
  };
}
