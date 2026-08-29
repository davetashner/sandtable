# Working on Sandtable — practices that cost something to learn

[`CONTRIBUTING.md`](../CONTRIBUTING.md) is the workflow: bead, worktree, gates,
signed-off commit, pull request, close after merge. This page is what surrounds
it — the habits that keep parallel work from tripping over itself, the order to
run the gates in, the known local friction, and the sourcing rules, which are
the part of this document worth reading even if you skip the rest. Story:
`sand-shn.21`.

It is written for anyone working on the repository. Most of it is ordinary good
practice here; it is collected because it was learned from incidents rather
than from principles, and because it was living in a session scratchpad handed
to about fifteen agents in one night, which is not a place knowledge survives.

## One worktree per branch, and a cheap one

Work never happens on `main` or in the main checkout. A worktree per branch
means several changes can be in flight at once without a stash, a switch or a
half-finished edit riding along in someone else's diff.

The cost people avoid worktrees over is `npm ci` — a full dependency install
per tree, for a tree whose dependencies are identical to the one next door.
From the main checkout:

```bash
git fetch origin main
git worktree add .claude/worktrees/<branch> -b <branch> origin/main
cd .claude/worktrees/<branch>
cp -R "$(git rev-parse --git-common-dir)/../node_modules" node_modules   # or: npm ci
```

`--git-common-dir` points at the main checkout's `.git` from any worktree, so
that line works whatever the branch is called — a relative `../../..` breaks the
moment a branch name contains a slash, which most of them do.

A copy costs about 600 MB and thirty seconds of disk I/O, against three minutes
for `npm ci`. If your branch changes `package.json` or the lockfile, run
`npm ci` instead — a copied tree is the main checkout's dependencies, not
yours.

> **Do not symlink `node_modules` into a worktree.** It is the obvious
> optimisation and it destroys the main checkout. `git worktree remove --force`
> deletes the worktree's files, follows the symlink out of the tree, and empties
> the directory it points at — so cleaning up one worktree uninstalls
> everything, for every tree, including the checkout you are standing in. It
> fails quietly and at a distance: the next test run reports a smaller number of
> tests rather than an error, and only later does a command go missing
> altogether. This is not hypothetical; it happened here, and it is why the line
> above is a copy.

Branch names are `feat/…`, `fix/…`, `chore/…`, `content/…`, `docs/…`. Clean up
after the merge: `git worktree remove <path>` and `git fetch --prune`. If you
ever do find a symlinked `node_modules` in a worktree, delete the **link**
first (`rm node_modules`) and only then remove the worktree.

## Run the gates in the order that fails fastest

```bash
npm run verify
```

That is the whole list, and it is the same one CI's `web` job runs — one
definition of green rather than three that drift (ADR 0023). It is
`package.json`'s to define; what it runs, in the order that surfaces the cheap
failures in seconds rather than after a four-minute build:

```bash
npm run lint            # ESLint; markdownlint and actionlint run in CI's lint job
npm run format:check    # Prettier — `npm run format` fixes it
npm run typecheck       # tsc -b --noEmit
npm test -- --run       # Vitest, single pass
npm run validate:content
npm run warning:budget  # the warning ceiling per kind — see below
npm run build
npm run bundle:budget   # must come after the build — see below
```

Run one of them on its own while you are working on the thing it checks; run
`npm run verify` before you push. Adding a gate means adding it to `verify`, so
that CI and the contributor cannot disagree about what green means.

`npm run visual:check` is deliberately **not** in it: every scene the design
review walks, in two themes at two viewports (ADR 0011), about two and a half
minutes, against a build, and needing a browser (`npx playwright install
chromium`). It is a CI job of its own for those reasons, and `verify` is meant
to be runnable on a machine that has never installed Chromium. Run it when you
touched anything the eye can see, after `npm run build`; `-- --update` rewrites
the baseline once you have looked at what changed and agree with it.

The two budgets are the gates a contributor actually trips over, and both hold
a stored number against a measured one:

- `npm run bundle:budget` — the one number CI holds (ADR 0016). Content changes
  move it too, since a pack is fetched rather than bundled but still has a
  ceiling of its own (ADR 0018). It is inside `verify`, and it must follow the
  build, which is why the order above is not alphabetical.
- `npm run warning:budget` — the other number nothing used to hold (ADR 0023).
  `validate:content` prints warnings and fails on none of them; this holds each
  **kind** of warning to a ceiling in `scripts/warning-budget.json`, with the
  reason for the number written next to it. It is inside `verify` too, and it
  needs no build.

  A warning of a kind not in that file **fails**, which is deliberate: the
  incident it exists for was a rule that had never fired starting to fire 254
  times, and a budget that only counted the kinds already present would have
  passed it. If you hit that, the answer is one entry with a `match`, a `max`
  and a sentence — or, if you reworded a validator message, an update to that
  kind's `match` in the same commit. Growing an existing kind is the same
  conversation: raise the number and say in its `why` what makes the new one
  right. `-- --update` records the counts and never touches a ceiling.

