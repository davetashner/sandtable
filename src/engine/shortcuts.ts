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
 *
 * The second case is a row inside a surface that already listens (sand-pmz.12).
 * The timeline's markers row is fifty buttons and wants a roving `tabindex` —
 * one tab stop, the arrows to move within it — and the arrows are the
 * transport's, on the same strip. The declaration settles it in one place
 * instead of two: the row declares, the transport's own handler steps around
 * any declarer inside itself, and the global listener already did. The
 * scrubber is why `declaresOwnKeys` is separate from `ownsKeys` — it is an
 * `<input>`, so it owns its keys by the rule above, and it must not, because
 * ←/→ on the scrubber are the clock's step and not the range's.
 */
export const OWNS_KEYS = 'data-owns-keys';

/** True when the target sits inside a surface that declared `data-owns-keys`. */
export function declaresOwnKeys(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${OWNS_KEYS}]`) !== null;
}

/** True when the event's target handles this key itself. */
export function ownsKeys(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true;
  // `isContentEditable` is not implemented in jsdom, so ask the attribute as
  // well — which also covers a node inside an editable region.
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  if (target.closest('[contenteditable]:not([contenteditable="false"])')) return true;
  return declaresOwnKeys(target);
}
