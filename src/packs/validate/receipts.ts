/**
 * A quotation is the one claim nothing else here can check (ADR 0021).
 *
 * `checkCitations` in validate.ts confirms a citation *resolves* — that the
 * source id exists in the registry. It cannot confirm that the source says
 * what we claim, and a fabricated quotation carrying a well-formed citation is
 * worse than no quotation at all, because the citation makes it look checked.
 * Two incidents on 2026-08-27 made that concrete: a research subagent invented
 * quotations attributed to a named memoirist and the text of a decree, and the
 * Pearl Harbor pack found the text-extraction layer returning different page
 * markers for the same sentence on repeated fetches.
 *
 * A `Receipt` answers the only version of the question a machine can hold: not
 * "is this quotation real" but "does the retrieved text contain these words".
 * This module is the containment test that turns the receipt from an assertion
 * into evidence, plus the backlog parser that keeps the gate off `main`'s back
 * while the existing corpus catches up.
 *
 * Pure string work; no filesystem, no schema parsing, no network.
 */

/**
 * What a quotation and a retrieval have to agree about, and what they do not.
 *
 * Transcriptions, OCR layers and Markdown all disagree harmlessly about
 * typography: an editor's curly quote is a scanner's straight one, an em dash
 * survives as a hyphen, `*sic*` is emphasis in one and asterisks in the other,
 * and soft hyphens and non-breaking spaces arrive from HTML at random. None of
 * that is the difference between a real quotation and an invented one, so all
 * of it is normalised away before the comparison. Case goes too: small caps in
 * a printed heading come back upper-case from one extractor and title case
 * from the next.
 *
 * What is *not* normalised away is the words. That is the whole check.
 */
export function normaliseQuoted(text: string): string {
  return (
    text
      // Markdown links: keep what a reader sees, drop the address.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // emphasis, code fences and block quoting are presentation, not text
      .replace(/[*_`>]/g, ' ')
      // every dash the typographers use, and the ones OCR turns them into
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      // every quotation mark, single and double, curly and angled
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u00B4`']/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"')
      // invisible passengers from HTML
      .replace(/[\u00A0\u00AD\u200B-\u200D\uFEFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  );
}

/**
 * The runs of words a quotation actually promises are in the source.
 *
 * An ellipsis says "and then, later in the same passage"; a bracketed
 * insertion — `[the enemy]`, `[sic]`, a translator's gloss — says "these words
 * are mine, not the author's". Both are honest editorial marks and neither
 * appears in the text that was retrieved, so both split the quotation into
 * fragments that must each be found, in order, rather than one string that
 * never will be.
 *
 * Fragments of a word or two are dropped: "of", "and the" occur in any
 * paragraph and finding them proves nothing.
 */
const MIN_FRAGMENT_CHARS = 8;

export function quoteFragments(quote: string): string[] {
  return normaliseQuoted(quote)
    .split(/\s*(?:\.\.\.|…|\[[^\]]*\])\s*/)
    .map((f) => f.replace(/^[\s,.;:!?'"-]+|[\s,.;:!?'"-]+$/g, '').trim())
    .filter((f) => f.length >= MIN_FRAGMENT_CHARS);
}

/**
 * Does the retrieved text contain the quotation? Returns the first fragment it
 * could not find, or `undefined` when every one of them is there in order.
 *
 * Returning the fragment rather than a boolean is deliberate: the author who
 * gets this wrong has almost always mistyped one clause of a long passage, and
 * being told which clause is the difference between a two-minute fix and a
 * re-transcription.
 */
export function missingFragment(quote: string, context: string): string | undefined {
  const haystack = normaliseQuoted(context);
  const fragments = quoteFragments(quote);
  if (fragments.length === 0) return normaliseQuoted(quote) || quote;
  let from = 0;
  for (const fragment of fragments) {
    const at = haystack.indexOf(fragment, from);
    if (at === -1) return fragment;
    from = at + fragment.length;
  }
  return undefined;
}

/**
 * The same question asked of several retrievals at once: which fragment of the
 * quotation is in none of them?
 *
 * A document's excerpt is often assembled from passages pages apart — the
 * Hawaii operation order in the 1941 pack quotes four, off printed pages 7, 11,
 * 13 and 21 — and holding it to one continuous window would force an author to
 * paste an entire transcription into a receipt to satisfy a rule about four
 * sentences. Each passage may therefore come from its own receipt; ordering
 * inside a single receipt is still checked by `missingFragment`, which is
 * where the claim "this is one passage" is actually made.
 */
export function missingFromAny(quote: string, contexts: string[]): string | undefined {
  const haystacks = contexts.map(normaliseQuoted);
  for (const fragment of quoteFragments(quote))
    if (!haystacks.some((h) => h.includes(fragment))) return fragment;
  return undefined;
}

/**
 * The one-time allowance, in the shape `scripts/media-index-backlog.txt`
 * already uses (PR #151): one id per line, `#` for comments and the reason,
 * blank lines ignored. Kept as a text file rather than JSON because its
 * header is most of its value — a list of ids with no explanation is how an
 * allowance becomes permanent.
 */
export function parseReceiptBacklog(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0);
}
