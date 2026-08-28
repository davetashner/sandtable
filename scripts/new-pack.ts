#!/usr/bin/env tsx
/**
 * Scaffold a new era pack (`sand-shn.20`).
 *
 *   npm run new-pack -- --dir 1942-midway --title "1942: Midway" \
 *     --start 1942-06-03 --end 1942-06-07 --region 170,20,-160,35 \
 *     --border-year 1941 --tiles central-pacific-z10 \
 *     --side 'us=United States|USA|The Allies' \
 *     --side 'jp=Empire of Japan|Japan|The Axis'
 *
 * Three packs were authored in one night and ADR 0019 projects ten more for
 * the Pacific alone. Every author assembles the same skeleton, and every one
 * of them has to be *told* the same six rules in a briefing document. This
 * turns six things an author must remember into six things the tool asks —
 * and, where the answer can be wrong in a way that only shows up months later,
 * six things it refuses:
 *
 *   1. **`idPrefix` is the directory name**, not a bare year (ADR 0019). The
 *      two oldest packs (`1914`, `1915`) are grandfathered counter-examples
 *      and are the reason this is the rule most likely to be got wrong, so
 *      there is no flag for `idPrefix` at all: it *is* `--dir`.
 *   2. **`status` is `seed`** on a first pass, and there is no flag for that
 *      either.
 *   3. **A README recording what was read and what was not**, which is the one
 *      document in a pack that the validator can never check.
 *   4. **`borderYear` against the caveats**, which the tool prints in full for
 *      whatever year is chosen. Several are traps: 1931 is badly wrong for
 *      Russia, 1941 has no Manchukuo and no Republic of China, 1945 is the
 *      post-surrender map.
 *   5. **`tiles` from the closed enum** (ADR 0002), with the manifest's status
 *      shown so the author knows whether the archive is uploaded yet — and a
 *      refusal if the region falls outside the default archive and nothing was
 *      named, because that pack draws its armies over an empty field.
 *   6. **Pace bands only if the era needs them** (ADR 0020), with a note and a
 *      citation that resolves, and **never `march`**.
 *
 * Flags and prompts, both. Flags are the contract — agents author most packs
 * here and a prompt-only tool is useless to them — and anything a flag has not
 * answered is asked for when there is a terminal to ask on. With no terminal
 * (CI, an agent's shell, `--no-input`) a missing answer is an error naming the
 * flag rather than a process that hangs on a read nobody will ever satisfy.
 *
 * The output validates as it stands: `npx tsx scripts/validate-content.ts`
 * over the generated directory reports no errors and no warnings. It is not
 * *finished* — a pack with no beats teaches nothing — and the closing report
 * lists every placeholder it wrote.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { format, resolveConfig } from 'prettier';
import { Pack, TILE_ARCHIVES, DEFAULT_TILE_ARCHIVE } from '../src/packs/schema/index.js';
import { PACE_CEILING } from '../src/packs/validate/pace.js';
import type { TileArchive } from '../src/packs/schema/index.js';

// ------------------------------------------------------------------- facts

/** What the tool knows about the repository it is scaffolding into. */
export interface Facts {
  /** borderYear → the manifest's caveat for it, in full. */
  borderYears: Map<number, string>;
  /** Archive name → how the tiles manifest describes it. */
  tiles: Map<TileArchive, { status: string; bbox: number[]; serves: string }>;
  /** Every `idPrefix` already taken, so a new one cannot collide. */
  usedPrefixes: Set<string>;
  /** Every shared source id, so a pace citation cannot point at nothing. */
  sourceIds: Set<string>;
}

interface BorderManifest {
  entries: { year: number; caveat: string }[];
}
interface TileManifest {
  entries: { name: string; status: string; bbox: number[]; serves: string }[];
}

const readJson = <T>(path: string): T | undefined =>
  existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : undefined;

