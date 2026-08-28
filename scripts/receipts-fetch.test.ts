import { describe, expect, it } from 'vitest';
import { decodeBody, htmlToText } from './verify-receipts.js';

/**
 * The retrieval half of ADR 0021. Both of these were bugs before they were
 * tests, and both had the same symptom: a passage that is plainly on the page
 * reads as missing, which pushes an honest source into the "unverifiable"
 * bucket for a reason that is ours and not the source's.
 */
describe('decodeBody', () => {
  const cp1251 = new Uint8Array([
    0xc4,
    0xe5,
    0xea,
    0xf0,
    0xe5,
    0xf2, // Декрет
  ]).buffer;

  it('honours a charset in the Content-Type header', () => {
    expect(decodeBody(cp1251, 'text/html; charset=windows-1251')).toBe('Декрет');
  });

  it('sniffs a meta charset when the header does not say', () => {
    const html = `<html><head><meta charset="windows-1251"></head><body>`;
    const bytes = new Uint8Array([
      ...new TextEncoder().encode(html),
      0xc4,
      0xe5,
      0xea,
      0xf0,
      0xe5,
      0xf2,
    ]).buffer;
    expect(decodeBody(bytes, 'text/html')).toContain('Декрет');
  });

  it('falls back to UTF-8 rather than throwing on an encoding Node does not know', () => {
    const utf8 = new TextEncoder().encode('Декрет').buffer;
    expect(decodeBody(utf8, 'text/html; charset=x-nonesuch')).toBe('Декрет');
  });
});

describe('htmlToText', () => {
  it('keeps the text and drops the markup, script and style', () => {
    const html =
      '<html><head><style>p{color:red}</style></head><body><script>var x=1</script>' +
      '<p>ARTICLE 1</p><p>Germany &amp; Russia declare that the condition of war has ceased.</p></body></html>';
    const text = htmlToText(html);
    expect(text).toContain('ARTICLE 1');
    expect(text).toContain('Germany & Russia declare that the condition of war has ceased.');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('var x');
  });

  it('turns block ends into line breaks, so two clauses do not run together', () => {
    expect(htmlToText('<p>clause four</p><p>clause five</p>')).toBe('clause four\nclause five');
  });
});
