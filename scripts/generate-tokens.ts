#!/usr/bin/env tsx
/**
 * Write src/styles/tokens.css from src/styles/tokens.ts.
 *
 *   npm run tokens            # regenerate
 *   npm run tokens -- --check # exit 1 if the committed CSS is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { renderTokensCss } from '../src/styles/tokens.js';

export const TOKENS_CSS = 'src/styles/tokens.css';

export function tokensCssStale(): boolean {
  try {
    return readFileSync(TOKENS_CSS, 'utf8') !== renderTokensCss();
  } catch {
    return true;
  }
}

if (process.argv[1] && /generate-tokens\.ts$/.test(process.argv[1])) {
  if (process.argv.includes('--check')) {
    if (tokensCssStale()) {
      console.error(`${TOKENS_CSS} is stale — run: npm run tokens`);
      process.exit(1);
    }
    console.log(`${TOKENS_CSS} is up to date`);
  } else {
    writeFileSync(TOKENS_CSS, renderTokensCss());
    console.log(`wrote ${TOKENS_CSS}`);
  }
}