export function readFacts(root = 'content'): Facts {
  const borders = readJson<BorderManifest>(join(root, 'shared/geo/borders/manifest.json'));
  const tiles = readJson<TileManifest>(join(root, 'shared/geo/tiles/manifest.json'));
  const sources = readJson<{ id: string }[]>(join(root, 'shared/sources/sources.json'));
  const eras = join(root, 'eras');
  const usedPrefixes = new Set<string>();
  if (existsSync(eras)) {
    for (const dir of readdirSync(eras)) {
      const pack = readJson<{ idPrefix?: string }>(join(eras, dir, 'pack.json'));
      if (pack?.idPrefix) usedPrefixes.add(pack.idPrefix);
    }
  }
  return {
    borderYears: new Map((borders?.entries ?? []).map((e) => [e.year, e.caveat])),
    tiles: new Map(
      (tiles?.entries ?? []).map((e) => [
        e.name as TileArchive,
        { status: e.status, bbox: e.bbox, serves: e.serves },
      ]),
    ),
    usedPrefixes,
    sourceIds: new Set((sources ?? []).map((s) => s.id)),
  };
}

// ------------------------------------------------------------ flag parsing

/** A refusal the author can act on: what is wrong, and what to write instead. */
export class PackError extends Error {}

function fail(message: string): never {
  throw new PackError(message);
}

/** `de=German Empire|Germany|Central Powers` → one entry of `pack.sides`. */
export function parseSide(spec: string) {
  const eq = spec.indexOf('=');
  if (eq < 1) fail(`--side ${spec}: write it as <id>=<name>[|<short>[|<alliance>]]`);
  const id = spec.slice(0, eq).trim();
  const [name, short, alliance] = spec
    .slice(eq + 1)
    .split('|')
    .map((s) => s.trim());
  if (!name) fail(`--side ${spec}: the side needs a name`);
  if (short && short.length > 12)
    fail(`--side ${spec}: the short label is a map token and may not exceed 12 characters`);
  return {
    id,
    name,
    ...(short ? { short } : {}),
    ...(alliance ? { alliance } : {}),
  };
}

/**
 * The pace flags, folded into one band per mode.
 *
 * `--pace 'sea=26/46' --pace-note 'sea=…' --pace-source 'sea=source:x|7, 13'`
 *
 * Three flags rather than one because the note and the citation are not
 * decoration: ADR 0020 requires them, for the reason that a pace band is a
 * number about the past and every number about the past cites a source. A band
 * that arrives without either is refused here rather than written out for the
 * validator to reject two commands later.
 */
