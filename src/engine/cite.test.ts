import { describe, expect, it } from 'vitest';
import { WORK, accessedOn, citeView } from './cite.js';

const URL_1914 =
  'https://sandtable.davetashner.com/?pack=1914-schlieffen-marne&t=1914-08-24T12:00:00Z';

const cite = () =>
  citeView({
    title: 'The Schlieffen Plan and the march to the Marne',
    when: '24 August 1914, 12:00',
    accessed: new Date('2026-08-29T04:31:00Z'),
    url: URL_1914,
  });

describe('citeView', () => {
  it('reads as one line a reader can paste into a footnote', () => {
    expect(cite().text).toBe(
      'Sandtable, The Schlieffen Plan and the march to the Marne, ' +
        'the view at 24 August 1914, 12:00 (accessed 29 August 2026). ' +
        URL_1914,
    );
  });

  it('carries no markup, because italics do not survive a clipboard', () => {
    // `formatCitation` marks the title up for Markdown; this one is the string
    // that goes to the clipboard, and a literal asterisk there is worse than
    // no emphasis at all. The component re-adds the italics in the DOM.
    expect(cite().text).not.toMatch(/[*_[\]]/);
  });

  it('keeps the parts, so the view can italicise the title', () => {
    const c = cite();
    expect(c.work).toBe(WORK);
    expect(c.title).toBe('The Schlieffen Plan and the march to the Marne');
    expect(c.when).toBe('24 August 1914, 12:00');
    expect(c.accessed).toBe('29 August 2026');
    expect(c.url).toBe(URL_1914);
  });

  it('holds two dates that are different kinds of thing', () => {
    // The in-world instant is a property of the link — follow it and you are
    // there. The accessed date is a property of the reading, because the pack
    // behind the URL is revised.
    const c = cite();
    expect(c.when).toContain('1914');
    expect(c.accessed).toContain('2026');
  });

  it('does not let the reader’s timezone move the accessed date', () => {
    // Late UTC evening is already tomorrow east of here and still today west
    // of it. A citation that says a different day depending on who renders it
    // is a citation nobody can check, so the formatting is pinned to UTC.
    expect(accessedOn(new Date('2026-08-29T23:59:00Z'))).toBe('29 August 2026');
    expect(accessedOn(new Date('2026-08-29T00:01:00Z'))).toBe('29 August 2026');
  });

  it('cites the campaign, not whichever era happened to be seeded', () => {
    const pacific = citeView({
      title: '1941: Pearl Harbor',
      when: '7 December 1941, 18:00',
      accessed: new Date('2026-08-29T04:31:00Z'),
      url: 'https://sandtable.davetashner.com/?pack=1941-pearl-harbor',
    });
    expect(pacific.text).toContain('1941: Pearl Harbor');
    expect(pacific.text).not.toContain('Schlieffen');
  });
});
