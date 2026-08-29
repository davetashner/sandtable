# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**

- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.

<!-- END BEADS INTEGRATION -->

## Build & Test

Node 22 (`.nvmrc`). The app is Vite + TypeScript + React (ADR 0001).

```bash
npm ci
npm run verify           # every gate below that CI's `web` job runs, in fail-fast order — one definition of green (ADR 0023)
npm run dev              # Vite dev server
npm run lint             # ESLint (flat config)
npm run typecheck        # tsc -b
npm test -- --run        # Vitest, single pass
npm run validate:content # scripts/check-content.sh + the pack validator (docs/content-model.md)
npm run warning:budget   # the warning ceiling: one per kind against scripts/warning-budget.json (ADR 0023); a warning of no listed kind fails; -- --update records counts, never a ceiling
npm run receipts         # quotation receipts: coverage; -- --fetch re-verifies against the live sources,
                         # -- --capture <url> --find "<phrase>" prints context to paste (ADR 0021). Never in CI
npm run schema           # regenerate schema/*.schema.json from src/packs/schema (tests fail if stale)
npm run borders          # rebuild content/shared/geo/borders/<year>.geojson from historical-basemaps (pinned commit)
npm run front            # rebuild content/shared/geo/front/western-front.geojson from the authored snapshots; -- --check fails on a stale commit
npm run tokens           # regenerate src/styles/tokens.css from src/styles/tokens.ts (docs/design.md; AA contrast tested)
npm run new-pack         # scaffold content/eras/<yyyy>-<slug>/ — flags or prompts, refuses the six ways a pack skeleton goes wrong (docs/authoring.md §10)
npm run media            # WebP derivatives + content/shared/media/index.json from media.json manifests; -- --upload syncs to the assets bucket
npm run audio            # loudness-matched Opus/AAC + content/shared/audio/index.json from cue.json manifests; -- --upload syncs (needs ffmpeg)
npm run build            # tsc -b && vite build → dist/ (bundles under dist/app/)
npm run visual:check     # the visual gate: every scene in scripts/lib/visual-scenes.mjs x 2 themes x 2 viewports off one load each, assets stubbed, ~2.5 min (ADR 0011).
                         # Two tiers: breakage (exit 1) and structural (exit 2) block, tiny-text is reported and never fatal; exit 3 means the gate could not run.
                         # -- --update rewrites the baseline, -- --timings prints the phase table, PORT= moves its preview server
npm run visual:review    # the on-demand design review against real assets (docs/design-review.md); needs a build + `npm run preview`
npm run bundle:budget    # the performance gate: eager, home, code and pack gzip against scripts/bundle-budget.json (ADR 0016, ADR 0018, ADR 0024); reads dist/, so it refuses when dist/ is older than src/ or content/ — build first
npm run perf             # measure bundle, first map paint, frame rate, PMTiles cost; -- --live for the real bucket, -- --headed for a real GPU
                         # -- --throttle mobile|slow-3g|4g emulates a phone on a slow link (ADR 0016's amendment, sand-pmz.17):
                         # FCP survives the split (248 -> 496 ms), time-to-map does not (836 ms -> 8.9 s)
npm run format           # Prettier (beat front matter is deliberately excluded — see .prettierignore)
npm run format:check     # the same as a check; runs in CI's `web` job
```

The visual scripts and `npm run perf` need a browser once: `npx playwright install chromium`.

CI runs the same commands in the `web` job; `lint` and `security` jobs cover docs, content manifests, secrets and dependencies; `visual` runs `visual:check` and uploads its screenshots. Open `poc/schlieffen-plan.html` directly for the original proof of concept.

## Architecture Overview

See `docs/ROADMAP.md` for the phased plan and thesis. In one paragraph: a
static, client-only web app (Vite + TypeScript + React; MapLibre GL + deck.gl)
that renders data-driven **scenario packs** (JSON + Markdown under `content/`)
on real geography with a timeline, narrative dossier, counterfactual branches,
battle zoom-ins, and timeline-synced technology and science "rails". The engine
is era-agnostic; the first pack is the Schlieffen Plan / 1914 campaign.

## Conventions & Patterns

- **Backlog:** beads is the source of truth. `bd ready` → `bd update <id> --claim`
  → work → `bd close <id> --reason "..."`. Phase epics chain by dependency; the
  five `decision` beads under `sand-a55` are the first things to settle,
  each producing `docs/decisions/NNNN-*.md`.
- **Branches/worktrees:** new work happens on a feature branch in a worktree
  under `.claude/worktrees/`, never on `main`. Sign off commits (`git commit -s`)
  and reference the bead ID in the message.
