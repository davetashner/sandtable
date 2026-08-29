# Sandtable

An interactive history simulation and learning companion. Campaigns are played
out on real geography with a timeline, a narrative dossier, counterfactual
branches, battle zoom-ins, and rails carrying the technology and science of the
same moment. The engine knows nothing about any particular war: an era is
**data** — a scenario pack of JSON and Markdown under `content/` — so a new
campaign is authored, not programmed.

Five eras are in the app today:

| Era                       | What it covers                                           |
| ------------------------- | -------------------------------------------------------- |
| `1914-schlieffen-marne`   | The Schlieffen Plan and the march to the Marne           |
| `1915-attrition`          | The year of failed breakthroughs; gas at Ypres           |
| `1917-russian-revolution` | February to October, in a calendar thirteen days behind  |
| `1918-russian-civil-war`  | Six fronts and no continuous line; Brest-Litovsk to 1922 |
| `1941-pearl-harbor`       | Two clocks, ten and a half hours apart                   |

More are on the way: [ADR 0019](docs/decisions/0019-second-world-war-arc.md)
commits the Second World War arc to ten Pacific packs opening at Mukden in
1931, with the European theatres after them.

**The atlas is the home page.** `/` lists every campaign, grouped by arc; a URL
that names a view — `/?pack=1915-attrition&t=…`, or any of ADR 0009's slots —
opens that view of that campaign instead
([ADR 0024](docs/decisions/0024-the-home-page-is-the-atlas.md)). It reads a
small build-time manifest rather than the packs themselves, so listing twenty
campaigns costs one request. Opening one is a navigation to `/?pack=<id>`, not
a runtime swap:
**one page load is one era**, and the pack is fetched from the app's own origin
rather than bundled with it
([ADR 0018](docs/decisions/0018-fetching-the-pack.md)). That is what keeps a
content change from being a performance change.

- **Roadmap:** [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Decisions:** [`docs/decisions/`](docs/decisions/README.md) — twenty records
  on the stack, the geography, the URL contract, imagery policy, the visual and
  performance gates, and how eras are named and sequenced
- **Contributing:** [`CONTRIBUTING.md`](CONTRIBUTING.md), then
  [`docs/agent-workflow.md`](docs/agent-workflow.md) for the practices around it
- **Backlog:** beads (`bd ready`) — see `CLAUDE.md`
- **Proof of concept:** [`poc/schlieffen-plan.html`](poc/schlieffen-plan.html)
  (open it in a browser; no build)

## Develop

Requires Node 22 (`.nvmrc`).

```bash
npm ci
npm run dev              # Vite dev server; tiles and borders come from production
npm run verify           # every gate CI's `web` job runs, in fail-fast order (ADR 0023)
```

`verify` is the whole list and the only definition of it, so CI and a
contributor cannot disagree about what green means:

```bash
npm run lint             # ESLint
npm run format:check     # Prettier — `npm run format` fixes it
npm run typecheck        # tsc -b
npm test -- --run        # Vitest, single pass
npm run validate:content # packs, registries and media manifests
npm run warning:budget   # the warning ceiling, one per kind (ADR 0023)
npm run build            # tsc -b && vite build → dist/
npm run bundle:budget    # the size ceilings CI holds (ADR 0016)
```

One gate is deliberately outside it, and is the one a change is most likely to
trip over:

```bash
npm run visual:check     # every scene, two themes, two viewports (ADR 0011)
```

It needs a browser and two and a half minutes, and has a CI job of its own.
`bundle:budget` measures whatever is already in `dist/`, so build first or the
number is a lie — inside `verify` the build immediately precedes it.
`CLAUDE.md` lists the rest — the content and asset pipelines
(`borders`, `front`, `tokens`, `media`, `audio`), the schema generator, the
design review and `perf`.

## Layout

```text
src/engine    era-agnostic runtime (timeline, map, branches, focus)
src/ui        React components for the three surfaces
src/packs     scenario-pack types, schema, loader
src/atlas     the index of eras — `/`, and `/atlas.html` beside it
src/gallery   /gallery.html — every component, both themes, real content
src/styles    design tokens (tokens.ts → tokens.css)
content/      scenario packs, shared registries, threads (data, not code)
schema/       generated JSON Schema, for editor completion
infra/        AWS CDK stack (S3 + CloudFront + Route 53)
scripts/      data pipelines, gates and CI helpers
docs/         roadmap, decision records, authoring and workflow guides
poc/          the original single-file proof of concept
```

## Contributing

Work happens on feature branches in worktrees, lands by pull request with
squash or rebase merges, and `main` requires every check green and the branch
up to date with it. Every PR names the beads it completes. Content cites sources;
quotations are read before they are written down; images are open-licence,
credited, and never gory (ADR 0007). See `CONTRIBUTING.md` for the workflow,
`docs/agent-workflow.md` for the sourcing rules and the local friction, and
`CLAUDE.md` for the full conventions.
