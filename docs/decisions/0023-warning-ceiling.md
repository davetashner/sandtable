# 0023 — Warnings get a ceiling per kind, and green gets one definition

- **Status:** accepted
- **Date:** 2026-08-28
- **Bead:** `sand-pmz.33`, `sand-pmz.34`

## Context

`npm run validate:content` reports two things and fails on one of them. Errors
fail the `web` job. Warnings are printed, counted in the last line — `content
valid (62 warnings — list with --warnings)` — and enforced by nobody.

In the night of 2026-08-27/28 that count went **10 → 20 → 62** across merged
pull requests. Every move was narrated in a pull request description as "all
expected", and in each case it was. That is not the problem. The problem is
that "all expected" was a claim no tool checked, made by the author of the
change, about the only number in the repository that moves silently.

It did not stay hypothetical for long. PR #160 (per-entity registries, ADR 0022) moved the shared registries from three JSON arrays to directories of one
file per entity, which changed every registry path. `REFERENCE_ONLY_SOURCE`'s
allowlist — the rule that says a Wikipedia citation is reference data in the
people and place registries and an unsourced operational claim anywhere else —
matched on that path, and its regex silently stopped matching:

```text
62 warnings → 316 warnings
254 of them: "source:wikipedia-en is reference data only — an operational
claim needs a source from the hierarchy of evidence"
  134 under shared/places/
  115 under shared/people/
```

Every person and place in the repository was suddenly reading as an
unsourced operational claim, and the rule that exists to catch exactly that had
been switched off by accident. It was caught only because that pull request had
been given a byte-identical-output constraint for unrelated reasons. Without
it, it would have merged green, and the next author to add a person would have
inherited a rule that was no longer a rule.

The repository already knows the shape of the answer. ADR 0016 gave bytes a
stored expectation, a measured value, a delta and a reason written next to the
number, and `scripts/bundle-budget.json` has held that line through a dozen
content passes. Warnings want the same treatment, and one thing more, because a
warning count is not one number the way a byte count is.

The second half of this record is smaller and came out of writing the first.
Wiring a new gate in meant editing the gate list, and there were three of them:
eight named steps in `.github/workflows/ci.yml`'s `web` job, the same list as
prose in `docs/agent-workflow.md`, and whatever a contributor remembers to run.
Three copies free to drift, with nothing to notice when they do.

## Decision

**Warnings get a ceiling per kind, in `scripts/warning-budget.json`, checked by
`npm run warning:budget`. A warning matching no kind is a failure. And the gate
list becomes one list, `npm run verify`, which CI calls.**

### One ceiling per kind, not one total

Today's 62 warnings are three kinds, and they are not one thing:

| kind                   | today | ceiling | what it is                                               |
| ---------------------- | ----: | ------: | -------------------------------------------------------- |
| `uncited-source`       |    57 |      70 | a work in the registry that nothing cites (`sand-shn.5`) |
| `concentration-region` |     3 |       3 | a battle's marker drawn outside its own region           |
| `pace-sustained`       |     2 |       2 | a leg faster than its mode held day after day (ADR 0020) |

A single total of 62 would be too blunt in both directions. The great majority
of it is `uncited-source`, which is a **designed state**: a bibliography lands a
pull request or two ahead of the pack that will cite it, and most of these 57
are the Pacific and 1915–18 works waiting on content that is already beaded. A
total ceiling would either sit tight enough to be bumped on every content pass —
which is how a budget stops being read — or loose enough to hide a new category
growing underneath a fall in that one. A ceiling per kind cannot be paid for out
of another kind's improvement.

So the total is printed and **not** gated, in the same spirit as ADR 0018's
"every era together": it is the sum of decisions taken separately, and it is
worth seeing without being worth failing on.

### The uncited ceiling has headroom; the other two have none

The three numbers are set by different arguments, and the file says so next to
each.

`uncited-source` is at **70 against 57** — thirteen works, about one campaign's
bibliography. Adding a source ahead of its pack is normal and must not cost a
ceiling edit. But an unbounded category is exactly where a real problem would
hide, and this one is bounded by something concrete: 215 sources are in the
registry, so a break in how citations are collected flips all 215 to uncited at
once and is red on the first push. Thirteen of headroom absorbs ordinary
authoring and catches every failure of that shape.

`concentration-region` and `pace-sustained` are at **the count, with no
headroom**, because they are defects rather than states anything is waiting on —
three Liège battles (`sand-23b.60`) and two legs of the Kidō Butai's approach
(`sand-23b.61`). A fourth misplaced marker, or a third leg that outruns its
mode, is a new claim about where something was or how fast it moved, and should
be read by a person before it lands.

### A warning matching no kind fails

This is the part the incident argues for, and it is what a total would also have
caught while a naive per-kind budget would not. The 254 new warnings were a
rule that had **never fired**. A budget that listed only the kinds present today
and ignored everything else would have counted 57, 3 and 2, found all three
within their ceilings, and passed.

So unbudgeted is zero. A warning matching no `match` in the file fails the gate
and prints what it is, grouped, with directory tallies. The two cases that
produces are both cases that want a person:

- **a rule has started firing** — decide whether the content is wrong or the
  ceiling is; either way the answer is written down.
- **a message was reworded** and its pattern stopped matching — which is the
  same silent-disarming failure as the incident, one level up, and is caught in
  the same commit as the wording.

