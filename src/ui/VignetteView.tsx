/**
 * First-person vignettes (sand-1l0.24): the voices a beat carries once the
 * clock has passed their moment — set apart from the narrative by a
 * different face and a hairline, labelled by whose eyes and what kind of
 * witness (memoir, contemporary witness, reconstruction), footnoted to
 * their own sources. Era-agnostic.
 */
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { withFootnotes } from '../engine/beats.js';
import type { Source, Vignette } from '../packs/schema/index.js';
import type { MediaIndexEntry } from '../packs/media-index.js';
import './vignette.css';

const KIND_LABEL: Record<Vignette['kind'], string> = {
  memoir: 'Memoir',
  witness: 'Contemporary witness',
  reconstruction: 'Reconstruction',
};

/** "7 August 1914 · 12:00" from an ISO instant. */
// eslint-disable-next-line react-refresh/only-export-components -- moment label belongs with the view
export function momentLabel(at: string): string {
  const d = new Date(at);
  const date = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return time === '00:00' ? date : `${date} · ${time}`;
}

export interface VignetteViewProps {
  vignettes: Vignette[];
  sources: Source[];
  /** Label for an entity id (people chips). */
  label?: (id: string) => string | undefined;
  /** Portrait for a person id (the first named person leads the voice). */
  portrait?: (personId: string) => MediaIndexEntry | undefined;
  /** Base URL of the media bucket path, default /assets/media/. */
  base?: string;
}

export function VignetteView({
  vignettes,
  sources,
  label,
  portrait,
  base = '/assets/media/',
}: VignetteViewProps) {
  if (vignettes.length === 0) return null;
  return (
    <section className="vignettes" aria-label="Voices">
      {vignettes.map((v) => {
        const face = portrait && v.people?.[0] ? portrait(v.people[0]) : undefined;
        const variant = face?.variants.find((x) => x.width >= 160) ?? face?.variants[0];
        const position = face?.focalPoint
          ? `${Math.round(face.focalPoint.x * 100)}% ${Math.round(face.focalPoint.y * 100)}%`
          : '50% 25%';
        return (
          <article key={v.id} className="vignette" data-kind={v.kind} aria-label={v.title}>
            {face && variant && (
              <img
                className="vignette__face"
                src={`${base}${variant.src}`}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ objectPosition: position }}
              />
            )}
            <p className="vignette__eyebrow">
              <span className="vignette__voice">{v.voice}</span>
              <span className="vignette__kind">{KIND_LABEL[v.kind]}</span>
            </p>
            <h3 className="vignette__title">{v.title}</h3>
            <p className="vignette__when">{momentLabel(v.at)}</p>
            <div className="vignette__text">
              <Markdown remarkPlugins={[remarkGfm]}>
                {withFootnotes({ body: v.text, sources: v.sources }, sources)}
              </Markdown>
            </div>
            {label && v.people && v.people.length > 0 && (
              <p className="vignette__people">
                {v.people.map((id) => label(id) ?? id).join(' · ')}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
