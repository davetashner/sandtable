/**
 * Who owns a key press (sand-pmz.4).
 *
 * Two handlers listen on `window` for keys the whole app answers to — the
 * timeline's transport (Space, ←/→, Home/End, `,` and `.`) and the guided
 * tour's (Space, ←/→, Escape) — and both call `preventDefault`. That is right
 * for a reader whose focus is nowhere in particular, and wrong for a reader
 * whose focus is on a control with keys of its own.
 *
 * The map was the case that mattered. MapLibre makes its canvas focusable and
 * gives it the arrow keys to pan and `+`/`-` to zoom; with the transport
 * listening globally, tabbing to the map and pressing → moved the clock and
 * not the camera, and the map could not be driven from a keyboard at all.
 *
 * A surface says it handles its own keys with `data-owns-keys`; a text field
 * always does, without having to say so.
 */
export const OWNS_KEYS = 'data-owns-keys';

/** True when the event's target handles this key itself. */
export function ownsKeys(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true;
  // `isContentEditable` is not implemented in jsdom, so ask the attribute as
  // well — which also covers a node inside an editable region.
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  if (target.closest('[contenteditable]:not([contenteditable="false"])')) return true;
  return target.closest(`[${OWNS_KEYS}]`) !== null;
}
