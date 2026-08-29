# 0025 — The four-second freeze is deck.gl compiling, and moving it does not help

- **Status:** accepted
- **Date:** 2026-08-29
- **Bead:** `sand-pmz.39` (measured under `sand-pmz.36`)

## Context

A reader on a phone waits about twelve and a half seconds for a map they can
touch. `sand-pmz.36` took that apart into two costs of similar size: a download
chain that does not start fetching the 400 kB map chunk until React has
rendered, and one main-thread task of roughly four and a half seconds during
which the page answers nothing — no scroll, no tap, no frame.

`sand-pmz.23` attributed that task to "MapLibre's and deck.gl's shader programs
compiling" and left the split between the two unmeasured. `sand-pmz.39` proposed
the obvious remedy: take deck.gl off the path to a first map, so MapLibre draws
the basemap, the borders, the front line and the place labels while the deck
stack is still arriving.

This record exists because that remedy was implemented, measured, and **does not
work** — and the reason it does not work is worth writing down, because it will
occur to the next person too.

## What was measured

Harness throughout: local `vite preview` (which proxies `/assets` to
production) under 4× CPU throttling and 1.6 Mbps/150 ms, 390×844, campaign view
of the 1914 pack. It reproduces the live deployment within about 10%.

**First: the split, by attaching the overlay and then not attaching it at all.**

|                  | blocked total | worst single task |
| ---------------- | ------------- | ----------------- |
| overlay attached | 7402 ms       | **4364 ms**       |
| overlay detached | 1861 ms       | **620 ms**        |

deck.gl is not a share of the shader cost. It is nearly all of it. MapLibre
alone compiles in 620 ms. The app builds **five** distinct deck layer types
across fifteen instantiations — `ScatterplotLayer` (6), `TextLayer` (4),
`IconLayer` (3), `TripsLayer` (1) and `PathLayer` (1) — and it is the distinct
types that each bring their own programs, not the instances.

**Then: deferring the attach to an idle callback with a 400 ms floor.**

|          | map-ready | overlay-ready | freeze starts | worst task |
| -------- | --------- | ------------- | ------------- | ---------- |
| before   | 8177 ms   | —             | 8840 ms       | 4364 ms    |
| deferred | 8127 ms   | 8483 ms       | 9022 ms       | 4341 ms    |

The freeze moved **182 ms later** on a 4.3 s task. That is noise.

## Why it does not work

The premise was that the freeze sat between the reader and the map. It does
not, and never did: `map-ready` was already at 8177 ms and the task already
started at 8840 ms. **The map had always painted before deck compiled.** Deck's
programs are built on the overlay's first render, which is necessarily after
the map's first paint whether the overlay is attached in the same effect or an
idle callback later.

So the deferral moves the compile from just-after-first-paint to
slightly-more-just-after-first-paint, and the reader's experience — a map, then
four and a half seconds of nothing — is unchanged.

**Deferring further would make it worse, not better.** A 4.3 s freeze during
page load is a slow load. The same freeze moved past the point where the map
looks usable lands while somebody is panning, which is a broken app rather than
a slow one. There is no delay that turns this cost into a good experience; the
cost has to get smaller.

## Decision

**Do not defer the overlay.** The attach stays where it is, in the effect that
constructs the map. The implementation was written, measured and reverted; this
record is what survives it, so the next person does not spend the afternoon
again.

**`sandtable:map-ready` keeps its current meaning** — MapLibre's style is live
and the deck overlay can project. There was going to be a second mark,
`sandtable:overlay-ready`, to name the newly-separated moment. With no
separation there is no second moment, and an extra mark whose value is always
within noise of another one is a number that invites false conclusions.

## Where the cost can actually go

Two levers, neither taken here, both now grounded rather than guessed:

**Compile less.** Five layer types is five program sets. `TripsLayer` is a
`PathLayer` subclass with its own shaders and is used once; `TextLayer` is a
composite that pulls in more than it looks like. An audit of what each type
earns is the most direct route to a smaller number, and it is content-visible
work rather than plumbing.

**Overlap the compile with the wait.** The waterfall has a structural oddity
worth naming: the main thread is essentially idle from about 4.2 s to 8.1 s,
waiting on the network, and deck's code does not arrive until 7.8 s. The window
with free CPU is exactly the window without the code. Getting the chunk in
earlier would create the chance to warm the programs during the wait — but
`sand-pmz.36` measured that a `modulepreload` buys map latency by spending
content latency (era JSON 3661 → 5200 ms), so the two halves have to be taken
together or not at all. That is a real experiment and nobody has run it.

## Consequences

- No code changes. `src/engine/map/MapView.tsx` is untouched.
- `sand-pmz.39` is closed by this record rather than by an implementation, and
  the two levers above are filed as their own work.
- The measurements in `sand-pmz.36` and here are the standing account of the
  boot path. Anyone proposing to move the map cost around should reproduce the
  harness first — the numbers here were all produced with it, and the one
  conclusion that mattered was the opposite of the one that looked obvious.
