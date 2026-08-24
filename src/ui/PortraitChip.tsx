/**
 * A face at chip size (ADR 0012): the cast strip, a vignette's voice, and any
 * card that wants to say who it is about without spending a figure on it.
 *
 * A chip is not a display of the photograph — it is a name in the shape of a
 * face, never larger than the name it stands for. That is why it carries no
 * caption and no credit: the provenance lives on the person's card, one click
 * away, which is where the picture is large enough for the credit to be about
 * anything the reader can see. It is toned like every other photograph at
 * rest and comes to full colour when it is hovered, focused or pressed.
 *
 * The round crop is CSS here. On the map the same portraits are masked into
 * a canvas instead (src/engine/layers/portrait-icons.ts, sand-1l0.27), because
 * there is no CSS on a WebGL surface; the focal-point rule is the same in both.
 */
import type { CSSProperties } from 'react';
import { variantFor, type MediaIndexEntry } from '../packs/media-index.js';
import { EntityLink } from './Prose.js';
import './portrait-chip.css';
import './prose.css';

export interface PortraitChipProps {
  /** The portrait; absent falls back to initials, which is not a failure. */
  entry?: MediaIndexEntry | undefined;
  /** Who this is — the accessible name, and the label the chip reveals. */
  name: string;
  /** Appended to the accessible name: "Joseph Joffre — Commander-in-Chief". */
  role?: string | undefined;
  /** Diameter in CSS px. */
  size?: number;
  /** Ring colour, as a CSS value — the side's colour in the cast strip. */
  ring?: string | undefined;
  /** Pressing the chip selects it (the cast strip); with `pressed` for state. */
  onSelect?: (() => void) | undefined;
  pressed?: boolean | undefined;
  /** Or the chip is a link to an entity's card (a vignette's voice). */
  entity?: string | undefined;
  base?: string;
  className?: string;
}

/** Initials for a face with no photograph — an empty circle says nothing. */
// eslint-disable-next-line react-refresh/only-export-components -- the fallback belongs with the chip that draws it
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-ZÀ-Þ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}

export function PortraitChip({
  entry,
  name,
  role,
  size = 34,
  ring,
  onSelect,
  pressed,
  entity,
  base = '/assets/media/',
  className,
}: PortraitChipProps) {
  // Comfortably above the rendered size, so the circle stays sharp at any
  // device pixel ratio and every chip of every size draws the same file.
  const variant = entry ? variantFor(entry.variants, size * 4) : undefined;
  const position = entry?.focalPoint
    ? `${Math.round(entry.focalPoint.x * 100)}% ${Math.round(entry.focalPoint.y * 100)}%`
    : '50% 25%';
  const label = role ? `${name} — ${role}` : name;
  const style = {
    '--chip-size': `${size}px`,
    ...(ring ? { '--chip-ring': ring } : {}),
  } as CSSProperties;

  const face =
    entry && variant ? (
      <img
        className="portrait-chip__img"
        src={`${base}${variant.src}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: position }}
      />
    ) : (
      <span className="portrait-chip__initials" aria-hidden="true">
        {initialsOf(name)}
      </span>
    );

  return (
    <span
      className={`portrait-chip portrait-frame${className ? ` ${className}` : ''}`}
      style={style}
    >
      {onSelect ? (
        <button
          type="button"
          className="portrait-chip__face"
          aria-pressed={pressed ?? false}
          aria-label={label}
          onClick={onSelect}
        >
          {face}
        </button>
      ) : entity ? (
        <EntityLink id={entity} label={label} className="portrait-chip__face entity-link--portrait">
          {face}
        </EntityLink>
      ) : (
        <span className="portrait-chip__face" role="img" aria-label={label}>
          {face}
        </span>
      )}
      <span className="portrait-name" aria-hidden="true">
        {name}
      </span>
    </span>
  );
}
