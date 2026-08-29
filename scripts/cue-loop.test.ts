/**
 * `loop: false` is a value, not an absence (`sand-pmz.30`).
 *
 * Section 4 of `scripts/check-content.sh` tested the field with
 * `jq -r '.loop // empty'`. jq's `//` yields its right-hand side for `false`
 * as well as for `null`, so the first cue authored with `"loop": false` would
 * have been rejected for missing the field it had just declared. Every cue in
 * the tree is `loop: true`, which is why nothing caught it and why nothing
 * would catch a regression either — the fixture that proves it cannot live in
 * `content/`, because an unindexed cue fails a different rule.
 *
 * So this pins the two halves: that jq really does behave that way (the test
 * is worthless if the premise is wrong), and that the script asks the
 * presence question rather than the truthiness one.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const jq = (filter: string, json: string) =>
  execFileSync('jq', ['-r', filter], { input: json }).toString().trim();

describe('cue.loop presence (sand-pmz.30)', () => {
  it('is the trap it is claimed to be: jq // swallows false', () => {
    expect(jq('.loop // empty', '{"loop":true}')).toBe('true');
    // The bug, in one line: a declared `false` is indistinguishable from a
    // missing key under `//`.
    expect(jq('.loop // empty', '{"loop":false}')).toBe('');
    expect(jq('.loop // empty', '{}')).toBe('');
  });

  it('has("loop") separates a declared false from a missing key', () => {
    expect(jq('has("loop")', '{"loop":false}')).toBe('true');
    expect(jq('has("loop")', '{}')).toBe('false');
  });

  it('check-content.sh asks the presence question', () => {
    const sh = readFileSync('scripts/check-content.sh', 'utf8');
    const loopLine = sh.split('\n').find((l) => l.includes('missing .loop'));
    expect(loopLine, 'the .loop check disappeared from check-content.sh').toBeDefined();
    expect(
      loopLine,
      'the .loop check is back to a truthiness test, which rejects `loop: false` — ' +
        'see sand-pmz.30; use `jq -e \'has("loop")\'`',
    ).toContain('has("loop")');
  });
});
