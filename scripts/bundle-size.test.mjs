// @vitest-environment node
/**
 * `dist/` must be able to say whether it still describes the working tree
 * (`sand-pmz.31`), because `npm run bundle:budget` reads it without rebuilding
 * and a number with no date on it is indistinguishable from a current one.
 *
 * Everything here runs against a fake tree with hand-set mtimes: the real
 * `dist/` may or may not exist while the suite runs, and the answer must not
 * depend on that.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { distFreshness, stamp } from './lib/bundle-size.mjs';

const temps = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const seconds = (t) => new Date(t * 1000);

/**
 * A root and a dist, with every file's mtime set explicitly. `at` is seconds
 * since the epoch, so the two sides of the comparison can be ordered without
 * sleeping.
 */
function tree({ srcAt, distAt, extra = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'sandtable-freshness-'));
  temps.push(dir);
  const root = join(dir, 'repo');
  const dist = join(dir, 'dist');
  const write = (path, at) => {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'x');
    utimesSync(path, seconds(at), seconds(at));
  };
  write(join(root, 'src', 'app.ts'), srcAt);
  write(join(root, 'content', 'eras', '1914', 'pack.json'), srcAt);
  write(join(dist, 'index.html'), distAt);
  write(join(dist, 'app', 'main.js'), distAt);
  write(join(dist, 'pack', 'index.json'), distAt);
  for (const [rel, at] of Object.entries(extra)) write(join(root, rel), at);
  return { root, dist };
}

describe('distFreshness', () => {
  it('is fresh when the build ran after the last edit', () => {
    const { root, dist } = tree({ srcAt: 1000, distAt: 2000 });
    expect(distFreshness(dist, root).stale).toBe(false);
  });

  it('is stale when a source moved after the build, and names the file', () => {
    const { root, dist } = tree({ srcAt: 3000, distAt: 2000 });
    const f = distFreshness(dist, root);
    expect(f.stale).toBe(true);
    expect(f.newest.path).toMatch(/^(src|content)\//);
    expect(f.builtAt).toBe(2_000_000);
  });

  it('notices a content pull request, which is the case that sprang the trap', () => {
    const { root, dist } = tree({
      srcAt: 1000,
      distAt: 2000,
      extra: { 'content/eras/1941-pearl-harbor/pack.json': 5000 },
    });
    const f = distFreshness(dist, root);
    expect(f.stale).toBe(true);
    expect(f.newest.path).toBe('content/eras/1941-pearl-harbor/pack.json');
  });

  it('watches the config that decides what the build emits', () => {
    const { root, dist } = tree({ srcAt: 1000, distAt: 2000, extra: { 'vite.config.ts': 9000 } });
    expect(distFreshness(dist, root).newest.path).toBe('vite.config.ts');
  });

  it('ignores test files, which change nothing the bundle contains', () => {
    const { root, dist } = tree({ srcAt: 1000, distAt: 2000, extra: { 'src/app.test.ts': 9000 } });
    expect(distFreshness(dist, root).stale).toBe(false);
  });

  it('ignores dot-directories, so a git operation is not a rebuild', () => {
    const { root, dist } = tree({ srcAt: 1000, distAt: 2000, extra: { 'src/.cache/x': 9000 } });
    expect(distFreshness(dist, root).stale).toBe(false);
  });

  it('compares against the oldest file in dist/, which fails towards refusing', () => {
    const { root, dist } = tree({ srcAt: 1500, distAt: 1000 });
    utimesSync(join(dist, 'app', 'main.js'), seconds(9000), seconds(9000));
    expect(distFreshness(dist, root).stale).toBe(true);
  });

  it('says nothing when there is no dist/ — that is bundleReport’s error to give', () => {
    const { root } = tree({ srcAt: 1000, distAt: 2000 });
    expect(distFreshness(join(root, 'nowhere'), root).stale).toBe(false);
  });
});

describe('stamp', () => {
  it('is a local date and time a human can compare at a glance', () => {
    expect(stamp(Date.UTC(2026, 7, 28, 12, 0, 0))).toMatch(/^2026-08-\d\d \d\d:00:00$/);
  });
});
