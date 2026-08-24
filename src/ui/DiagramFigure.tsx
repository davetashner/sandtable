/**
 * A concept schematic above a beat (sand-1l0.33): the proof-of-concept's
 * hand-drawn style, in the dossier.
 *
 * Inlined into the document rather than loaded through an `<img>`, because
 * the drawings are built out of the design tokens — `var(--army-1)`,
 * `var(--land)`, `var(--brass)` — and an SVG behind an `<img>` is a separate
 * document that cannot see them. Inlined, one drawing follows the theme in
 * both directions and needs no second file.
 *
 * The markup comes from the pack, which is repository source bundled at build
 * time, and the validator rejects a diagram carrying a script or an inline
 * event handler. When packs are fetched at run time (sand-shn.1) that stops
 * being true and this is the one place that has to sanitise.
 */
import './diagram.css';

export interface DiagramFigureProps {
  /** The SVG source, from the pack's diagrams/ directory. */
  svg: string;
  /** What the schematic shows and what to read from it. */
  caption: string;
  /** The same, for a reader who cannot see it. */
  alt: string;
}

export function DiagramFigure({ svg, caption, alt }: DiagramFigureProps) {
  return (
    <figure className="diagram">
      {/* role="img" makes the drawing a leaf: the label is announced and the
          labels inside it are not read out one by one. */}
      <div
        className="diagram__frame"
        role="img"
        aria-label={alt}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="diagram__caption">{caption}</figcaption>
    </figure>
  );
}