The price is one entry with a sentence, which is what ADR 0016 already charges
for a byte.

`scripts/warning-budget.test.ts` holds the pattern set to what the gate cannot
check about itself: every pattern still matches something in `content/` (a dead
pattern counts zero and passes), no two patterns claim the same warning (first
match wins, which is only honest while they are disjoint), and no `measured`
sits above its own `max`.

### One definition of green

`npm run verify` is the gate list, in the order that fails fastest:

```text
lint → format:check → typecheck → test → validate:content → warning:budget
     → build → bundle:budget
```

CI's `web` job runs that one command instead of eight named steps, so the
workflow, the doc and the contributor all mean the same thing by "green". The
per-step names are worth less than they look: `npm run` prints
`> sandtable@0.1.0 typecheck` before each gate, so the log still names the gate
that failed, and the fold that has to be opened is one rather than one of eight.

Two placements are load-bearing. `bundle:budget` follows `build`, because it
reads `dist/` and now refuses a stale one (`sand-pmz.31`). `warning:budget`
follows `validate:content` and precedes `build`, because it needs no build at
all — content is its whole input — and a content gate should not wait thirty
seconds behind a compile to say what it already knows.

`visual:check` is **not** in `verify`. It needs Chromium and a warm Playwright
cache, takes two and a half minutes, is not a required check, and has a CI job
of its own for those reasons (ADR 0011). Putting it in `verify` would mean
either that `verify` fails on a machine without a browser or that CI's `web`
job grows a browser install; the doc keeps naming it separately, as the gate you
run when you touched something the eye can see.

## Alternatives considered

- **One ceiling on the total warning count.** The obvious version, and it would
  have caught the incident. Rejected because of what it does the rest of the
  time: 92% of today's warnings are one designed-state category that grows with
  ordinary authoring, so the total either needs bumping on most content passes
  or carries so much headroom that a new category of ten warnings disappears
  into it. It also cannot say anything useful when it goes red — "the number is
  bigger" is not a diagnosis.
- **A per-warning baseline file, the way a lint suppression list works.** It
  would name the new warnings exactly, which is the one thing counts cannot do.
  Rejected because every source added ahead of its pack — the single most common
  content act in this repository — would require editing a checked-in list of
  57 fingerprints, in the same rebase-prone file, for a warning that is expected.
  ADR 0022 has just finished removing a file of that shape for that reason. The
  churn would be paid on every content pull request to buy precision on the rare
  one, and a baseline everyone regenerates reflexively is a baseline nobody
  reads. Instead, the failure prints the offending kind's warnings — capped at
  twenty, with the remainder tallied by directory, which is what actually
  identified the incident: _134 under `shared/places/`, 115 under
  `shared/people/`_ names the regex without naming a single warning.
- **Promote the warnings to errors and delete the distinction.** Rejected
  outright for `uncited-source`: it would make a bibliography that lands ahead
  of its pack a build failure, and force authors to either withhold sources or
  cite them from content that does not exist yet. The warning level is right;
  what was missing was that nothing counted.
- **Add a `kind` field to `Problem` and classify at the site.** Cleaner than
  regexes over prose, and probably where this goes if the file grows past a
  dozen kinds. Not now, for two reasons: it changes what `validate:content
--json` emits, and this change was required to leave that output untouched;
  and a message's wording changing without its `kind` changing is precisely the
  event the reworded-message check is for, so the coupling to the prose is doing
  work rather than costing it.
- **Keep the eight named steps in CI and have `verify` shadow them.** The
  status quo plus a script, which is two definitions rather than three. It reads
  better in the GitHub checks UI — the annotation names the step. Rejected
  because a shadow that is not executed drifts exactly the way the doc did, and
  npm's own per-script banner recovers most of the readability.

## Consequences

- `npm run warning:budget` is part of the `web` job through `verify`, which is a
  required check. **A pull request that adds a new kind of warning, or grows an
  existing kind past its ceiling, now fails**, naming the kind, the count, the
  ceiling, the delta since the last measurement, and the warnings themselves.
- The ceilings are set at today's real counts and no existing warning was fixed
  in the change that introduced them. `main` is green at 57/3/2.
- **Raising a ceiling edits its `why` in the same commit.** The number and the
  sentence are reviewed together in the diff, as with `bundle-budget.json`.
  `--update` rewrites `measured` and `measuredOn` and never a `max`, and refuses
  entirely while any warning is unbudgeted, because it cannot invent the
  sentence a new kind needs.
- **`validate:content` is untouched.** The gate reads `content/` and runs the
  same validator rather than parsing that command's output, so the two cannot
  drift, and the command reports exactly what it reported before.
- **`npm run verify` is what green means**, for CI and for a contributor.
  Adding a gate means adding it there; `docs/agent-workflow.md` documents the
  order and points at the command rather than repeating it.
- Two content defects now have beads and no headroom above them: `sand-23b.60`
  (three Liège concentrations outside their region) and `sand-23b.61` (two Kidō
  Butai legs above the declared sea band). Fixing either means lowering its
  ceiling in the same commit — the ratchet only turns one way for a defect.
- The regression this record is named for is reproducible in one line: revert
  `REFERENCE_REGISTRIES` to a path that no longer exists and the gate reports
  254 unbudgeted warnings under `shared/people/` and `shared/places/`. That was
  run before the ceiling was committed, and it is the test the file is for.
