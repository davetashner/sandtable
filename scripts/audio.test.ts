/**
 * The audio pipeline's pure parts (sand-1l0.34.1). The transcode itself needs
 * ffmpeg and real files, so it is exercised by running `npm run audio`; what
 * is tested here is everything that decides *what* ffmpeg is asked to do, plus
 * the manifests actually in the tree.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUDIO_ROOT,
  DERIVED_DIR,
  INDEX_FILE,
  OPUS_KBPS,
  AAC_KBPS,
  TARGET_LUFS,
  loudnormFilter,
  sourcesFor,
  type LoudnormMeasurement,
} from './audio-pipeline.js';
import { Cue } from '../src/packs/schema/index.js';

const measured: LoudnormMeasurement = {
  input_i: '-14.38',
  input_tp: '-0.20',
  input_lra: '10.20',
  input_thresh: '-24.60',
  target_offset: '-0.31',
};

describe('loudnormFilter', () => {
  it('feeds the first pass measurements back in, and stays linear', () => {
    const f = loudnormFilter(measured, 0);
    expect(f).toContain(`I=${TARGET_LUFS}`);
    expect(f).toContain('measured_I=-14.38');
    expect(f).toContain('measured_TP=-0.20');
    expect(f).toContain('measured_LRA=10.20');
    expect(f).toContain('measured_thresh=-24.60');
    expect(f).toContain('offset=-0.31');
    // linear=true is the whole point: match by gain, do not ride the level.
    expect(f).toContain('linear=true');
  });

  it('adds no volume stage when the cue takes no trim', () => {
    expect(loudnormFilter(measured, 0)).not.toContain('volume=');
  });

  it('appends the trim after loudnorm, so a bed sits under its cue', () => {
    const f = loudnormFilter(measured, -9);
    expect(f).toMatch(/loudnorm=.*,volume=-9dB$/);
  });
});

describe('sourcesFor', () => {
  it('offers Opus first and AAC as the fallback', () => {
    const s = sourcesFor('forty-days', 'the-clockwork-minute');
    expect(s.map((x) => x.type)).toEqual(['audio/ogg; codecs=opus', 'audio/mp4; codecs=mp4a.40.2']);
    expect(s[0]!.src).toBe(`forty-days/${DERIVED_DIR}/the-clockwork-minute.opus`);
    expect(s[1]!.src).toBe(`forty-days/${DERIVED_DIR}/the-clockwork-minute.m4a`);
    expect(s[0]!.bitrateKbps).toBe(OPUS_KBPS);
    expect(s[1]!.bitrateKbps).toBe(AAC_KBPS);
  });
});

describe('the cues in the tree', () => {
  const dirs = existsSync(AUDIO_ROOT)
    ? readdirSync(AUDIO_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  it('has at least one cue', () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  it.each(dirs)('%s parses against the Cue schema and carries provenance', (dir) => {
    const raw = JSON.parse(readFileSync(join(AUDIO_ROOT, dir, 'cue.json'), 'utf8'));
    const c = Cue.parse(raw);
    expect(c.provenance.licence.length).toBeGreaterThan(0);
    expect(c.provenance.tool.length).toBeGreaterThan(0);
    // A generated cue that cannot be regenerated is not documented.
    if (/suno|udio|generated|ai/i.test(c.provenance.tool)) {
      expect(c.provenance.prompt, `${c.id} needs its prompt`).toBeTruthy();
    }
    expect(c.provenance.licence).not.toMatch(/\b(TODO|TBD|UNKNOWN|HOLD)\b/i);
  });

  it('gives every cue a unique id', () => {
    const ids = dirs.map(
      (d) => Cue.parse(JSON.parse(readFileSync(join(AUDIO_ROOT, d, 'cue.json'), 'utf8'))).id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has an index covering every manifest', () => {
    if (!existsSync(INDEX_FILE)) return;
    const index = JSON.parse(readFileSync(INDEX_FILE, 'utf8')) as {
      base: string;
      entries: { id: string; loudness?: { outputLufs: number; targetLufs: number } }[];
    };
    expect(index.base).toBe('/assets/audio/');
    for (const dir of dirs) {
      const c = Cue.parse(JSON.parse(readFileSync(join(AUDIO_ROOT, dir, 'cue.json'), 'utf8')));
      expect(
        index.entries.some((e) => e.id === c.id),
        `${c.id} missing from index`,
      ).toBe(true);
    }
    // Whatever came in, everything should leave at the same loudness.
    for (const e of index.entries) {
      if (!e.loudness) continue;
      expect(Math.abs(e.loudness.outputLufs - e.loudness.targetLufs)).toBeLessThanOrEqual(1.5);
    }
  });
});
