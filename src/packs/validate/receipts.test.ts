import { describe, expect, it } from 'vitest';
import {
  missingFragment,
  missingFromAny,
  normaliseQuoted,
  normaliseRetrieved,
  parseReceiptBacklog,
  quoteFragments,
} from './receipts.js';

/**
 * The containment check is the whole of ADR 0021: everything else in a receipt
 * is metadata about a retrieval, and this is the only part that can be wrong in
 * a way that matters. So the tests are mostly about what it must forgive
 * (typography, which differs between every transcription and every scanner) and
 * what it must not (words).
 */
describe('normaliseQuoted', () => {
  it('forgives the typography a transcription and a scanner disagree about', () => {
    const printed = '“Sie sind natürlich nur denkbar” — General v. Moltke';
    const scanned = '"Sie  sind natürlich nur denkbar" -- General v. Moltke';
    expect(normaliseQuoted(printed)).toBe(normaliseQuoted(scanned.replace('--', '—')));
  });

  it('strips Markdown that is presentation rather than text', () => {
    expect(normaliseQuoted('the *entire* force')).toBe(normaliseQuoted('the entire force'));
    expect(normaliseQuoted('> a block quotation')).toBe(normaliseQuoted('a block quotation'));
    expect(normaliseQuoted('[Hitokappu Bay](https://example.test/x)')).toBe('hitokappu bay');
  });

  it('does not forgive a different word', () => {
    expect(normaliseQuoted('at a speed of 24 knots')).not.toBe(
      normaliseQuoted('at a speed of 26 knots'),
    );
  });
});

describe('quoteFragments', () => {
  it('splits on an ellipsis, because that is what an ellipsis means', () => {
    const frags = quoteFragments('depart with utmost secrecy … advance to the standby point');
    expect(frags).toEqual(['depart with utmost secrecy', 'advance to the standby point']);
  });

  it('splits on a bracketed editorial insertion, which is the author speaking', () => {
    expect(quoteFragments('the commander said [the enemy] would not come before evening')).toEqual([
      'the commander said',
      'would not come before evening',
    ]);
  });

  it('splits on a blank line, because that is where a passage ends', () => {
    // The Petropavlovsk resolution as marxists.org prints it carries the
    // transcriber's notes between the numbered clauses, so clauses 4 and 5 are
    // two passages in the source with somebody else's words in between.
    expect(
      quoteFragments('4. To liberate all political prisoners;\n\n5. To equalize the rations;'),
    ).toEqual(['4. to liberate all political prisoners', '5. to equalize the rations']);
  });

  it('drops fragments too short to prove anything', () => {
    expect(quoteFragments('the … and … a considerable body of cavalry')).toEqual([
      'a considerable body of cavalry',
    ]);
  });
});

describe('normaliseRetrieved', () => {
  it('drops the brackets a transcriber repairs a text with, and keeps the words', () => {
    // marxists.org: "they [are] to be appointed". Quoting it with or without
    // the brackets is honest; inventing the word is not, and only the
    // delimiters come off.
    expect(normaliseRetrieved('they [are] to be appointed')).toBe('they are to be appointed');
    expect(normaliseRetrieved('they [are] to be appointed')).not.toContain('were');
  });

  it('drops a page marker so a passage can span a page break', () => {
    // hist.msu.ru prints {404} mid-sentence where the printed page turns.
    expect(normaliseRetrieved('исчисления времени {404} Совет Народных')).toBe(
      normaliseRetrieved('исчисления времени Совет Народных'),
    );
  });

  it('leaves the quotation side alone — a bracket there is the author speaking', () => {
    expect(quoteFragments('the commander said [the enemy] would not come before evening')).toEqual([
      'the commander said',
      'would not come before evening',
    ]);
  });
});

describe('missingFragment', () => {
  const context =
    'While exercising strict antiaircraft and antisubmarine measures, the entire force ' +
    '(except the Midway Bombardment Unit) in accordance with special orders will depart as a ' +
    'group from Hitokappu Bay at a speed of 12-14 knots. The force refueling en route whenever ' +
    'possible will arrive at the standby point (42 N, 165 W).';

  it('accepts a quotation that is in the retrieved text', () => {
    expect(
      missingFragment(
        'will depart as a group from Hitokappu Bay at a speed of 12-14 knots',
        context,
      ),
    ).toBeUndefined();
  });

  it('accepts one elided across the passage', () => {
    expect(
      missingFragment('the entire force … will arrive at the standby point (42 N, 165 W)', context),
    ).toBeUndefined();
  });

  it('names the fragment it could not find, so the author knows which clause is wrong', () => {
    expect(missingFragment('at a speed of 18-20 knots', context)).toBe('at a speed of 18-20 knots');
  });

  it('rejects a quotation whose fragments are in the wrong order', () => {
    // Within one receipt the order is the claim: these words, in this sequence,
    // were one passage. Two clauses found out of order are two quotations, and
    // want two receipts.
    expect(missingFragment('will arrive at the standby point … the entire force', context)).toBe(
      'the entire force',
    );
  });

  it('rejects a quotation with nothing substantial in it', () => {
    expect(missingFragment('the …', context)).toBeDefined();
  });
});

describe('missingFromAny', () => {
  // A document's excerpt is often assembled from passages pages apart, each
  // with its own receipt; across receipts, order is not the claim.
  const contexts = [
    '… at a speed of 12-14 knots. The force refueling …',
    '… [Page 21] depart with utmost secrecy from Hitokappu Bay on 26 November …',
  ];

  it('accepts passages spread across several retrievals, in any order', () => {
    expect(
      missingFromAny(
        'depart with utmost secrecy from Hitokappu Bay on 26 November … at a speed of 12-14 knots',
        contexts,
      ),
    ).toBeUndefined();
  });

  it('names a passage no retrieval shows', () => {
    expect(missingFromAny('the Midway Bombardment Unit', contexts)).toBe(
      'the midway bombardment unit',
    );
  });
});

describe('parseReceiptBacklog', () => {
  it('reads ids and ignores the header that explains them', () => {
    expect(
      parseReceiptBacklog(
        '# why this file exists\n\n1914:document-a\n1917:document-b  # opened, not quoted\n',
      ),
    ).toEqual(['1914:document-a', '1917:document-b']);
  });
});
