# 0022 — One file per shared entity, because the conflict is the shape

- **Status:** accepted
- **Date:** 2026-08-28
- **Bead:** `sand-shn.19`

## Context

`content/shared/` holds the three registries every pack joins against: people,
places and the bibliography. Until this record each was a single JSON array —
`people/people.json`, `places/places.json`, `sources/sources.json` — and an
author adding a person appended to the end of it.

That worked while one pack was being written at a time. It stopped working the
moment several were. On 2026-08-27/28 there were **three rebase conflicts in
one night**, all the same shape: two agents authoring two different eras, each
appending to the tail of the same file, producing overlapping hunks at the same
line numbers. Two of them had to be resolved by hand with a throwaway script
that merged on `id` and dropped duplicates — which is the correct resolution
and also the kind of thing that is done wrong once and loses an entry silently.

This is not an accident that can be waited out. ADR 0019 projects roughly
twenty packs; parallel authoring is how they get written; every pack adds
people, places and works. The Russian Civil War pack landed the same night and
added 16 sources, 12 people and 42 places on its own. The conflict rate scales
with the number of authors and will not improve.

The registries are also read by more than git. `scripts/lib/read-content.ts`
feeds the validator, `scripts/lib/pack-bundle.ts` assembles the fetched bundle,
`scripts/lib/shared-refs.ts` narrows them to one era (ADR 0018's second
amendment), `scripts/build-front.ts` checks front-line citations against them
and `scripts/new-pack.ts` checks a new pack's pace citations. Any change to
their shape has to keep all of that working, and in particular has to keep the
per-era narrowing cheap and keep its guarantee that the emitted set is closed
under reference.

## Decision

**The registries are directories of one file per entity, named for the entity.**

```text
content/shared/people/kluck-alexander-von.json    one Person
content/shared/places/ypres.json                  one Place
content/shared/sources/tyng-1935.json             one Source
```

The file name is the id with its kind prefix removed, so `source:tyng-1935`
lives in `sources/tyng-1935.json` and nowhere else. That is not a convention
but a rule: `parseShared` errors on a file whose entity disagrees with its
name, which is what makes a directory listing and an id index the same thing.
Nothing about the entities themselves changed — the schema, the fields and the
values are exactly what they were.

Two authors adding two different people now write two different files, and git
has nothing to merge. Two authors editing the _same_ person still conflict,
which is correct: that is a disagreement about content and a human should see
it.

`scripts/split-registries.ts` is the migration, committed rather than
described. It is re-runnable, it verifies the round trip entity by entity
before it deletes anything, and `--check` re-asserts the shape without writing.

## Alternatives considered

**A git merge driver for id-keyed JSON arrays**, registered in
`.gitattributes`. This was the cheaper option and the one to beat: no change to
the readers, no change to the bundle, no change to any path in any message.
Rejected for four reasons, in increasing order of weight:

1. **It is not distributed.** `.gitattributes` names a driver; `merge.<name>.driver`
   has to be in a git config, which is per clone and cannot be committed. A
   fresh clone, a CI job or an agent that skipped the bootstrap step silently
   gets the old behaviour back — and silently is the problem, because the way
   you find out is a conflict at the worst moment.
2. **It only helps git.** GitHub computes mergeability server-side and would
   still show the pull request as conflicting; `main` is protected strict, so
   every branch rebases anyway.
3. **It only helps merges.** An author still opens a 3,500-line file to add
   twelve lines, and a reviewer still reads a diff whose context is whichever
   entity happened to be authored before it.
4. **A wrong auto-merge is worse than a conflict.** The driver has to decide
   what to do when both sides changed the same entity, and any answer it gives
   quietly is an answer nobody checked. In a project whose whole claim is that
   every date, number and position cites a source, a silent content merge is a
   bad trade for the convenience it buys. A conflict is loud. Loud is right.

**Sharding by authoring wave** — a new array file per pack, `sources/1918.json`
and so on. It removes the conflict too, but it invents a grouping the content
does not have: people and works are shared _across_ eras, which is the entire
reason they are not in the pack directory. It would leave every author with a
question ("which file does this one go in?") that has no correct answer.

**Doing nothing and resolving the conflicts.** Recorded as an option because it
was the status quo for three nights and it does work; the merge is mechanical.
It costs an author's attention every time and is wrong once.

## Consequences

**The shape that does not conflict was already in the repository.** Media and
audio have always been one manifest per entity — `media/**/media.json`,
`audio/**/cue.json` — and 90 media entries have never produced this conflict.
The registries are now the same shape as the neighbours they sit beside, and
`RawShared` says so: three `RawFile[]` where there used to be two lists and a
map.

**Problems name the file the author opens.** The unused-source warning used to
read `shared/sources/sources.json [source:harris-1995]`; it now reads
`shared/sources/harris-1995.json`. Schema errors lose the array index they used
to carry (`0.tier` becomes `tier`) because there is no array to be at position
zero of. The set of findings is unchanged: 62 warnings before and after, and
`npm run validate:content` is byte-identical to `main`, because the plain run
prints counts. The `--warnings` listing differs on exactly the 57 lines whose
path is now the entity's own file, in name order rather than insertion order;
normalised for the path and sorted, the two are identical.

**The heaviest bundle grew 0.4 kB gzip, and this record refuses to hide it.**
Emission order is now file-name order, which is id order, where it used to be
the order entries were appended in. The order carried no information — it was
an accident of who wrote what first — but it did compress marginally better,
because works added together shared publishers and authors. 1914 goes from
303.1 to 303.5 kB gzip and the gated `pack` figure from 305.8 to 306.1 against
a 340 kB ceiling; every other era is unchanged to the tenth of a kilobyte, and
`eager` does not move. `code` reads 0.2 kB higher and that is not this change:
every emitted chunk is byte-identical once the content hashes in file names are
normalised, except deck.gl's `webgl-device` chunk, whose modules Rollup emitted
in a different order — 4 characters out of 191,407, and 0.3 kB of gzip luck.
Holding the old bytes exactly would have
meant an ordinal prefix on every file name (`0001-bismarck-otto-von.json`),
freezing an accident of history into 506 file names to keep a gzip figure
constant to one decimal. That is a worse artifact than the 0.4 kB.

**506 files today, and roughly two thousand at twenty packs.** Reading all
three registries costs 8.7 ms instead of 1.0 ms; the whole content tree reads in
24 ms. That is real and it is not close to mattering — it is a build step, not
a request. `git status` is noisier when a pack lands, but the noise is new files,
which is the thing that happened. The genuine loss is review context: a single
file let a reviewer see a new source against its neighbours and notice a `tier`
that did not match the house style. That check moves to
[`docs/fact-check.md`](../fact-check.md) and to the validator, which is where a
rule that matters should have been anyway.

**The per-era narrowing is untouched.** `sharedFor` takes the registries as
arrays and returns them as arrays; it never knew how many files they came from,
and its two tests — nothing an emitted bundle points at is missing from it, and
everything the validator resolves for a pack is in that pack's bundle — pass
unchanged.
