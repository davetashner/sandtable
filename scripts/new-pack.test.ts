// @vitest-environment node
/**
 * `npm run new-pack` must emit a pack that validates as it stands, and must
 * refuse the six things the tool exists to stop an author getting wrong
 * (`sand-shn.20`).
 *
 * The generated pack goes into a temp directory, never into `content/` — a
 * scaffold is not an era, and a test that left one behind would ship it.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  fitCamera,
  formatScaffold,
  parsePace,
  parseSide,
  readFacts,
  scaffold,
  type Facts,
  type PackOptions,
} from './new-pack.js';
import { validateContent } from '../src/packs/validate/validate.js';
import { readContent } from './lib/read-content.js';

/** The real manifests: the caveats and the archive statuses are the point. */
const REAL = readFacts('content');

const facts = (over: Partial<Facts> = {}): Facts => ({ ...REAL, ...over });

const PACIFIC: PackOptions = {
  dir: '1942-midway',
  title: '1942: Midway',
  start: '1942-06-03',
  end: '1942-06-07',
  region: [170, 20, -160, 35],
  borderYear: 1941,
  tiles: 'central-pacific-z10',
  sides: [
    { id: 'us', name: 'United States' },
    { id: 'jp', name: 'Empire of Japan' },
  ],
};

const temps: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'sandtable-new-pack-'));
  temps.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe('the generated pack', () => {
  it('validates with no errors and no warnings, in a content tree of its own', async () => {
    const root = temp();
    const target = join(root, 'eras', PACIFIC.dir);
    mkdirSync(target, { recursive: true });
    const files = await formatScaffold(scaffold(PACIFIC, facts()).files, target);
    for (const [name, body] of Object.entries(files)) writeFileSync(join(target, name), body);

    const { content, problems } = readContent(root);
    const report = validateContent(content);
    expect([...problems, ...report.errors]).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(content.packs).toHaveLength(1);
  });

  it('is a seed whose idPrefix is the directory name (ADR 0019)', () => {
    const pack = JSON.parse(scaffold(PACIFIC, facts()).files['pack.json']);
    expect(pack.idPrefix).toBe('1942-midway');
    expect(pack.id).toBe('1942-midway:pack');
    expect(pack.status).toBe('seed');
    expect(pack.branches).toHaveLength(1);
    expect(pack.defaultBranch).toBe(pack.branches[0].id);
  });

  it('is Prettier-clean, so the author does not have to reformat what it wrote', async () => {
    const target = join(temp(), 'eras', PACIFIC.dir);
    const once = await formatScaffold(scaffold(PACIFIC, facts()).files, target);
    expect(await formatScaffold(once, target)).toEqual(once);
  });

  it("puts the border year's caveat in front of the author, and in the README", () => {
    const built = scaffold(PACIFIC, facts());
    expect(built.notes.join('\n')).toMatch(/Manchukuo is not drawn/);
    expect(built.files['README.md']).toMatch(/Manchukuo is not drawn/);
  });

  it("names the tile archive's status, so uploaded-or-not is not a surprise", () => {
    const built = scaffold(PACIFIC, facts());
    expect(built.notes.join('\n')).toMatch(/tiles central-pacific-z10 — status "planned"/);
    expect(built.files['README.md']).toMatch(/status `planned`/);
  });

  it('lists every placeholder it filled in', () => {
    const built = scaffold(PACIFIC, facts());
    expect(built.placeholders).toContain('pack.json#summary');
    expect(built.files['pack.json']).toContain('TODO');
  });

  it('warns that a region across the antimeridian cannot be framed', () => {
    expect(scaffold(PACIFIC, facts()).notes.join('\n')).toMatch(/antimeridian/);
  });
});

