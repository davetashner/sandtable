import { describe, expect, it } from 'vitest';
import { cueFor, cuesInScore } from './score.js';
import type { ScoreEntry } from '../packs/schema/index.js';
import scoreJson from '../../content/eras/1914-schlieffen-marne/score.json';
import { ScoreEntry as ScoreEntrySchema } from '../packs/schema/index.js';

const t = (iso: string) => Date.parse(iso);

const SCORE: ScoreEntry[] = [
  { opening: true, cue: 'cue:a' },
  { focus: '1914:marne', cue: 'cue:f' },
  { from: '1914-08-16T00:00:00Z', to: '1914-09-05T00:00:00Z', cue: 'cue:e' },
  { from: '1914-08-22T00:00:00Z', to: '1914-08-23T00:00:00Z', silence: true },
];

describe('cueFor', () => {
  it('gives the opening its cue while it is on screen', () => {
    expect(cueFor(SCORE, { t: t('1914-09-06T00:00:00Z'), opening: true }).cue).toBe('cue:a');
  });

  it('prefers the focused chapter over the clock', () => {
    // The Marne window would give cue:e; the focus wins.
    expect(cueFor(SCORE, { t: t('1914-08-18T00:00:00Z'), focus: '1914:marne' }).cue).toBe('cue:f');
  });

  it('falls through to the time window with no focus', () => {
    expect(cueFor(SCORE, { t: t('1914-08-18T00:00:00Z') }).cue).toBe('cue:e');
  });

  it('lets the narrowest window win, so 22 August is silent', () => {
    const v = cueFor(SCORE, { t: t('1914-08-22T09:00:00Z') });
    expect(v.cue).toBeUndefined();
    expect(v.silent).toBe(true);
  });

  it('resumes the wider cue the moment the silence ends', () => {
    expect(cueFor(SCORE, { t: t('1914-08-23T00:00:00Z') }).cue).toBe('cue:e');
  });

  it('treats windows as half-open so a boundary matches one entry', () => {
    expect(cueFor(SCORE, { t: t('1914-08-16T00:00:00Z') }).cue).toBe('cue:e');
    expect(cueFor(SCORE, { t: t('1914-09-05T00:00:00Z') }).cue).toBeUndefined();
  });

  it('says nothing outside every window, and does not call it silence', () => {
    const v = cueFor(SCORE, { t: t('1914-12-25T00:00:00Z') });
    expect(v.cue).toBeUndefined();
    expect(v.silent).toBe(false);
  });

  it('is empty-safe', () => {
    expect(cueFor([], { t: t('1914-08-18T00:00:00Z') }).cue).toBeUndefined();
  });

  it('ignores a focus the score does not mention', () => {
    expect(cueFor(SCORE, { t: t('1914-08-18T00:00:00Z'), focus: '1914:nowhere' }).cue).toBe('cue:e');
  });
});

describe('the pack score', () => {
  const score = ScoreEntrySchema.array().parse(scoreJson);

  it('parses against the schema', () => {
    expect(score.length).toBeGreaterThan(0);
  });

  it('covers the campaign from the first day to the last', () => {
    const days = ['1914-08-02', '1914-08-10', '1914-08-19', '1914-09-08', '1914-10-30', '1914-11-24'];
    for (const d of days) {
      const v = cueFor(score, { t: t(`${d}T12:00:00Z`) });
      expect(v.cue, `${d} has no cue`).toBeTruthy();
    }
  });

  it('goes silent on 22 August and nowhere else in the campaign', () => {
    expect(cueFor(score, { t: t('1914-08-22T12:00:00Z') }).silent).toBe(true);
    expect(cueFor(score, { t: t('1914-08-21T12:00:00Z') }).silent).toBe(false);
    expect(cueFor(score, { t: t('1914-08-23T12:00:00Z') }).silent).toBe(false);
  });

  it('names only cues that exist in the audio registry', async () => {
    const { audioIndex } = await import('../packs/audio-index.js');
    const known = new Set(audioIndex.entries.map((e) => e.id));
    for (const id of cuesInScore(score)) expect(known.has(id), `${id} is not in the index`).toBe(true);
  });
});
