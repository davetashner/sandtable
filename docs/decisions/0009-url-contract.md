# 0009 — The URL is the view: a citable deep-link contract

- **Status:** accepted
- **Date:** 2026-08-23
- **Bead:** `sand-shn.3`

## Context

Sandtable makes historical claims. A claim that cannot be pointed at cannot be
checked, and "open the app, scrub to 9 September, switch to Schlieffen's
concept, zoom into the Marne, open the Hentsch decision" is not a citation. The
bead that asks for deep links calls them "the basis for citations of the app
itself", and that is the harder requirement: not that state survives a reload,
but that a reader can put a URL in a footnote and a stranger — or the same
reader in two years — can open the exact view it names.

`src/engine/url-state.ts` already carried `t`, `branch`, `focus`, `card`,
`pick`, `tour` and `step`. Two things were missing. The on/off switches — the
commander portraits, the "Meanwhile" field filter — lived in React state, so
half of what a reader had arranged was lost on share; and every parameter the
build did not recognise was silently dropped on the next write, which meant a
link written by a newer release could be quietly demolished by an older one and
a campaign tag on a shared link would not survive the first click.

The pressure here is to keep adding parameters — one per switch, then camera,
then scroll position — until the address bar is a serialised store and no URL
can be read aloud, printed in a footnote, or diffed by eye.

## Decision

**The query string is the whole view, and it is written to be read.**

1. **Named slots for the things a reader navigated to**: `t` (the clock's now,
   ISO-8601 UTC to the second), `branch`, `focus`, `card`, `pick`, `tour`,
   `step`. Era-qualified ids keep their colons unencoded (`focus=1914:marne`),
   because `:` is legal in a query string and `%3A` is not readable.

2. **One parameter for every on/off switch**, `layers`, holding a
   comma-separated list of **only the switches that differ from their
   default**: `layers=commanders,-meanwhile.physics`. A leading `-` turns an
   on-by-default layer off. Names are lower-case dotted paths
   (`meanwhile.biology-medicine`); malformed tokens and repeated names are
   dropped on read. The engine holds no defaults — the app asks `layerOn` and
   `withLayer` about them — so a layer that changes its default later does not
   invalidate the links already written.

3. **The ordinary view has no parameters at all.** Anything sitting at its
   default is absent, not written as `off`. This is what keeps a shared link
   short: the deepest state this pack can reach — time, branch, focus, card,
   pick, tour step and two layer switches — is under 300 characters on the
   production origin, and the test says so.

4. **Unknown parameters are carried through untouched**, in the order they
   arrived. A state write re-emits them after the known slots. Old links, links
   from a newer release, and tracking or campaign parameters all survive.

5. **The camera is not in the URL.** Centre, zoom, bearing and pitch follow
   from the focus, the tour step and the pack; putting them in the URL would
   let a link name a view the content does not endorse, and would double the
   length of every link to buy it.

6. **The link is copyable in one gesture**: a `⧉` glyph in the header row
   copies `window.location.href` exactly as the address bar shows it, which is
   why the app writes with `replaceState` on every change rather than at share
   time. There is no share panel — ADR 0006 permits a glyph or a mode, and
   nothing else.

## Alternatives considered

- **One parameter per switch** (`commanders=1&meanwhile=physics,ideas`).
  Reads well with two switches and badly with ten, and each new layer becomes a
  new name in the contract rather than a new value in an existing one.
- **A serialised blob** (`?v=eyJ0Ijoi…`). Short-ish and opaque: unreadable in a
  footnote, undiffable, and impossible to hand-edit — and it makes every
  addition a versioning problem instead of an ignored parameter.
- **The hash fragment instead of the query string.** Never sent to the server,
  which sounds like a privacy win, but this is a static site with no server to
  hide from, and query strings are what link previews, analytics and readers'
  expectations are built around.
- **Camera in the URL.** Rejected under 5 above.
- **`history.pushState` per change** so Back retraces the reading. A playing
  clock would write hundreds of entries; Back must leave the app, not step
  through a scrub.

## Amendment: `pack` is not a slot (2026-08-28, `sand-shn.1`)

The atlas of eras made one era per page load real, and the era is named in the
URL as `?pack=<id>`. It is deliberately **not** added to `KNOWN`, and that is
the decision rather than an omission.

`pack` selects **which document is loaded**, not a state inside one. It is read
before React exists — by the four-line boot script in `<head>`, which has to
resolve it to start the fetch, and again by `pack-loader.ts`, which resolves it
the same way so the request the browser started and the one the loader awaits
cannot disagree. Making it a known slot would put it in `formatViewState`, and
then every state write would carry it, and rule 3 above — the ordinary view has
no parameters at all — would be false for every reader of the seed era.

As an unknown parameter it round-trips as an `extra` and is re-emitted after
the known slots, which is exactly the behaviour needed: scrubbing the clock
inside the 1915 pack keeps the reader in the 1915 pack. That is the migration
path this record already described, used as the destination rather than as a
waypoint. `src/engine/url-state.test.ts` holds it.

Two things follow. An id the build never emitted falls back to the seed era
rather than to an empty screen, so a stale or mistyped link still opens
something. And the default era is addressed as `/`, not `/?pack=…`, so every
link written before the atlas existed still means what it meant.

## Amendment: `pack` is a slot after all, because `/` is the atlas (2026-08-28, ADR 0024)

The amendment above is superseded on its central point, and only that point.
`/` no longer opens the seed era: a URL that fills no slot of this contract
opens the atlas of eras. That makes the last paragraph above false in both its
halves. The default era is **not** addressed as `/`, and a campaign link that
names no era no longer means "the seed era" — it means "whichever era is seeded
when you click it", which is a link that breaks silently and in the worst way
the first time the seed changes.

So `pack` is a named slot, written first, and written into every campaign URL.
The reasoning above about `formatViewState` was right and its conclusion has
inverted: it _is_ now in every state write, deliberately. Rule 3 is the price —
the ordinary view of a campaign is `/?pack=1914-schlieffen-marne` rather than
`/`, and the 300-character bound still holds with room to spare.

Nothing else moves. Unknown parameters are still `extra` and still round-trip;
an id the build never emitted still falls back to the seed era rather than to
an empty screen, and the address is then corrected to name the era actually
served. A link written before the atlas existed still opens the view it meant,
and gains its era on the first state write. ADR 0024 has the full table of what
each published link shape does.

## Consequences

- Every new on/off switch registers a **layer name and a default** and goes
  through `setLayer`; it does not get a parameter of its own. Names are part of
  the contract — renaming one breaks links already in footnotes, so a rename
  needs an alias or a new record.
- Adding a new named slot means adding it to `KNOWN` in `url-state.ts`; until
  then it round-trips as an unknown parameter, which is the intended migration
  path rather than a bug.
- The citation format for a view (`docs/sources.md` is about sources cited _by_
  the app; citing the app is the other direction) can now name a URL, and the
  round-trip test in `src/engine/url-state.test.ts` is what keeps that promise
  honest.
- Anything a reader can arrange that is _not_ in the query string — the score's
  on/off, the dismissed opening — is a per-viewer preference in
  `localStorage`/`sessionStorage` by design: a shared link should not start
  music in a stranger's browser.
