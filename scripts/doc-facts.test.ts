// @vitest-environment node
/**
 * `scripts/check-doc-facts.sh` has to fail on the states this repository was
 * actually in, or it certifies the bug rather than catching it (`sand-pmz.37`,
 * the standard PR #151 set). Each case below is the real prose, taken from the
 * commit that removed it.
 *
 * The fixture tree carries its own truths — five eras, three scenes, a
 * `verify` of its own — so a sixth era or a new scene moves the repository and
 * not these expectations. One test at the end runs the gate against the real
 * checkout, which is the part that would notice a regression in the derivation
 * itself.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const trees: string[] = [];
afterAll(() => trees.forEach((t) => rmSync(t, { recursive: true, force: true })));

const VERIFY =
  'npm run lint && npm run format:check && npm run typecheck && npm test -- --run && ' +
  'npm run validate:content && npm run warning:budget && npm run build && npm run bundle:budget';

const GATES =
  'lint format:check typecheck test validate:content warning:budget build bundle:budget';

/** A tree with the truths fixed: five eras, three scenes, five CI jobs. */
function tree(docs: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'doc-facts-'));
  trees.push(root);
  const write = (rel: string, body: string) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), body);
  };

  write('package.json', JSON.stringify({ scripts: { verify: VERIFY } }, null, 2));
  for (const era of ['1914-a', '1915-b', '1917-c', '1918-d', '1941-e']) {
    write(`content/eras/${era}/pack.json`, '{}');
  }
  write(
    'scripts/lib/visual-scenes.mjs',
    [
      'export const SCENES = [',
      "  ['opening', '?pack=1914-a'],",
      "  ['gallery', 'gallery.html'],",
      "  ['atlas', ''],",
      '];',
      '',
      'export const VIEWPORTS = [',
      "  ['desktop', { width: 1440, height: 900 }],",
      "  ['phone', { width: 390, height: 844 }],",
      '];',
    ].join('\n'),
  );
  write(
    '.github/workflows/ci.yml',
    [
      'jobs:',
      '  lint:',
      '    name: lint',
      '  security:',
      '    name: security',
      '  web:',
      '    name: web',
      '  visual:',
      '    name: visual',
    ].join('\n'),
  );
  write(
    '.github/workflows/codeql.yml',
    ['jobs:', '  analyze:', '    name: analyze (javascript-typescript)'].join('\n'),
  );

  for (const [path, body] of Object.entries(docs)) write(path, body);
  return root;
}

/** Runs the gate. Returns its output; `ok` is what the exit code said. */
function run(root: string): { ok: boolean; out: string } {
  try {
    return { ok: true, out: execFileSync('bash', ['scripts/check-doc-facts.sh', root]).toString() };
  } catch (e) {
    const err = e as { stdout?: Buffer };
    return { ok: false, out: (err.stdout ?? Buffer.from('')).toString() };
  }
}

