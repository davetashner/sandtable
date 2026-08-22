# Sandtable

An interactive history simulation and learning companion. It opens with the
Schlieffen Plan — Germany's 1914 wager to swing through Belgium, avoid the
French fortress line and win in six weeks — and follows the thread through the
First World War, the interwar years and the Second, with the technology and
science of each moment alongside. Built so that other eras are added as data,
not as new applications.

- **Roadmap:** [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Decisions:** [`docs/decisions/`](docs/decisions/README.md)
- **Backlog:** beads (`bd ready`) — see `CLAUDE.md`
- **Proof of concept:** [`poc/schlieffen-plan.html`](poc/schlieffen-plan.html) (open it in a browser; no build)

## Develop

Requires Node 22 (`.nvmrc`).

```bash
npm ci
npm run dev          # Vite dev server
npm run lint         # ESLint
npm run typecheck    # tsc -b
npm test             # Vitest (add -- --run for a single pass)
npm run validate:content
npm run build        # tsc -b && vite build → dist/
```

## Layout

```text
src/engine    era-agnostic runtime (timeline, map, branches, focus)
src/ui        React components for the three surfaces
src/packs     scenario-pack types, schema, loader
content/      scenario packs, shared registries, threads (data, not code)
infra/        AWS CDK stack (S3 + CloudFront + Route 53)
scripts/      data pipelines and CI helpers
docs/         roadmap, decision records, authoring guide
poc/          the original single-file proof of concept
```

## Contributing

Work happens on feature branches in worktrees, lands by pull request with
squash or rebase merges, and `main` requires green `lint`, `security` and
`web` checks. Every PR names the beads it completes. Content cites sources;
images are open-licence, credited, and never gory. See `CLAUDE.md` for the
full conventions.
