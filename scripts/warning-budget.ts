#!/usr/bin/env tsx
/**
 * The content warning ceiling CI holds (`sand-pmz.33`, ADR 0023).
 *
 * `npm run validate:content` reports two things and fails on one of them.
 * Errors fail; warnings are printed, counted, and enforced by nobody. In one
 * night the count went 10 → 20 → 62, and every move was narrated as "all
 * expected" in a pull request description — a claim no tool checked. It did
 * not stay hypothetical: a change to a path regex stopped
 * `REFERENCE_ONLY_SOURCE`'s allowlist matching and turned 62 warnings into
 * 316, every Wikipedia citation in the people and place registries suddenly
 * reading as an operational claim. It was caught by an unrelated constraint on
 * that pull request. Otherwise it merges green.
 *
 * So warnings get the treatment bytes already have (ADR 0016): a stored
 * expectation, a measured value, a delta, and the reason for the number
 * written next to it, in `scripts/warning-budget.json`.
 *
 * It needs no build — content alone is the input, which is why it runs beside
 * `validate:content` rather than after the build the way the byte budget must.
 *
 *   npm run warning:budget
 *   npm run warning:budget -- --update   # rewrite `measured`, never `max`
 *
 * Two things make it a gate rather than a nuisance:
 *
 * **One ceiling per kind, not one total.** 57 of today's 62 warnings are
 * "nothing cites this source" — the designed state of a registry that lands
 * ahead of its packs. A single total would let a new category grow silently
 * under a fall in that one, and that is the shape of every regression worth
 * catching here.
 *
 * **A warning matching no kind fails.** The regression above was a rule that
 * had never fired starting to fire in bulk; a budget listing only the kinds
 * that exist today would have shrugged at it. So unbudgeted is zero, and the
 * fix is one entry with a sentence — the same price the byte ceilings charge.
 *
 * It reads the content tree and runs the same validator `validate:content`
 * runs, rather than parsing that command's output, so the two cannot drift
 * and nothing about what that command reports is changed by this file.
 */
import { writeFileSync } from 'node:fs';
import { BUDGET_PATH, classify, readBudget } from './lib/warning-budget.js';
import { readContent } from './lib/read-content.js';
import { validateContent, type Problem } from '../src/packs/validate/validate.js';

const args = process.argv.slice(2);
const update = args.includes('--update');
const root = args.find((a) => !a.startsWith('--')) ?? 'content';

const budget = readBudget();
const { content, problems } = readContent(root);
const report = validateContent(content);
const errors = [...problems, ...report.errors];
if (errors.length) {
  console.error(
    `content is invalid (${errors.length} ${errors.length === 1 ? 'error' : 'errors'}), so the\n` +
      'warning counts describe a tree that does not load. Run\n' +
      '`npm run validate:content` and fix the errors first.',
  );
  process.exit(2);
}

const { rows, unbudgeted } = classify(report.warnings, budget);

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`;
const fmt = (p: Problem) => `  ! ${p.path}${p.id ? ` [${p.id}]` : ''}: ${p.message}`;
const headroom = (head: number) =>
  head < 0 ? `${-head} over` : `${plural(head, 'warning')} spare`;

console.log('content warning budget\n');
const width = Math.max(...rows.map((r) => r.name.length));
for (const r of rows) {
  const delta = r.now - r.measured;
  console.log(
    `  ${r.over ? '✗' : '✓'} ${r.name.padEnd(width)} ${String(r.now).padStart(5)}` +
      ` / ${String(r.max).padStart(4)}   ` +
      `${delta >= 0 ? '+' : ''}${delta} since ${r.measured} (${headroom(r.head)})`,
  );
}
console.log(
  `\n  ${plural(report.warnings.length, 'warning')} in all, ` +
    (unbudgeted.length
      ? `${unbudgeted.length} of no budgeted kind.`
      : 'every one of a budgeted kind.') +
    '\n  The total is reported and not gated: it is the sum of decisions taken' +
    '\n  separately, and a fall in one kind must not pay for a rise in another.\n',
);

if (update) {
  if (unbudgeted.length) {
    console.error(
      `  ✗ ${plural(unbudgeted.length, 'warning')} match no kind, and --update cannot invent one:\n` +
        '    a kind is a `match`, a `max`, and a sentence saying why that number\n' +
        '    is right. Add it by hand, then run --update to record the count.',
    );
    process.exit(2);
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    budget.kinds[r.name]!.measured = r.now;
    budget.kinds[r.name]!.measuredOn = today;
  }
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2) + '\n');
  console.log('  measured refreshed. The ceilings are untouched — raise one by hand,');
  console.log('  in the same commit as the sentence saying why the new number is right.');
  process.exit(0);
}

const over = rows.filter((r) => r.over);
if (!over.length && !unbudgeted.length) {
  console.log('  ✓ within budget');
  process.exit(0);
}

/** The offending warnings themselves, capped, with the rest tallied by directory. */
function show(list: Problem[], cap = 20) {
  for (const w of list.slice(0, cap)) console.log(`  ${fmt(w)}`);
  if (list.length <= cap) return;
  const byDir = new Map<string, number>();
  for (const w of list.slice(cap)) {
    const dir = w.path.split('/').slice(0, -1).join('/') || '.';
    byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
  }
  console.log(`    …and ${list.length - cap} more, by directory:`);
  for (const [dir, n] of [...byDir].sort((a, b) => b[1] - a[1]))
    console.log(`      ${String(n).padStart(5)}  ${dir}/`);
}

for (const r of over) {
  console.log(
    `\n  ✗ ${r.name} is ${-r.head} over its ceiling of ${r.max} — ${plural(r.now, 'warning')},\n` +
      `    ${r.now - r.measured} more than the ${r.measured} measured on ${r.measuredOn}.\n` +
      `    ${r.why}\n`,
  );
  show(r.found);
  console.log(
    '\n    `npm run validate:content -- --warnings` prints every warning in the\n' +
      '    tree. Either these are a regression, and the fix is the content or the\n' +
      '    rule — or they are not, and the ceiling moves in this commit with a\n' +
      '    sentence saying why the new number is right.',
  );
}

if (unbudgeted.length) {
  const groups = new Map<string, Problem[]>();
  for (const w of unbudgeted) {
    const key = w.message.replace(/\d+([.,]\d+)?/g, 'N').slice(0, 120);
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  console.log(
    `\n  ✗ ${plural(unbudgeted.length, 'warning')} match no kind in scripts/warning-budget.json.\n` +
      '    This is the case that file exists for. Either a rule that has never\n' +
      '    fired has started firing, or a message was reworded and its kind\n' +
      '    stopped matching — and the second is how a whole category goes quiet\n' +
      '    while its ceiling stays green.\n',
  );
  for (const [, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${plural(list.length, 'warning')} like:`);
    show(list, 5);
    console.log('');
  }
  console.log(
    '    If the rule is new, add a kind: a `match`, a `max`, and a sentence\n' +
      '    saying why that number is right. If a message was reworded, update\n' +
      "    that kind's `match` in the same commit as the wording.",
  );
}
process.exit(1);