describe('what it refuses', () => {
  it('a bare year, which is the rule the two oldest packs are counter-examples to', () => {
    expect(() => scaffold({ ...PACIFIC, dir: '1942' }, facts())).toThrow(/ADR 0019/);
  });

  it('a directory name that is not a slug', () => {
    expect(() => scaffold({ ...PACIFIC, dir: '1942_Midway' }, facts())).toThrow(/<yyyy>-<slug>/);
  });

  it('an idPrefix another pack has already taken', () => {
    expect(() =>
      scaffold(
        { ...PACIFIC, dir: '1942-midway' },
        facts({ usedPrefixes: new Set(['1942-midway']) }),
      ),
    ).toThrow(/already taken/);
  });

  it('a borderYear with no file, and says which years have one', () => {
    expect(() => scaffold({ ...PACIFIC, borderYear: 1943 }, facts())).toThrow(/1941/);
  });

  it('a region outside the default archive with no --tiles, and suggests one', () => {
    const { tiles, ...rest } = PACIFIC;
    expect(tiles).toBeDefined();
    expect(() => scaffold(rest, facts())).toThrow(/`--tiles` is not optional/);
    // The Philippines box is inside one archive and named as the way out.
    expect(() =>
      scaffold({ ...rest, region: [117, 5, 127, 19], borderYear: 1941 }, facts()),
    ).toThrow(/philippines-z10/);
  });

  it('a tile archive that is not on the closed list (ADR 0002)', () => {
    expect(() =>
      scaffold({ ...PACIFIC, tiles: 'midway-z12' as PackOptions['tiles'] }, facts()),
    ).toThrow(/list is closed/);
  });

  it('an end that does not follow its start', () => {
    expect(() => scaffold({ ...PACIFIC, start: '1942-06-07', end: '1942-06-03' }, facts())).toThrow(
      /not before/,
    );
  });

  it('a side label too long to be a map token', () => {
    expect(() => parseSide('us=United States|United States Navy')).toThrow(/12 characters/);
  });
});

describe('pace bands (ADR 0020)', () => {
  const known = new Set(['source:morison-1949']);

  it('are absent unless asked for, because the 1914 defaults are usually right', () => {
    expect(parsePace([], [], [], known)).toBeUndefined();
    expect(scaffold(PACIFIC, facts()).files['README.md']).toMatch(/None declared/);
  });

  it('are refused for march, whatever the numbers', () => {
    expect(() =>
      parsePace(['march=2/3'], ['march=x'], ['march=source:morison-1949'], known),
    ).toThrow(/`march` is never declared/);
  });

  it('are refused without a note', () => {
    expect(() => parsePace(['sea=46/61'], [], ['sea=source:morison-1949'], known)).toThrow(
      /--pace-note/,
    );
  });

  it('are refused without a citation', () => {
    expect(() => parsePace(['sea=46/61'], ['sea=fast carriers'], [], known)).toThrow(
      /--pace-source/,
    );
  });

  it('are refused when the citation resolves to nothing', () => {
    expect(() =>
      parsePace(['sea=46/61'], ['sea=fast carriers'], ['sea=source:invented-1999'], known),
    ).toThrow(/is not in content\/shared\/sources/);
  });

  it('are refused above PACE_CEILING, where the mode stops being the mode', () => {
    expect(() =>
      parsePace(['sea=200/300'], ['sea=fast carriers'], ['sea=source:morison-1949'], known),
    ).toThrow(/PACE_CEILING/);
  });

  it('carry the note and the pages through to the pack when they are right', () => {
    const table = parsePace(
      ['sea=46/61'],
      ['sea=US fast carrier task force, 25 knots economical to 33 flank.'],
      ['sea=source:morison-1949|iv. 88'],
      known,
    );
    expect(table).toEqual({
      sea: {
        sustained: 46,
        limit: 61,
        note: 'US fast carrier task force, 25 knots economical to 33 flank.',
        sources: [{ source: 'source:morison-1949', pages: 'iv. 88' }],
      },
    });
  });

  it('reach the pack.json and the README when declared', () => {
    const built = scaffold(
      {
        ...PACIFIC,
        pace: parsePace(
          ['sea=46/61'],
          ['sea=US fast carrier task force.'],
          ['sea=source:morison-1949'],
          known,
        ),
      },
      facts(),
    );
    expect(JSON.parse(built.files['pack.json']).pace.sea.sustained).toBe(46);
    expect(built.files['README.md']).toMatch(/Declared: `sea`/);
  });
});

describe('the fitted camera', () => {
  it('centres on the region', () => {
    expect(fitCamera([7, 46, 42, 67]).center).toEqual([24.5, 56.5]);
  });

  it('measures a region across the antimeridian the short way round', () => {
    const { center, zoom } = fitCamera([170, 20, -160, 35]);
    expect(center[0]).toBe(-175);
    // 30° of longitude, not 330: the wide way would zoom out to nearly nothing.
    expect(zoom).toBeGreaterThan(3);
  });
});
