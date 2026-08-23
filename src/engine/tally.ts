/**
 * Strength ledgers (sand-1l0.19): the running value of a tally at an instant
 * and the entries that have happened by then. Pure.
 */
import type { Tally } from '../packs/schema/index.js';

type Entry = Tally['entries'][number];

export interface TallyStatus {
  /** Value after every entry at or before `now` (the start value before any). */
  value: number;
  /** Entries that have happened by `now`, in order. */
  applied: Entry[];
  /** The next entry still ahead. */
  next?: Entry;
  /** True once the start instant has passed. */
  started: boolean;
}

export function tallyStatus(tally: Tally, now: number): TallyStatus {
  let value = tally.start.value;
  const applied: Entry[] = [];
  let next: Entry | undefined;
  for (const e of tally.entries) {
    if (Date.parse(e.at) <= now) {
      value += e.delta;
      applied.push(e);
    } else if (!next) next = e;
  }
  const out: TallyStatus = { value, applied, started: Date.parse(tally.start.asOf) <= now };
  if (next) out.next = next;
  return out;
}

/** Running totals per entry, for the ledger table. */
export function tallyRunning(tally: Tally): { entry: Entry; after: number }[] {
  let v = tally.start.value;
  return tally.entries.map((entry) => {
    v += entry.delta;
    return { entry, after: v };
  });
}

/** "+1", "−2". */
export const deltaLabel = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0');
