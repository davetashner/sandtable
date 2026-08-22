# Shared media

Photographs, maps and documents referenced by every scenario pack.

## What is in git and what is not

- **Tracked:** one `media.json` manifest per image (provenance, licence, credit,
  caption, colorization notes, placement). The manifest is the source of truth.
- **Not tracked:** the image binaries (`*.png`, `*.jpg`, `*.webp`, …). They live
  in the S3 assets bucket (see decision `sand-a55.4`) under the same
  relative path as the manifest, e.g.
  `media/people/schlieffen-alfred-von/portrait-c1906-colorized.png`.
  A copy beside the manifest on a developer's machine is a local staging copy
  only; `.gitignore` keeps it out of commits.

The media pipeline (`sand-y0u.3`) uploads originals and derivatives
from the staging copy to the bucket, generates WebP/AVIF variants, and writes
the attribution manifest the app renders.

## Layout

```text
media/
  people/<slug>/          portraits — one directory per Person
  scenes/<yyyy>-<slug>/   group photographs, places, events
  documents/<slug>/       scans of orders, memoranda, maps   (future)
```

## Rules (from the imagery policy, `sand-y0u.1`)

- Open-licence or public-domain originals only; archive, photographer, date and
  licence recorded per image. Bundesarchiv images are CC-BY-SA — the credit
  string is mandatory and colorizations inherit the licence.
- Colorizations are labelled **colorized (AI-assisted)**, the original is one
  click away, and colour is the only thing changed — nothing added or removed.
- No gore: no dead or mutilated bodies, no atrocity imagery.
