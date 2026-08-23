import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import { Prose } from './Prose.js';

const range = { start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 7, 2) + 40 * DAY };

const renderProse = (md: string) =>
  render(
    <ClockProvider range={range}>
      <Prose>{md}</Prose>
    </ClockProvider>,
  );

describe('Prose', () => {
  it('turns an entity link into a card link with a working href', () => {
    renderProse('On 17 August [Lanrezac](person:lanrezac-charles) met the British.');
    const link = screen.getByRole('link', { name: 'Lanrezac' });
    expect(link.getAttribute('href')).toContain('card=person:lanrezac-charles');
    expect(link).toHaveClass('entity-link');
    expect(link.getAttribute('data-kind')).toBe('person');
  });

  it('opens the card on a plain click instead of navigating', () => {
    renderProse('[Joffre](person:joffre-joseph) sends the armies forward.');
    fireEvent.click(screen.getByRole('link', { name: 'Joffre' }), { button: 0 });
    expect(window.location.search).toContain('card=person:joffre-joseph');
  });

  it('leaves ordinary links alone and opens external ones in a new tab', () => {
    renderProse('See [the archive](https://example.org/item).');
    const link = screen.getByRole('link', { name: 'the archive' });
    expect(link).not.toHaveClass('entity-link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders nothing for empty prose', () => {
    const { container } = renderProse('');
    expect(container).toBeEmptyDOMElement();
  });
});
