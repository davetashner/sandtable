import { describe, expect, it } from 'vitest';
import { OWNS_KEYS, ownsKeys } from './shortcuts.js';

const el = (html: string): Element => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild!;
};

describe('ownsKeys', () => {
  it('leaves the global shortcuts to a button, a link and plain text', () => {
    expect(ownsKeys(el('<button>Play</button>'))).toBe(false);
    expect(ownsKeys(el('<a href="/">Kluck</a>'))).toBe(false);
    expect(ownsKeys(el('<p>the wheel</p>'))).toBe(false);
    expect(ownsKeys(null)).toBe(false);
  });

  it('gives a text field its own keys without being told', () => {
    expect(ownsKeys(el('<input type="range" />'))).toBe(true);
    expect(ownsKeys(el('<textarea></textarea>'))).toBe(true);
    expect(ownsKeys(el('<select></select>'))).toBe(true);
    expect(ownsKeys(el('<div contenteditable="true"></div>'))).toBe(true);
  });

  it('gives a declared surface its own keys, and everything inside it', () => {
    const map = el(`<div ${OWNS_KEYS}><canvas tabindex="0"></canvas></div>`);
    expect(ownsKeys(map)).toBe(true);
    expect(ownsKeys(map.querySelector('canvas'))).toBe(true);
  });
});
