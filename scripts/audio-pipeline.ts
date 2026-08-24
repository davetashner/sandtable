#!/usr/bin/env tsx
/**
 * Audio pipeline (sand-1l0.34.1) — the score's counterpart to the media
 * pipeline, and it works the same way for the same reasons (ADR 0004, 0008).
 *
 * For every content/shared/audio/** /cue.json whose master sits beside it (a
 * git-ignored local staging copy), this script:
 *   1. validates the manifest against the Cue schema,
 *   2. reads the master's real duration and channels with ffprobe, and warns
 *      when the manifest disagrees,
 *   3. normalises loudness to a common target with two-pass EBU R128
 *      loudnorm and `linear=true`, so cues are matched by *gain* and keep
 *      their dynamics — background music that has been compressed to hit a
 *      number is worse than background music that is slightly quiet,
 *   4. encodes Opus (small, and what everything but older Safari wants) and
 *      AAC (the fallback that plays everywhere), into a git-ignored
 *      `.derived/` beside the master,
 *   5. writes content/shared/audio/index.json — per cue the sources, the
 *      duration, the credit and licence, the measured loudness before and
 *      after, and whether it loops (tracked in git),
 *   6. with --upload, syncs the derivatives to the assets bucket under
 *      audio/, so the app can fetch /assets/audio/<path>.
 *
 *   npm run audio                 # transcode + index.json
 *   npm run audio -- --upload     # …and push to the assets bucket
 *   npm run audio -- --check      # index.json covers every manifest (CI)
 *
 * The masters are never uploaded: they are large, and nothing in the browser
 * wants a WAV.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { Cue, type Cue as CueT } from '../src/packs/schema/index.js';
import { CUE_MANIFEST } from '../src/packs/schema/files.js';

export const AUDIO_ROOT = 'content/shared/audio';
export const INDEX_FILE = join(AUDIO_ROOT, 'index.json');
export const DERIVED_DIR = '.derived';

/**
 * Integrated loudness every cue is normalised to. Well below streaming's
 * -14 LUFS: this is music to read over, not music to listen to.
 */
export const TARGET_LUFS = -20;
/** True-peak ceiling, leaving room for the encoder. */
export const TARGET_TP = -1.5;
/** Loudness range passed to loudnorm; generous, so it stays a gain change. */
export const TARGET_LRA = 14;

const BUCKET = process.env['ASSETS_BUCKET'] ?? 'sandtable-assets-205074708100';
const PROFILE = process.env['AWS_PROFILE'] ?? 'sandtable-deployer';

export interface AudioSource {
  /** Path under /assets/audio/, e.g. forty-days/.derived/forty-days.opus */
  src: string;
  type: 'audio/ogg; codecs=opus' | 'audio/mp4; codecs=mp4a.40.2';
  bitrateKbps: number;
  bytes: number;
}

export interface Loudness {
  /** Integrated loudness of the master, before normalisation. */
  inputLufs: number;
  /** Integrated loudness measured on the encoded result. */
  outputLufs: number;
  targetLufs: number;
}

export interface AudioIndexEntry {
  id: string;
  /** Directory under content/shared/audio, e.g. forty-days */
  dir: string;
  title: string;
  letter?: string;
  role: 'cue' | 'bed';
  /** Seconds. */
  duration: number;
  loop: boolean;
  /** Gain trim relative to the common target, in dB. */
  mixDb: number;
  sources: AudioSource[];
  credit: string;
  licence: string;
  key?: string;
  bpm?: number;
  loudness?: Loudness;
  /** True when the master was present locally when the index was built. */
  present: boolean;
}

export interface AudioIndex {
  generatedAt: string;
  base: string;
  entries: AudioIndexEntry[];
}

function walkManifests(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== DERIVED_DIR) walkManifests(p, out);
    } else if (name === CUE_MANIFEST) out.push(p);
  }
  return out;
}

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * ffmpeg writes its progress and its filter reports to stderr, not stdout, so
 * this needs spawnSync — execFileSync returns stdout alone.
 */
