/**
 * Reading `scripts/warning-budget.json` and sorting warnings into its kinds
 * (`sand-pmz.33`, ADR 0023). Split from the command so the invariants the
 * command cannot state — that no pattern is dead, that no two patterns
 * overlap — can be tested (`scripts/warning-budget.test.ts`).
 *
 * Pure: it takes warnings and gives back rows. Reading `content/` is the
 * caller's business.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Problem } from '../../src/packs/validate/validate.js';

export interface Kind {
  /** Regular expression over the warning's message. */
  match: string;
  /** The ceiling. Raised by hand, in the commit that says why. */
  max: number;
  /** What the count was when `--update` last ran. Never a ceiling. */
  measured: number;
  measuredOn: string;
  /** Why the ceiling is where it is — read in the diff when it moves. */
  why: string;
  $note?: string;
}

export interface Budget {
  $comment: string;
  kinds: Record<string, Kind>;
}

export interface Row extends Kind {
  name: string;
  re: RegExp;
  /** Warnings of this kind in the tree as it stands. */
  found: Problem[];
  now: number;
  head: number;
  over: boolean;
}

export const BUDGET_PATH = fileURLToPath(new URL('../warning-budget.json', import.meta.url));

export function readBudget(path = BUDGET_PATH): Budget {
  return JSON.parse(readFileSync(path, 'utf8')) as Budget;
}

/**
 * Every warning against the kinds, in file order. A warning matching no kind
 * is `unbudgeted` and is a failure on its own: a rule that has never fired
 * before, or a message that was reworded out from under its pattern.
 *
 * First match wins, which only stays honest while the patterns do not
 * overlap — the test holds them to that.
 */
export function classify(
  warnings: readonly Problem[],
  budget: Budget = readBudget(),
): { rows: Row[]; unbudgeted: Problem[] } {
  const rows: Row[] = Object.entries(budget.kinds).map(([name, k]) => ({
    ...k,
    name,
    re: new RegExp(k.match),
    found: [],
    now: 0,
    head: 0,
    over: false,
  }));
  const unbudgeted: Problem[] = [];
  for (const w of warnings) {
    const row = rows.find((r) => r.re.test(w.message));
    if (row) row.found.push(w);
    else unbudgeted.push(w);
  }
  for (const r of rows) {
    r.now = r.found.length;
    r.head = r.max - r.now;
    r.over = r.now > r.max;
  }
  return { rows, unbudgeted };
}