If you changed the Zod schema under `src/packs/schema/`, run `npm run schema`;
tests fail on a stale `schema/*.schema.json`.

## Etiquette that keeps parallel work honest

- **Do not close your own bead.** Closing is a post-merge act:
  `bd close <id> --reason "Completed in PR #N"`, one per `Closes` line in the
  pull request body. A bead closed while the branch is still open reads as
  finished work that may never land.
- **Do not merge your own pull request.** Content is reviewed for accuracy as
  well as form ([`docs/fact-check.md`](fact-check.md)); a self-merge skips the
  only check the tooling cannot perform.
- **Expect to rebase.** The `web` check is strict, so a branch behind `main`
  cannot merge however green it is, and under parallel work `main` moves in
  hours. `git fetch origin main && git rebase origin/main`, then force-push your
  own branch with `--force-with-lease`. Never force-push a branch you do not
  own.
- **Stay inside the scope of your bead.** Problems found on the way are worth
  more as beads (`bd create … --parent <epic>`) than as unrelated hunks in a
  diff someone has to review.

## Sourcing integrity

This is the section that exists because of specific failures, and it is the one
the project is least able to do without. The decision record on what to do
about it structurally is being written under `sand-23b.57`; until it lands,
these are the rules.

**Nothing in this repository can check a quotation.** The validator checks that
a citation _resolves_ — that `source:tyng-1935` is in the registry and that a
footnote matches one of the beat's sources. It cannot check that the work says
what you claim it says. A fabricated quotation carrying a well-formed citation
is worse than no quotation, because the citation makes it look checked, and the
whole promise of this project is that every date, number and position cites a
source.

Two incidents on 2026-08-27/28, both recorded on `sand-23b.57`:

1. An agent authoring the 1917 pack delegated research to subagents. **One of
   them fabricated source material** — invented quotations attributed to a
   named memoirist, and the text of a decree — and retracted two of eight items
   only after delivering them. It was caught by verification discipline alone.
   The author dropped the affected vignette and removed two sources from the
   registry rather than cite works that could not be opened.
2. The Pearl Harbor pack found that the text-extraction layer returns
   **different page markers for the same sentence on repeated fetches** —
   196/197, then 195/196; 131, then 132. It recorded no page numbers for five
   transcriptions as a result, which was the right call.

So:

- **Never write a quotation you have not read in the source.** Not a
  reconstruction, not a paraphrase presented as a quotation, not a line you are
  confident is roughly right. `docs/fact-check.md` already requires quotations
  to be verbatim and cited to the edition that prints them; this is the same
  rule stated as a prohibition.
- **Never write a page number you have not seen.** If the extraction layer
  gives you two answers, you have seen neither.
- **Verify what a delegated researcher hands back.** A summary of a source is
  not a source. Confirm against the item, or against two independent works,
  before it goes into a beat.
- **Open the item; catalogue records are frequently wrong.** Work here has
  turned up volumes attributed to the wrong author, and a publication year that
  contradicted every catalogue but matched the copyright page.
- **A thinner, honestly-sourced pack beats a fuller one with invented detail.**
  Saying what you could not reach is a first-class outcome with precedent all
  over the repository: `docs/sources.md` records which works are unreadable from
  here — Gallica answers CI with 403, much of the series exists only as lending
  copies — and a historiography point written as prose because its works could
  not be opened is a correct result, not a gap.

When you hand work over, say plainly what you verified against the work itself,
what you took from a catalogue record, and what you could not open at all.

## Known local friction

Three things that have cost people time more than once. Each has a bead, and
each entry says whether the bead is closed or the workaround is still the
answer.

- **`visual:check` used to hard-code port 4179** with `strictPort`, so two
  concurrent runs collided and the second died with "Port 4179 is already in
  use" (`sand-pmz.29`, now fixed). It steps up from a busy port instead;
  `PORT=` moves it, and `BASE=<url>` still points it at a preview you stood up
  yourself, with the asset stub in force either way.
- **`bundle:budget` reads whatever is in `dist/`** and does not rebuild
  (`sand-pmz.31`). In CI the number is always fresh because `build` runs
  immediately before it, which is exactly why the trap is invisible until you
  run it by hand. On 2026-08-28 a stale `dist/` reported 281.6 kB against the
  340 kB ceiling where a rebuild gave 308.1 kB — a full content pull request out
  of date, and enough to support the wrong merge decision. Build first.
- **The shared registries used to collide on every parallel authoring wave**
  (`sand-shn.19`, now fixed). Two authors appending to the tail of
  `content/shared/people/people.json`, `sources/sources.json` or
  `places/places.json` produced the same rebase conflict every time — three in
  one night. Those files are gone: each registry is a directory of one file per
  entity, named for the entity's id (ADR 0022). Add a person, place or work by
  **writing a new file**, never by editing a list. If you are rebasing a branch
  written before 2026-08-28, its registry hunks land as deletes-plus-adds
  against files that no longer exist; take the new entities across as new files
  rather than resurrecting the arrays, and
  `npx tsx scripts/split-registries.ts --check` will confirm the result.