function runCapturingStderr(args: string[]): string {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  const stderr = r.stderr ?? '';
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}):\n${stderr.slice(-4000)}`);
  return stderr;
}

export interface Probe {
  duration: number;
  channels: number;
  sampleRate: number;
}

export function probe(file: string): Probe {
  const out = run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'a:0',
    '-show_entries',
    'format=duration:stream=channels,sample_rate',
    '-of',
    'json',
    file,
  ]);
  const j = JSON.parse(out) as {
    format?: { duration?: string };
    streams?: { channels?: number; sample_rate?: string }[];
  };
  const st = j.streams?.[0];
  return {
    duration: Number(j.format?.duration ?? 0),
    channels: st?.channels ?? 0,
    sampleRate: Number(st?.sample_rate ?? 0),
  };
}

export interface LoudnormMeasurement {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

/** Pass one: measure. loudnorm prints its JSON report at the end of stderr. */
export function measureLoudness(file: string): LoudnormMeasurement {
  const stderr = runCapturingStderr([
    '-hide_banner',
    '-nostats',
    '-i',
    file,
    '-af',
    `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`,
    '-f',
    'null',
    '-',
  ]);
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`could not read loudnorm report for ${file}`);
  return JSON.parse(stderr.slice(start, end + 1)) as LoudnormMeasurement;
}

/** Integrated loudness of a finished file, to confirm the second pass landed. */
export function integratedLoudness(file: string): number {
  const stderr = runCapturingStderr([
    '-hide_banner',
    '-nostats',
    '-i',
    file,
    '-af',
    'ebur128=peak=true',
    '-f',
    'null',
    '-',
  ]);
  const m = /I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g;
  let last: RegExpExecArray | null = null;
  for (let hit = m.exec(stderr); hit; hit = m.exec(stderr)) last = hit;
  return last ? Number(last[1]) : NaN;
}

/**
 * The second-pass filter chain: measured values fed back in, `linear=true` so
 * loudnorm applies one gain rather than riding the level, and the per-cue trim
 * after it so a bed can sit under a cue.
 */
export function loudnormFilter(m: LoudnormMeasurement, mixDb: number): string {
  const base =
    `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}` +
    `:measured_I=${m.input_i}:measured_TP=${m.input_tp}` +
    `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}` +
    `:offset=${m.target_offset}:linear=true:print_format=summary`;
  return mixDb === 0 ? base : `${base},volume=${mixDb}dB`;
}

export const OPUS_KBPS = 96;
export const AAC_KBPS = 128;

export function sourcesFor(
  dir: string,
  stem: string,
): { src: string; type: AudioSource['type']; bitrateKbps: number }[] {
  return [
    {
      src: `${dir}/${DERIVED_DIR}/${stem}.opus`,
      type: 'audio/ogg; codecs=opus',
      bitrateKbps: OPUS_KBPS,
    },
    {
      src: `${dir}/${DERIVED_DIR}/${stem}.m4a`,
      type: 'audio/mp4; codecs=mp4a.40.2',
      bitrateKbps: AAC_KBPS,
    },
  ];
}

async function buildOne(
  manifestPath: string,
  opts: { encode: boolean },
): Promise<{ entry: AudioIndexEntry; warnings: string[] }> {
  const c: CueT = Cue.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const dir = dirname(manifestPath);
  const rel = relative(AUDIO_ROOT, dir).split('\\').join('/');
  const master = join(dir, c.file);
  const present = existsSync(master);
  const stem = basename(c.file, extname(c.file));
  const mixDb = c.mixDb ?? 0;
  const warnings: string[] = [];

  const entry: AudioIndexEntry = {
    id: c.id,
    dir: rel,
    title: c.title,
    ...(c.letter ? { letter: c.letter } : {}),
    role: c.role,
    duration: c.duration,
    loop: c.loop,
    mixDb,
    sources: [],
    credit: c.credit,
    licence: c.provenance.licence,
    ...(c.musical?.key ? { key: c.musical.key } : {}),
    ...(c.musical?.bpm ? { bpm: c.musical.bpm } : {}),
    present,
  };

  if (!present || !opts.encode) return { entry, warnings };

  const p = probe(master);
  if (Math.abs(p.duration - c.duration) > 0.5) {
    warnings.push(
      `${c.id}: manifest says ${c.duration}s, master is ${p.duration.toFixed(2)}s — using the master`,
    );
    entry.duration = Number(p.duration.toFixed(2));
  }

  const outDir = join(dir, DERIVED_DIR);
  mkdirSync(outDir, { recursive: true });
  const measured = measureLoudness(master);
  const filter = loudnormFilter(measured, mixDb);

  const opus = join(outDir, `${stem}.opus`);
  runCapturingStderr([
    '-hide_banner',
    '-nostats',
    '-y',
    '-i',
    master,
    '-af',
    filter,
    '-c:a',
    'libopus',
    '-b:a',
    `${OPUS_KBPS}k`,
    '-vbr',
    'on',
    '-application',
    'audio',
    '-ar',
    '48000',
    opus,
  ]);

  const m4a = join(outDir, `${stem}.m4a`);
  runCapturingStderr([
    '-hide_banner',
    '-nostats',
    '-y',
    '-i',
    master,
    '-af',
    filter,
    '-c:a',
    'aac',
    '-b:a',
    `${AAC_KBPS}k`,
    '-ar',
    '48000',
    '-movflags',
    '+faststart',
    m4a,
  ]);

  entry.sources = sourcesFor(rel, stem).map((s) => ({
    ...s,
    bytes: statSync(join(AUDIO_ROOT, s.src)).size,
  }));

  const inputLufs = Number(measured.input_i);
  const outputLufs = integratedLoudness(opus);
  entry.loudness = {
    inputLufs,
    outputLufs: Number.isFinite(outputLufs) ? Number(outputLufs.toFixed(1)) : inputLufs,
    targetLufs: TARGET_LUFS + mixDb,
  };
  const drift = Math.abs(entry.loudness.outputLufs - entry.loudness.targetLufs);
  if (Number.isFinite(outputLufs) && drift > 1.5) {
    warnings.push(
      `${c.id}: landed at ${entry.loudness.outputLufs} LUFS, ${drift.toFixed(1)} LU off the ${entry.loudness.targetLufs} target`,
    );
  }
  return { entry, warnings };
}

export function readIndex(): AudioIndex | undefined {
  return existsSync(INDEX_FILE)
    ? (JSON.parse(readFileSync(INDEX_FILE, 'utf8')) as AudioIndex)
    : undefined;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const manifests = walkManifests(AUDIO_ROOT);

  if (args.has('--check')) {
    const index = readIndex();
    const missing = manifests
      .map((p) => Cue.parse(JSON.parse(readFileSync(p, 'utf8'))).id)
      .filter((id) => !index?.entries.some((e) => e.id === id));
    if (manifests.length && (!index || missing.length)) {
      console.error(
        `audio index is stale — missing: ${missing.join(', ') || '(no index)'} — run: npm run audio`,
      );
      process.exit(1);
    }
    console.log(`audio index covers ${index?.entries.length ?? 0} cues`);
    return;
  }

  const entries: AudioIndexEntry[] = [];
  const allWarnings: string[] = [];
  for (const p of manifests) {
    const { entry, warnings } = await buildOne(p, { encode: true });
    entries.push(entry);
    allWarnings.push(...warnings);
    const how = entry.sources.length
      ? `${entry.loudness ? `${entry.loudness.inputLufs} → ${entry.loudness.outputLufs} LUFS` : ''} · ${entry.sources.map((s) => `${s.bitrateKbps}k ${Math.round(s.bytes / 1024)}KB`).join(' · ')}`
      : '(no local master)';
    console.log(`${entry.present ? '✓' : '·'} ${entry.id} ${how}`);
  }

  const index: AudioIndex = {
    generatedAt: new Date().toISOString().slice(0, 10),
    base: '/assets/audio/',
    entries,
  };
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
  console.log(
    `wrote ${INDEX_FILE} (${entries.length} cues, ${entries.filter((e) => e.present).length} present locally)`,
  );
  for (const w of allWarnings) console.log(`  ! ${w}`);

  if (args.has('--upload')) {
    console.log(`→ aws s3 sync ${AUDIO_ROOT} s3://${BUCKET}/audio (derivatives only)`);
    execFileSync(
      'aws',
      [
        's3',
        'sync',
        AUDIO_ROOT,
        `s3://${BUCKET}/audio`,
        '--exclude',
        '*',
        '--include',
        '*.opus',
        '--include',
        '*.m4a',
        '--cache-control',
        'public, max-age=31536000, immutable',
        '--only-show-errors',
      ],
      { stdio: 'inherit', env: { ...process.env, AWS_PROFILE: PROFILE } },
    );
    console.log('uploaded');
  }
}

if (process.argv[1] && /audio-pipeline\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
