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
 * Pure geometry and arithmetic; no filesystem, no schema parsing.
 */
import { haversineKm } from '../../engine/geo.js';
import { waypointConfidence } from '../../engine/confidence.js';
import type { Confidence, MovementMode, Waypoint } from '../schema/index.js';

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

export interface PaceFinding {
  /** Index of the leg's later waypoint, the one the message points at. */
  index: number;
  km: number;
  hours: number;
  /** km allowed over these hours at the bar that was broken. */
  allowed: number;
  level: 'error' | 'warning';
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
 */
export function paceFindings(
  waypoints: Waypoint[],
  mode: MovementMode,
  pathConfidence: Confidence = 'medium',
): PaceFinding[] {
  const pace = MOVEMENT_PACE[mode];
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
      });
    else if (km > allowedKm(pace.sustained, hours, tolerance))
      out.push({
        index: i,
        km,
        hours,
        allowed: allowedKm(pace.sustained, hours, tolerance),
        level: 'warning',
      });
  }
  return out;
}

const round = (n: number, places = 0) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** The sentence the validator prints for a finding. */
export function paceMessage(f: PaceFinding, mode: MovementMode): string {
  const leg = `waypoints[${f.index}] covers ${round(f.km)} km in ${round(f.hours, 1)} h (${round(
    (f.km / f.hours) * 24,
  )} km/day)`;
  return f.level === 'error'
    ? `${leg} — beyond ${mode}, which could not make more than ${round(f.allowed)} km in that time. Name the mode that carried it (motor, rail, sea, air) or split the transfer into a route of its own`
    : `${leg} — faster than ${mode} sustained (${round(f.allowed)} km); check the dates and the mode`;
}
