/**
 * The human scale (sand-1l0.24): which first-person vignettes a beat shows at
 * an instant, and what the casualty records add up to "so far" — a restrained
 * sum per side, carried as a range with the weakest confidence, never a score.
 * Pure and era-agnostic.
 */
import type {
  CasualtyCategory,
  CasualtyFigure,
  CasualtyRecord,
  Confidence,
  NarrativeBeat,
  Vignette,
} from '../packs/schema/index.js';

/** Vignettes that belong to `beat`, are visible on `branchId`, and whose moment the clock has passed. */
export function vignettesFor(
  vignettes: Vignette[],
  beat: Pick<NarrativeBeat, 'from' | 'to'> | undefined,
  now: number,
  branchId: string,
): Vignette[] {
  if (!beat) return [];
  const from = Date.parse(beat.from);
  const to = Date.parse(beat.to);
  return vignettes
    .filter((v) => !v.branch || v.branch === branchId)
    .filter((v) => {
      const at = Date.parse(v.at);
      return at >= from && at < to && at <= now;
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export interface Estimate {
  low: number;
  high: number;
  /** Point estimate: the value, or the middle of the range. */
  mid: number;
}

/** A figure as a range: a point value is a zero-width range. */
export function estimate(f: Pick<CasualtyFigure, 'value' | 'low' | 'high'>): Estimate {
  if (f.low !== undefined && f.high !== undefined) {
    const mid = f.value ?? Math.round((f.low + f.high) / 2);
    return { low: f.low, high: f.high, mid };
  }
  const v = f.value ?? 0;
  return { low: v, high: v, mid: v };
}

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2, contested: 3 };

/** The weaker of two confidences (contested < low < medium < high). */
export function weakest(a: Confidence | undefined, b: Confidence): Confidence {
  if (!a) return b;
  return CONFIDENCE_RANK[b] > CONFIDENCE_RANK[a] ? b : a;
}

export interface SideTotal {
  side: string;
  category: CasualtyCategory;
  estimate: Estimate;
  confidence: Confidence;
  /** Records that contributed. */
  records: string[];
}

/** Records whose period has fully elapsed by `now`, in order of their end. */
export function recordsToDate(records: CasualtyRecord[], now: number): CasualtyRecord[] {
  return records
    .filter((r) => Date.parse(r.timeRange.end) <= now)
    .sort((a, b) => Date.parse(a.timeRange.end) - Date.parse(b.timeRange.end));
}

/**
 * Sum the figures of `records` per side and category. Figures are only added
 * within a category (killed with killed, casualties with casualties), so a
 * record that gives a total and another that gives only the dead never mix.
 */
export function totals(records: CasualtyRecord[]): SideTotal[] {
  const acc = new Map<string, SideTotal>();
  for (const r of records) {
    for (const f of r.figures) {
      const key = `${f.side}|${f.category}`;
      const e = estimate(f);
      const cur = acc.get(key);
      if (cur) {
        cur.estimate = {
          low: cur.estimate.low + e.low,
          high: cur.estimate.high + e.high,
          mid: cur.estimate.mid + e.mid,
        };
        cur.confidence = weakest(cur.confidence, f.confidence);
        if (!cur.records.includes(r.id)) cur.records.push(r.id);
      } else {
        acc.set(key, {
          side: f.side,
          category: f.category,
          estimate: e,
          confidence: f.confidence,
          records: [r.id],
        });
      }
    }
  }
  return [...acc.values()];
}

/** "27,000" / "about 250,000" / "75,000–80,000". */
export function formatEstimate(e: Estimate, locale = 'en-GB'): string {
  const fmt = (n: number) => n.toLocaleString(locale);
  if (e.low === e.high) return fmt(e.mid);
  return `${fmt(e.low)}–${fmt(e.high)}`;
}

export const CATEGORY_LABEL: Record<CasualtyCategory, string> = {
  killed: 'killed',
  wounded: 'wounded',
  missing: 'missing',
  prisoners: 'taken prisoner',
  casualties: 'killed, wounded and missing',
};
