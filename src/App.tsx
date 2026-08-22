/**
 * Application shell.
 *
 * Deliberately minimal: it asserts the three surfaces the information
 * architecture decision (sand-neh.5) commits us to — one map, one dossier,
 * one timeline — as placeholders the engine stories fill in:
 *   - map       → sand-a55.9  (MapLibre + deck.gl)
 *   - dossier   → sand-a55.12 (narrative beats)
 *   - timeline  → sand-a55.8  (clock, scrubber, phases)
 */
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <p className="eyebrow">Operational study · Western Front, 1914</p>
        <h1>Sandtable</h1>
        <p className="lede">
          An interactive history simulation — beginning with the Schlieffen Plan and the march to
          the Marne, August–September 1914.
        </p>
      </header>

      <main className="app__main">
        <section className="surface surface--map" aria-label="Map">
          <p className="surface__label">Map</p>
          <p className="surface__hint">
            Real geography, period borders, animated armies — engine story <code>sand-a55.9</code>.
          </p>
        </section>
        <aside className="surface surface--dossier" aria-label="Dossier">
          <p className="surface__label">Dossier</p>
          <p className="surface__hint">
            Narrative beats, documents, tech and science cards — <code>sand-a55.12</code>.
          </p>
        </aside>
      </main>

      <footer className="surface surface--timeline" aria-label="Timeline">
        <p className="surface__label">Timeline</p>
        <p className="surface__hint">
          Day 0 · 4 August 1914 — scrubber, phases, two clocks — <code>sand-a55.8</code>.
        </p>
      </footer>
    </div>
  );
}
