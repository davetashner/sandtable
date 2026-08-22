// @vitest-environment node
/**
 * The real content/ tree must validate, and the committed JSON Schema must
 * match what the Zod definitions generate. Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/packs/validate/validate.js';
import { readContent } from './lib/read-content.js';
import { staleSchemas } from './generate-schema.js';

describe('content/', () => {
  it('validates with no errors', () => {
    const { content, problems } = readContent('content');
    const report = validateContent(content);
    const errors = [...problems, ...report.errors].map(
      (e) => `${e.path}${e.id ? ` [${e.id}]` : ''}: ${e.message}`,
    );
    expect(errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(content.packs.length).toBeGreaterThan(0);
  });
});

describe('schema/', () => {
  it('is up to date with src/packs/schema (run `npm run schema`)', () => {
    expect(staleSchemas('schema')).toEqual([]);
  });
});
