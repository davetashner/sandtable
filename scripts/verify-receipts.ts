#!/usr/bin/env tsx
/**
 * Re-verify the quotation receipts, and help write new ones (ADR 0021).
 *
 *   npm run receipts                     # offline: coverage and consistency
 *   npm run receipts -- --fetch          # re-fetch every `how: "fetch"` receipt
 *   npm run receipts -- --fetch --id receipt:foo
 *   npm run receipts -- --capture <url> --find "<phrase>"
 *
 * Three jobs, and the third is the one that decides whether anybody uses the
 * other two. `--capture` fetches a url, extracts its text and prints the
 * passage around a phrase, ready to paste into a receipt's `context`. Without
 * it, writing a receipt means copying a paragraph out of a browser by hand and
 * hoping the whitespace survives; with it, a receipt is two commands.
 *
 * **This script fetches bytes.** That matters more than it sounds. A tool that
 * hands a page to a language model and asks it what the page said returns the
 * model's rendering of the text, and a receipt built from one would be a
 * paraphrase wearing the costume of a retrieval — which is the exact failure
 * this whole mechanism exists to prevent. Nothing here summarises anything.
 *
 * Never run in CI: it is network-dependent, several of the works are behind
 * hosts that answer this project with 403, and a gate that fails when a
 * transcription site is down would teach everyone to ignore it. Drift is
 * reported to a person, who decides.
 */
import { readContent } from './lib/read-content.js';
import { Receipt, type Receipt as ReceiptT } from '../src/packs/schema/index.js';
import { missingFragment, parseReceiptBacklog } from '../src/packs/validate/receipts.js';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const valueOf = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

/** How much text to print either side of a captured phrase. */
const CAPTURE_PADDING = 700;

/**
 * HTML to text, without a parser.
 *
 * The open sources this project can actually quote from are hypertext
 * transcriptions — HyperWar at ibiblio, Wikisource, marxists.org, the BSB's
 * document pages — which are plain enough that tag-stripping is honest. A PDF
 * or a page scan is not, and this returns nothing useful for one: that is the
 * difference between a receipt a machine can re-run and a `how: "read"`
 * attestation, and the script says which it got rather than guessing.
 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

export function htmlToText(html: string): string {
  return (
    html
      .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
      .replace(/[ \t]+/g, ' ')
      // trim each line: an opening <p> left a space where a line now starts, and
      // `--capture` output is meant to be pasted into a receipt as it stands
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Decode a response body in the encoding it was actually served in.
 *
 * `Response.text()` assumes UTF-8, and several of the transcription sites this
 * project depends on are older than that assumption: the Moscow State
 * University decree library serves Windows-1251 with no charset in the header,
 * and read as UTF-8 every Cyrillic character comes back as mojibake — which
 * looks exactly like "the passage is not on this page". Getting this wrong
 * would push the Russian sources, the ones the fabrication incident was about,
 * into the "unverifiable" bucket for a reason that is ours and not theirs.
 */
export function decodeBody(buf: ArrayBuffer, contentType: string): string {
  const declared = /charset=\s*"?([\w-]+)/i.exec(contentType)?.[1];
  const sniff = () => {
    const head = new TextDecoder('latin1').decode(buf.slice(0, 4096));
    return (
      /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
      /<\?xml[^>]+encoding=["']([\w-]+)/i.exec(head)?.[1]
    );
  };
  for (const charset of [declared, sniff(), 'utf-8']) {
    if (!charset) continue;
    try {
      return new TextDecoder(charset, { fatal: false }).decode(buf);
    } catch {
      /* an encoding label Node does not know; try the next */
    }
  }
  return new TextDecoder().decode(buf);
}

export async function fetchText(url: string): Promise<{ text: string } | { failure: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'sandtable-receipts/1.0 (+https://sandtable.davetashner.com)' },
      redirect: 'follow',
    });
    if (!res.ok) return { failure: `HTTP ${res.status}` };
    const type = res.headers.get('content-type') ?? '';
    if (/pdf|octet-stream|image\//i.test(type))
      return { failure: `${type.split(';')[0]} — not text this script can read` };
    const body = decodeBody(await res.arrayBuffer(), type);
    return { text: /html|xml/i.test(type) || /^\s*</.test(body) ? htmlToText(body) : body };
  } catch (e) {
    return { failure: (e as Error).message };
  }
}

// ------------------------------------------------------------------ capture

