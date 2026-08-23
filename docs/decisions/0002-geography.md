# 0002 — Real geography: self-hosted vector tiles + historical borders; schematic only as inset

- **Status:** accepted
- **Date:** 2026-08-22
- **Bead:** `sand-a55.2`

## Context

The headline experience zooms from the campaign (Belgium–France–Germany) into
individual battles (the Mons–Condé canal, the Ourcq, the marshes of
Saint-Gond). Battles are decided by rivers, ridges and road nets; a schematic
map cannot show them. Later eras need other regions entirely — Manchuria and
the Tsushima strait for 1904–05, the Eastern Front for 1914–17 and 1941–45 —
so the geography solution must not be Europe-only or hand-drawn.

At the same time the map must _look like a staff map_, not a web map, and
must show the political geography of the period (Alsace-Lorraine German in
1914, pre-annexation in 1870), which no modern basemap provides.

## Decision

- **Basemap:** MapLibre GL with a custom "war-room" style over **self-hosted
  Protomaps PMTiles** — a single archive file per region served statically
  and read by HTTP range requests. No tile API, no key, no per-request cost.
- **Coverage:** a low-zoom world extract for the atlas/landing view plus
  per-era regional extracts at high zoom, declared by each scenario pack and
  loaded lazily (Western Europe for 1870/1914/1940; Manchuria–Korea–Japan for
  1904–05; the Eastern Front for 1914–17 and 1941–45; the Middle East later).
- **Period borders:** GeoJSON overlays derived from the open
  _historical-basemaps_ dataset (aourednik) for each era year the roadmap
  needs (1870, 1871, 1905, 1914, 1918, 1939, 1945, 1950), simplified for the
  web, stored in `content/shared/geo/borders/<year>.geojson`, selected by
  the pack's declared year. Known inaccuracies are documented and corrected
  locally where they matter (e.g. the 1914 Franco-German frontier).
- **Terrain:** rivers are first-class in the style; hill-shade or contours
  only where ground decided events (Grand Couronné, Argonne, Meuse heights),
  from free DEM tiles.
- **Schematic style:** the PoC's SVG treatment survives as an optional
  concept-diagram inset (e.g. the 1905 memorandum's idealised wheel), never
  as the primary map.

## Alternatives considered

- **Hosted tile services** (MapTiler, Mapbox, Stadia). Excellent styles and
  zero ops, but API keys, usage caps, and a recurring cost for a hobby-scale
  public site; also harder to make look period-appropriate without a custom
  style anyway.
- **Raster historical maps** (georeferenced period sheets). Wonderful as
  overlays for specific battles and worth adding later as a layer, but not a
  basemap: inconsistent scales, heavy, and unreadable at campaign zoom.
- **Hand-drawn SVG geography** (the PoC). No zoom, no other regions, every
  new battle is a new drawing.
- **A full OpenStreetMap planet extract at all zooms.** Tens of GB; the
  per-era regional extracts give the same result for a few hundred MB.

## Implementation note (2026-08-22, `sand-a55.9` / `sand-a55.10`)

- Basemap tiles: a Protomaps planet build (`build.protomaps.com/20260821.pmtiles`,
  tile schema v4, OpenStreetMap © ODbL) extracted with `scripts/tiles-extract.sh`
  and uploaded to the assets bucket; the app reads `/assets/tiles/…` through the
  `pmtiles://` protocol. Extracts, newest first:
  - `central-europe-z10.pmtiles` (bbox −1.5,42 → 24,56, z≤10, 541 MB) — **current
    default** (`sand-pmz.6`, 2026-08-23). The Western-Europe archive stopped at
    10.5°E/46°N, so the Tannenberg chapter in East Prussia and the July Crisis
    at Sarajevo drew as an empty field with place labels. Superseding it under a
    new name rather than re-extracting in place keeps the name honest and avoids
    serving a stale copy from the 24-hour `max-age` on the old URL. PMTiles is
    range-read, so the extra extent costs storage, not per-viewer bandwidth.
  - `western-europe-z10.pmtiles` (bbox −1.5,46 → 10.5,53, z≤10, 172 MB) — the
    original extract, retained in the bucket and no longer referenced. Styled by
  `protomaps-themes-base` v4 with the muted palette in `src/engine/map/style.ts`
  (replaced by the design-system map style, `sand-neh.2`).
- Borders: `npm run borders` builds one world file per era year from
  aourednik/historical-basemaps (GPL-3.0); `content/shared/geo/borders/README.md`
  lists years, caveats and attribution. Drawn by `src/engine/map/borders.ts`.
- deck.gl (`MapboxOverlay`, interleaved) is mounted by `MapView` for the data
  layers of `sand-a55.11`; `MapHandle.flyTo/fitRegion` is the camera API for
  tours and zoom-ins.

## Consequences

- Hosting must serve large files with range requests (see 0004 — S3 and
  CloudFront do).
- A data pipeline (`sand-a55.10`) fetches and simplifies borders
  reproducibly; a second one builds the PMTiles extracts.
- The map style is a designed artefact with light and dark variants
  (`sand-neh.2`).
- Packs declare a region, a zoom range and a border year; the engine loads
  accordingly.
- Period place names (Lemberg/Lwów/Lviv, Port Arthur/Lüshun) come from the
  shared gazetteer, not the basemap.