export function parsePace(
  bands: string[],
  notes: string[],
  sources: string[],
  known: Set<string>,
): Record<string, unknown> | undefined {
  if (!bands.length) return undefined;
  const keyed = (specs: string[], flag: string) => {
    const by = new Map<string, string[]>();
    for (const spec of specs) {
      const eq = spec.indexOf('=');
      if (eq < 1) fail(`${flag} ${spec}: write it as <mode>=<value>`);
      const mode = spec.slice(0, eq).trim();
      by.set(mode, [...(by.get(mode) ?? []), spec.slice(eq + 1).trim()]);
    }
    return by;
  };
  const noteBy = keyed(notes, '--pace-note');
  const sourceBy = keyed(sources, '--pace-source');
  const table: Record<string, unknown> = {};

  for (const spec of bands) {
    const eq = spec.indexOf('=');
    if (eq < 1) fail(`--pace ${spec}: write it as <mode>=<sustained>/<limit>`);
    const mode = spec.slice(0, eq).trim();
    if (mode === 'march')
      fail(
        'ADR 0020: `march` is never declared. A Marine on Betio walks no faster than a\n' +
          'poilu on the Marne, and wanting to raise the band is almost always a date or a\n' +
          "route's `mode` being wrong rather than the band being wrong. Re-read the record.",
      );
    if (!(mode in PACE_CEILING))
      fail(`--pace ${spec}: unknown mode. One of ${Object.keys(PACE_CEILING).join(', ')}.`);
    const [sustained, limit] = spec
      .slice(eq + 1)
      .split('/')
      .map((n) => Number(n.trim()));
    if (!(sustained > 0) || !(limit > 0))
      fail(`--pace ${spec}: sustained and limit are km/h, both positive`);
    if (sustained > limit)
      fail(`--pace ${spec}: sustained (${sustained}) exceeds limit (${limit})`);
    const ceiling = PACE_CEILING[mode as keyof typeof PACE_CEILING];
    if (sustained > ceiling.sustained || limit > ceiling.limit)
      fail(
        `--pace ${spec}: above PACE_CEILING for ${mode} (${ceiling.sustained}/${ceiling.limit} km/h).\n` +
          'That is what the mode has ever physically done, in any era. Past it you have\n' +
          'stopped describing the mode (ADR 0020).',
      );

    const note = noteBy.get(mode)?.[0];
    if (!note)
      fail(
        `--pace ${mode} without --pace-note '${mode}=…'. ADR 0020: say in words what these\n` +
          'are the speeds of — "US fast carrier task force, 25 knots economical to 33 flank".',
      );
    const cites = sourceBy.get(mode) ?? [];
    if (!cites.length)
      fail(
        `--pace ${mode} without --pace-source '${mode}=source:<id>[|<pages>]'. A pace band is a\n` +
          'number about the past and every number about the past cites a source (ADR 0020).',
      );
    table[mode] = {
      sustained,
      limit,
      note,
      sources: cites.map((c) => {
        const [source, pages, cnote] = c.split('|').map((s) => s.trim());
        if (known.size && !known.has(source))
          fail(
            `--pace-source ${mode}=${c}: ${source} is not in content/shared/sources/sources.json.\n` +
              'Add the source first (docs/authoring.md §1) — a citation that resolves to\n' +
              'nothing is worse than none, because it looks checked.',
          );
        return { source, ...(pages ? { pages } : {}), ...(cnote ? { note: cnote } : {}) };
      }),
    };
  }
  return table;
}

/** `170,20,-160,35` → `[west, south, east, north]`. */
export function parseRegion(spec: string): [number, number, number, number] {
  const n = spec.split(',').map((s) => Number(s.trim()));
  if (n.length !== 4 || n.some(Number.isNaN))
    fail(`--region ${spec}: four numbers, west,south,east,north`);
  const [w, s, e, no] = n as [number, number, number, number];
  if (s >= no) fail(`--region ${spec}: south (${s}) must be below north (${no})`);
  return [w, s, e, no];
}

/**
 * A whole day is a whole day: `1942-06-03` means midnight, and an author who
 * wants an hour writes the hour. Anything else is passed through for Zod to
 * judge, so a bad offset is reported by the schema rather than paraphrased.
 */
export function isoInstant(spec: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(spec) ? `${spec}T00:00:00Z` : spec;
}

// -------------------------------------------------------------- generation

const CENTRAL_EUROPE_BBOX = [-1.5, 42, 24, 56];

const inside = (region: number[], bbox: number[]) =>
  region[0] >= bbox[0] && region[1] >= bbox[1] && region[2] <= bbox[2] && region[3] <= bbox[3];

/**
 * A camera the author can live with until they have looked at the map: the
 * centre of the region, at the zoom that just about holds it. Deliberately
 * crude — every existing pack's camera was tuned by eye, and this is a
 * starting point rather than a claim.
 */
export function fitCamera(region: [number, number, number, number]) {
  const [w, s, e, n] = region;
  // A region that crosses the antimeridian is written east-of-west; measure
  // the short way round, which is the way the theatre actually runs.
  const spanLng = e >= w ? e - w : 360 - (w - e);
  const centreLng = e >= w ? (w + e) / 2 : (((w + e + 360) / 2 + 180) % 360) - 180;
  const zoom = Math.max(
    0,
    Math.min(
      12,
      Math.round(
        Math.min(Math.log2(360 / Math.max(spanLng, 0.05)), Math.log2(180 / Math.max(n - s, 0.05))) *
          10,
      ) / 10,
    ),
  );
  return { center: [Number(centreLng.toFixed(2)), Number(((s + n) / 2).toFixed(2))], zoom };
}

