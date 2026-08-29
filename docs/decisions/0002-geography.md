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
  needs (1870, 1871, 1905, 1914, 1918, 1931, 1939, 1941, 1945, 1950),
  simplified for the web, stored in
  `content/shared/geo/borders/<year>.geojson`, selected by the pack's
  declared year. Known inaccuracies are documented and corrected
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
  - The six theatre-scale extracts of the 2026-08-27 note below were run and
    uploaded on 2026-08-28 from build `20260828` (`sand-lry.17`); their bboxes
    and what each serves are in that note's table, and their real sizes are
    `eastern-europe-z10` 613 MB, `east-asia-z10` 159 MB, `world-z6` 43 MB,
    `philippines-z10` 14 MB, `sw-pacific-z10` 9 MB, `central-pacific-z10`
    3 MB. The spread is the point: a European extract is expensive because
    Europe is dense and the archive keeps every zoom below `maxzoom`, while an
    archive that is nine tenths ocean costs almost nothing — the whole Central
    Pacific is 0.5% of Central Europe, and the whole world at z≤6 is 8% of it.
  - The eight assault-scale extracts are still unrun; each waits for the pack
    that needs it (`sand-lry.17`).
- Borders: `npm run borders` builds one world file per era year from
  aourednik/historical-basemaps (GPL-3.0); `content/shared/geo/borders/README.md`
  lists years, caveats and attribution. Drawn by `src/engine/map/borders.ts`.
- deck.gl (`MapboxOverlay`, interleaved) is mounted by `MapView` for the data
  layers of `sand-a55.11`; `MapHandle.flyTo/fitRegion` is the camera API for
  tours and zoom-ins.

## Implementation note (2026-08-27, `sand-en0.1` / `sand-lry.1`)

Extending the geography east and then across the Pacific. Every `pmtiles
extract` below needs the `pmtiles` CLI and the `sandtable-deployer` profile, so
they are collected as a manual run at the end of this note (`sand-lry.17`).
Nothing here had been uploaded when this note was written; the theatre-scale
half was run on 2026-08-28, and the assault-scale half still waits for the
packs that need it.

### What the pinned borders dataset actually has

Checked before promising a year, by listing `geojson/` at
`aourednik/historical-basemaps@62d8f1a` and testing which polygon contains each
place that matters. The files near the years these arcs need are **1900, 1914,
1920, 1930, 1938, 1945, 1960** — there is no 1931, no 1941 and no 1944.

- **The Eastern Front needs no new year.** `world_1914` is right where it has to
  be: Lemberg and Przemyśl inside the Austro-Hungarian Empire as one polity,
  Königsberg and Tannenberg inside the German Empire, Warsaw and Riga inside the
  Russian Empire, Belgrade in Serbia, Sarajevo in Austria-Hungary, Bucharest in
  Romania, with Montenegro, Bulgaria and the Ottoman Empire all present. The
  committed `1914.geojson` already serves the whole Eastern arc; `sand-en0.1`'s
  border half was done before it was asked for. (One gap: the Ottoman polygon
  does not reach Constantinople, so a Gallipoli or Thrace pack must draw the
  straits itself.)
- **1931 ← `world_1930`**, added. Right for the eve of Mukden: Manchuria is its
  own polity, not yet Manchukuo, and Korea and Formosa are inside the Empire of
  Japan. **Badly wrong for Russia** — Moscow, Minsk, Kyiv and Stalingrad fall
  inside a polygon named "White Russia" and Vladivostok inside the "Far Eastern
  SSR", Civil-War entities gone since 1922, with no USSR west of the Urals.
  East Asia only.
