# Historical borders

One world GeoJSON per **era year** a pack may declare as `borderYear`
(`pack.json`). Built by `npm run borders` from
[aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps),
pinned to one upstream commit (`manifest.json#upstreamCommit`), simplified with
mapshaper to ~120–150 kB each (the Pacific years are ~340–390 kB — see
**Simplification and small islands** below; `manifest.json` records the compact
size, the committed files are Prettier-formatted and roughly double it, and
CloudFront serves them gzipped at ~135–155 kB). The map engine (`sand-a55.9`)
fetches `/assets/geo/borders/<year>.geojson`; the deploy workflows sync this
directory to the assets bucket.

| File           | Upstream file | Use for                                                  |
| -------------- | ------------- | -------------------------------------------------------- |
| `1870.geojson` | `world_1880`  | Franco-Prussian War — **needs hand edits** (see caveat)  |
| `1871.geojson` | `world_1880`  | post-Frankfurt Europe                                    |
| `1905.geojson` | `world_1900`  | Russo-Japanese War                                       |
| `1914.geojson` | `world_1914`  | August 1914 (Alsace-Lorraine German) — Phase 1           |
| `1918.geojson` | `world_1920`  | post-war settlement                                      |
| `1931.geojson` | `world_1930`  | eve of Mukden — **East Asia only** (see caveat)          |
| `1939.geojson` | `world_1938`  | eve of WWII — check Austria/Sudetenland                  |
| `1941.geojson` | `world_1938`  | the Pacific war's colonial frame — **Pacific only**      |
| `1945.geojson` | `world_1945`  | the **post-surrender** settlement, not the fighting year |
| `1950.geojson` | `world_1960`  | Korea / early Cold War (Europe adequate)                 |

The per-year caveats live in `manifest.json` and in each file's top-level
`caveat` property; read them before trusting a frontier.

**There is no 1944**, and that is a decision rather than an omission
(`sand-lry.1`). Upstream jumps 1938 → 1945, and 1945 is a map of the aftermath:
Germany in four occupation zones, "Japan (USA)", Korea split US/USSR. The empire
the Marianas and the Philippines were fought over is already gone on it. A 1944
Pacific pack declares `borderYear: 1941` and draws the Japanese perimeter as its
own dated series — the same answer the 1918 caveat gives for armistice day.

## Simplification and small islands

The default is `-simplify 12%`, which is a land-map setting: it pulls every
coastline inward, which costs nothing on the Rhine and deletes islands. The
Pacific years are built at **50%** instead. Measured on `world_1938`, the number
of test places still inside a polygon afterwards:

| `-simplify` | size   | islands that survive                  |
| ----------- | ------ | ------------------------------------- |
| 12%         | 143 kB | Saipan, Guam                          |
| **50%**     | 391 kB | + Formosa, Oahu, Okinawa, Port Arthur |
| 80%         | 577 kB | + Iwo Jima, and nothing else          |

Even at 50% the atolls are simply not in the upstream geometry: Truk, Palau,
Kwajalein, Tarawa, Wake, Midway and Rabaul have no polygon at any setting, and
neither Singapore nor Batavia falls inside one. **Borders are basin-scale
context in the Pacific; the islands come from the tiles** (ADR 0002).

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