async function capture(url: string, find: string): Promise<number> {
  const got = await fetchText(url);
  if ('failure' in got) {
    console.error(`could not read ${url}: ${got.failure}`);
    return 1;
  }
  const at = got.text.toLowerCase().indexOf(find.toLowerCase().trim());
  if (at === -1) {
    console.error(
      `the phrase is not in the text at ${url}.\n` +
        'That is a finding, not a bug: either the passage is on another page of the ' +
        'transcription, or it is not in this source at all. Do not write it down until it is.',
    );
    return 1;
  }
  const from = Math.max(0, at - CAPTURE_PADDING);
  const to = Math.min(got.text.length, at + find.length + CAPTURE_PADDING);
  console.log(`${url}\nretrieved ${got.text.length} characters; the phrase is at ${at}\n`);
  console.log('--- context (paste into the receipt verbatim) ---');
  console.log(got.text.slice(from, to));
  console.log('--- end ---');
  return 0;
}

// ------------------------------------------------------------------- verify

type Outcome = 'agreed' | 'differed' | 'unavailable' | 'offline';

async function reverify(r: ReceiptT): Promise<{ outcome: Outcome; detail?: string }> {
  if (r.how !== 'fetch' || !r.url) return { outcome: 'offline', detail: r.copy ?? 'read receipt' };
  const got = await fetchText(r.url);
  if ('failure' in got) return { outcome: 'unavailable', detail: got.failure };
  const missing = missingFragment(r.quote, got.text);
  return missing === undefined
    ? { outcome: 'agreed' }
    : { outcome: 'differed', detail: `"${missing}" is no longer in the retrieved text` };
}

// --------------------------------------------------------------------- main

async function main(): Promise<number> {
  const captureUrl = valueOf('--capture');
  if (captureUrl) {
    const find = valueOf('--find');
    if (!find) {
      console.error('--capture needs --find "<phrase to locate in the page>"');
      return 1;
    }
    return capture(captureUrl, find);
  }

  const { content, problems } = readContent(valueOf('--content') ?? 'content');
  for (const p of problems) console.error(`✗ ${p.path}: ${p.message}`);

  const receipts: ReceiptT[] = [];
  for (const f of content.receipts ?? []) {
    const parsed = Receipt.array().safeParse(f.data);
    if (!parsed.success) {
      console.error(
        `✗ ${f.path}: ${parsed.error.issues[0]?.message} — run npm run validate:content`,
      );
      return 1;
    }
    receipts.push(...parsed.data);
  }
  const only = valueOf('--id');
  const chosen = only ? receipts.filter((r) => r.id === only) : receipts;

  const documents = content.packs.flatMap((p) => {
    const f = p.collections['documents.json'];
    return Array.isArray(f?.data) ? (f.data as { id: string }[]) : [];
  });
  const covered = new Set(receipts.flatMap((r) => r.usedIn));
  const backlog = content.receiptBacklog
    ? parseReceiptBacklog(String(content.receiptBacklog.data))
    : [];

  console.log(
    `${receipts.length} receipts; ${documents.filter((d) => covered.has(d.id)).length}/${documents.length} documents carry one, ${backlog.length} on the backlog`,
  );

  if (!flags.has('--fetch')) {
    const byMethod = { fetch: 0, read: 0 };
    for (const r of chosen) byMethod[r.how] += 1;
    console.log(
      `${byMethod.fetch} re-fetchable, ${byMethod.read} attestations of a copy nothing here can open`,
    );
    console.log('re-fetch them with: npm run receipts -- --fetch');
    return 0;
  }

  let differed = 0;
  for (const r of chosen) {
    const { outcome, detail } = await reverify(r);
    if (outcome === 'differed') differed += 1;
    const mark = { agreed: '✓', differed: '✗', unavailable: '?', offline: '·' }[outcome];
    console.log(`  ${mark} ${r.id} ${outcome}${detail ? ` — ${detail}` : ''}`);
  }
  if (differed)
    console.log(
      `\n${differed} receipt(s) no longer match what the url returns. That is not automatically ` +
        'wrong — transcriptions get re-edited and sites reorganise — but somebody has to look, ' +
        'and until they have, the quotation is unverified.',
    );
  return differed > 0 ? 1 : 0;
}

// Guarded so that `htmlToText` can be imported by a test without the script
// running, the way scripts/generate-schema.ts does it.
if (process.argv[1] && /verify-receipts\.ts$/.test(process.argv[1]))
  main().then((code) => process.exit(code));
