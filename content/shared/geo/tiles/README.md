# Basemap archives

One PMTiles archive per region a pack may be drawn on, named in `pack.json`:

```json
{ "tiles": "central-pacific-z10" }
```

A pack names an **archive**, never a URL. `src/engine/map/tiles.ts` resolves the
name to `/assets/tiles/<name>.pmtiles`, which is where the assets bucket serves
it from (ADR 0002/0004) and where `scripts/tiles-extract.sh` puts it. That path
has already changed once; content that carried it would have carried the old one
forever.

**Nothing lives in this directory but the record.** The archives themselves are
hundreds of megabytes of OpenStreetMap data and are never tracked in git — they
are extracted from the Protomaps daily planet build and uploaded straight to the
bucket. `manifest.json` is what this repository knows about them: bbox, maximum
zoom, whether it has been uploaded, and what it serves.

## Adding one

1. Decide the bbox and the maximum zoom, and write both into
   `docs/decisions/0002-geography.md` with the packs they serve.
2. Add an entry here with `"status": "planned"`.
3. Add the name to `TILE_ARCHIVES` in `src/packs/schema/tiles.ts` and run
   `npm run schema`. The list is closed on purpose: an archive that is not on it
   is a typo, and the schema says so in the editor, in the validator and again in
   the browser. `src/engine/map/tiles.test.ts` fails if this file and that list
   disagree.
4. Run `scripts/tiles-extract.sh <name> <bbox> <maxzoom>` (needs the `pmtiles`
   CLI and the `sandtable-deployer` profile), then set `"status": "uploaded"` and
   record the size.

## Two scales

The Pacific packs need both, and they are not the same map at different zooms —
one is nearly all water and the other is nearly all beach:

- **theatre** (`z≤6`/`z≤10`) — the campaign: an ocean crossing, a front, a
  continent. Named by the pack.
- **assault** (`z≤13`/`z≤14`) — one island, a few tens of kilometres on a side.
  Named by the battle: `battles.json` carries its own `tiles`, because Betio at
  z14 is not inside `central-pacific-z10`.

`maxzoom` is a floor, not a ceiling on what a reader sees: MapLibre overzooms
past it, so z14 on Betio is crisp to about 1:15 000 and stretched below that.

## Before they are uploaded

Most entries here are `planned` (`sand-lry.17`). Naming one is still correct:
the request 404s, and the map says so — a line over the terrain reading that the
basemap for this campaign is not on the table, with the borders, places and
movement drawn without it. That is the intended degradation, and it is why a
pack should name the archive it wants rather than settle for the one that
happens to be in the bucket.
