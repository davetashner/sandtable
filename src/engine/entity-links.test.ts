import { describe, expect, it } from 'vitest';
import { entityKind, entityLinksIn, isEntityHref } from './entity-links.js';

describe('isEntityHref', () => {
  it('accepts shared and era-qualified ids', () => {
    expect(isEntityHref('person:joffre-joseph')).toBe(true);
    expect(isEntityHref('place:liege')).toBe(true);
    expect(isEntityHref('1914:document-hentsch-first-army-minute-1914-09-09')).toBe(true);
  });

  it('rejects URLs, in-page anchors and paths', () => {
    expect(isEntityHref('https://example.org/x')).toBe(false);
    expect(isEntityHref('mailto:someone@example.org')).toBe(false);
    // GFM footnotes render as in-page anchors and must stay ordinary links.
    expect(isEntityHref('#user-content-fn-herwig-2009')).toBe(false);
    expect(isEntityHref('/assets/media/x.png')).toBe(false);
    expect(isEntityHref('./relative')).toBe(false);
    expect(isEntityHref(undefined)).toBe(false);
    expect(isEntityHref('Moltke')).toBe(false);
  });
});

describe('entityKind', () => {
  it('uses the registry for shared ids and the slug for era-qualified ones', () => {
    expect(entityKind('person:joffre-joseph')).toBe('person');
    expect(entityKind('place:liege')).toBe('place');
    expect(entityKind('1914:document-x')).toBe('document');
    expect(entityKind('1914:tech-railways-mobilization')).toBe('tech');
    expect(entityKind('not an id')).toBe('entity');
  });
});

describe('entityLinksIn', () => {
  it('collects entity targets and ignores everything else', () => {
    const md =
      'On 17 August [Lanrezac](person:lanrezac-charles) met [Sir John French](person:french-john) ' +
      'at Rethel.[^spears-1930] See [the note](https://example.org) and [again](person:french-john).';
    expect(entityLinksIn(md)).toEqual(['person:lanrezac-charles', 'person:french-john']);
  });

  it('returns nothing for prose without links', () => {
    expect(entityLinksIn('Namur was supposed to hold for weeks.')).toEqual([]);
  });
});
