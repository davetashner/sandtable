# src/engine

Era-agnostic runtime. Nothing in here knows about 1914; it renders whatever
scenario pack it is given.

- `clock.ts` — the single source of truth for "now": `createClock({ range })`
  with seek/step/play/pause/setSpeed/setRange, a requestAnimationFrame loop
  while playing, speed in simulated ms per real second, presets and keyboard
  steps that scale with the range (hours for a battle, days for a campaign,
  weeks for an era). Framework-free; tests inject the scheduler.
- `ticks.ts` — nice axis ticks (15 min → 10 years, UTC calendar-aware) and the
  labels for "now" (`Day 20 — Monday, 24 August 1914, 12:00`).
- `url-state.ts` — deep links (ADR 0009): `?t=…&branch=…&focus=…&layers=…` ⇄
  clock + view slots, throttled while playing (`bindUrlState`). Every on/off
  switch shares one `layers` parameter that lists only the deviations from
  default (`commanders`, `-meanwhile.physics`); ask `layerOn` / `withLayer`
  rather than reading it. Parameters this build does not know are carried
  through untouched, so an old or newer link is never demolished by a write.
- `ClockContext.tsx` — React binding: `<ClockProvider range>`, `useClock()`
  (re-renders on ticks), `useClockControls()` (stable), `useViewState()`.

- `map/` — MapLibre GL + PMTiles + deck.gl: `style.ts` (themed Protomaps v4
  basemap from our own archive), `borders.ts` (historical borders per year),
  `MapView.tsx` (the surface; `MapHandle.flyTo/fitRegion/setDeckLayers` for
  tours, zoom-ins and data layers).

- `focus.ts` — zoom-in logic: a battle's clock range, the instant to enter at,
  the instant to restore on exit; the App's FocusController applies it from
  the URL's `focus` slot.
- `beats.ts` — which narrative beat is on now (time × branch × focus) and how a
  citation reads; used by the dossier.
- `confidence.ts` — the pack's one vocabulary for how sure it is
  (`high | medium | low | contested`), the ordering (`weakest`), the rule that
  a waypoint inherits its route's or track's confidence unless it carries its
  own (`waypointConfidence`), what the clock is between at an instant
  (`confidenceAt`), and the question the map asks of a position
  (`isApproximate`) — `sand-23b.4`.
- `layers/` — data layers on the deck.gl overlay: `places.ts` (cities and
  fortress rings from the shared registry), `movement.ts`
  (composeRoutes per branch — a formation's route legs joined into one path,
  each keeping its own mode and the confidence of each of its waypoints —
  positionAt, ghost + sliced-path trail + tokens + labels), `approx-halo.ts`
  (the dashed ring a `low` or `contested` position wears, as a mask icon so
  its colour still comes from the tokens), `colors.ts` (design tokens → RGBA
  per side), `useMovementLayers`.

Coming: branches
(`sand-a55.13`) and the focus/zoom-in mechanism (`sand-a55.14`), which swaps
the clock's range for a battle's.