describe('a tree whose docs match the code', () => {
  it('passes, and says what it derived', () => {
    const { ok, out } = run(
      tree({
        'README.md': [
          'Five eras are in the app today, walked by three scenes.',
          '',
          '```bash',
          ...GATES.split(' ').map((g) => (g === 'test' ? 'npm test -- --run' : `npm run ${g}`)),
          '```',
          '',
          '- Required checks are `lint`, `security`, `web`, `analyze',
          '  (javascript-typescript)` and `visual`, strict.',
          '- The `web` job is one step, `npm run verify`, which is',
          `  ${GATES.replaceAll(' ', '/')}.`,
        ].join('\n'),
      }),
    );
    expect(out).toContain('5 eras, 3 visual scenes, 8 gates, 5 CI jobs');
    expect(out).not.toContain('✗');
    expect(ok).toBe(true);
  });

  it('leaves prose that states no number alone', () => {
    // How `sand-pmz.28` was actually fixed, and always the cheaper answer.
    const { ok, out } = run(
      tree({
        'CLAUDE.md': 'The gate walks every scene in `scripts/lib/visual-scenes.mjs`.\n',
        'docs/authoring.md': 'The 1941 pack is the first pack to exercise `pack.json#pace`.\n',
      }),
    );
    expect(out).not.toContain('✗');
    expect(ok).toBe(true);
  });

  it('leaves an ADR alone — a decision record is dated, not current', () => {
    // ADR 0021 says "the four eras that existed when it was written"; ADR 0007
    // counts "two scenes" meaning photographs. Both are right and neither is a
    // restatement of the present.
    const { ok } = run(
      tree({
        'docs/decisions/0021-quotation-receipts.md':
          'Across the four eras that existed when it was written…\n',
        'docs/decisions/0007-imagery.md': 'Nineteen commander portraits and two scenes.\n',
      }),
    );
    expect(ok).toBe(true);
  });

  it('leaves a menu of npm scripts alone — it is not the gate list', () => {
    const { ok } = run(
      tree({
        'CLAUDE.md': [
          '```bash',
          'npm run dev',
          'npm run lint',
          'npm run typecheck',
          'npm run build',
          'npm run bundle:budget',
          '```',
        ].join('\n'),
      }),
    );
    expect(ok).toBe(true);
  });

  it('leaves a quoted stale statement alone, across a line wrap', () => {
    // A retrospective is a true sentence about a false one. This is not
    // hypothetical: docs/agent-workflow.md documents this gate by quoting the
    // prose it exists to catch, and tripped it until quotation was exempt.
    const { ok, out } = run(
      tree({
        'docs/agent-workflow.md': [
          'It exists because both agent files said "the first pack is the',
          'Schlieffen Plan", and an ADR is right to say "the four eras that',
          'existed when it was written".',
        ].join('\n'),
      }),
    );
    expect(out).not.toContain('✗');
    expect(ok).toBe(true);
  });

  it('lets an unpaired quote cost one paragraph, not the rest of the file', () => {
    // The failure mode worth more than the false positive: a stray `"` must
    // not silently switch the gate off downstream.
    const { ok, out } = run(
      tree({
        'README.md': ['A stray quote: "', '', 'Four eras are in the app today.'].join('\n'),
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('README.md:3 says "Four eras"');
  });

  it('leaves a paragraph naming one CI job alone', () => {
    // docs/accessibility.md's shape: a passing mention, naming one job and no
    // list. Only two or more is an enumeration.
    const { ok } = run(
      tree({
        'docs/accessibility.md':
          '`small-target` sits in the **blocking** tier, which is the tier the `visual`\ncheck goes red on; `tiny-text` sits in the reported one.\n',
      }),
    );
    expect(ok).toBe(true);
  });

  it('does not read `npm run lint` as a mention of the `lint` job', () => {
    const { ok } = run(
      tree({
        'CONTRIBUTING.md': 'Run `npm run lint` and `npm run build` before you push.\n',
      }),
    );
    expect(ok).toBe(true);
  });
});

describe('the states this repository was actually in', () => {
  it('catches AGENTS.md naming three CI jobs where there were five', () => {
    // Verbatim from the section PR #188 removed. It sat wrong for a week, and
    // nothing in CI read the file at all.
    const { ok, out } = run(
      tree({
        'AGENTS.md': [
          '## CI & branch rules',
          '',
          '- `main` is protected by a ruleset: PR-only, **squash or rebase merges** (no',
          '  merge commits), **linear history required**, force-push and deletion',
          '  blocked, required checks `lint`, `security`, `web` (strict — branch must be',
          '  up to date with `main`).',
        ].join('\n'),
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('AGENTS.md:3 names some of the CI jobs but not');
    expect(out).toContain('`analyze (javascript-typescript)` and `visual`');
  });

  it('catches a half-list of CI jobs in prose, however it is phrased', () => {
    const { ok, out } = run(
      tree({
        'README.md': '`main` requires green `lint`, `security` and `web` checks.\n',
        'CONTRIBUTING.md': 'CI (`lint`, `security`, `web`, CodeQL) must be green.\n',
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('README.md:1 names some of the CI jobs but not');
    expect(out).toContain('CONTRIBUTING.md:1 names some of the CI jobs but not');
    // CodeQL named in prose is not the job name the ruleset holds.
    expect(out).toContain('`analyze (javascript-typescript)` and `visual`');
  });

  it('catches the `web` job described as a list of npm commands', () => {
    // The same section's second half: a gate list that `npm run verify` had
    // replaced, three gates short.
    const { ok, out } = run(
      tree({
        'AGENTS.md': [
          '- CI (`.github/workflows/ci.yml`): `lint` = actionlint + markdownlint +',
          '  `scripts/check-content.sh`; `security` = gitleaks + dependency review; `web` =',
          '  npm lint/typecheck/test/validate:content/build, self-activating once',
          '  `package.json` exists.',
        ].join('\n'),
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('spells the gate list as "lint/typecheck/test/validate:content/build"');
    expect(out).toContain(`verify runs ${GATES}`);
  });

  it('catches a gate list in a fenced block that has lost a gate', () => {
    // README.md's shape when this gate was written: `format:check` missing.
    const { ok, out } = run(
      tree({
        'README.md': [
          '```bash',
          'npm run lint             # ESLint',
          'npm run typecheck        # tsc -b',
          'npm test -- --run        # Vitest, single pass',
          'npm run validate:content',
          'npm run warning:budget',
          'npm run build',
          'npm run bundle:budget',
          '```',
        ].join('\n'),
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('lists the gates as "lint typecheck test');
  });

  it('catches "the first pack is the Schlieffen Plan" with five eras merged', () => {
    const { ok, out } = run(
      tree({
        'CLAUDE.md':
          'The engine is era-agnostic; the first pack is the Schlieffen Plan / 1914 campaign.\n',
        'AGENTS.md': 'The first pack is the Schlieffen Plan / 1914 campaign.\n',
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('CLAUDE.md:1 says "the first pack is…" — content/eras/ holds 5 packs');
    expect(out).toContain('AGENTS.md:1 says "The first pack is…"');
  });

  it('catches the scene count quoted four ways', () => {
    // 25 in CLAUDE.md, twenty in ADR 0011, twenty-four in the script, twenty-two
    // in docs/accessibility.md — against a list holding a fifth number.
    const { ok, out } = run(
      tree({
        'CLAUDE.md': 'npm run visual:check   # 25 scenes x 2 themes x 2 viewports\n',
        'docs/accessibility.md':
          "Checked by `sand-pmz.2`'s harness, which walks twenty-two scenes.\n",
        'docs/design-review.md': 'The review walks twenty scenes.\n',
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('CLAUDE.md:1 says "25 scenes" — there are 3');
    expect(out).toContain('docs/accessibility.md:1 says "twenty-two scenes" — there are 3');
    expect(out).toContain('docs/design-review.md:1 says "twenty scenes" — there are 3');
  });

  it('catches a stale era count in either English or digits', () => {
    const { ok, out } = run(
      tree({
        'README.md': 'Four eras are in the app today:\n',
        'docs/ROADMAP.md': 'There are 4 eras.\n',
      }),
    );
    expect(ok).toBe(false);
    expect(out).toContain('README.md:1 says "Four eras" — there are 5 (content/eras/)');
    expect(out).toContain('docs/ROADMAP.md:1 says "4 eras" — there are 5');
  });
});

describe('the real checkout', () => {
  // The only case that walks the whole repository rather than a fixture tree,
  // so it is the only one that costs seconds — and it runs alongside fifteen
  // others, on a CI runner slower than any laptop. The default 5s timeout it
  // used to inherit was a flake waiting for a busy machine, not a budget.
  it('has no documented fact that has drifted', () => {
    const { ok, out } = run('.');
    expect(out).not.toContain('✗');
    expect(ok).toBe(true);
  }, 60_000);
});
