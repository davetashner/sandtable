# The Western Front, snapshot by snapshot

Where the front line ran, from the day it became continuous to the day the guns
stopped: **25 November 1914 to 11 November 1918**, in twenty dated snapshots.
Story: `sand-g80.1`. It is the backbone of the 1915–18 packs — every battle from
Second Ypres to the Armistice is a local disturbance of this line — and it is
what `1914:meanwhile-epilogue` means by "the line as November left it".

| File                    | What it is                                                      |
| ----------------------- | --------------------------------------------------------------- |
| `western-front.json`    | **the authored source** — a gazetteer and one list per snapshot |
| `western-front.geojson` | generated; what the app fetches                                 |
| `manifest.json`         | generated; the snapshot table with lengths and citations        |

```bash
npm run front            # rebuild the GeoJSON and the manifest
npm run front -- --check # CI: fail if the committed GeoJSON is stale
```

Edit `western-front.json` and rerun. **Never edit the `.geojson` by hand** — the
next build overwrites it, and the point of generating it is that the historical
claim stays in a form a reviewer can argue with.

## How a snapshot is written

A snapshot is a date, a label, a summary, citations, and `through` — the
sequence of **named control points** the line ran through, north to south:

```json
{
  "date": "1917-04-05",
  "label": "The withdrawal to the Hindenburg Line",
  "precision": "medium",
  "summary": "Operation Alberich: between 16 March and 5 April …",
  "sources": [{ "source": "source:stevenson-2004", "note": "…" }],
  "through": ["nieuwpoort", "sint-joris", "…", "pfetterhouse"]
}
```

Each key is an entry in the `gazetteer` at the top of the file, which gives its
display name and its coordinate once. So a diff between two snapshots reads as
history — `neuville-saint-vaast` becomes `avion`, and the line has crossed Vimy
Ridge — instead of four hundred changed numbers. Coordinates that also appear in
`content/shared/places/places.json` are kept identical to the registry's.

## What this is, and what it is not

**It is a schematic through cited control points, not a digitised trace.** Each
snapshot is the sequence of localities the sources record the front as running
through or immediately beside on that date, joined by straight segments. Take it
as good to **about five kilometres**. It is drawn for the campaign scale, to
answer "where was the war on this date" and "what did that offensive actually
move"; battle zoom-ins draw their own geometry and should not inherit this one.

Two consequences worth stating plainly:

- **The control points are the claim; the geometry is a rendering of it.** A
  citation supports "the line ran through Passchendaele on 10 November 1917", at
  the resolution the work gives. None of them supports a coordinate.
- **A snapshot's `precision` is about the sources, not the drawing.** `low` says
  the line is fixed loosely enough that the map should say so — the app draws
  those dashed. `1918-10-20`, in the middle of a retreat that moved daily, is
  the standing example.

Digitising the official-history map plates (Edmonds' map volumes, the AFGG
_cartes_, the Reichsarchiv sketches) would replace this with a real trace, and
is the upgrade path; `western-front.json` is the thing to throw away when
somebody does it.

## Why the shape is a check on the history

The line's **length** is an independent test of the geometry, and the build
script prints it per snapshot into `manifest.json`:

| Snapshot                                 | Length | Why that is the right direction        |
| ---------------------------------------- | ------ | -------------------------------------- |
| 25 Nov 1914, the line reaches the sea    | 758 km | the standard figure is about 750 km    |
| 5 Apr 1917, after Alberich               | 705 km | the withdrawal shortened it by ~45 km  |
| 17 Jul 1918, the high-water mark         | 790 km | salients buy ground by adding frontage |
| 26 Sep 1918, back to the Hindenburg Line | 689 km | the salients are gone                  |
| 11 Nov 1918, the Armistice line          | 559 km | and it starts at the Dutch frontier    |

`npm run front` refuses to build a line that does not run from the northern
anchor to the Swiss frontier, that leaves a gap wider than 45 km between two
control points, that comes out outside 500–850 km, or that cites a work which is
not in `content/shared/sources/sources.json`. `scripts/front.test.ts` checks that
those checks work.

## Serving

The deploy workflows sync `content/shared/geo` to the assets bucket, so the app
fetches `/assets/geo/front/western-front.geojson` — one file, about 11 kB gzip,
fetched once. The clock picks a snapshot out of it
(`snapshotAt`, `src/engine/map/front.ts`); scrubbing the timeline does not
refetch. Nothing is drawn before the first snapshot, because before 25 November
1914 there was no continuous front to draw.

## Sources

Every snapshot cites at least one registered work, with a note saying what that
work supports. No page numbers: none of these works was read to a page for a
coordinate, and `docs/sources.md` §3 says not to write a page you did not read.
Where a work only fixes the line at the resolution of a campaign rather than a
day, the note says so.
