/**
 * The cast strip — a pack's dramatis personae as a row of portrait buttons at
 * the top of the dossier (sand-9ts): grouped by side, ringed in the side's
 * colour, the open profile marked. Selecting a face opens the person's
 * profile (?card=person:…); selecting it again returns to the narrative.
 * Era-agnostic: members come from the pack's cast.json joined to the shared
 * people and media registries by the caller.
 *
 * The face itself is a PortraitChip, so the crop, the tone, the initials
 * fallback and the lazy fetch are the same here as in a vignette or a card
 * (ADR 0012); the strip owns only the grouping and the side ring.
 */
import type { CSSProperties } from 'react';
import { sideToken } from '../engine/layers/colors.js';
import type { MediaIndexEntry } from '../packs/media-index.js';
import type { Side } from '../packs/schema/index.js';
import { PortraitChip } from './PortraitChip.js';
import './cast.css';
import './prose.css';

export interface CastMember {
  /** Cast entry id. */
  id: string;
  /** Person id (the selection key). */
  person: string;
  name: string;
  /** Period role, one line. */
  role: string;
  side?: string | undefined;
  portrait?: MediaIndexEntry | undefined;
}

export interface CastStripProps {
  members: CastMember[];
  sides: Side[];
  /** Person id of the open profile. */
  selected?: string | undefined;
  onSelect: (personId: string) => void;
  /** Base URL of the media bucket path, default /assets/media/. */
  base?: string;
}

export function CastStrip({
  members,
  sides,
  selected,
  onSelect,
  base = '/assets/media/',
}: CastStripProps) {
  if (members.length === 0) return null;
  const order = new Map(sides.map((s, i) => [s.id, i]));
  const groups = new Map<string, CastMember[]>();
  for (const m of members) {
    const key = m.side && order.has(m.side) ? m.side : '';
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const keys = [...groups.keys()].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  return (
    <nav className="cast" aria-label="Cast">
      {keys.map((key) => {
        const side = sides.find((s) => s.id === key);
        const style = side
          ? ({ '--chip-ring': `var(${sideToken(side, sides)})` } as CSSProperties)
          : undefined;
        return (
          <ul
            key={key || 'other'}
            className="cast__group"
            aria-label={side ? (side.short ?? side.name) : 'Others'}
            style={style}
          >
            {groups.get(key)!.map((m) => (
              <li key={m.id}>
                <PortraitChip
                  entry={m.portrait}
                  name={m.name}
                  role={m.role}
                  base={base}
                  pressed={m.person === selected}
                  onSelect={() => onSelect(m.person)}
                />
              </li>
            ))}
          </ul>
        );
      })}
    </nav>
  );
}
