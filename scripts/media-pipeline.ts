#!/usr/bin/env tsx
/**
 * Media pipeline (sand-y0u.3, ADR 0007).
 *
 * For every content/shared/media/** /media.json whose image sits beside it
 * (a git-ignored local staging copy), this script:
 *   1. validates the manifest against the Media schema,
 *   2. makes WebP derivatives at several widths (sharp), next to the original
 *      in a git-ignored `.derived/` directory,
 *   3. writes content/shared/media/index.json — the attribution manifest the
 *      app renders: per image the variants, size, caption, credit, licence,
 *      colorized flag and the link to the original (tracked in git),
 *   4. with --upload, syncs originals + derivatives to the assets bucket under
 *      media/ (aws CLI, profile sandtable-deployer), so the app can fetch
 *      /assets/media/<path>.
 *
 *   npm run media                 # derivatives + index.json
 *   npm run media -- --upload     # …and push to the assets bucket
 *   npm run media -- --check      # index.json covers every manifest (CI)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import sharp from 'sharp';
import { Media, type Media as MediaT } from '../src/packs/schema/index.js';

export const MEDIA_ROOT = 'content/shared/media';
export const INDEX_FILE = join(MEDIA_ROOT, 'index.json');
export const DERIVED_DIR = '.derived';
export const WIDTHS = [320, 640, 1024];
const BUCKET = process.env['ASSETS_BUCKET'] ?? 'sandtable-assets-205074708100';
const PROFILE = process.env['AWS_PROFILE'] ?? 'sandtable-deployer';

export interface MediaVariant {
  /** Path under /assets/media/, e.g. people/joffre-joseph/.derived/portrait-colorized.w640.webp */
  src: string;
  width: number;
  height: number;
  type: 'image/webp' | 'image/png' | 'image/jpeg';
}

export interface MediaIndexEntry {
  id: string;
  /** Directory under content/shared/media, e.g. people/joffre-joseph */
  dir: string;
  original: MediaVariant;
  variants: MediaVariant[];
  width: number;
  height: number;
  caption: string;
  credit: string;
  licence: string;
  colorized: boolean;
  /** Where the unaltered original can be seen (archive item page). */
  originalUrl?: string;
  focalPoint?: { x: number; y: number };
  person?: string;
  /** Everyone the manifest identifies, for a photograph of more than one (sand-y0u.18). */
  people?: string[];
  /** True when the binary was present locally when the index was built. */
  present: boolean;
}

export interface MediaIndex {
  generatedAt: string;
  base: string;
  entries: MediaIndexEntry[];
}

function walkManifests(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== DERIVED_DIR) walkManifests(p, out);
    } else if (name === 'media.json') out.push(p);
  }
  return out;
}

const mime = (file: string): MediaVariant['type'] =>
  extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

async function buildOne(manifestPath: string, opts: { derive: boolean }): Promise<MediaIndexEntry> {
  const m: MediaT = Media.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const dir = dirname(manifestPath);
  const rel = relative(MEDIA_ROOT, dir).split('\\').join('/');
  const file = join(dir, m.file);
  const present = existsSync(file);
  const stem = basename(m.file, extname(m.file));
  const variants: MediaVariant[] = [];
  if (present && opts.derive) {
    const outDir = join(dir, DERIVED_DIR);
    mkdirSync(outDir, { recursive: true });
    const meta = await sharp(file).metadata();
    for (const w of WIDTHS) {
      if (meta.width && w > meta.width) continue;
      const out = join(outDir, `${stem}.w${w}.webp`);
      const info = await sharp(file)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(out);
      variants.push({
        src: `${rel}/${DERIVED_DIR}/${stem}.w${w}.webp`,
        width: info.width,
        height: info.height,
        type: 'image/webp',
      });
    }
  }
  const entry: MediaIndexEntry = {
    id: m.id,
    dir: rel,
    original: { src: `${rel}/${m.file}`, width: m.width, height: m.height, type: mime(m.file) },
    variants,
    width: m.width,
    height: m.height,
    caption: m.caption,
    credit: m.credit,
    licence: m.original.licence,
    colorized: m.colorized,
    present,
  };
  const originalUrl = m.original.archive_url ?? m.original.uncropped_url;
  if (originalUrl) entry.originalUrl = originalUrl;
  if (m.focal_point) entry.focalPoint = m.focal_point;
  if (m.person) entry.person = m.person;
  if (Array.isArray(m.people) && m.people.length) entry.people = m.people as string[];
  return entry;
}

export function readIndex(): MediaIndex | undefined {
  return existsSync(INDEX_FILE)
    ? (JSON.parse(readFileSync(INDEX_FILE, 'utf8')) as MediaIndex)
    : undefined;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const manifests = walkManifests(MEDIA_ROOT);
  if (args.has('--check')) {
    const index = readIndex();
    const missing = manifests
      .map((p) => Media.parse(JSON.parse(readFileSync(p, 'utf8'))).id)
      .filter((id) => !index?.entries.some((e) => e.id === id));
    if (!index || missing.length) {
      console.error(
        `media index is stale — missing: ${missing.join(', ') || '(no index)'} — run: npm run media`,
      );
      process.exit(1);
    }
    console.log(`media index covers ${index.entries.length} images`);
    return;
  }
  const entries: MediaIndexEntry[] = [];
  for (const p of manifests) {
    const e = await buildOne(p, { derive: true });
    entries.push(e);
    console.log(
      `${e.present ? '✓' : '·'} ${e.id} ${e.variants.length ? `(${e.variants.map((v) => v.width).join('/')}w)` : '(no local binary)'}`,
    );
  }
  const index: MediaIndex = {
    generatedAt: new Date().toISOString().slice(0, 10),
    base: '/assets/media/',
    entries,
  };
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
  console.log(
    `wrote ${INDEX_FILE} (${entries.length} images, ${entries.filter((e) => e.present).length} present locally)`,
  );
  if (args.has('--upload')) {
    console.log(`→ aws s3 sync ${MEDIA_ROOT} s3://${BUCKET}/media (images only)`);
    execFileSync(
      'aws',
      [
        's3',
        'sync',
        MEDIA_ROOT,
        `s3://${BUCKET}/media`,
        '--exclude',
        '*',
        '--include',
        '*.png',
        '--include',
        '*.jpg',
        '--include',
        '*.jpeg',
        '--include',
        '*.webp',
        '--include',
        '*.avif',
        '--cache-control',
        'public, max-age=31536000, immutable',
        '--only-show-errors',
      ],
      { stdio: 'inherit', env: { ...process.env, AWS_PROFILE: PROFILE } },
    );
    console.log('uploaded');
  }
}

if (process.argv[1] && /media-pipeline\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
