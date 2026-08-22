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

At the same time the map must *look like a staff map*, not a web map, and
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
  *historical-basemaps* dataset (aourednik) for each era year the roadmap
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
