// @vitest-environment node
/**
 * The invariants `npm run warning:budget` cannot state about itself
 * (`sand-pmz.33`, ADR 0023).
 *
 * The gate counts warnings against the ceilings in
 * `scripts/warning-budget.json`. What it cannot notice is a ceiling that has
 * stopped meaning anything: a `match` that no longer matches counts zero and
 * passes, which is precisely the failure the file was written for, one level
 * up. So the pattern set is held to three things here — every pattern earns
 * its place, no two patterns claim the same warning, and no ceiling has been
 * left below the count it was recorded against.
 */
import { describe, expect, it } from 'vitest';
import { classify, readBudget } from './lib/warning-budget.js';
import { readContent } from './lib/read-content.js';
import { validateContent } from '../src/packs/validate/validate.js';

const budget = readBudget();
const kinds = Object.entries(budget.kinds);
const warnings = validateContent(readContent('content').content).warnings;

describe('warning-budget.json', () => {
  it.each(kinds)('%s carries a ceiling, a measurement and a reason', (_name, k) => {
    expect(Number.isInteger(k.max)).toBe(true);
    expect(k.max).toBeGreaterThanOrEqual(0);
    expect(k.measured).toBeLessThanOrEqual(k.max);
    expect(k.measuredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Long enough to be a reason rather than a label. Every ceiling that moves
    // is reviewed by reading this sentence in the diff.
    expect(k.why.length).toBeGreaterThan(80);
  });

  it.each(kinds)('%s still matches a warning in content/ — a dead pattern counts zero', (name) => {
    const { rows } = classify(warnings, budget);
    const row = rows.find((r) => r.name === name)!;
    expect(row.now).toBeGreaterThan(0);
  });

  it('no two kinds claim the same warning', () => {
    const overlaps = warnings
      .map((w) => ({
        message: w.message,
        matched: kinds.filter(([, k]) => new RegExp(k.match).test(w.message)).map(([n]) => n),
      }))
      .filter((m) => m.matched.length > 1);
    expect(overlaps).toEqual([]);
  });

  it('classifies every warning the validator produces', () => {
    // The same thing the gate fails on, asserted here so `npm test` says it
    // too: an unbudgeted warning is a new rule or a reworded message, and
    // either wants a person.
    const { unbudgeted } = classify(warnings, budget);
    expect(unbudgeted.map((w) => `${w.path}: ${w.message}`)).toEqual([]);
  });
});