- **Working practice:** `docs/agent-workflow.md` — how to make a worktree cheap
  (**copy** `node_modules`; a symlink destroys the main checkout on
  `git worktree remove --force`), `npm run verify` and the gate order that
  fails fastest, why you neither
  close your own bead nor merge your own PR, the **sourcing-integrity rules**
  (never a quotation you have not read, never a page number you have not seen,
  verify delegated research, open the item), and the known local friction
  (`bundle:budget` reading a stale `dist/`, and how the shared registries used
  to collide under parallel authoring).
- **Multi-era layout:** `content/eras/<yyyy>-<slug>/` (one self-contained pack
  per campaign), `content/shared/` (people, places, sources, borders, links,
  media referenced by era-qualified IDs like `1870:sedan`), `content/threads/`
  (learning paths across packs). Never a by-war hierarchy. See `docs/ROADMAP.md`.
  The three shared registries are **one file per entity**, named for the
  entity's id (`content/shared/sources/tyng-1935.json`, ADR 0022) — add a
  person, place or work by writing a new file, never by appending to a list.
- **Imagery:** open-licence archive photos only, credited; colorized images are
  labelled with the original available; no gore (`sand-y0u.1`).
- **Content:** every date, number and position cites a `Source`; contested
  points are written as historiography, not fact; hypothetical branches are
  labelled as such. Packs must pass the validator — the schema (Zod, single
  source of truth for types + JSON Schema) is `src/packs/schema/`, the rules
  are `src/packs/validate/`, the prose is `docs/content-model.md`, the how-to is
  `docs/authoring.md`, the citation standard is `docs/sources.md`, the reviewer
  checklist is `docs/fact-check.md`, the contested points are
  `docs/historiography-1914.md`, the 1914 lesson spine every beat must serve is
  `docs/lesson-1914.md`.
- **Quotations carry receipts:** ADR 0021 — a citation that _resolves_ is not a
  citation that was _read_, and a fabricated quotation with a well-formed
  citation is worse than none. Every `Document.excerpt` needs a `Receipt` in
  `content/receipts/<era>.json` whose `context` is **retrieved text with the
  quotation inside it**; the validator checks the containment, `npm run
receipts -- --fetch` re-runs it against the source. Receipts live outside
  `content/eras/`, so the pack build never sees them and the budget never
  moves. Never build one from a tool that summarises a page. Only the excerpt
  is gated — the ~700 quoted spans in `sources[].note` are review's job
  (`sand-23b.58`) — and the right answer to a source that cannot be opened is
  to stop quoting it and keep citing it.
- **Design:** tokens and the war-room identity come from the design-system epic
  (`sand-neh`): `src/styles/tokens.ts` → `npm run tokens` → `tokens.css`, reference
  in `docs/design.md`; don't introduce ad-hoc colours or typefaces.
- **Performance:** ADR 0016 — bundle size is the one number CI holds
  (`scripts/bundle-budget.json`, four ceilings with the reason for each written
  next to them: `eager` the campaign cold load, `home` the atlas one — the two
  pages `/` answers with — `code` every chunk, `pack` the
  **heaviest** era plus the atlas index — what one cold load fetches, since a
  page load is one era, with every era together reported and not gated). The two
  cold loads are walked from Vite's build manifest, not read off `index.html`,
  because both pages are behind a dynamic import (ADR 0024). First map paint, frame rate and PMTiles cost are
  measured by `npm run perf` and reported, because a runner rasterising through
  SwiftShader runs the campaign six times slower than a laptop. Don't import
  deck.gl or MapLibre from anything the shell can reach —
  `src/ui/MapSurface.tsx` is the lazy boundary and the budget is what notices
  when it leaks.
