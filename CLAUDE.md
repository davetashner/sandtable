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
npm run dev              # Vite dev server
npm run lint             # ESLint (flat config)
npm run typecheck        # tsc -b
npm test -- --run        # Vitest, single pass
npm run validate:content # scripts/check-content.sh + the pack validator (docs/content-model.md)
npm run schema           # regenerate schema/*.schema.json from src/packs/schema (tests fail if stale)
npm run borders          # rebuild content/shared/geo/borders/<year>.geojson from historical-basemaps (pinned commit)
npm run tokens           # regenerate src/styles/tokens.css from src/styles/tokens.ts (docs/design.md; AA contrast tested)
npm run media            # WebP derivatives + content/shared/media/index.json from media.json manifests; -- --upload syncs to the assets bucket
npm run audio            # loudness-matched Opus/AAC + content/shared/audio/index.json from cue.json manifests; -- --upload syncs (needs ffmpeg)
npm run build            # tsc -b && vite build → dist/ (bundles under dist/app/)
npm run visual:check     # the visual gate: 19 scenes x 2 themes x 2 viewports, assets stubbed (ADR 0011); -- --update rewrites the baseline
npm run visual:review    # the on-demand design review against real assets (docs/design-review.md); needs a build + `npm run preview`
npm run format           # Prettier
```

Both visual scripts need a browser once: `npx playwright install chromium`.

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
- **Multi-era layout:** `content/eras/<yyyy>-<slug>/` (one self-contained pack
  per campaign), `content/shared/` (people, places, sources, borders, links,
  media referenced by era-qualified IDs like `1870:sedan`), `content/threads/`
  (learning paths across packs). Never a by-war hierarchy. See `docs/ROADMAP.md`.
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
- **Design:** tokens and the war-room identity come from the design-system epic
  (`sand-neh`): `src/styles/tokens.ts` → `npm run tokens` → `tokens.css`, reference
  in `docs/design.md`; don't introduce ad-hoc colours or typefaces.
- **Accessibility:** `docs/accessibility.md` — the keyboard run-through, the
  24×24px target floor and its two inline exemptions, the focus-ring rule, and
  what `src/a11y.test.tsx` (axe-core over jsdom) checks on every push.

## CI & branch rules

- `main` is protected by a ruleset: PR-only, **squash or rebase merges** (no
  merge commits), **linear history required**, force-push and deletion
  blocked, required checks `lint`, `security`, `web` (strict — branch must be
  up to date with `main`). `visual` runs on every PR but is **not** required;
  adding it is a settings change, made deliberately (ADR 0011).
- CI (`.github/workflows/ci.yml`): `lint` = actionlint + markdownlint +
  `scripts/check-content.sh` (JSON validity, media-manifest policy, no tracked
  image binaries); `security` = gitleaks + dependency review; `web` =
  npm lint/typecheck/test/validate:content/build, self-activating once
  `package.json` exists; `visual` = `npm run visual:check` against a
  production-shaped build with the assets bucket stubbed, screenshots uploaded
  as an artifact (ADR 0011). CodeQL is added with the app scaffold.
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
