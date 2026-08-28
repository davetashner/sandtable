/**
 * Nothing teleports (`sand-23b.8`).
 *
 * A route's `mode` is a claim about what carried the formation, and what
 * carried it settles how fast it could go. This module holds every leg of
 * every route and commander track to the pace of its own mode, so that a
 * transfer written as a march — the French 2nd Army crossing France at 80 km
 * a day, on foot — fails the build instead of quietly drawing a solid line.
 *
 * Two bars per mode, because the history has both ordinary days and famous
 * ones. `sustained` is what the mode kept up day after day; above it the
 * validator warns, and the author should look again at the dates or the mode.
 * `limit` is what the mode could not exceed on any leg at all; above it the
 * mode is simply wrong, and that is an error.
 *
 * The bars are era-aware (ADR 0020). `MOVEMENT_PACE` below is 1914's and is
 * the default; a pack whose technology outran it declares its own bands in
 * `pack.json#pace`, per mode, with a note and sources, and `PACE_CEILING` is
 * the outer edge no declaration may pass.
 *
 * Pure geometry and arithmetic; no filesystem, no schema parsing.
 */
import { haversineKm } from '../../engine/geo.js';
import { waypointConfidence } from '../../engine/confidence.js';
import type { Confidence, MovementMode, PaceTable, Waypoint } from '../schema/index.js';

/**
 * How far apart a leg's endpoints may be for reasons that are not movement —
 * now read off the confidence of the positions themselves (`sand-23b.4`).
 *
 * The flat 15 km this started as was a confidence statement in disguise: it
 * was justified by the route derivations, which put the centre of an army at
 * ±10–15 km, and it was applied to a track whose derivation names a building
 * and prints the hour. Those are not the same claim and should not buy the
 * same slack.
 *
 * `medium` keeps the old number exactly, so no leg that passed before is
 * judged differently for want of an author writing anything down. `high` is
 * the town or the building the source names, good to a few kilometres.
 * `low` and `contested` are the derived and the disputed position, where the
 * pack has already said in prose that it does not know better than this.
 */
export const POSITION_TOLERANCE_KM: Record<Confidence, number> = {
  high: 8,
  medium: 15,
  low: 30,
  contested: 30,
};

export interface Pace {
  /** km/h the mode held day after day — above it, a warning. */
  sustained: number;
  /** km/h the mode could not beat on any leg — above it, an error. */
  limit: number;
}

/**
 * The pace of each mode in 1914, in km/h of straight-line displacement — less
 * than road or track distance, which is the direction that keeps the check
 * conservative.
 *
 * **This is the default table, and it stays 1914's** (ADR 0020). It is not a
 * statement about movement in general; a pack whose ships or aircraft were
 * faster says so in `pack.json#pace` rather than having these numbers widened
 * underneath every pack at once. What it *is* good for beyond 1914 is
 * `march`, which barely moved between Caesar and Okinawa.
 *
 * `march`: a corps made 20–30 km on an ordinary day and 40 on a hard one; the
 * fastest marches of the campaign (Kluck's right wing, the IX Reserve Corps
 * running for the Ourcq) reach the low 60s per day and no further.
 * `motor`: 1914 staff cars and requisitioned taxis ran at 25–45 km/h on the
 * roads they had. `rail`: troop trains averaged 300 km a day including
 * entraining and detraining, and the fastest legs of Joffre's transfers about
 * 30 km/h. `sea`: a transport convoy at 8–20 knots. `air`: the aeroplanes of
 * 1914 cruised at 100 km/h and could not exceed about 150.
 */
export const MOVEMENT_PACE: Record<MovementMode, Pace> = {
  march: { sustained: 1.7, limit: 2.7 },
  motor: { sustained: 45, limit: 70 },
  rail: { sustained: 15, limit: 30 },
  sea: { sustained: 15, limit: 40 },
  air: { sustained: 60, limit: 150 },
};

/**
 * The outer edge of each mode, whatever the era — the one number a pack may
 * not talk its way past (ADR 0020).
 *
 * A pack declares its own bands in `pack.json#pace` because 1914's ships and
 * aeroplanes cannot hold 1942's, and that declaration is what keeps the check
 * useful across eras. But a declaration that could say anything would also be
 * a way to switch the check off: raise `march` far enough and the transfer
 * written as a march — the case this module exists for — passes.
 *
 * So the ceiling is what the mode has ever physically done, as against what
 * it did in one decade. It is deliberately generous: this is a floor under
 * review, not a second band, and every honest declaration is far below it.
 * Above it the author has stopped describing the mode and is describing
 * something else, which is an error the same way naming the wrong mode is.
 *
 * `march`: no formation of men on foot has averaged more than about 6 km/h of
 * displacement over a leg — that is a fit man walking with no rest, no
 * baggage and no column behind him. `motor` and `rail`: 110 and 120 km/h are
 * a car and an express train running without a stop, which no movement of
 * troops does. `sea`: 85 km/h is 46 knots, past the fastest ship ever built
 * (Le Terrible's 45.25 knots on trials, 1935). `air`: 1,100 km/h is beyond
 * every piston fighter and the jets of 1945.
 *
 * The period this project covers ends in 1945. A pack that genuinely needs
 * more — a jet-age or high-speed-rail era — raises the number here, in a code
 * change with a reason next to it, which is exactly the visibility that
 * makes this a ceiling rather than a formality.
 */
