/**
 * Circular portrait icons for the commander layer (sand-1l0.27).
 *
 * deck.gl draws icons from an image, and the portraits in the media index are
 * rectangles. Cropping them round with `object-fit` is a CSS trick and there
 * is no CSS on a WebGL canvas, so each portrait is drawn once into an
 * offscreen canvas under a circular clip and handed to the layer as a data
 * URL. Done once per person and cached: the layer rebuilds on every tick.
 *
 * The focal point from the manifest is honoured, so a face stays in the
 * circle rather than being centred on a subject's chest — the same framing
 * the person cards use.
 */

const SIZE = 128;

export interface PortraitSource {
  /** Widest-enough derivative to draw from. */
  src: string;
  /** 0–1, from the manifest; defaults to the portrait rule of thirds. */
  focalPoint?: { x: number; y: number } | undefined;
}

/**
 * Loads and masks portraits, one per person, and calls `onReady` as each
 * lands so the caller can re-render. Everything is cached, including the
 * failures — a portrait that 404s must not be retried on every tick.
 */
export function createPortraitIcons(onReady: () => void) {
  const icons = new Map<string, string>();
  const started = new Set<string>();

  const draw = (img: HTMLImageElement, focal: { x: number; y: number }): string | undefined => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    // cover: scale so the shorter side fills, then slide to the focal point
    const scale = Math.max(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const dx = (SIZE - w) * focal.x;
    const dy = (SIZE - h) * focal.y;
    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();
    return canvas.toDataURL('image/png');
  };

  return {
    /** The masked portrait for a person, or undefined until it is ready. */
    get(personId: string): string | undefined {
      return icons.get(personId);
    },
    /** Ask for a portrait; safe to call every render. */
    request(personId: string, source: PortraitSource | undefined) {
      if (!source || started.has(personId)) return;
      started.add(personId);
      if (typeof document === 'undefined') return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const url = draw(img, source.focalPoint ?? { x: 0.5, y: 0.3 });
        if (url) {
          icons.set(personId, url);
          onReady();
        }
      };
      // A portrait that will not load leaves the commander as a coloured disc;
      // `started` keeps it from being asked for again on the next tick.
      img.onerror = () => {};
      img.src = source.src;
    },
  };
}

export type PortraitIcons = ReturnType<typeof createPortraitIcons>;
