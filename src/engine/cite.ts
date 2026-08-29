/**
 * A citation for the view a reader is looking at (`sand-shn.5.1`).
 *
 * ADR 0009 made the URL the whole view: named slots, defaults absent, unknown
 * parameters preserved, the deepest reachable state under 300 characters. That
 * is what makes a view citable at all — a reader who follows the link arrives
 * at the same date, the same branch, the same open card. Nothing in the app
 * said so, though: the copy-link glyph hands over a raw URL, which is the act
 * without the apparatus.
 *
 * The form follows `formatCitation` (`src/engine/beats.ts`) and the rendered
 * form in `docs/sources.md`: the work, the title in italics, a parenthetical,
 * a full stop, and the URL appended as a web source. What changes is what is
 * being cited — not a book at a page, but a state of this app at an instant of
 * its own clock:
 *
 *   Sandtable, *The Schlieffen Plan and the march to the Marne*, the view at
 *   24 August 1914, 12:00 (accessed 29 August 2026).
 *   https://sandtable.davetashner.com/?pack=1914-schlieffen-marne&t=…
 *
 * Two dates on purpose, and they are not the same kind of thing. The **view
 * date** is in-world and is a property of the link: follow it and you see that
 * moment. The **accessed date** is the ordinary scholarly one and is a
 * property of the reading: the content behind a URL can change, and this
 * repository revises its packs.
 *
 * `formatCitation` deliberately stopped printing URLs in footnotes — "a
 * footnote is not the place for eighty unbreakable characters". Here the URL
 * is the citation's subject rather than an ornament on it, so it stays, and
 * the wrapping is the stylesheet's problem (`.bib__cite-url`).
 */

/** The work being cited, which is the app rather than any one pack. */
export const WORK = 'Sandtable';

export type ViewCitation = {
  /** The work: `Sandtable`. */
  readonly work: string;
  /** The pack's own title, rendered in italics. */
  readonly title: string;
  /** The in-world instant, long form — "24 August 1914, 12:00". */
  readonly when: string;
  /** The real-world date of reading, long form — "29 August 2026". */
  readonly accessed: string;
  readonly url: string;
  /**
   * The whole citation as one plain string, which is what a reader pastes
   * into a footnote. No markup: italics do not survive a clipboard, and a
   * citation carrying literal asterisks is worse than one carrying none.
   */
  readonly text: string;
};

/** A date in the long British form the atlas already uses, in UTC. */
export function accessedOn(when: Date): string {
  return when.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function citeView(input: {
  /** `pack.title` — the campaign, not the app. */
  readonly title: string;
  /** The in-world instant as `labelNow(...).date` already formats it. */
  readonly when: string;
  /** When the reader is reading. Injected so the citation is testable. */
  readonly accessed: Date;
  readonly url: string;
}): ViewCitation {
  const accessed = accessedOn(input.accessed);
  const text =
    `${WORK}, ${input.title}, the view at ${input.when} ` + `(accessed ${accessed}). ${input.url}`;
  return {
    work: WORK,
    title: input.title,
    when: input.when,
    accessed,
    url: input.url,
    text,
  };
}
