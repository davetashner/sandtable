import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CopyLink } from './CopyLink.js';

const LINK = 'https://sandtable.davetashner.com/?t=1914-09-06T06:00:00Z&layers=commanders';

describe('<CopyLink>', () => {
  it('copies the address of the view and says so', async () => {
    const write = vi.fn((_text: string) => Promise.resolve());
    render(<CopyLink href={() => LINK} write={write} />);
    const button = screen.getByRole('button', { name: 'Copy a link to this view' });
    fireEvent.click(button);
    await waitFor(() => expect(write).toHaveBeenCalledWith(LINK));
    expect(await screen.findByText(/copied to the clipboard/)).toBeInTheDocument();
    // the name is stable; only the visual label and the live region change
    expect(button).toHaveAccessibleName('Copy a link to this view');
  });

  it('offers the link to copy by hand when the clipboard refuses', async () => {
    render(<CopyLink href={() => LINK} write={() => Promise.reject(new Error('denied'))} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy a link to this view' }));
    const field = await screen.findByRole('textbox', { name: 'Link to this view' });
    expect(field).toHaveValue(LINK);
    expect(field).toHaveAttribute('readonly');
    expect(screen.getByText(/copy it by hand/)).toBeInTheDocument();
  });

  it('falls back to the address bar when no href is given', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-24T12:00:00Z');
    const write = vi.fn((_text: string) => Promise.resolve());
    render(<CopyLink write={write} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy a link to this view' }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(window.location.href));
    expect(write.mock.calls[0]![0]).toContain('?t=1914-08-24T12:00:00Z');
  });
});
