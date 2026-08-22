# 0007 — Imagery: sourcing, licensing, colorization and content policy

- **Status:** accepted
- **Date:** 2026-08-22
- **Bead:** `sand-y0u.1`

## Context

Sandtable wants real archive photographs throughout — commanders, armies on
the march, the Liège forts and the 42 cm guns, the taxis, aviators, Paris in
August 1914, documents — and wants them to feel present rather than sepia
and remote. Photographs carry legal and ethical weight that a map layer does
not: licences differ per archive and per image, colorization changes what a
viewer believes they are seeing, and a war is full of images that teach
nothing a school audience should be shown. Twenty-one images already exist
(nineteen commander portraits and two scenes, all colorized by the project
from public-domain originals), each with a provisional `media.json`
manifest; this record turns the practice behind them into policy.

## Decision

### Sourcing

Only open-licence or public-domain originals, and only where the licence is
recorded per image. Preferred sources, in rough order of ease:

- **Wikimedia Commons** — public-domain and Creative Commons works, including
  the **Bundesarchiv** deposits (CC BY-SA 3.0 DE; the credit string
  `Bundesarchiv, Bild <number> / <photographer> / CC-BY-SA 3.0` is mandatory
  and derivatives inherit the licence).
- **Library of Congress** (Bain News Service, Harris & Ewing — no known
  restrictions), **US National Archives**, **BnF Gallica** (public domain in
  France for pre-1931 works), **Nationaal Archief** (CC0 / public domain),
  **Europeana 1914–1918** (check each item's rights statement).
- **Imperial War Museums** and **Australian War Memorial** — per-image: IWM's
  non-commercial licence and AWM's copyright statements vary; use only items
  marked public domain / CC, or ask.
- **Anything restricted, "fair use", or of unknown provenance is out.**

Every image has a manifest recording: archive and item URL, photographer,
date, original dimensions, licence, and the credit line as the archive asks
for it. The manifest is the source of truth and is tracked in git; the
binary lives in the assets bucket (ADR 0004).

### Colorization

- Prefer already-colorized open works where they exist and are licensed.
- Otherwise the project may produce its own colorizations — **AI-assisted,
  from the public-domain original** — as was done for the commander
  portraits. These are **always labelled "colorized (AI-assisted)"**, the
  original is one click away in the UI, and the manifest records the method
  and the year.
- Colour is interpretation, except where documented (uniform colours, ribbons,
  known insignia) — captions never present colorization as documentary colour.
- **Colour is the only thing that changes.** No AI generation, inpainting,
  upscaling that invents detail, or removal/addition of elements. Cropping
  and tonal correction of the original are fine and are noted.
- Colorizations of CC BY-SA originals are themselves CC BY-SA and say so.

### Content

- **In:** portraits, kit and uniforms, guns and machines, marches and
  columns, aircraft, ships, towns, documents, maps, posters, prisoners
  treated with dignity, field hospitals without gore, graves and memorials.
- **Out:** dead or mutilated bodies, executions and atrocity imagery, wounds
  shown for shock, and any image whose subject could not be identified and
  credited truthfully. The human scale of the war is told by the casualty
  layer and first-person vignettes (`sand-1l0.24`), not by bodies.
- Every image shows its credit; every colorized image shows its label; both
  are rendered by the media component, never left to the caption writer.

### Enforcement

- `scripts/check-content.sh` and the media schema in the pack validator refuse
  manifests that lack a licence, credit, caption, archive record or
  content-policy note; that carry BLOCKED/UNVERIFIED/UNKNOWN/HOLD flags; that
  are colorized without saying so in the caption; or that cite the
  Bundesarchiv without its credit string (`npm run validate:content`).
- Image review is a step of the fact-check workflow (`sand-y0u.7`): caption
  accuracy, date, unit identification, misattributed stock photographs,
  colorization plausibility.

## Alternatives considered

- **No photographs; maps and tokens only.** Clean and safe, but the project's
  thesis is that the war room should feel lamp-lit and real, and faces make
  people remember names.
- **Licensed stock or agency images.** Out of budget and not redistributable
  in an open project.
- **Aggressive AI restoration (upscaling, face reconstruction).** Produces
  impressive, false images; forbidden above.
- **Including the famous atrocity and casualty photographs for impact.** The
  audience includes school-age learners; the human cost is conveyed by data
  and testimony instead.

## Consequences

- `sand-y0u.2` formalises the manifest as the `Media` entity (the provisional
  schema in `src/packs/schema` already mirrors today's fields and the
  validator enforces the rules above).
- `sand-y0u.3` builds the pipeline: fetch, provenance, optional colorization,
  WebP/AVIF derivatives, upload to the assets bucket, attribution manifest.
- `sand-y0u.4` renders credits, the colorized label and the "show original"
  toggle in every placement; `sand-y0u.6` is the Phase 1 shot list.
- Content review (`sand-23b.2`) gains an image checklist (`sand-y0u.7`).
- `content/shared/media/README.md` and the PR template checklist restate the
  rules for authors.
