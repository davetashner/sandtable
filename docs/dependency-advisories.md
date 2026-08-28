# Dependency advisories: what is fixed, and what is accepted

What `npm audit` reports, what was remediated, and — for what is left — why it
stays. Written because a standing count of eleven advisories is either a
decision or a shrug, and only one of those survives review. Stories:
`sand-pmz.26`, `sand-pmz.27`.

Re-check with `npm audit`, and re-check the bundle claim below with
`npm run build` and a grep of `dist/app/`, before trusting any of this. Last
re-checked 2026-08-28: eleven, unchanged, and the two `image-size` ones are
still the only alerts GitHub raises on a push.

## The one fact that governs the rest

**None of these advisories reaches a reader.** The app is a static, client-only
site (ADR 0001, ADR 0004); the only thing a browser is served is `dist/`.
Verified on the built output rather than reasoned from the dependency graph:

- No chunk under `dist/app/` contains `image-size`'s parsers, or
  `texture-compressor`. The only symbol matching `imageSize` is React DOM's
  `imageSizes`/`imageSrcSet` attribute table.
- `@deck.gl/geo-layers` is a production dependency, but the only thing the app
  imports from it is `TripsLayer` (`src/engine/layers/movement-layers.ts`), and
  the only geo-layers symbol in the map chunk is `TripsLayer`. The
  `@luma.gl/gltf` → `@loaders.gl/textures` → `texture-compressor` →
  `image-size` chain is tree-shaken away.

So `npm audit --omit=dev` counting eight of these as "production" is a
statement about the dependency _tree_, not about the _bundle_. Both matter —
a build-time compromise is real — but they are different risks with different
urgency, and the distinction is the whole triage here.

## Fixed

| Package   | Was    | Now    | How                               |
| --------- | ------ | ------ | --------------------------------- |
| `sharp`   | 0.34.5 | 0.35.4 | devDependency bump (libvips CVEs) |
| `adm-zip` | 0.5.18 | 0.6.0  | `overrides`, under `mapshaper`    |

Both were verified against the pipelines that actually use them, because an
override that silences an advisory and breaks a tool is a worse outcome than
the advisory: `sharp` still encodes WebP, and `mapshaper` still runs a
`-simplify` command and passes `npm run borders -- --check`.

## Accepted, with reasons

### `image-size` — and the seven packages above it in the chain

Two DoS advisories (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq): infinite loops
in the ICNS and JXL/HEIF parsers. These are the two Dependabot alerts (#3, #4)
the remote prints on every push.

`npm ls image-size` finds two copies, and only the first is what the alerts are
about:

- `@deck.gl/geo-layers` → `@luma.gl/gltf` → `@loaders.gl/textures` →
  `texture-compressor` → `image-size@0.7.5` — production, and the one
  Dependabot scopes as `runtime`.
- `mapshaper` → `@ngageoint/geopackage` → `image-size@0.8.3` — dev, alongside
  the `file-type` entry below.

Note what is _not_ in either list: the media pipeline. `scripts/media-pipeline.ts`
imports `sharp` and nothing else that decodes an image, so "it's only the media
pipeline, and we control the inputs" is a comforting story about the wrong
package. The real answer is the bundle claim above.

**There is no patched version, and GitHub agrees.** The advisories cover
`<=2.0.2`, 2.0.2 is the latest release (April 2025), and both Dependabot alerts
report `first_patched_version: null` — there is nothing to bump to, so no
`overrides` entry can help either. `npm audit fix --force` offers
`@deck.gl/geo-layers@8.9.36`, which is a _downgrade_ to the 8.x line while the
rest of deck.gl is 9.3 — the deck.gl packages are version-locked to each other,
so taking it would break the map outright.

Accepted because it cannot be fixed, it does not ship (above), and nothing in
the build feeds it an ICNS or JXL file — the media pipeline is `sharp`, and it
reads PNG and JPEG masters we fetched ourselves.

**Revisit when** `image-size` ships a fix, or when deck.gl moves to loaders.gl
v5 — `@loaders.gl/textures@5.0.0-alpha.2` has already dropped
`texture-compressor` from its dependencies, so the chain dies of its own accord
on that upgrade. That is now the likeliest exit and it costs us nothing to wait
for it. Cheapest escape we control: if `TripsLayer` is ever replaced with a
hand-rolled trail layer, `@deck.gl/geo-layers` leaves the tree and takes all
eight with it.

Because there is no fix to schedule, the push warning is permanent until one of
those lands. Silencing it is a repo-settings decision rather than a code one, so
it is left to the owner:

```bash
gh api --method PATCH repos/:owner/:repo/dependabot/alerts/3 \
  -f state=dismissed -f dismissed_reason=tolerable_risk \
  -f dismissed_comment='No patched version; not in the bundle. docs/dependency-advisories.md'
```

Dismissal is reversible and Dependabot re-opens the alert if the dependency
changes, so it loses nothing except the reminder.

### `file-type` — do not override this one

`mapshaper` → `@ngageoint/geopackage` → `file-type@16.5.4`, moderate.

The advisory wants `>=21.3.1`. An override to 21 **installs and imports
cleanly, and then breaks at runtime**: `geopackage`'s `tileCreator.js` calls
`fileType.fromBuffer(...)`, and `fromBuffer` was renamed to
`fileTypeFromBuffer` in file-type 17. The symbol is `undefined` on 21, so the
call throws — and no test here would catch it, because nothing in this repo
reads a `.gpkg` tile.

That is the trap worth writing down: the audit count goes green and a code path
nobody exercises is quietly broken. It was tried, reverted, and is not to be
tried again without checking the call sites.

Accepted: dev-only, moderate, in a code path this repo never enters.

### `mapshaper` and `@ngageoint/geopackage`

They appear only as the parents of the two above. They clear when their
children do.

## Why this file exists

Stringer (a static-analysis tool, `~/Development/stringer`) filed five of these
as beads, four of them dev-only and two at P1, while missing the eight in the
production tree — including the direct dependency. The findings were real; the
triage was inverted, because nothing in the pipeline knew which of them ship.
The corrections are filed against Stringer as `stringer-bqg` and `stringer-kgr`.
This page is the answer for this repo either way.
