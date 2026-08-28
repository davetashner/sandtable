/**
 * The in-memory shape of everything under content/, as read by a loader
 * (the CLI reads the filesystem; a browser loader will fetch). Raw, unparsed
 * values — the validator parses them against the schema and reports.
 */

import type { SharedRegistryDir } from '../schema/files.js';

/** One file's raw contents, with the path used in messages. */
export interface RawFile {
  /** Path relative to the content root, e.g. eras/1914-schlieffen-marne/routes.json */
  path: string;
  /** Parsed JSON for .json files; the full text for .md files. */
  data: unknown;
}

export interface RawPack {
  /** Directory name under content/eras, e.g. 1914-schlieffen-marne */
  dir: string;
  pack: RawFile;
  /** Optional collection files keyed by file name (formations.json, …). */
  collections: Record<string, RawFile>;
  /** beats/*.md as text. */
  beats: RawFile[];
  /** diagrams/*.svg as text — inlined into beats, so the validator reads them. */
  diagrams?: RawFile[];
}

export interface RawShared {
  /**
   * The shared registries, one file per entity, keyed by directory (ADR 0022).
   * A `RawFile` here holds a single Person, Place or Source — the same shape
   * `media` and `audio` have always had, and for the same reason: an entity
   * per file is an entity per diff.
   */
  registries: Record<SharedRegistryDir, RawFile[]>;
  /** Every media.json manifest. */
  media: RawFile[];
  /** Every cue.json manifest (the score). */
  audio: RawFile[];
}

export interface RawContent {
  packs: RawPack[];
  shared: RawShared;
  threads: RawFile[];
  /**
   * `content/receipts/*.json` — the verification receipts (ADR 0021). Apparatus
   * rather than content: the pack build does not read this directory, so a
   * receipt costs a reader nothing.
   */
  receipts?: RawFile[];
  /**
   * `content/receipts/backlog.txt` as text — the ids allowed to carry a
   * quotation without a receipt while `sand-23b.57.1` runs.
   */
  receiptBacklog?: RawFile;
}
