/**
 * The component gallery (sand-neh.3): every reusable component in `src/ui`,
 * in both themes, on real content from the seed pack.
 *
 * Both themes at once is the point of the page, so a specimen renders inside
 * a pane that stamps its own `data-theme`. The token blocks are not anchored
 * to `:root` (ADR 0010, src/styles/tokens.ts), so a subtree carries a whole
 * palette. Light and Dark stamp the document instead, for the components that
 * escape their pane — a modal dialog opens in the top layer, where no
 * ancestor can reach it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ClockProvider } from '../engine/ClockContext.js';
import { seed } from '../packs/seed.js';
import { shared } from '../styles/tokens.js';
import { NOT_IN_GALLERY, SECTIONS, type Specimen } from './specimens.js';

type ThemeMode = 'both' | 'light' | 'dark';
type Frame = 'auto' | 'column' | 'phone';

const RANGE = {
  start: Date.parse(seed.pack.timeRange.start),
  end: Date.parse(seed.pack.timeRange.end),
};

/** Mid-campaign: gauges, bands and the day counter all have something to say. */
const NOW = RANGE.start + (RANGE.end - RANGE.start) * 0.32;

const FRAME_WIDTH: Record<Frame, string> = {
  auto: '100%',
  column: '340px',
  phone: '390px',
};

/** The type scale, so the bottom of it can be read rather than reasoned about. */
const TYPE_SCALE = [
  ['--fs-3xl', 'Display'],
  ['--fs-2xl', 'Beat title'],
  ['--fs-xl', 'Card title'],
  ['--fs-lg', 'Lede'],
  ['--fs-md', 'Body'],
  ['--fs-sm', 'Meta'],
  ['--fs-xs', 'Instrument panel'],
] as const;

const GROUNDS = ['bg', 'panel', 'panel-2'] as const;
const INKS = ['ink', 'muted', 'brass', 'accent-red', 'french'] as const;

function Pane({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <div className="pane" data-theme={theme}>
      <p className="pane__label">{theme}</p>
      <div className="pane__stage">{children}</div>
    </div>
  );
}

function SpecimenView({ spec, mode, frame }: { spec: Specimen; mode: ThemeMode; frame: Frame }) {
  const width = spec.column && frame === 'auto' ? FRAME_WIDTH.column : FRAME_WIDTH[frame];
  const stage = (
    <div
      className="specimen__frame"
      data-contained={spec.contained || undefined}
      style={{ maxWidth: width }}
    >
      {spec.render()}
    </div>
  );
  return (
    <section className="specimen" id={spec.id} aria-label={spec.title}>
      <header className="specimen__head">
        <h3 className="specimen__title">{spec.title}</h3>
        <p className="specimen__covers">{spec.covers.join(' · ')}</p>
        <p className="specimen__note">{spec.note}</p>
      </header>
      {mode === 'both' ? (
        <div className="specimen__panes">
          <Pane theme="light">{stage}</Pane>
          <Pane theme="dark">{stage}</Pane>
        </div>
      ) : (
        <div className="specimen__panes specimen__panes--one">
          <Pane theme={mode}>{stage}</Pane>
        </div>
      )}
    </section>
  );
}

function Tokens() {
  return (
    <section className="specimen" id="tokens" aria-label="Tokens">
      <header className="specimen__head">
        {/* h2, not h3: the token sheet is a top-level section of the page in
            its own right, and an h3 straight after the h1 skips a level. */}
        <h2 className="specimen__title">Tokens</h2>
        <p className="specimen__covers">src/styles/tokens.ts</p>
        <p className="specimen__note">
          The grounds text is guaranteed AA on, the inks that are guaranteed on them, and the type
          scale. The bottom of the scale is the 11px floor, not a ratio (ADR 0010).
        </p>
      </header>
      <div className="specimen__panes">
        {(['light', 'dark'] as const).map((theme) => (
          <Pane key={theme} theme={theme}>
            <div className="tokens">
              <div className="tokens__swatches">
                {GROUNDS.map((ground) => (
                  <div
                    key={ground}
                    className="tokens__ground"
                    style={{ background: `var(--${ground})` }}
                  >
                    <p className="tokens__ground-name">--{ground}</p>
                    {INKS.map((ink) => (
                      <p key={ink} className="tokens__ink" style={{ color: `var(--${ink})` }}>
                        --{ink} · the quick brown fox
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <ul className="tokens__scale">
                {TYPE_SCALE.map(([token, use]) => (
                  <li key={token}>
                    <span className="tokens__size" style={{ fontSize: `var(${token})` }}>
                      {use} — 24 August 1914
                    </span>
                    <span className="tokens__token">
                      {token} · {shared[token.slice(2) as keyof typeof shared]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Pane>
        ))}
      </div>
    </section>
  );
}

export function Gallery() {
  const [mode, setMode] = useState<ThemeMode>('both');
  const [frame, setFrame] = useState<Frame>('auto');

  // In a single-theme mode the document itself is stamped, so a dialog in the
  // top layer and anything else that escapes its pane is themed too.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'both') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    return () => root.removeAttribute('data-theme');
  }, [mode]);

  return (
    <ClockProvider range={RANGE} initialNow={NOW} syncUrl={false}>
      <div className="gallery">
        <header className="gallery__header">
          <p className="eyebrow">Design system · sand-neh.3</p>
          <h1>The component gallery</h1>
          <p className="lede">
            Every reusable component in <code>src/ui</code>, in both themes, on content from the
            1914 pack. Not part of the app: this is a second Vite entry, for design review. The
            tokens are{' '}
            <a href="https://github.com/davetashner/sandtable/blob/main/docs/design.md">
              docs/design.md
            </a>
            .
          </p>
          <div className="gallery__controls">
            <div className="gallery__group" role="group" aria-label="Theme">
              {(['both', 'light', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="gallery__option"
                  data-active={mode === m || undefined}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {m === 'both' ? 'Both themes' : m === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
            <div className="gallery__group" role="group" aria-label="Width">
              {(
                [
                  ['auto', 'Natural'],
                  ['column', 'Dossier 340'],
                  ['phone', 'Phone 390'],
                ] as const
              ).map(([f, labelText]) => (
                <button
                  key={f}
                  type="button"
                  className="gallery__option"
                  data-active={frame === f || undefined}
                  aria-pressed={frame === f}
                  onClick={() => setFrame(f)}
                >
                  {labelText}
                </button>
              ))}
            </div>
          </div>
          <nav className="gallery__index" aria-label="Sections">
            <a href="#tokens">Tokens</a>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
          </nav>
        </header>

        <main className="gallery__body">
          <Tokens />
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="gallery__section">
              <h2 className="gallery__section-title">{section.title}</h2>
              <p className="gallery__section-note">{section.note}</p>
              {section.specimens.map((spec) => (
                <SpecimenView key={spec.id} spec={spec} mode={mode} frame={frame} />
              ))}
            </section>
          ))}
        </main>

        <footer className="gallery__footer">
          <h2 className="gallery__section-title">Not in the gallery</h2>
          <ul>
            {Object.entries(NOT_IN_GALLERY).map(([name, why]) => (
              <li key={name}>
                <strong>{name}</strong> — {why}
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </ClockProvider>
  );
}
