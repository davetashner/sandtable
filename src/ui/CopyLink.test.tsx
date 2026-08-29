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
  it('speaks the citation’s vocabulary when that is what it is copying', async () => {
    // `sand-shn.5.1` puts a second one of these inside the bibliography card.
    // The clipboard dance is the same; only the words change, and they have to
    // change or a screen reader meets two controls with one name.
    const CITATION = 'Sandtable, The Schlieffen Plan…, the view at 24 August 1914, 12:00.';
    const write = vi.fn((_text: string) => Promise.resolve());
    render(<CopyLink href={() => CITATION} write={write} what="citation" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy a citation for this view' }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(CITATION));
    expect(await screen.findByText(/Citation for this view copied/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy a link to this view' })).toBeNull();
  });

  it('offers the citation to copy by hand when the clipboard refuses', async () => {
    render(
      <CopyLink
        href={() => 'a citation'}
        write={() => Promise.reject(new Error('denied'))}
        what="citation"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy a citation for this view' }));
    const field = await screen.findByRole('textbox', { name: 'Citation for this view' });
    expect(field).toHaveValue('a citation');
  });
});
