# The score

Background music for the campaign, one directory per cue. Policy and the
reasoning behind it: [ADR 0008](../../../docs/decisions/0008-audio.md).

## What is in git and what is not

- **Tracked:** one `cue.json` manifest per cue (title, role, duration, loop,
  musical metadata, provenance and credit) and the generated `index.json`.
- **Not tracked:** the WAV master beside the manifest, and the Opus/AAC
  derivatives under `.derived/`. The master is a local staging copy; the
  derivatives live in the S3 assets bucket under the same relative path,
  e.g. `audio/forty-days/.derived/the-clockwork-minute.opus`.

## The pipeline

```bash
npm run audio                 # normalise, transcode, write index.json
npm run audio -- --upload     # …and sync the derivatives to the bucket
npm run audio -- --check      # index covers every manifest (CI)
```

`npm run audio` needs **ffmpeg** on the PATH. CI only runs `--check`, so
ffmpeg is a contributor's tool, not a build dependency.

Every cue is normalised to **−20 LUFS** integrated by two-pass EBU R128
`loudnorm` with `linear=true` — matched by gain, dynamics intact, no
compression. Generated masters arrive far louder and uneven; the pipeline
prints what each one came in at and what it went out at, and warns if a cue
lands more than 1.5 LU from target.

## Layout

```text
audio/
  <slug>/cue.json              the manifest        (tracked)
  <slug>/<master>.wav          local staging only  (ignored)
  <slug>/.derived/*.opus|.m4a  uploaded            (ignored)
  index.json                   what the app reads  (tracked)
```

## Rules

- Provenance is required: tool, model, prompt, excludes, date, licence. A cue
  whose provenance is a placeholder fails `scripts/check-content.sh`.
- `role: "cue"` is stage music, one at a time. `role: "bed"` is an overlay
  that fades in *under* the cue and carries a negative `mixDb`.
- Never autoplay, always offer a control, remember the choice, and never
  carry meaning in audio alone.
