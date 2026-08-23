/**
 * Entity references inside prose (sand-1l0.29).
 *
 * A Markdown link whose target is an entity id — `[Joffre](person:joffre-joseph)`
 * — points at that entity's card rather than at a URL. The id is named
 * explicitly instead of matched from the text on purpose: the 1914 registry
 * already holds two Moltkes and two Wilhelms, and a surname matcher would
 * mislink them. Era-agnostic — the same rule carries places, documents,
 * battles and formations, so nothing here knows about 1914.
 */

/** Link targets that are ordinary web links, never entity ids. */
const WEB_SCHEMES = new Set([
  'http',
  'https',
  'mailto',
  'tel',
  'ftp',
  'data',
  'blob',
  'javascript',
]);

/** Shared registries whose ids are not era-qualified. */
const SHARED_PREFIXES = new Set(['person', 'place', 'source', 'media']);

/** `person:joffre-joseph`, `place:liege`, `1914:tech-railways` — a prefix and a slug. */
const ENTITY_ID = /^([a-z][a-z0-9-]*|\d{3,4}):([a-z0-9][a-z0-9-]*)$/i;

/**
 * True when a Markdown link target names an entity rather than a location.
 * In-page anchors (GFM footnotes) and relative paths are never entities.
 */
export function isEntityHref(href: string | undefined): boolean {
  if (!href) return false;
  if (href.startsWith('#') || href.startsWith('/') || href.startsWith('.')) return false;
  const m = ENTITY_ID.exec(href);
  return m ? !WEB_SCHEMES.has(m[1]!.toLowerCase()) : false;
}

/**
 * A coarse family for styling: the registry name for shared ids
 * (`person:…` → `person`), or the slug's first word for era-qualified ids
 * (`1914:document-hentsch-…` → `document`).
 */
export function entityKind(id: string): string {
  const m = ENTITY_ID.exec(id);
  if (!m) return 'entity';
  const head = m[1]!.toLowerCase();
  if (SHARED_PREFIXES.has(head)) return head;
  return m[2]!.split('-')[0] || 'entity';
}

/** Every entity id linked from a Markdown body, in order, deduplicated. */
export function entityLinksIn(markdown: string): string[] {
  const out = new Set<string>();
  for (const m of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = m[1]!;
    if (isEntityHref(href)) out.add(href);
  }
  return [...out];
}
