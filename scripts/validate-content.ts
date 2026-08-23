#!/usr/bin/env tsx
/**
 * Validate every scenario pack, shared registry and thread under content/.
 *
 *   npm run validate:content                 # errors exit 1; warnings counted
 *   npx tsx scripts/validate-content.ts [content-dir] [--warnings] [--json] [--quiet]
 *
 * Reads the filesystem (scripts/lib/read-content.ts) and hands the tree to
 * the pure validator in src/packs/validate. Rules: docs/content-model.md.
 */
import { readContent } from './lib/read-content.js';
import { validateContent, type Problem } from '../src/packs/validate/validate.js';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const root = args.find((a) => !a.startsWith('--')) ?? 'content';

const { content, problems } = readContent(root);
const report = validateContent(content);
const errors = [...problems, ...report.errors];
const ok = errors.length === 0;
const PLURALS: Record<string, string> = {
  branch: 'branches',
  person: 'people',
  media: 'media',
  casualties: 'casualty records',
  supply: 'supply lines',
  tally: 'tallies',
};
const plural = (n: number, w: string) => `${n} ${n === 1 ? w : (PLURALS[w] ?? `${w}s`)}`;

if (flags.has('--json')) {
  console.log(
    JSON.stringify({ ok, errors, warnings: report.warnings, counts: report.counts }, null, 2),
  );
} else {
  const fmt = (p: Problem) =>
    `  ${p.level === 'error' ? '✗' : '!'} ${p.path}${p.id ? ` [${p.id}]` : ''}: ${p.message}`;
  if (!flags.has('--quiet')) {
    const summary = Object.entries(report.counts)
      .sort()
      .map(([k, v]) => plural(v, k))
      .join(', ');
    console.log(`content: ${plural(content.packs.length, 'pack')} — ${summary || 'no entities'}`);
  }
  if (flags.has('--warnings')) for (const w of report.warnings) console.log(fmt(w));
  for (const e of errors) console.log(fmt(e));
  const warn = report.warnings.length
    ? `${plural(report.warnings.length, 'warning')}${flags.has('--warnings') ? '' : ' — list with --warnings'}`
    : 'no warnings';
  console.log(
    ok ? `content valid (${warn})` : `content INVALID: ${plural(errors.length, 'error')}; ${warn}`,
  );
}
process.exit(ok ? 0 : 1);
