/**
 * Primitive building blocks shared by every entity schema.
 *
 * The schema is written in Zod (v4) and is the single source of truth: the
 * TypeScript types are inferred from it, the JSON Schema under `schema/` is
 * generated from it (`npm run schema`), and the validator uses it at run time.
 * Nothing here depends on Node or the DOM, so the same module serves the CLI,
 * the tests and the in-browser pack loader.
 */
import { z } from 'zod';

/**
 * Entity identifier. Era-qualified for pack entities (`1914:marne`,
 * `1914:army-de-1`), kind-qualified for shared registries
 * (`person:joffre-joseph`, `place:liege`, `source:herwig-2009`,
 * `media:person/joffre-joseph/portrait-colorized`). Lower-case; the part
 * after the colon may contain `/` for media paths and `.` for versions.
 */
export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9._/-]*$/, {
    message: 'ids are lower-case and qualified: <era|kind>:<slug>',
  })
  .describe('Qualified entity id, e.g. 1914:marne or person:joffre-joseph');

/** A URL-safe slug (pack directory names, side ids, option ids). */
export const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, { message: 'slug: a-z 0-9 -' });

/** Absolute instant, ISO-8601 with an offset or Z, e.g. `1914-08-04T08:00:00Z`. */
export const IsoTime = z.iso
  .datetime({ offset: true })
  .describe('ISO-8601 date-time with offset, e.g. 1914-08-04T08:00:00Z');

/** Calendar date without time, e.g. `1914-08-04`. */
export const IsoDate = z.iso.date().describe('ISO-8601 date, e.g. 1914-08-04');

/** A year or year-month, for roles and dates known only roughly: `1891`, `1914-08`. */
export const PartialDate = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, { message: 'YYYY or YYYY-MM' })
  .describe('Year or year-month, e.g. 1891 or 1914-08');

/** A date-time, a date, or — where only the year or month is known — a partial date. */
export const When = z.union([IsoTime, IsoDate, PartialDate]);

/** Inclusive time range. Validated (start < end) by the validator, not the schema. */
export const TimeRange = z
  .object({ start: IsoTime, end: IsoTime })
  .strict()
  .describe('Inclusive time range; start must precede end');

/** Markdown text (CommonMark + footnote citations `[^source-id]`). */
export const Markdown = z.string().min(1).describe('Markdown');

/** [longitude, latitude] in WGS 84. */
export const LngLat = z
  .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  .describe('[lng, lat] in WGS 84');

/** [west, south, east, north] bounding box. */
export const BBox = z
  .tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ])
  .describe('[west, south, east, north]');

/** Map camera. */
export const Camera = z
  .object({
    center: LngLat,
    zoom: z.number().min(0).max(22),
    bearing: z.number().min(-180).max(180).optional(),
    pitch: z.number().min(0).max(85).optional(),
  })
  .strict();

/** How sure we are of a position, date or claim. */
export const Confidence = z
  .enum(['high', 'medium', 'low', 'contested'])
  .describe(
    'high: documented; medium: inferred from sources; low: approximate; contested: historians disagree',
  );

/**
 * A citation: a pointer to a `Source` plus an optional locator. Entities that
 * make factual claims carry `sources: Citation[]`; the validator enforces the
 * minimum count per entity kind.
 */
export const Citation = z
  .object({
    source: Id.describe('Source id, e.g. source:herwig-2009'),
    pages: z.string().optional().describe('Page(s), e.g. "112–115" or "ch. 4"'),
    note: z.string().optional().describe('What this citation supports'),
  })
  .strict();

/** Alternate names for people and places (period, language, transliteration). */
export const AltName = z
  .object({
    name: z.string().min(1),
    language: z.string().optional().describe('BCP 47 tag, e.g. de, fr, zh-Latn'),
    period: z.string().optional().describe('When this name applied, e.g. "to 1918" or "1905–1945"'),
    kind: z.enum(['period', 'modern', 'translation', 'transliteration', 'nickname']).optional(),
  })
  .strict();

export type Id = z.infer<typeof Id>;
export type IsoTime = z.infer<typeof IsoTime>;
export type IsoDate = z.infer<typeof IsoDate>;
export type PartialDate = z.infer<typeof PartialDate>;
export type When = z.infer<typeof When>;
export type TimeRange = z.infer<typeof TimeRange>;
export type LngLat = z.infer<typeof LngLat>;
export type BBox = z.infer<typeof BBox>;
export type Camera = z.infer<typeof Camera>;
export type Confidence = z.infer<typeof Confidence>;
export type Citation = z.infer<typeof Citation>;
export type AltName = z.infer<typeof AltName>;
