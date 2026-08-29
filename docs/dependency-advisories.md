# Dependency advisories: what is fixed, and what is accepted

What `npm audit` reports, what was remediated, and — for what is left — why it
stays. Written because a standing count of eleven advisories is either a
decision or a shrug, and only one of those survives review. Stories:
`sand-pmz.26`, `sand-pmz.27`.

Re-check with `npm audit`, and re-check the bundle claim below with
`npm run build` and a grep of `dist/app/`, before trusting any of this.

**Last re-checked 2026-08-29: four, and `--omit=dev` reports none.** The count
was eleven, with eight of them counted as production. The escape this document
named as "cheapest we control" was taken — `TripsLayer` is gone
(`sand-pmz.40`), `@deck.gl/geo-layers` left the tree, and the whole
`@luma.gl/gltf` → `@loaders.gl/textures` → `texture-compressor` →
`image-size` chain went with it. The two `image-size` alerts GitHub raised on
every push are gone with it, so the permanent push warning this file used to
end by explaining how to silence is no longer there to silence.

## The one fact that governs the rest

**None of these advisories reaches a reader.** The app is a static, client-only
site (ADR 0001, ADR 0004); the only thing a browser is served is `dist/`.
Verified on the built output rather than reasoned from the dependency graph:

- No chunk under `dist/app/` contains `image-size`'s parsers, or
  `texture-compressor`. The only symbol matching `imageSize` is React DOM's
  `imageSizes`/`imageSrcSet` attribute table.
- `@deck.gl/geo-layers` **is no longer a dependency at all** (`sand-pmz.40`).
  It was here for one symbol, `TripsLayer`, in
  `src/engine/layers/movement-layers.ts`. That layer ran with `fadeTrail:
false` and an unbounded `trailLength` — every property distinguishing it from
  a path was switched off — so it was replaced by a `PathLayer` over a path
  sliced at the clock, and the package left the tree. Kept in this list because
  the reasoning below is still the right reasoning about a bundled dependency;
  only this one stopped being one.

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

**Resolved 2026-08-29, by the escape this section named** (`sand-pmz.40`).

The paragraph that stood here said: "Cheapest escape we control: if
`TripsLayer` is ever replaced with a hand-rolled trail layer,
`@deck.gl/geo-layers` leaves the tree and takes all eight with it." That is
what happened, and it was not undertaken for the advisories — it came out of a
boot-performance audit that measured `TripsLayer` costing about 917 ms of
shader compilation on a phone for a layer whose distinguishing features were
all switched off.

`npm audit --omit=dev` now reports none, and `npm audit` four rather than
eleven. The two `image-size` alerts were the only ones GitHub raised on a push,
so there is no longer a permanent push warning, and the `gh api` snippet that
used to sit here for silencing it has gone with the reason for it.

The rest of the reasoning is kept above rather than deleted, because it is
still how to think about a bundled advisory the next time one lands — and
because "it does not reach a reader" was true and is still the fact that
governs the rest.

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
