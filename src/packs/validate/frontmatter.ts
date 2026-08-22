/**
 * Split a Markdown beat into YAML front matter and body.
 *
 *   ---
 *   id: 1914:beat-mobilization
 *   ...
 *   ---
 *   Markdown body
 */
import { parse as parseYaml } from 'yaml';

export interface FrontMatterResult {
  /** Parsed YAML (unknown until validated). */
  data: unknown;
  body: string;
}

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/;

export function splitFrontMatter(text: string): FrontMatterResult | null {
  const m = FRONT_MATTER.exec(text);
  if (!m) return null;
  const yamlText = m[1] ?? '';
  const body = (m[2] ?? '').trim();
  return { data: parseYaml(yamlText), body };
}

/** Footnote references in a Markdown body: `[^herwig-2009]` → "herwig-2009". */
export function footnoteLabels(markdown: string): string[] {
  const labels = new Set<string>();
  for (const m of markdown.matchAll(/\[\^([^\]\s]+)\](?!:)/g)) {
    if (m[1]) labels.add(m[1]);
  }
  return [...labels];
}