export interface PackOptions {
  dir: string;
  title: string;
  subtitle?: string;
  summary?: string;
  start: string;
  end: string;
  region: [number, number, number, number];
  borderYear: number;
  tiles?: TileArchive;
  camera?: { center: number[]; zoom: number };
  sides: ReturnType<typeof parseSide>[];
  pace?: Record<string, unknown>;
  branchSummary?: string;
  bead?: string;
}

export interface Scaffold {
  /** Relative path within the pack directory → file contents. */
  files: Record<string, string>;
  /** What the tool wants the author to know, in the order it wants it read. */
  notes: string[];
  /** Every field it filled in for them, which is every field they must revisit. */
  placeholders: string[];
}

const PLACEHOLDER_SUMMARY =
  'TODO — what this pack covers and what it is for, in a paragraph or two. ' +
  'The summary is the first prose a reader meets and the last thing to write.';

/**
 * The pack directory, as text. Pure: no filesystem, so the tests can generate
 * and validate without writing anything, and so `--dry-run` is the same code
 * path as a real run.
 */
export function scaffold(opts: PackOptions, facts: Facts): Scaffold {
  const prefix = opts.dir;
  const notes: string[] = [];
  const placeholders: string[] = [];

  // 1 — the directory name is the id prefix (ADR 0019).
  if (/^\d{4}$/.test(prefix))
    fail(
      `--dir ${prefix}: a pack directory is <yyyy>-<slug>, and the directory name *is* the\n` +
        'idPrefix (ADR 0019). `1914` and `1915` are grandfathered and are the reason this\n' +
        'is worth saying: 1944 alone holds four Pacific packs, and a bare year runs out.\n' +
        `Try \`--dir ${prefix}-<slug>\`.`,
    );
  if (!/^\d{4}-[a-z0-9]+(-[a-z0-9]+)*$/.test(prefix))
    fail(
      `--dir ${prefix}: a pack directory is <yyyy>-<slug>, lower-case, hyphen-separated —\n` +
        '`1942-midway`, `1944-peleliu`. It becomes the idPrefix every entity in the pack\n' +
        'carries (ADR 0019), so it is also a Slug.',
    );
  if (facts.usedPrefixes.has(prefix))
    fail(`idPrefix "${prefix}" is already taken by another pack; it must be unique.`);

  // 4 — borderYear against the caveats.
  if (!facts.borderYears.has(opts.borderYear))
    fail(
      `--border-year ${opts.borderYear} has no file. The years that do:\n` +
        [...facts.borderYears.keys()].map((y) => `    ${y}`).join('\n') +
        '\n  Adding one is `npm run borders` plus a TARGETS entry (scripts/fetch-borders.ts).',
    );
  notes.push(
    `borderYear ${opts.borderYear} — read this before you trust a frontier:\n` +
      wrap(facts.borderYears.get(opts.borderYear)!, 4),
  );

  // 5 — tiles from the closed enum, with the manifest's status.
  const archive = opts.tiles ?? DEFAULT_TILE_ARCHIVE;
  if (opts.tiles && !TILE_ARCHIVES.includes(opts.tiles))
    fail(
      `--tiles ${opts.tiles} is not an archive. The list is closed (ADR 0002) because a name\n` +
        'that is not on it is a typo rather than a deployment we have not done yet:\n' +
        TILE_ARCHIVES.map((t) => `    ${t}`).join('\n'),
    );
  if (!opts.tiles && !inside(opts.region, CENTRAL_EUROPE_BBOX)) {
    const covering = [...facts.tiles.entries()]
      .filter(([, t]) => inside(opts.region, t.bbox))
      .map(([name]) => name);
    fail(
      'this region is outside the default archive, so `--tiles` is not optional.\n' +
        `  Omitting it gives ${DEFAULT_TILE_ARCHIVE} (${CENTRAL_EUROPE_BBOX.join(', ')}), and a pack\n` +
        '  outside that box draws its borders and its armies over an empty field — which is\n' +
        '  not a map with a mistake in it, it is a mistake that looks like a map.\n' +
        (covering.length
          ? `  Archives whose bbox contains this region: ${covering.join(', ')}.`
          : '  No archive contains this region; the widest is world-z6, or extract a new one\n' +
            '  with scripts/tiles-extract.sh and add it to ADR 0002 and the tiles enum.'),
    );
  }
  const tileEntry = facts.tiles.get(archive);
  if (tileEntry)
    notes.push(
      `tiles ${archive} — status "${tileEntry.status}".\n` +
        wrap(sentence(tileEntry.serves), 4) +
        (tileEntry.status !== 'uploaded'
          ? '\n    Naming it is still right: the map will say the basemap is not on the table\n' +
            '    yet, over the borders and the movement, until sand-lry.17 uploads it.'
          : ''),
    );
  if (!inside(opts.region, tileEntry?.bbox ?? CENTRAL_EUROPE_BBOX))
    notes.push(
      `the region reaches outside ${archive} (${(tileEntry?.bbox ?? CENTRAL_EUROPE_BBOX).join(', ')}).\n` +
        '    Part of the map will have no basemap under it. A zoom-in may want a different\n' +
        "    archive from its campaign: `tiles` on a battle applies while that battle's\n" +
        '    zoom-in is open, and only then.',
    );
  if (opts.region[0] > opts.region[2])
    notes.push(
      'this region crosses the antimeridian, which `fitRegion` cannot frame: it takes the\n' +
        '    minimum and maximum of the corners and fits the complement of the Pacific.\n' +
        '    1941-pearl-harbor writes the region as a full longitude band and lets the camera\n' +
        '    and the chapters do the framing. Coordinates and the pace check are unaffected.',
    );

  const summary = opts.summary ?? PLACEHOLDER_SUMMARY;
  if (!opts.summary) placeholders.push('pack.json#summary');
  const branchSummary = opts.branchSummary ?? 'TODO — what happened, in two or three sentences.';
  if (!opts.branchSummary) placeholders.push(`pack.json#branches[0].summary`);
  const camera = opts.camera ?? fitCamera(opts.region);
  if (!opts.camera) placeholders.push('pack.json#camera (fitted to the region; tune it by eye)');

  const pack = {
    id: `${prefix}:pack`,
    idPrefix: prefix,
    title: opts.title,
    ...(opts.subtitle ? { subtitle: opts.subtitle } : {}),
    summary,
    timeRange: { start: isoInstant(opts.start), end: isoInstant(opts.end) },
    region: opts.region,
    borderYear: opts.borderYear,
    ...(opts.tiles ? { tiles: opts.tiles } : {}),
    camera,
    sides: opts.sides,
    branches: [
      {
        id: `${prefix}:historical`,
        title: 'What happened',
        kind: 'historical',
        summary: branchSummary,
      },
    ],
    defaultBranch: `${prefix}:historical`,
    // 2 — a first pass is a seed, and there is no flag to say otherwise.
    status: 'seed',
    ...(opts.pace ? { pace: opts.pace } : {}),
  };

  // The schema is the arbiter, here as everywhere: whatever the flags said,
  // what lands on disk has already been through the same Zod definitions the
  // validator and the browser use.
  const parsed = Pack.safeParse(pack);
  if (!parsed.success)
    fail(
      'the pack these flags describe does not satisfy the schema:\n' +
        parsed.error.issues
          .map((i) => `    ${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('\n'),
    );
  if (new Date(pack.timeRange.start) >= new Date(pack.timeRange.end))
    fail(`--start ${pack.timeRange.start} is not before --end ${pack.timeRange.end}`);

  return {
    files: {
      'pack.json': JSON.stringify(pack, null, 2) + '\n',
      'README.md': readme(opts, prefix, archive, facts),
    },
    notes,
    placeholders,
  };
}

/**
 * Run the scaffold through Prettier before it lands.
 *
 * `content/eras/**` is not in `.prettierignore`, so a generated file that is
 * merely valid still turns `npm run format:check` red — which would make the
 * author's first act after using the tool be to undo its output. Formatting
 * here means the pack is committable as generated.
 */
export async function formatScaffold(
  files: Record<string, string>,
  target: string,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [name, body] of Object.entries(files)) {
    const filepath = join(target, name);
    const config = (await resolveConfig(filepath)) ?? {};
    out[name] = await format(body, { ...config, filepath });
  }
  return out;
}

/** The manifest writes `serves` as a fragment; here it starts a sentence. */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const wrap = (text: string, indent: number, width = 76): string => {
  const pad = ' '.repeat(indent);
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > width - indent) {
      lines.push(pad + line);
      line = word;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(pad + line);
  return lines.join('\n');
};

/**
 * The README stub (rule 3).
 *
 * Modelled on the two written on 2026-08-28 — `1917-russian-revolution` and
 * `1941-pearl-harbor` — which are the pattern this project wants: what the
 * pack argues, what was read in full and what was only catalogued, what is
 * deliberately absent, and which engine limits the pack ran into. The headings
 * are the questions; the answers are the author's.
 *
 * It carries prompts rather than prose because the one thing this file must
 * never do is put words in the author's mouth about their sourcing. That is
 * the failure this repository is least able to survive, and a README that
 * arrived pre-filled with a confident-sounding sourcing section would be a way
 * to commit it by accident.
 */
function readme(opts: PackOptions, prefix: string, archive: string, facts: Facts): string {
  const caveat = facts.borderYears.get(opts.borderYear) ?? '';
  const tile = facts.tiles.get(archive as TileArchive);
  const paceModes = Object.keys(opts.pace ?? {});
  return `# ${opts.title}

\`content/eras/${prefix}/\` · \`idPrefix: "${prefix}"\` · \`status: "seed"\` · bead \`${opts.bead ?? 'TODO'}\`

TODO — one paragraph: what this pack covers, between which two dates, and why
those two. The citation standard is [\`docs/sources.md\`](../../../docs/sources.md).

## The argument

TODO — what the pack is *for*. Not a summary of the events: the thing a reader
should be able to see by the end that they could not see before. 1941 has two
clocks; 1917 has a calendar thirteen days behind. Write yours here, and let the
beats serve it.

## What is in it

TODO — beats, chapters, documents, historiography cards, vignettes, tracks.
Also what makes this pack structurally unlike the others, if anything does.

## Geography

\`borderYear: ${opts.borderYear}\`. The manifest's caveat for that year — a statement
about what this map is wrong about, not a disclaimer:

> ${caveat.replace(/\n/g, '\n> ')}

TODO — say whether that matters for this pack, and what you are doing about
the parts of it that do.

\`tiles: ${opts.tiles ?? `(omitted — the ${archive} default)`}\`${
    tile ? ` — status \`${tile.status}\`. ${sentence(tile.serves)}` : ''
  }${
    tile && tile.status !== 'uploaded'
      ? '\nThe extract is authored and not yet in the bucket (`sand-lry.17`), so the map\nrenders on the borders layer alone until it is.'
      : ''
  }

## Pace bands (ADR 0020)

${
  paceModes.length
    ? `Declared: ${paceModes.map((m) => `\`${m}\``).join(', ')}. TODO — say where each number
comes from, and prefer a document this pack has actually read over an equipment
specification. Every mode not declared keeps the 1914 default, and \`march\` is
never declared.`
    : `None declared: the 1914 defaults hold for every mode, which for most eras is
right. Declare a band only when this pack's technology genuinely outran 1914's,
with a note and a citation, and never \`march\` — if you find yourself wanting to
raise \`march\`, the problem is almost always a date or a route's \`mode\`.`
}