- **1941 ← `world_1938`**, added; the only candidate between 1930 and 1945. It
  is right about the colonial frame the war was fought over — the Philippines
  under the United States, the Netherlands East Indies under the Netherlands,
  Malaya and the Gilberts under the United Kingdom, Guam American, Saipan and
  the mandate Japanese, Indochina French with Cochin China and Cambodia already
  marked subject to Japan. It is wrong in three ways: **Manchukuo is not drawn**
  (Mukden, Harbin and Port Arthur fall inside "Empire of Japan", so a puppet
  state reads as annexation), there is **no Republic of China** (only "Chinese
  warlords"), and Europe is the 1938 map.
- **1944: not added, on purpose.** Upstream jumps 1938 → 1945 and `world_1945`
  is a map of the _aftermath_ — Germany in four occupation zones, "Japan (USA)",
  "Korea (USA)" and "Korea (USSR)". The empire the Marianas and the Philippines
  were fought over has already been dissolved on it. A 1944 pack declares
  `borderYear: 1941` and draws the Japanese perimeter as its own dated series,
  which is the answer the 1918 caveat already gives for armistice day
  (`sand-lry.19`).
- **Simplification is the Pacific's real border problem.** The pipeline's
  `-simplify 12%` is a land-map setting: it pulls every coastline inward, which
  costs nothing on the Rhine and deletes islands. At 12% only Saipan and Guam
  still contain their own place; Formosa, Oahu, Okinawa and Port Arthur are all
  gone. The Pacific years are therefore built at **50%** (391 kB rather than
  143 kB, fetched from the assets bucket and not bundled — ADR 0018), which
  brings those four back. 80% adds Iwo Jima and nothing else, for another
  186 kB. Even at 50%, **Truk, Palau, Kwajalein, Tarawa, Wake, Midway and
  Rabaul have no polygon at any setting**, and neither Singapore nor Batavia
  falls inside one. In the Pacific the borders layer is basin-scale context;
  the islands come from the tiles.

### The extracts

ADR 0019 hands the scale jump to this plan rather than to the schema — "a pack
that contains both a 2,100 km ocean crossing and a 3.2 km island is asking the
camera and the tile extracts for three orders of magnitude" — so here is what
that costs in archives.

Two scales, because the Pacific has two. An ocean crossing is measured in
thousands of kilometres (Pearl Harbor to Midway is 2,100 km); an assault is
measured in hundreds of metres (Betio is 3.2 km long, and the pier the first
waves waded from is 500 m of it). No single archive serves both, and unlike
Europe the two are not the same map at different zooms — one is nearly all
water and the other is nearly all beach.

Three things make ocean extracts cheap where European ones are not: an ocean
tile carries almost no features, `pmtiles extract` keeps **every** zoom up to
`--maxzoom` inside the bbox (so a theatre archive is self-sufficient from the
whole-theatre view down), and PMTiles is range-read, so extent costs storage
rather than per-viewer bandwidth.

The exception that forces a world extract: **the Pacific crosses the
antimeridian.** Midway sits at −177.4° and Tarawa at +172.9°, ten degrees apart
and on opposite sides of it, so no `west,south,east,north` box holds the
strategic Pacific. The whole-world low-zoom archive this ADR decided on and
never built is that box, and it earns its keep three ways over: the atlas
landing view, every Pacific crossing, and the continental sweep of the Russian
Civil War (`sand-ekc.8`, which reaches from Arkhangelsk to Vladivostok).

**Theatre scale** — run these first; they are what the waiting beads need.

| Archive               | bbox (W,S,E,N)    | z≤  | Serves                                                                                                                                                                  |
| --------------------- | ----------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world-z6`            | `-180,-85,180,85` | 6   | the atlas landing view; every Pacific crossing; the Russian Civil War's continental sweep                                                                               |
| `eastern-europe-z10`  | `13,40,46,61`     | 10  | `sand-en0.*` (Tannenberg, Galicia, Serbia, Gorlice–Tarnów, Brusilov, Romania, Riga), `sand-ekc.7/.8`, `sand-c6p.*` (Barbarossa, Stalingrad, Kursk, Bagration to Berlin) |
| `east-asia-z10`       | `112,20,146,47`   | 10  | `sand-lry.4` (Mukden), the Home Islands, Formosa, Korea, Okinawa at theatre scale — **and `sand-6dh`** (Port Arthur, Mukden, Tsushima, Vladivostok)                     |
| `central-pacific-z10` | `130,-2,178,30`   | 10  | `sand-lry.8/.9/.10/.12` — the Gilberts, Marshalls, Carolines, Palaus, Marianas, Bonins, Philippine Sea                                                                  |
| `sw-pacific-z10`      | `140,-18,168,2`   | 10  | `sand-lry.7` — Guadalcanal, the Slot, Rabaul, Bougainville, New Guinea, the Coral Sea                                                                                   |
| `philippines-z10`     | `116,4,128,20`    | 10  | `sand-lry.11` — Leyte Gulf, Surigao Strait, Cape Engaño, Luzon, Lingayen, Corregidor                                                                                    |

`eastern-europe-z10` overlaps `central-europe-z10` (which stops at 24°E/56°N,
short of Lemberg, Lutsk, Bucharest, Riga and Petrograd) from 13°E to 24°E, and
the seam is deliberately wide. Its own edges cut two things off, both noted
rather than paid for: Baku (49.9°E) and Arkhangelsk (64.5°N), which the Civil
War reaches and `world-z6` covers instead.

**Assault scale** — one per battle, run when that pack is authored. Each is a
box a few tens of kilometres on a side, so each archive is small.

| Archive           | bbox (W,S,E,N)                | z≤  | Serves                                                             |
| ----------------- | ----------------------------- | --- | ------------------------------------------------------------------ |
| `oahu-z13`        | `-158.4,21.2,-157.6,21.8`     | 13  | `sand-lry.5` — Pearl Harbor, Ford Island, Hickam, Wheeler, Kaneohe |
| `midway-z13`      | `-177.45,28.14,-177.28,28.28` | 13  | `sand-lry.6` — Sand and Eastern Islands                            |
| `guadalcanal-z13` | `159.6,-9.85,160.35,-9.2`     | 13  | `sand-lry.7` — Henderson Field, the Tenaru, Bloody Ridge, Savo     |
| `betio-z14`       | `172.88,1.3,173.08,1.65`      | 14  | `sand-lry.8` — Betio, the pier, the reef, the lagoon               |
| `peleliu-z14`     | `134.1,6.86,134.32,7.1`       | 14  | `sand-lry.10` — Umurbrogol, the airfield, Angaur                   |
| `iwo-jima-z14`    | `141.26,24.71,141.42,24.85`   | 14  | `sand-lry.12` — Suribachi, the Motoyama airfields                  |
| `okinawa-z13`     | `127.55,26.0,128.4,26.9`      | 13  | `sand-lry.13` — the Hagushi beaches, Kadena, the Shuri line        |
| `port-arthur-z14` | `121.14,38.75,121.42,38.95`   | 14  | `sand-6dh.3` — the siege, 203 Metre Hill, the inner harbour        |

Two caveats on the small ones. OSM coverage of an uninhabited former battlefield
is thin — Iwo Jima has a coastline, Suribachi and the airstrips and little else —
so an assault map's detail comes from the pack, not the basemap. And the
`maxzoom` is a floor, not a ceiling on what a reader sees: MapLibre overzooms
past it, so z14 on Betio means crisp to about 1:15 000 and stretched below.

### The gap that made these unreachable — closed by `sand-lry.18`

`src/engine/map/style.ts` exported `DEFAULT_TILES_URL` and `buildStyle` took a
`tilesUrl`, and `MapView`/`MapSurface` threaded one through — but **nothing set
it**. There was no `tiles` field in `pack.json`, so every pack resolved to the
one default and uploading these archives would not have been enough: until a
pack could name one, the Pacific would have rendered as central Europe. There
is one now, and it settles three things.

**A pack names an archive, not a URL.** `"tiles": "central-pacific-z10"`.
Where the archives are served from is a deployment fact — this decision put
them behind `/assets/`, ADR 0004 owns that path, and it has changed once
already — and a URL in `pack.json` writes that fact into every pack ever
authored. `src/engine/map/tiles.ts` is the one module that resolves the name;
content says which map it wants. The names are a **closed list**
(`src/packs/schema/tiles.ts`, a Zod enum, so it reaches the generated JSON
Schema too), because an archive that is not on it is a typo rather than an
upload we have not done: the extracts in the tables above were all written down
before they were extracted, so the list costs nothing to keep and catches the
mistake in the editor, in the validator and again in the browser. Provenance —
bbox, maximum zoom, whether it is uploaded, what it serves — lives in
`content/shared/geo/tiles/manifest.json`, the way border years' provenance
lives beside the border files; a test holds the manifest and the enum in step.

**A battle gets one too**, which is what the assault-scale table above is for:
Betio at z14 is not inside `central-pacific-z10`, and the two are not the same
map at different zooms. `Battle.tiles` applies while that zoom-in is open and
nowhere else; absent, the campaign's archive stands. It was built with the
pack's field rather than deferred, because the plumbing is the same prop and
deferring it would have left the assault extracts as archives nothing could
reach — the exact shape of the gap this note is about.

**A missing archive degrades to a legible map, not a blank one.** Naming an
archive that is not uploaded yet is legitimate — most of the list is
`sand-lry.17`, a manual run — so the failure is a state to design, not an
error to avoid. MapLibre reports the failed range requests through `error`
with the source id; `MapView` listens, turns the flood into one console warning
and one line laid over the terrain — _the basemap for this map is not on the
table yet_ — and leaves the borders, the places and the movement drawing
underneath. That follows PR #139's rule for the failed pack fetch: the failure
gets a face, in the place that knows about it, at the size of the actual
damage. A campaign without its terrain is still a campaign; it does not want a
failure page.

Backwards compatibility is the reason `tiles` is optional: a pack that names
none is drawn on `central-europe-z10`, which is what it was drawn on before,
so 1914 and 1915 do not move. Until the archives were in the bucket the eras
already merged declared nothing, because naming one would have traded a partial
basemap for a notice; they declare now (`sand-lry.21`, the note below).

### The manual run

Every command below needs the `pmtiles` CLI (`brew install pmtiles`) and the
`sandtable-deployer` AWS profile. `scripts/tiles-extract.sh` extracts and
uploads in one step; sizes are unknown until it runs, and the `Extracts` list
above should be amended with each archive's real size afterwards.

**The theatre-scale block was run on 2026-08-28** against Protomaps build
`20260828` (`planetiler:osm:osmosisreplicationtime 2026-08-28T04:00:00Z`, which
is what `pmtiles show` on any of the six reports and the only build stamp the
archives carry). All six answer a range request through CloudFront as
`application/vnd.pmtiles`, and each one's bounds and `max zoom` read back
exactly the bbox and zoom in the table above. Sizes are in the `Extracts` list.

```bash
# Theatre scale — run these first; the waiting beads need them.
scripts/tiles-extract.sh world-z6            -180,-85,180,85   6
scripts/tiles-extract.sh eastern-europe-z10  13,40,46,61       10
scripts/tiles-extract.sh east-asia-z10       112,20,146,47     10
scripts/tiles-extract.sh central-pacific-z10 130,-2,178,30     10
scripts/tiles-extract.sh sw-pacific-z10      140,-18,168,2     10
scripts/tiles-extract.sh philippines-z10     116,4,128,20      10

# Assault scale — run each when its pack is authored.
scripts/tiles-extract.sh oahu-z13        -158.4,21.2,-157.6,21.8     13
scripts/tiles-extract.sh midway-z13      -177.45,28.14,-177.28,28.28 13
scripts/tiles-extract.sh guadalcanal-z13 159.6,-9.85,160.35,-9.2     13
scripts/tiles-extract.sh betio-z14       172.88,1.3,173.08,1.65      14
scripts/tiles-extract.sh peleliu-z14     134.1,6.86,134.32,7.1       14
scripts/tiles-extract.sh iwo-jima-z14    141.26,24.71,141.42,24.85   14
scripts/tiles-extract.sh okinawa-z13     127.55,26.0,128.4,26.9      13
scripts/tiles-extract.sh port-arthur-z14 121.14,38.75,121.42,38.95   14
```

The borders half needs no manual step: `npm run borders` has already written
`1931.geojson` and `1941.geojson`, and the deploy workflows sync
`content/shared/geo` to the assets bucket on every push to `main`.

### The ocean look

`sand-lry.1` asks whether the style built for land survives a map that is
mostly water, and the answer is no. The palette pairs `--sea` with `--land` at
a contrast ratio of **1.20:1** in light and **1.24:1** in dark; the `water`
layer against `earth` is 1.38:1 and 1.17:1. On the Marne that is right — the
coast is an edge of a shape you are already reading from rivers, roads and
towns. On a map where the ocean is nine tenths of the frame and the subject is
a 3 km atoll, it leaves the one thing that matters indistinguishable from the
background, and Protomaps has no bathymetry to give the water any structure of
its own. Assessed and not fixed here: `--sea` and `--land` are design tokens
that every scene in the visual baseline is drawn against, so changing them is a
design decision under `sand-neh`, not a side effect of a geography bead. Filed
as `sand-neh.31`.

## Implementation note (2026-08-29, `sand-lry.21`)

The six theatre archives are in the bucket, so every merged era now names the
map it is drawn on. The choice was made against each pack's `region` rather
than its title, because an era naming an archive that does not contain its
region renders blank in the corners and reports nothing: the notice in
`MapView` fires on a **failed request**, and a request that succeeds and
returns no tiles for that corner is indistinguishable from ocean.

| Era                       | `region`            | `tiles`              |
| ------------------------- | ------------------- | -------------------- |
| `1914-schlieffen-marne`   | `0,47 → 9,52`       | `central-europe-z10` |
| `1915-attrition`          | `1.5,47 → 8.5,51.6` | `central-europe-z10` |
| `1917-russian-revolution` | `7,46 → 42,67`      | `eastern-europe-z10` |
| `1918-russian-civil-war`  | `20,38 → 133,70.5`  | `world-z6`           |
| `1941-pearl-harbor`       | `99,−12 → −155,52`  | `world-z6`           |

**1914 and 1915 declare the default.** Both regions sit inside `−1.5,42 →
24,56` with room to spare, and so does every place either pack reaches — 1914's
widest are Amiens at 2.3°E and Gumbinnen at 22.2°E, Sarajevo at 43.9°N and
Königsberg at 54.7°N. Nothing moves; the point of writing it down is that the
map they are drawn on becomes a stated choice rather than a fallback, which is
what makes changing the default a decision someone has to make on purpose.

**1917 declares `eastern-europe-z10`, and its region is wider than that
archive.** This is the one place the rule above is knowingly bent, so it is
worth being exact about what is off the map. The pack's region reaches to 7°E
and 67°N for Lenin's April journey — Zürich to Haparanda to the Finland
Station — and the archive starts at 13°E and stops at 61°N. But the journey is
narrated, not plotted: `place:zurich` appears in one beat's prose and nowhere
in a position, and there is no Haparanda or Tornio in the pack at all. Every
coordinate the pack actually draws — sixteen places, one rail route, three
battle zoom-ins — lies between 28.3°E and 30.5°E and between 53.9°N and 60.0°N,
which is the middle of the archive. The alternative was `world-z6`, and it is
not a real alternative: this pack's zoom-ins are Petrograd at z11.2 and z12.2,
about six kilometres of city, and z6 tiles overzoomed six levels have no
streets in them to stretch. The default is worse still — `central-europe-z10`
stops at 24°E, which excludes _every_ position in the pack.

**1918 declares `world-z6`, and the low zoom is the honest answer.** The Civil
War runs Warsaw (21.0°E) to Vladivostok (131.9°E) and Krasnovodsk (40.0°N) to
Murmansk (69.0°N) — 111° of longitude. No regional box holds it and none was
ever going to: `eastern-europe-z10` stops at 46°E, short of Omsk, Kazan's
eastern approaches, the whole Siberian intervention and the Trans-Siberian the
Czechoslovak Legion was strung along, which is the pack's spine. The cost is
paid at the other end. Three of its four zoom-ins are city-scale —
Brest-Litovsk at z8, Warsaw at z7.6, Kronstadt at z10.2 — and all three fall
inside `eastern-europe-z10`, so on that archive they would have been crisp and
the rest of the war would have been an empty field. Choosing `world-z6` is
choosing a coarse Kronstadt over a blank Siberia, which is the right way round
for a pack whose subject is distance. If the Kronstadt zoom-in becomes
unreadable, the fix is `Battle.tiles` on that one battle, not a different
archive for the pack.

**1941 declares `world-z6` because nothing else exists.** Its region crosses
the antimeridian (`99,−12 → −155,52`, 106° wide going east over the date line),
and a `west,south,east,north` box cannot hold it — that is the case this ADR
built `world-z6` for. Singapore at 103.8°E and Midway at −177.4°E are in the
same pack. The Oahu zoom-in at z10 is four levels of overzoom and will want
`oahu-z13` on `Battle.tiles`; that extract is assault scale and unrun, so it
waits for `sand-lry.5`.

## Consequences

- Hosting must serve large files with range requests (see 0004 — S3 and
  CloudFront do).
- A data pipeline (`sand-a55.10`) fetches and simplifies borders
  reproducibly; a second one builds the PMTiles extracts.
- The map style is a designed artefact with light and dark variants
  (`sand-neh.2`).
- Packs declare a region, a zoom range, a border year and a tile archive
  (`sand-lry.18`); the engine loads accordingly.
- Period place names (Lemberg/Lwów/Lviv, Port Arthur/Lüshun) come from the
  shared gazetteer, not the basemap.
