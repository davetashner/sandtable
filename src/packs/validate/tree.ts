/**
 * The in-memory shape of everything under content/, as read by a loader
 * (the CLI reads the filesystem; a browser loader will fetch). Raw, unparsed
 * values — the validator parses them against the schema and reports.
 */

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
}

export interface RawShared {
  /** Optional registry files keyed by relative path (people/people.json, …). */
  collections: Record<string, RawFile>;
  /** Every media.json manifest. */
  media: RawFile[];
}

export interface RawContent {
  packs: RawPack[];
  shared: RawShared;
  threads: RawFile[];
}
