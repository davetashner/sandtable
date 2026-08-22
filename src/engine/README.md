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
- `url-state.ts` — deep links: `?t=…&branch=…&focus=…` ⇄ clock + view slots,
  throttled while playing (`bindUrlState`).
- `ClockContext.tsx` — React binding: `<ClockProvider range>`, `useClock()`
  (re-renders on ticks), `useClockControls()` (stable), `useViewState()`.

- `map/` — MapLibre GL + PMTiles + deck.gl: `style.ts` (themed Protomaps v4
  basemap from our own archive), `borders.ts` (historical borders per year),
  `MapView.tsx` (the surface; `MapHandle.flyTo/fitRegion/setDeckLayers` for
  tours, zoom-ins and data layers).

Coming: the data layers (`sand-a55.11`), branches
(`sand-a55.13`) and the focus/zoom-in mechanism (`sand-a55.14`), which swaps
the clock's range for a battle's.
