/**
 * The atlas of eras (`sand-shn.1`), which is the home page (ADR 0024): every
 * campaign the app can open, grouped by arc, each a link into the campaign
 * shell.
 *
 * It reads `/pack/index.json` — a summary per era, a few hundred bytes each —
 * rather than the bundles themselves, so listing twenty eras costs one small
 * request and not twenty large ones. The manifest is written at build time by
 * `scripts/lib/vite-plugin-pack.ts` from each `pack.json`, which means the
 * atlas cannot drift from what the build actually emitted: an era is on this
 * page if and only if there is a bundle behind it.
 *
 * Opening an era is a navigation to `/?pack=<id>`, not a runtime swap. That is
 * deliberate and it is what keeps ADR 0018's top-level `await` working: one
 * page load is one era, so every module in the campaign app goes on reading its
 * pack at module scope. **Every era is addressed with its `pack`, the seed one
 * included** — `/` is this page now, so a campaign link that named no campaign
 * would be a link that depended on which era happened to be the seed.
 */
import { useEffect, useState } from 'react';
import { PACK_DEFAULT, PACK_INDEX } from 'virtual:sandtable-pack';
import { groupByArc, type Arc } from './arcs.js';
import './atlas.css';

interface PackSummary {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  arc?: string;
  timeRange: { start: string; end: string };
  region: [number, number, number, number];
  status: string;
  bytes: number;
}

interface PackIndex {
  default: string;
  /**
   * The arc table, authored in `content/shared/arcs.json` and carried on this
   * index so the atlas costs one request (`sand-shn.14`). Optional because an
   * index emitted before that field existed must still render: an absent table
   * groups every era under "Elsewhere", which lists all of them.
   */
  arcs?: Arc[];
  packs: PackSummary[];
}

/** "August 1914 – November 1914", from the pack's own clock. */
function span(range: { start: string; end: string }): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const from = fmt(range.start);
  const to = fmt(range.end);
  return from === to ? from : `${from} – ${to}`;
}

/** The year an era opens in — the eyebrow that makes the list scannable. */
const startYear = (range: { start: string; end: string }) =>
  String(new Date(range.start).getUTCFullYear());

/**
 * The first paragraph of the pack's summary, which is the one written to be
 * read first. The rest is the era's opening prose and belongs in the era: a
 * front door that printed all of Pearl Harbor's three paragraphs would bury
 * the two campaigns underneath it.
 */
const opener = (summary: string) => summary.split(/\n\s*\n/)[0]?.trim() ?? '';

type State = { kind: 'loading' } | { kind: 'ready'; index: PackIndex } | { kind: 'failed' };

export function Atlas() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch(PACK_INDEX)
      .then((r) => {
        if (!r.ok) throw new Error(`atlas index: HTTP ${r.status}`);
        return r.json() as Promise<PackIndex>;
      })
      .then((index) => {
        if (!cancelled) setState({ kind: 'ready', index });
      })
      .catch((e: unknown) => {
        console.warn('[atlas]', e);
        if (!cancelled) setState({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="atlas">
      <header className="atlas__head">
        <p className="atlas__eyebrow">Sandtable</p>
        <h1 className="atlas__title">An atlas of campaigns you can open</h1>
        <p className="atlas__lede">
          Each era is a self-contained scenario pack drawn on real ground — its own clock, its own
          armies, its own argument — with the decisions the commanders actually faced and the roads
          they did not take. Every date, number and position cites a source.
        </p>
      </header>

      {state.kind === 'loading' && (
        <p className="atlas__note" role="status">
          Reading the atlas…
        </p>
      )}

      {state.kind === 'failed' && (
        <p className="atlas__note atlas__note--failed" role="alert">
          The atlas index could not be read, so there is nothing to list. The campaigns themselves
          are still there —{' '}
          <a href={`/?pack=${encodeURIComponent(PACK_DEFAULT)}`}>open the seed campaign</a> and try
          this page again.
        </p>
      )}

      {state.kind === 'ready' &&
        groupByArc(state.index.packs, state.index.arcs ?? []).map(({ arc, packs }) => (
          <section className="atlas__arc" key={arc?.id ?? 'rest'}>
            <h2 className="atlas__arc-title">{arc ? arc.title : 'Elsewhere'}</h2>
            <p className="atlas__arc-argument">
              {arc ? arc.argument : 'Eras this build has no arc for.'}
            </p>
            <ol className="atlas__list">
              {packs.map((p) => (
                <li key={p.id}>
                  <a className="atlas__era" href={`/?pack=${encodeURIComponent(p.id)}`}>
                    <span className="atlas__year">{startYear(p.timeRange)}</span>
                    <span className="atlas__body">
                      <span className="atlas__era-title">{p.title}</span>
                      {p.subtitle && <span className="atlas__subtitle">{p.subtitle}</span>}
                      <span className="atlas__summary">{opener(p.summary)}</span>
                      <span className="atlas__meta">
                        <span>{span(p.timeRange)}</span>
                        {/* A pack that is still being written says so, rather than
                            letting a reader mistake scaffolding for a finished
                            argument (`Pack.status`, docs/content-model.md). */}
                        {p.status !== 'published' && (
                          <span className="atlas__status" data-status={p.status}>
                            {p.status}
                          </span>
                        )}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
    </div>
  );
}
