/**
 * First-person vignettes (sand-1l0.24): the voices a beat carries once the
 * clock has passed their moment — set apart from the narrative by a
 * different face and a hairline, labelled by whose eyes and what kind of
 * witness (memoir, contemporary witness, reconstruction), footnoted to
 * their own sources. Era-agnostic.
 */
import { withFootnotes } from '../engine/beats.js';
import type { Source, Vignette } from '../packs/schema/index.js';
import type { MediaIndexEntry } from '../packs/media-index.js';
import { PortraitChip } from './PortraitChip.js';
import './vignette.css';
import { Prose } from './Prose.js';

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
        const voiceId = v.people?.[0];
        const face = portrait && voiceId ? portrait(voiceId) : undefined;
        const faceName = (voiceId && label ? label(voiceId) : undefined) ?? v.voice;
        return (
          <article key={v.id} className="vignette" data-kind={v.kind} aria-label={v.title}>
            {face && (
              <PortraitChip
                className="vignette__facewrap"
                entry={face}
                name={faceName}
                size={44}
                base={base}
                {...(voiceId ? { entity: voiceId } : {})}
              />
            )}
            <p className="vignette__eyebrow">
              <span className="vignette__voice">{v.voice}</span>
              <span className="vignette__kind">{KIND_LABEL[v.kind]}</span>
            </p>
            <h3 className="vignette__title">{v.title}</h3>
            <p className="vignette__when">{momentLabel(v.at)}</p>
            <div className="vignette__text">
              <Prose>{withFootnotes({ body: v.text, sources: v.sources }, sources)}</Prose>
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
