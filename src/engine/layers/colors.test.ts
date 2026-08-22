import { beforeEach, describe, expect, it } from 'vitest';
import type { Side } from '../../packs/schema/index.js';
import { parseCssColor, resetTokenColors, sideToken, tokenColor } from './colors.js';

describe('parseCssColor', () => {
  it('parses hex and rgb forms', () => {
    expect(parseCssColor('#9a2e22')).toEqual([154, 46, 34, 255]);
    expect(parseCssColor('#abc', 128)).toEqual([170, 187, 204, 128]);
    expect(parseCssColor('#9a2e2280')).toEqual([154, 46, 34, 128]);
    expect(parseCssColor('rgb(1, 2, 3)')).toEqual([1, 2, 3, 255]);
    expect(parseCssColor('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3, 128]);
    expect(parseCssColor('nope')).toBeUndefined();
  });
});

describe('tokenColor', () => {
  beforeEach(() => resetTokenColors());
  it('reads a CSS custom property from the document and caches it', () => {
    document.documentElement.style.setProperty('--army-1', '#9a2e22');
    expect(tokenColor('--army-1')).toEqual([154, 46, 34, 255]);
    document.documentElement.style.setProperty('--army-1', '#000000');
    expect(tokenColor('--army-1')).toEqual([154, 46, 34, 255]); // cached
    resetTokenColors();
    expect(tokenColor('--army-1')).toEqual([0, 0, 0, 255]);
  });
  it('falls back to grey for unknown tokens', () => {
    expect(tokenColor('--no-such-token', 200)).toEqual([128, 128, 128, 200]);
  });
});

describe('sideToken', () => {
  const sides: Side[] = [
    { id: 'de', name: 'Germany', alliance: 'Central Powers' },
    { id: 'at', name: 'Austria-Hungary', alliance: 'Central Powers' },
    { id: 'fr', name: 'France', alliance: 'Entente' },
    { id: 'gb', name: 'Britain', alliance: 'Entente' },
    { id: 'xx', name: 'Neutral' },
  ];
  it('cycles the alliance family in pack order', () => {
    expect(sideToken(sides[0]!, sides)).toBe('--army-1');
    expect(sideToken(sides[1]!, sides)).toBe('--army-2');
    expect(sideToken(sides[2]!, sides)).toBe('--french');
    expect(sideToken(sides[3]!, sides)).toBe('--brass');
    expect(sideToken(sides[4]!, sides)).toBe('--brass');
  });
});
