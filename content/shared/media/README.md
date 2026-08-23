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

The media pipeline — `npm run media` (`scripts/media-pipeline.ts`) — makes
WebP derivatives (320/640/1024 px, in a git-ignored `.derived/` beside the
original), writes the attribution manifest the app renders (`index.json`,
tracked), and with `-- --upload` syncs originals and derivatives to the assets
bucket (`/assets/media/<path>`). `MediaFigure` renders every image with its
credit, the colorized label and a link to the original (ADR 0007).

## Layout

```text
media/
  people/<slug>/                portraits — one directory per Person
  people/<slug>/<file-stem>/    …one directory per image, when a Person has more
                                than one portrait (e.g. moltke-helmuth-von-elder)
  scenes/<yyyy>-<slug>/         group photographs, places, events
  documents/<slug>/             scans of orders, memoranda, maps   (future)
```

A manifest is found by walking for files named exactly `media.json`, so a
directory holds at most one image. A Person photographed at different points in
their life therefore gets a directory per image, named for the file stem; a
Person with a single portrait keeps the flat layout.

## Rules (from the imagery policy, [ADR 0007](../../../docs/decisions/0007-imagery.md))

- Open-licence or public-domain originals only; archive, photographer, date and
  licence recorded per image. Bundesarchiv images are CC-BY-SA — the credit
  string is mandatory and colorizations inherit the licence.
- Colorizations are labelled **colorized (AI-assisted)**, the original is one
  click away, and colour is the only thing changed — nothing added or removed.
- No gore: no dead or mutilated bodies, no atrocity imagery.