- **Content is fetched, not bundled:** ADR 0018 — every era under
  `content/eras/` is assembled into its own `dist/pack/<id>-<hash>.json` by
  `scripts/lib/vite-plugin-pack.ts`, alongside a `dist/pack/index.json` the
  atlas reads, and fetched from the app's own origin (never `/assets/`, which
  the visual gate stubs). `src/packs/pack-loader.ts` is the only module that
  knows that, and it has a **top-level `await`** on purpose: every module that
  reads the pack at module scope stays unchanged. The pack is still re-validated
  with the schema on arrival. The shared registries are **narrowed to what the
  era reaches** before they go in the bundle (`scripts/lib/shared-refs.ts`,
  ADR 0018's second amendment, `sand-shn.15`) — they are the union of every era
  and would otherwise put the Pacific cast in front of a 1914 reader. When the fetch fails, the module graph never
  evaluates, so the failure state cannot be a component: it is static markup in
  `index.html` revealed by the boot hook (`src/packs/boot-script.ts`, ADR 0018's
  amendment) — three faces, atlas or retry.
- **One era per page load, and the home page is the atlas:** `?pack=<id>` names
  the era, resolved identically by the boot script in `<head>` and by the
  loader, so the request the browser starts and the one the loader awaits cannot
  disagree. Switching eras is a navigation, not a runtime swap — which is what
  keeps that top-level `await` working. `/` answers with **two pages**
  (ADR 0024): a URL that fills any slot of ADR 0009's contract is that view of
  that campaign; one that fills none is the atlas. `pack` is a named slot as of
  that record — written first into every campaign URL, because a campaign link
  that names no campaign would mean whichever era happened to be seeded — and
  `src/main.tsx` is the router that asks `namesAView` the same question the boot
  script does, from the same list in `src/packs/content-bundle.ts`. The campaign
  is behind a dynamic import because the loader's top-level `await` would
  otherwise suspend the atlas on a fetch it never wanted. `/atlas.html` still
  serves the atlas (`src/atlas/`), a Vite entry beside `gallery.html`, and is
  what the boot failure states link to.
- **Accessibility:** `docs/accessibility.md` — the keyboard run-through, the
  24×24px target floor and its two inline exemptions, the focus-ring rule, and
  what `src/a11y.test.tsx` (axe-core over jsdom) checks on every push. Write
  `var(--target-min)` (26px) rather than 24, and remember the gate is blind to
  the map: a keyboard route across a WebGL canvas is `src/ui/MapObjects.tsx`
  and is tested rather than audited.

## CI & branch rules

- `main` is protected by a ruleset: PR-only, **squash or rebase merges** (no
  merge commits), **linear history required**, force-push and deletion
  blocked, required checks `lint`, `security`, `web`, `analyze
(javascript-typescript)` and `visual` (strict — branch must be up to date
  with `main`). `visual` became required on 2026-08-28, after ADR 0011's
  amendment narrowed it to two blocking tiers so that only breakage and
  structural defects can stop a merge; `tiny-text` is reported and never
  fatal. There is **no merge queue**: GitHub does not offer one for a public
  repository under a personal account (`sand-pmz.35`), so strict checks mean
  each merge invalidates every other open PR, and the mitigation is to keep
  one PR in flight at a time rather than to queue them.
- CI (`.github/workflows/ci.yml`): `lint` = actionlint + markdownlint +
  `scripts/check-content.sh` (JSON validity, media-manifest policy, no tracked
  image binaries, and the generated `media`/`audio` `index.json` still covering
  every manifest — all 90 media manifests are in the index as of `sand-shn.16`,
  and the one-time allowance that named the 49 that were not is gone);
  `security` = gitleaks + dependency review; `web` =
  one step, `npm run verify`, which is
  lint/format:check/typecheck/test/validate:content/warning:budget/build/bundle:budget
  — the list lives in `package.json` and nowhere else, so CI, the workflow doc
  and a contributor cannot mean different things by green (ADR 0023);
  self-activating once `package.json` exists; `visual` = `npm run visual:check` against a
  production-shaped build with the assets bucket and the Protomaps sprite
  sheet stubbed; Google Fonts is a **declared dependency** and the gate exits 3
  if the webfonts did not arrive or if anything else leaves the origin, because
  stubbing the fonts made the gate disagree between macOS and CI
  (`sand-pmz.2.7`) — screenshots uploaded
  as an artifact (ADR 0011), red only on its **blocking** tier — a dead scene,
  an error the app raised, or a structural defect off the baseline; `tiny-text`
  is reported and never fatal (`sand-pmz.9`). CodeQL is added with the app
  scaffold.
- Merged branches are deleted automatically (`delete_branch_on_merge`); keep
  locals clean with `git fetch --prune` and `git worktree prune`.
- PRs use `.github/pull_request_template.md` — one `Closes sand-…` line per
  bead; close those beads after merge.
- Deploys assume the AWS role in repo variable `AWS_ROLE_ARN` via OIDC
  (`AWS_REGION` = us-east-1); see `docs/decisions/0004-hosting.md`.
- Deploy workflows (`deploy.yml`, `preview.yml`, `infra.yml`): `main` deploys
  to <https://sandtable.davetashner.com> (CDK stack `SandtableHosting` in
  `infra/`, then build → `scripts/deploy-static.sh` → invalidate); every
  same-repo PR gets `https://pr-<n>.sandtable.davetashner.com` via a sticky
  comment; infra PRs get a `cdk diff` in the job summary. `/assets/*` is the
  assets bucket (tiles, borders, media) on every deployment — Vite bundles
  live under `app/`; in dev `/assets/*` is proxied to production unless a
  git-ignored staging copy exists under `public/assets/`. See `infra/README.md`.
