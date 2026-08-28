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
ln -s "$PWD/node_modules" .claude/worktrees/<branch>/node_modules
cd .claude/worktrees/<branch>
```

Node resolves through the symlink, so Vite, Vitest, ESLint and `tsx` all behave
as if the tree had its own install. Two caveats, both obvious once stated: if
your branch changes `package.json` or the lockfile, run `npm ci` in the worktree
instead, because a symlinked tree is the main checkout's dependencies and not
yours; and the link is not tracked by git, so a fresh clone of the branch will
not have it.

Branch names are `feat/…`, `fix/…`, `chore/…`, `content/…`, `docs/…`. Clean up
after the merge: `git worktree remove <path>` and `git fetch --prune`.

## Run the gates in the order that fails fastest

CI runs all of these; running them locally in this order means the cheap
failures surface in seconds rather than after a four-minute build.

```bash
npm run lint            # ESLint; markdownlint and actionlint run in CI's lint job
npm run format:check    # Prettier — `npm run format` fixes it
npm run typecheck       # tsc -b --noEmit
npm test -- --run       # Vitest, single pass
npm run validate:content
npm run build
npm run bundle:budget   # must come after the build — see below
```

Two more are not part of the default loop but are the two gates a contributor
actually trips over:

- `npm run visual:check` — every scene the design review walks, in two themes
  at two viewports (ADR 0011), about two and a half minutes and against a build,
  so run it after `npm run build`. Run it when you touched anything the eye can
  see; `-- --update` rewrites the baseline once you have looked at what changed
  and agree with it. It needs a browser once: `npx playwright install chromium`.
- `npm run bundle:budget` — the one number CI holds (ADR 0016). Content changes
  move it too, since a pack is fetched rather than bundled but still has a
  ceiling of its own (ADR 0018).

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

Three things that have cost people time more than once. Each has a bead; none
is fixed yet, so the workaround is the current answer.

- **`visual:check` hard-codes port 4179** with `strictPort`, so two concurrent
  runs collide and the second dies with "Port 4179 is already in use"
  (`sand-pmz.29`). Stand up your own preview on another port and point the
  script at it with `BASE=<url>`, which the script supports and which keeps the
  asset stub in force.
- **`bundle:budget` reads whatever is in `dist/`** and does not rebuild
  (`sand-pmz.31`). In CI the number is always fresh because `build` runs
  immediately before it, which is exactly why the trap is invisible until you
  run it by hand. On 2026-08-28 a stale `dist/` reported 281.6 kB against the
  340 kB ceiling where a rebuild gave 308.1 kB — a full content pull request out
  of date, and enough to support the wrong merge decision. Build first.
- **The shared registries collide on every parallel authoring wave**
  (`sand-shn.19`). Two authors appending entries to the tail of
  `content/shared/people/people.json`, `sources/sources.json` or
  `places/places.json` produce the same rebase conflict every time — three in
  one night. Resolve by merging on `id` and dropping duplicates; do not take one
  side of the hunk.
