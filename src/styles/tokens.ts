/**
 * Design tokens — the single source of truth for the war-room identity
 * (sand-neh.1). `npm run tokens` writes src/styles/tokens.css from this file;
 * a test fails if the CSS drifts, and another test checks every text/ground
 * pair meets WCAG AA (4.5:1) in both themes. Components use the CSS variables;
 * the engine reads them at run time (src/engine/layers/colors.ts); this module
 * exists so tests and generators can reason about the values.
 *
 * Identity: a lamp-lit General Staff war room — parchment and slate grounds,
 * brass accents, an oxblood family for one alliance and a slate blue for the
 * other; Fraunces for display, IBM Plex Sans for text, IBM Plex Mono for the
 * instrument panel (dates, counters, eyebrows).
 */

export type ThemeName = 'light' | 'dark';

/** Colour tokens (hex). Names are the CSS variables without the leading `--`. */
export interface ColorTokens {
  /** Page ground (parchment / slate). */
  bg: string;
  /** Panels: dossier, timeline, controls. */
  panel: string;
  /** Secondary panel surface: chips, inputs, bands. */
  'panel-2': string;
  /** Body text. */
  ink: string;
  /** Secondary text — must stay AA on every ground. */
  muted: string;
  /** Accent and instrument text — AA on every ground. */
  brass: string;
  /** Brass for rules and borders, not text. */
  'brass-dim': string;
  /** Hairlines. */
  line: string;
  /** Warning/red text that must stay readable (✗ marks, errors). */
  'accent-red': string;
  /** Oxblood family: Central Powers sides in pack order. Fills and strokes. */
  'army-1': string;
  'army-2': string;
  'army-3': string;
  /** Slate blue: the first Entente side. Fills, strokes and text. */
  french: string;
  /** Map grounds. */
  sea: string;
  land: string;
}

export const colors: Record<ThemeName, ColorTokens> = {
  light: {
    bg: '#e6dfcb',
    panel: '#efe9d8',
    'panel-2': '#e0d9c4',
    ink: '#241f16',
    muted: '#5f5849',
    brass: '#745519',
    'brass-dim': '#b7a97c',
    line: '#c9bfa4',
    'accent-red': '#9a2e22',
    'army-1': '#9a2e22',
    'army-2': '#832820',
    'army-3': '#6e241e',
    french: '#24566e',
    sea: '#d6ccae',
    land: '#e6dfcb',
  },
  dark: {
    bg: '#10161a',
    panel: '#1a2228',
    'panel-2': '#202a31',
    ink: '#e9e1cb',
    muted: '#93998f',
    brass: '#c9a24b',
    'brass-dim': '#6e6142',
    line: '#384049',
    'accent-red': '#e0765e',
    'army-1': '#d45b3f',
    'army-2': '#b94734',
    'army-3': '#97392a',
    french: '#6fa6c4',
    sea: '#0b1013',
    land: '#1d262c',
  },
};

/** Tokens that are used as text and must meet AA on every ground. */
export const TEXT_TOKENS: (keyof ColorTokens)[] = ['ink', 'muted', 'brass', 'accent-red', 'french'];
/** Grounds text sits on. */
export const GROUND_TOKENS: (keyof ColorTokens)[] = ['bg', 'panel', 'panel-2'];

/** Theme-independent tokens. */
export const shared = {
  'font-display': "'Fraunces', Georgia, 'Times New Roman', serif",
  'font-body': "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  'font-mono': "'IBM Plex Mono', ui-monospace, Menlo, monospace",
  // type scale — a 1.2 ratio from a 14.5px body, clamped where it needs to breathe
  'fs-xs': '10.5px',
  'fs-sm': '12px',
  'fs-md': '14.5px',
  'fs-lg': '17px',
  'fs-xl': '21px',
  'fs-2xl': '26px',
  'fs-3xl': 'clamp(24px, 3.2vw, 34px)',
  'lh-tight': '1.2',
  'lh-body': '1.55',
  'track-eyebrow': '0.12em',
  // spacing — 4px base
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',
  'space-6': '32px',
  // shape and motion
  radius: '10px',
  'radius-sm': '8px',
  'radius-pill': '999px',
  'dur-fast': '120ms',
  'dur-base': '260ms',
  'dur-camera': '1400ms',
  'ease-out': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
} as const;

/** Theme-specific non-colour tokens. */
export const shadows: Record<ThemeName, string> = {
  light: '0 8px 24px rgba(40, 32, 16, 0.14)',
  dark: '0 12px 32px rgba(0, 0, 0, 0.45)',
};

// ------------------------------------------------------------- contrast

/** WCAG 2.x relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [16, 8, 0]
    .map((s) => ((n >> s) & 255) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** WCAG contrast ratio between two colours (≥ 4.5 passes AA for body text). */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ---------------------------------------------------------------- render

function block(theme: ThemeName): string {
  const c = colors[theme];
  const lines = Object.entries(c).map(([k, v]) => `  --${k}: ${v};`);
  lines.push(`  --shadow: ${shadows[theme]};`);
  lines.push(`  color-scheme: ${theme};`);
  return lines.join('\n');
}

/** The contents of src/styles/tokens.css. */
export function renderTokensCss(): string {
  const sharedLines = Object.entries(shared)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  return `/*
 * Design tokens — GENERATED from src/styles/tokens.ts by \`npm run tokens\`.
 * Do not edit by hand; change tokens.ts and regenerate (a test guards drift).
 *
 * Theme model: bare :root = light; dark via prefers-color-scheme unless
 * [data-theme="light"] is stamped; [data-theme="dark"] forces dark.
 * Components use these variables only — never literal colours or typefaces.
 */
:root {
${block('light')}

${sharedLines}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${block('dark')
  .split('\n')
  .map((l) => `  ${l}`)
  .join('\n')}
  }
}

:root[data-theme='dark'] {
${block('dark')}
}
`;
}
