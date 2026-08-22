# src/packs

Scenario-pack schema and validation:

- `schema/` — the Zod definitions (single source of truth): primitives,
  entities, and the file layout. TypeScript types are inferred from them;
  `npm run schema` generates `schema/*.schema.json` at the repo root.
- `validate/` — the pure validator (`validateContent(raw) → Report`) and the
  front-matter helpers. No filesystem: `scripts/validate-content.ts` reads
  `content/` into a `RawContent` tree and calls it; a browser loader
  (`sand-shn.1`) will do the same from fetched files.

Rules and entity intent: `docs/content-model.md`. Content itself lives under
`content/`, never here.
