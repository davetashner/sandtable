# 0001 — Application stack: Vite + TypeScript + React; MapLibre GL + deck.gl

- **Status:** accepted
- **Date:** 2026-08-22
- **Bead:** `sand-a55.1`

## Context

Sandtable is a client-only, map-centric, animation-heavy web application that
must live for years, host many historical eras as data, and be maintained
largely by AI agents working from a backlog. The proof of concept
(`poc/schlieffen-plan.html`) is a single file with an SVG schematic map and
hand-rolled path animation; it proved the idea but cannot zoom to real battle
geography or carry many formations.

The stack has to do four things well: render real geography with period
overlays, animate many time-stamped routes smoothly, drive everything from one
timeline, and stay boring enough that the largest possible pool of libraries,
examples and agent knowledge applies.

## Decision

- **Build tool / language:** Vite + TypeScript. Strict mode; ESLint + Prettier.
- **UI:** React for the shell, panels and controls. State for time, branch,
  focus and layers lives in a small store (Zustand or equivalent) and is
  mirrored to the URL.
- **Map:** MapLibre GL JS for the basemap (vector tiles, custom style, camera
  API for tours and zoom-ins).
- **Data layers:** deck.gl over MapLibre for everything that moves or is
  numerous — `TripsLayer` for time-revealed routes, `PathLayer`/`ArcLayer`
  for static and rail movements, `IconLayer`/`TextLayer` for tokens and
  labels, `GeoJsonLayer` for borders, fronts and fortress rings.
- **Charts and small graphics:** D3 only for non-map visuals (the two clocks,
  force-ratio bars, causal graph). SVG inline for concept-diagram insets.
- **Content:** scenario packs as JSON + Markdown (see 0003), validated by
  JSON Schema generated from the TypeScript types.
- **Tests:** Vitest for units, Playwright for visual regression of key scenes.

## Alternatives considered

- **Svelte / SvelteKit.** Lighter runtime and excellent for motion, but a
  thinner ecosystem for MapLibre/deck.gl bindings and fewer agent-familiar
  patterns. Rejected on ecosystem breadth, not quality.
- **Pure D3 + SVG schematic (the PoC approach).** Fast to iterate and
  beautiful at campaign scale; cannot zoom into real terrain, and SVG path
  tricks do not scale to fifteen armies plus battle-level units. Kept only as
  the concept-diagram inset.
- **Leaflet.** Raster-era API; weak for vector styling and large animated
  layers.
- **Game engine / WebGL from scratch (Three.js, PixiJS).** Maximum control,
  but we would rebuild map projection, tiles, labels and camera work that
  MapLibre already does well.
- **Next.js or another server framework.** No server is needed; a static
  build is simpler, cheaper and easier to host (see 0004).

## Consequences

- Everything renders client-side; content and tiles are static files.
- deck.gl's `TripsLayer` defines the route data shape (arrays of
  `[lng, lat, timestamp]`), which the scenario schema adopts directly.
- MapLibre's style JSON becomes a design-system artefact (`sand-neh.2`).
- Bundle discipline matters: deck.gl and MapLibre are large; they load once
  and packs load lazily.
- Revisit only if a non-map era (e.g. a purely causal/political scenario)
  becomes the dominant use — even then the map remains the spine.