## Sourcing — what was read, and what was not

**This section is the one thing in the pack no gate can check, and it is the
reason the file exists.** The validator checks that a citation *resolves*, not
that the work says what you claim; a fabricated quotation carrying a
correct-looking citation is worse than no quotation, because the citation makes
it look checked.

Read in full from this environment, and quoted:

- TODO

Read as transcriptions or without page numbers, and why:

- TODO

**Not opened at all**, cited for what the work is about, with nothing quoted
from it:

- TODO

TODO — and say explicitly what was verified against the work itself as against
a catalogue record. Catalogue records are frequently wrong.

## What is deliberately absent

TODO — a thinner, honestly-sourced pack beats a fuller one with invented
detail. Casualties, vignettes, tours, imagery, counterfactual branches: say
which are missing and whether that is scope or evidence.

## Known engine limits this pack ran into

TODO — or delete this section. Each one is worth a bead.

## Contested points

TODO — which points are historiography cards (ADR 0017), which are prose in a
beat because their works could not be opened, and which are recorded in
\`docs/historiography-${prefix.slice(0, 4)}.md\`.
`;
}

// --------------------------------------------------------------------- cli

const USAGE = `npm run new-pack -- --dir <yyyy-slug> [options]

  --dir <yyyy-slug>       the pack directory, which *is* the idPrefix (ADR 0019)
  --title <text>          "1942: Midway"
  --subtitle <text>
  --summary <markdown>    the pack's opening prose; a placeholder otherwise
  --start <date|instant>  1942-06-03, or an ISO instant with an offset
  --end <date|instant>
  --region w,s,e,n        the pack's extent, degrees
  --border-year <year>    one of content/shared/geo/borders; the caveat is printed
  --tiles <archive>       one of the closed enum (ADR 0002); required outside
                          the ${DEFAULT_TILE_ARCHIVE} box
  --camera lng,lat[,zoom] defaults to the region's centre, fitted
  --side <id>=<name>[|<short>[|<alliance>]]      repeatable, at least one
  --pace <mode>=<sustained>/<limit>              repeatable; never march
  --pace-note <mode>=<text>                      required with --pace
  --pace-source <mode>=source:<id>[|<pages>]     required with --pace
  --branch-summary <text> the historical branch's summary
  --bead <id>             recorded in the README header
  --root <dir>            content root (default: content)
  --no-input              never prompt; a missing answer is an error
  --dry-run               print what would be written, write nothing
  --help

Everything not given on the command line is asked for, when there is a terminal
to ask on. \`status\` is always "seed" and \`idPrefix\` is always --dir; neither has
a flag, on purpose.`;

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      dir: { type: 'string' },
      title: { type: 'string' },
      subtitle: { type: 'string' },
      summary: { type: 'string' },
      start: { type: 'string' },
      end: { type: 'string' },
      region: { type: 'string' },
      'border-year': { type: 'string' },
      tiles: { type: 'string' },
      camera: { type: 'string' },
      side: { type: 'string', multiple: true },
      pace: { type: 'string', multiple: true },
      'pace-note': { type: 'string', multiple: true },
      'pace-source': { type: 'string', multiple: true },
      'branch-summary': { type: 'string' },
      bead: { type: 'string' },
      root: { type: 'string' },
      'no-input': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }

  const root = values.root ?? 'content';
  const facts = readFacts(root);
  if (!facts.borderYears.size)
    fail(`${root}/shared/geo/borders/manifest.json is missing — is --root a content directory?`);

  const interactive = !values['no-input'] && process.stdin.isTTY && process.stdout.isTTY;
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;
  /** A flag, or a prompt, or an error naming the flag — in that order. */
  const need = async (flag: string, given: string | undefined, question: string, hint?: string) => {
    if (given) return given;
    if (!rl) fail(`--${flag} is required (no terminal to ask on).\n\n${USAGE}`);
    if (hint) console.log(`\n  ${hint}`);
    const answer = (await rl.question(`  ${question} `)).trim();
    return answer || fail(`--${flag} is required.`);
  };

  try {
    const dir = await need(
      'dir',
      values.dir ?? positionals[0],
      'pack directory (<yyyy>-<slug>):',
      'It is also the idPrefix every entity in the pack will carry (ADR 0019).\n' +
        '  `1914` and `1915` are grandfathered; a new pack is never a bare year.',
    );
    const title = await need('title', values.title, 'title ("1942: Midway"):');
    const start = await need('start', values.start, 'first day (YYYY-MM-DD):');
    const end = await need('end', values.end, 'last day (YYYY-MM-DD):');
    const region = parseRegion(
      await need('region', values.region, 'region as west,south,east,north:'),
    );
    const borderYear = Number(
      await need(
        'border-year',
        values['border-year'],
        `borderYear (${[...facts.borderYears.keys()].join(' ')}):`,
        'Several are traps. The caveat for whichever you pick is printed below,\n' +
          '  and content/shared/geo/borders/README.md has the rest.',
      ),
    );
    const tiles = (values.tiles ??
      (interactive && !inside(region, CENTRAL_EUROPE_BBOX)
        ? await need(
            'tiles',
            undefined,
            `tiles (${TILE_ARCHIVES.join(' ')}):`,
            'This region is outside the default archive, so the pack must name one.',
          )
        : undefined)) as TileArchive | undefined;
    const sideSpecs =
      values.side ??
      (
        await need(
          'side',
          undefined,
          'sides, comma-separated (id=Name|Short|Alliance):',
          'At least one. The alliance drives the colour family.',
        )
      ).split(',');
    const camera = values.camera
      ? (() => {
          const [lng, lat, zoom] = values.camera.split(',').map((n) => Number(n.trim()));
          return { center: [lng, lat], zoom: Number.isNaN(zoom) ? fitCamera(region).zoom : zoom };
        })()
      : undefined;

    const target = join(root, 'eras', dir);
    if (existsSync(target)) fail(`${target} already exists.`);

    const built = scaffold(
      {
        dir,
        title,
        ...(values.subtitle ? { subtitle: values.subtitle } : {}),
        ...(values.summary ? { summary: values.summary } : {}),
        start,
        end,
        region,
        borderYear,
        ...(tiles ? { tiles } : {}),
        ...(camera ? { camera } : {}),
        sides: sideSpecs.map((s) => parseSide(s.trim())),
        ...(values['branch-summary'] ? { branchSummary: values['branch-summary'] } : {}),
        ...(values.bead ? { bead: values.bead } : {}),
        pace: parsePace(
          values.pace ?? [],
          values['pace-note'] ?? [],
          values['pace-source'] ?? [],
          facts.sourceIds,
        ),
      },
      facts,
    );

    const files = await formatScaffold(built.files, target);
    if (!values['dry-run']) {
      mkdirSync(target, { recursive: true });
      for (const [name, body] of Object.entries(files)) writeFileSync(join(target, name), body);
    }

    console.log(
      `\n${values['dry-run'] ? 'would write' : 'wrote'} ${target}/\n` +
        Object.keys(files)
          .map((f) => `    ${f}`)
          .join('\n'),
    );
    for (const note of built.notes) console.log(`\n  ! ${note}`);
    if (built.placeholders.length)
      console.log(
        '\n  Placeholders, all of them yours to replace:\n' +
          built.placeholders.map((p) => `    ${p}`).join('\n') +
          '\n    README.md — every TODO, and the sourcing section above all',
      );
    console.log(
      '\n  Next: formations → routes → events → beats, validating as you go\n' +
        '  (docs/authoring.md). `npx tsx scripts/validate-content.ts` passes on this\n' +
        '  directory as it stands, which is not the same as the pack being finished.\n',
    );
  } finally {
    rl?.close();
  }
}

// The tests import this module for its pure half and must not run the CLI.
if (process.argv[1] && /new-pack\.ts$/.test(process.argv[1])) {
  main().catch((e: unknown) => {
    console.error(e instanceof PackError ? `\n  ✗ ${e.message}\n` : e);
    process.exit(1);
  });
}