export const PACE_CEILING: Record<MovementMode, Pace> = {
  march: { sustained: 4, limit: 6 },
  motor: { sustained: 60, limit: 110 },
  rail: { sustained: 60, limit: 120 },
  sea: { sustained: 55, limit: 85 },
  air: { sustained: 700, limit: 1100 },
};

/** The band a leg of `mode` is judged against, and where that band came from. */
export function paceFor(mode: MovementMode, table?: PaceTable): Pace & { declared: boolean } {
  const band = table?.[mode];
  return band
    ? { sustained: band.sustained, limit: band.limit, declared: true }
    : { ...MOVEMENT_PACE[mode], declared: false };
}

export interface PaceFinding {
  /** Index of the leg's later waypoint, the one the message points at. */
  index: number;
  km: number;
  hours: number;
  /** km allowed over these hours at the bar that was broken. */
  allowed: number;
  level: 'error' | 'warning';
  /** Whether the bar came from the pack's own table or from the 1914 default. */
  declared: boolean;
}

const allowedKm = (kmh: number, hours: number, tolerance: number) => tolerance + kmh * hours;

/**
 * A leg is judged at the resolution of its weaker end: the larger of the two
 * tolerances, not their sum. Adding them would double the slack on the
 * ordinary medium/medium leg — most of the pack — and quietly widen a gate
 * that is meant to catch teleporting armies.
 */
function legTolerance(a: Confidence, b: Confidence): number {
  return Math.max(POSITION_TOLERANCE_KM[a], POSITION_TOLERANCE_KM[b]);
}

/**
 * Every leg of `waypoints` that goes faster than `mode` could. Waypoints out
 * of order are somebody else's error and are skipped here.
 *
 * `pathConfidence` is the route's or track's own, which every waypoint
 * inherits unless it carries one of its own.
 *
 * `table` is the pack's own pace declaration (`pack.json#pace`). Absent, or
 * silent about this mode, and the leg is judged at 1914 — which is what every
 * pack written before ADR 0020 gets, unchanged.
 */
export function paceFindings(
  waypoints: Waypoint[],
  mode: MovementMode,
  pathConfidence: Confidence = 'medium',
  table?: PaceTable,
): PaceFinding[] {
  const pace = paceFor(mode, table);
  const out: PaceFinding[] = [];
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!;
    const b = waypoints[i]!;
    const hours = (Date.parse(b[2]) - Date.parse(a[2])) / 3_600_000;
    if (!(hours > 0)) continue;
    const km = haversineKm([a[0], a[1]], [b[0], b[1]]);
    const tolerance = legTolerance(
      waypointConfidence(a, pathConfidence),
      waypointConfidence(b, pathConfidence),
    );
    if (km > allowedKm(pace.limit, hours, tolerance))
      out.push({
        index: i,
        km,
        hours,
        allowed: allowedKm(pace.limit, hours, tolerance),
        level: 'error',
        declared: pace.declared,
      });
    else if (km > allowedKm(pace.sustained, hours, tolerance))
      out.push({
        index: i,
        km,
        hours,
        allowed: allowedKm(pace.sustained, hours, tolerance),
        level: 'warning',
        declared: pace.declared,
      });
  }
  return out;
}

const round = (n: number, places = 0) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/**
 * The sentence the validator prints for a finding.
 *
 * Which band was broken changes what the author should do about it, so the
 * message says which one it was. Under the 1914 default it offers the way out
 * ADR 0019 found missing: an author whose ships really were faster than 1914's
 * was being told to name a mode that does not exist, when what they needed was
 * `pack.json#pace`. Under the pack's own table that advice would be circular —
 * the number is already theirs — so it points at the number instead.
 */
export function paceMessage(f: PaceFinding, mode: MovementMode): string {
  const leg = `waypoints[${f.index}] covers ${round(f.km)} km in ${round(f.hours, 1)} h (${round(
    (f.km / f.hours) * 24,
  )} km/day)`;
  const band = f.declared ? 'this pack’s declared pace' : 'the default 1914 pace';
  if (f.level === 'warning')
    return `${leg} — faster than ${mode} sustained at ${band} (${round(f.allowed)} km); check the dates and the mode`;
  const fix = f.declared
    ? `Check the dates and the positions, or the number in pack.json#pace.${mode}`
    : `Name the mode that carried it (motor, rail, sea, air), split the transfer into a route of its own, or — if this era’s ${mode} outran 1914’s — declare pack.json#pace.${mode} with the sources for the number`;
  return `${leg} — beyond ${mode} at ${band}, which could not make more than ${round(f.allowed)} km in that time. ${fix}`;
}

/** The sentences the validator prints for a pack's own pace table. */
export const paceBandMessages = {
  inverted: (mode: MovementMode) =>
    `pace.${mode}: sustained must not exceed limit — sustained is the ordinary day, limit is the day nothing beat`,
  aboveCeiling: (mode: MovementMode, bar: keyof Pace, value: number) =>
    `pace.${mode}.${bar} of ${value} km/h is beyond what ${mode} has ever physically done (${PACE_CEILING[mode][bar]} km/h). That is not this era being faster; that is the wrong mode, or a number that would switch the pace check off for this pack`,
  unused: (mode: MovementMode) =>
    `pace.${mode} is declared but no route or track in this pack moves by ${mode}, so the band judges nothing — drop it, or set the mode on the routes it was written for`,
};
