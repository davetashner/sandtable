/**
 * Prose — the single place a Markdown string becomes DOM (sand-1l0.29).
 *
 * Every narrative surface renders through this so one rule holds everywhere:
 * a link whose target is an entity id opens that entity's card in the dossier
 * instead of navigating. Written as a real anchor with a working `href`, so a
 * reader can copy it, open it in a new tab, or middle-click it; a plain click
 * is intercepted and becomes a card change, which keeps the clock, branch and
 * zoom-in exactly where they were.
 *
 * Raw HTML is never enabled (react-markdown escapes it) — the entity link is
 * ordinary Markdown link syntax, so authors need no HTML and the escaping
 * behaviour is unchanged.
 */
import type { ReactNode } from 'react';
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useViewState, useViewStateControls } from '../engine/ClockContext.js';
import { entityKind, isEntityHref } from '../engine/entity-links.js';
import { formatViewState } from '../engine/url-state.js';
import './prose.css';

export interface EntityLinkProps {
  /** The entity id to open as a card. */
  id: string;
  /** Accessible name, when the children are not text (a portrait). */
  label?: string | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * A link to an entity's card. Falls back to plain navigation when no URL
 * binding is present (a static render or a test without a provider).
 */
export function EntityLink({ id, label, className, children }: EntityLinkProps) {
  const controls = useViewStateControls();
  const slots = useViewState();
  const href = formatViewState({ ...slots, card: id });
  return (
    <a
      className={className ? `entity-link ${className}` : 'entity-link'}
      data-kind={entityKind(id)}
      data-entity={id}
      href={href || `?card=${id}`}
      {...(label ? { 'aria-label': label } : {})}
      onClick={(e) => {
        // Let the browser handle new-tab, download and modified clicks.
        if (!controls || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        controls.setCard(id);
      }}
    >
      {children}
    </a>
  );
}

const ProseAnchor: Components['a'] = ({ node, href, children, ...rest }) => {
  void node;
  if (isEntityHref(href)) {
    return <EntityLink id={href!}>{children}</EntityLink>;
  }
  const external = href?.startsWith('http');
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
};

const COMPONENTS: Components = { a: ProseAnchor };

/**
 * react-markdown sanitises link targets and drops protocols it does not know,
 * which would silently delete every `person:…` href. Entity ids are ours and
 * never navigate on their own; everything else keeps the default sanitiser.
 */
const urlTransform = (url: string) => (isEntityHref(url) ? url : defaultUrlTransform(url));

/** Render a Markdown string with entity links live. */
export function Prose({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS} urlTransform={urlTransform}>
      {children}
    </Markdown>
  );
}
