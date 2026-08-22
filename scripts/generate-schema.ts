#!/usr/bin/env tsx
/**
 * Emit JSON Schema (draft 2020-12) for every content file kind into schema/,
 * generated from the Zod definitions in src/packs/schema.
 *
 *   npm run schema            # write schema/*.schema.json
 *   npm run schema -- --check # exit 1 if the committed files are stale
 *
 * Editors pick these up through the `$schema` key or a JSON schema mapping;
 * the validator uses Zod directly and never reads these files.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { JSON_SCHEMAS } from '../src/packs/schema/files.js';

export const SCHEMA_DIR = 'schema';

export function renderSchemas(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, schema] of Object.entries(JSON_SCHEMAS)) {
    const json = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' });
    const doc = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: `https://sandtable.davetashner.com/schema/${name}.schema.json`,
      title: `Sandtable ${name}`,
      ...json,
    };
    out[`${name}.schema.json`] = JSON.stringify(doc, null, 2) + '\n';
  }
  return out;
}

export function staleSchemas(dir = SCHEMA_DIR): string[] {
  const stale: string[] = [];
  for (const [file, text] of Object.entries(renderSchemas())) {
    let current = '';
    try {
      current = readFileSync(join(dir, file), 'utf8');
    } catch {
      /* missing counts as stale */
    }
    if (current !== text) stale.push(file);
  }
  return stale;
}

if (process.argv[1] && /generate-schema\.ts$/.test(process.argv[1])) {
  if (process.argv.includes('--check')) {
    const stale = staleSchemas();
    if (stale.length) {
      console.error(`schema/ is stale: ${stale.join(', ')} — run: npm run schema`);
      process.exit(1);
    }
    console.log('schema/ is up to date');
  } else {
    mkdirSync(SCHEMA_DIR, { recursive: true });
    for (const [file, text] of Object.entries(renderSchemas()))
      writeFileSync(join(SCHEMA_DIR, file), text);
    console.log(`wrote ${Object.keys(JSON_SCHEMAS).length} schemas to ${SCHEMA_DIR}/`);
  }
}
