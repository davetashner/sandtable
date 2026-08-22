# Historical borders

One world GeoJSON per **era year** a pack may declare as `borderYear`
(`pack.json`). Built by `npm run borders` from
[aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps),
pinned to one upstream commit (`manifest.json#upstreamCommit`), simplified with
mapshaper to ~120–150 kB each. The map engine (`sand-a55.9`) fetches
`/assets/geo/borders/<year>.geojson`; the deploy workflows sync this directory
to the assets bucket.

| File           | Upstream file | Use for                                                 |
| -------------- | ------------- | ------------------------------------------------------- |
| `1870.geojson` | `world_1880`  | Franco-Prussian War — **needs hand edits** (see caveat) |
| `1871.geojson` | `world_1880`  | post-Frankfurt Europe                                   |
| `1905.geojson` | `world_1900`  | Russo-Japanese War                                      |
| `1914.geojson` | `world_1914`  | August 1914 (Alsace-Lorraine German) — Phase 1          |
| `1918.geojson` | `world_1920`  | post-war settlement                                     |
| `1939.geojson` | `world_1938`  | eve of WWII — check Austria/Sudetenland                 |
| `1945.geojson` | `world_1945`  | end of WWII                                             |
| `1950.geojson` | `world_1960`  | Korea / early Cold War (Europe adequate)                |

The per-year caveats live in `manifest.json` and in each file's top-level
`caveat` property; read them before trusting a frontier.

## Fields

`NAME` (label), `SUBJECTO` (the power exercising authority — use for fill
colour), `PARTOF`, `BORDERPRECISION` (1 approximate, 2 moderately precise,
3 determined by international law — drive a softer stroke for 1). Some
polygons have a null `NAME` (oceans, uninhabited areas); upstream names are
kept verbatim, typos included (e.g. "Kingfom of Italy" in 1914 — fix upstream,
not here).

## Licence and attribution

Upstream data is **GPL-3.0**; these files are derived works under the same
licence. Show the attribution wherever the borders are drawn:

> Historical borders © aourednik/historical-basemaps contributors (GPL-3.0),
> simplified by Sandtable.

## Accuracy

The dataset is drawn for world/continent scale: frontiers are approximate at
campaign zoom (tens of kilometres in places), some years are interpolated, and
the authors invite corrections. Sandtable uses it for _context_ — who ruled
what — not for operational geography; battle zoom-ins draw their own detail.
When a pack needs a precise frontier (the 1870 Alsace-Lorraine line, the 1905
Liaodong lease), author it in the pack and note it in the pack's sources.

## Refreshing

```bash
npm run borders              # all years
npm run borders -- 1914      # one year
npm run borders -- --check   # CI: files present
```

To move to a newer upstream commit, change `UPSTREAM_COMMIT` in
`scripts/fetch-borders.ts`, rerun, and review the diff of `manifest.json`
(feature counts and sizes) — the GeoJSON itself is marked `-diff` in
`.gitattributes`.
