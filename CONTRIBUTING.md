# Contributing to Sandtable

Sandtable is an interactive history simulation — a static web app that renders
data-driven scenario packs on real geography. Contributions come in three
kinds: **engine** (TypeScript/React under `src/`), **content** (JSON +
Markdown packs under `content/`), and **infrastructure/docs**. All three go
through the same workflow.

## Workflow

1. **Find or create the bead.** The backlog lives in beads (`bd`), not in
   GitHub issues. `bd ready` lists unblocked work; `bd show <id>` explains it;
   `bd update <id> --claim` takes it. New work gets a bead first
   (`bd create …`). See `CLAUDE.md` for the full command reference.
2. **Branch in a worktree off `origin/main`** — never work on `main` or in the
   main checkout:

   ```bash
   git fetch origin main
   git worktree add .claude/worktrees/<branch> -b <branch> origin/main
   ```

3. **Work, then run the gates** before opening a PR:

   ```bash
   npm ci
   npm run lint && npm run typecheck && npm test -- --run
   npm run validate:content   # every pack, registry and media manifest
   npm run build
   ```

   Infrastructure changes: `cd infra && npm ci && npm run typecheck && npm test && npx cdk synth`.

4. **Commit signed-off, referencing the bead:**
   `git commit -s -m "feat(packs): … [sand-xxx]"`.
5. **Open a PR** with the template: one `Closes sand-…` line per bead. CI
   (`lint`, `security`, `web`, CodeQL) must be green and the branch up to date
   with `main`; every same-repo PR gets a preview at
   `https://pr-<n>.sandtable.davetashner.com`. Merges are squash or rebase.
6. **After merge:** `bd close <id> --reason "Completed in PR #N"`, delete the
   branch and worktree (`git worktree remove …`, `git fetch --prune`).

## Content contributions

Read `docs/authoring.md` (the how-to) and `docs/content-model.md` (the
reference) first. Then:

- **Cite everything.** Every route, event, battle, beat, card, document and
  causal link needs at least one `Source`; dates, numbers and positions are
  claims. Contested points are written as historiography ("Zuber argues …;
  Mombauer replies …"), not as fact.
- **Label hypotheticals.** Counterfactual branches and anything in them say
  so — in the branch, in the beat's `dateLabel`, and in the prose.
- **Positions carry confidence.** Routes say how they were derived and how
  sure we are; approximate is fine if it says so.
- **Images follow ADR 0007** (`docs/decisions/0007-imagery.md`): open-licence
  originals with archive, photographer, date and licence recorded; colorized
  images labelled "colorized (AI-assisted)" with the original available; no
  gore. Binaries go to the assets bucket, manifests to git.
- **No by-war hierarchy** — packs are flat under `content/eras/`, shared
  registries under `content/shared/`, learning paths under `content/threads/`.

Content PRs are reviewed for accuracy as well as form; the fact-check
checklist is `sand-23b.2`.

## Engine contributions

- The engine is era-agnostic: nothing under `src/engine` or `src/ui` may know
  about 1914. It renders whatever valid pack it is given.
- Design tokens and typefaces come from `src/styles/tokens.css` and the
  design-system epic; no literal colours or fonts in components.
- Decisions that change architecture get a record in `docs/decisions/`
  (numbered, with a bead) — never a silent change.

## Code of conduct

Be kind, be precise, cite your sources. Disagreements about history are
settled by evidence and recorded as historiography; disagreements about code
are settled in review.
