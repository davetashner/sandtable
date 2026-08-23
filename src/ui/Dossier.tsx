/**
 * The dossier — the right-hand narrative panel. Picks the beat that matches
 * now × branch × focus, renders its Markdown with footnote citations resolved
 * from the Source registry, shows the phase title and date, a hypothetical
 * badge for counterfactual branches, the pull quote, and a legend of sides.
 * Transitions between beats fade (and respect reduced motion). Era-agnostic.
 *
 * The information-architecture decision (sand-neh.5) makes this the single
 * home for cards — tech, science, documents, decision points, causal chains
 * — which will mount here as modes rather than as new panels.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useClock } from '../engine/ClockContext.js';
import { sideToken } from '../engine/layers/colors.js';
import { selectBeat, withFootnotes } from '../engine/beats.js';
import type { Branch, NarrativeBeat, Side, Source, Vignette } from '../packs/schema/index.js';
import { VignetteView } from './VignetteView.js';
import './card.css';
import { MediaFigure } from './MediaFigure.js';
import type { MediaIndexEntry } from '../packs/media-index.js';
import './dossier.css';

export interface DossierProps {
  beats: NarrativeBeat[];
  sources: Source[];
  sides: Side[];
  branch: Branch;
  /** Battle id when inside a zoom-in (sand-a55.14); beats with that focus win. */
  focus?: string | undefined;
  packTitle?: string;
  /** A card to show instead of the beat (ADR 0006); rendered by the caller. */
  card?: ReactNode;
  /** The cast strip (sand-9ts), rendered under the header in every mode. */
  cast?: ReactNode;
  /** Resolves a beat's hero `media` id to an index entry (sand-y0u.10). */
  resolveMedia?: ((id: string) => MediaIndexEntry | undefined) | undefined;
  /** Chips for the beat's links (tech cards, battles, people…). */
  related?: CardChipLike[];
  /** First-person vignettes the clock has reached within this beat (sand-1l0.24). */
  vignettes?: Vignette[];
  /** Label for an entity id (vignette people). */
  label?: ((id: string) => string | undefined) | undefined;
  /** Portrait for a person id (vignette voices). */
  resolvePortrait?: ((personId: string) => MediaIndexEntry | undefined) | undefined;
}

export interface CardChipLike {
  id: string;
  label: string;
  kind: string;
  onClick?: () => void;
}

export function Dossier({
  beats,
  sources,
  sides,
  branch,
  focus,
  packTitle,
  card,
  cast,
  resolveMedia,
  related = [],
  vignettes = [],
  label,
  resolvePortrait,
}: DossierProps) {
  const { now, range } = useClock();
  const beat = useMemo(
    () => selectBeat(beats, now, branch.id, focus, range.end),
    [beats, now, branch.id, focus, range.end],
  );
  const markdown = useMemo(() => (beat ? withFootnotes(beat, sources) : ''), [beat, sources]);
  const hypothetical = branch.kind === 'counterfactual';
  const hero = beat?.media && resolveMedia ? resolveMedia(beat.media) : undefined;

  // Fade on beat change.
  const [shown, setShown] = useState(beat?.id);
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (beat?.id === shown) return;
    setShown(beat?.id);
    setEntering(true);
    const t = window.setTimeout(() => setEntering(false), 260);
    return () => window.clearTimeout(t);
  }, [beat?.id, shown]);

  const next = useMemo(() => {
    if (beat) return undefined;
    return beats
      .filter((b) => (!b.branch || b.branch === branch.id) && !b.focus && Date.parse(b.from) > now)
      .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))[0];
  }, [beat, beats, branch.id, now]);

  return (
    <aside className="dossier" aria-label="Dossier" data-entering={entering || undefined}>
      <header className="dossier__head">
        <p className="dossier__eyebrow">
          {packTitle ? <span className="dossier__pack">{packTitle}</span> : null}
          <span className="dossier__branch" data-hypothetical={hypothetical || undefined}>
            {branch.title}
          </span>
        </p>
        {branch.kind === 'counterfactual' && (
          <details className="dossier__about" open={!beat}>
            <summary className="dossier__badge" role="note">
              Hypothetical — an authored branch, not what happened
            </summary>
            <div className="dossier__about-body">
              <Markdown remarkPlugins={[remarkGfm]}>{branch.summary}</Markdown>
              {branch.feasibility && branch.feasibility.length > 0 && (
                <>
                  <h3>What would have had to be true</h3>
                  <ul className="dossier__feasibility">
                    {branch.feasibility.map((f) => (
                      <li key={f.condition} data-met={f.met || undefined}>
                        <span className="dossier__check" aria-hidden="true">
                          {f.met ? '✓' : '✗'}
                        </span>
                        <span>
                          <strong>{f.condition}</strong>
                          {f.note ? <> — {f.note}</> : null}
                          <span className="visually-hidden">
                            {f.met ? ' (met in history)' : ' (not met in history)'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {branch.historiography && (
                <>
                  <h3>The debate</h3>
                  <Markdown remarkPlugins={[remarkGfm]}>{branch.historiography}</Markdown>
                </>
              )}
            </div>
          </details>
        )}
        {cast}
      </header>

      {card ? (
        card
      ) : beat ? (
        <article className="dossier__beat" key={beat.id} aria-live="polite">
          <p className="dossier__date">{beat.dateLabel}</p>
          <h2 className="dossier__title">{beat.title}</h2>
          {hero && <MediaFigure entry={hero} width={360} fit="contain" className="dossier__hero" />}
          {beat.pullQuote && (
            <blockquote className="dossier__pull">
              <p>{beat.pullQuote.text}</p>
              <footer>— {beat.pullQuote.attribution}</footer>
            </blockquote>
          )}
          <div className="dossier__body">
            <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
          </div>
          <VignetteView
            vignettes={vignettes}
            sources={sources}
            {...(label ? { label } : {})}
            {...(resolvePortrait ? { portrait: resolvePortrait } : {})}
          />
          {related.length > 0 && (
            <ul className="card__chips dossier__related" aria-label="Related">
              {related.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="card__chip"
                    data-kind={c.kind}
                    onClick={c.onClick}
                    disabled={!c.onClick}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : (
        <div className="dossier__empty">
          <p className="dossier__date">No narrative beat at this moment.</p>
          {next && (
            <p className="dossier__hint">
              Next: <strong>{next.title}</strong> — {next.dateLabel}.
            </p>
          )}
        </div>
      )}

      <footer className="dossier__legend" aria-label="Legend">
        {sides.map((s) => (
          <span key={s.id} className="dossier__side">
            <span
              className="dossier__swatch"
              style={{ background: `var(${sideToken(s, sides)})` }}
              aria-hidden="true"
            />
            {s.short ?? s.name}
          </span>
        ))}
      </footer>
    </aside>
  );
}
