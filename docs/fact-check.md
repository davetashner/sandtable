# Fact-check workflow — reviewing content PRs

Every content PR (anything under `content/`) gets two reviews: **form** (the
validator and CI) and **fact** (a human or agent reviewer with the sources).
This is the fact reviewer's checklist and the author's pre-flight. Story:
`sand-23b.2`. Standards it applies: [`docs/sources.md`](sources.md) (citation),
[`docs/historiography-1914.md`](historiography-1914.md) (contested points),
[ADR 0007](decisions/0007-imagery.md) (images), [`docs/content-model.md`](content-model.md)
(confidence on positions).

## Author pre-flight (before opening the PR)

- `npm run validate:content` is clean; `npm test -- --run` passes.
- The PR description says which lesson question each beat/card serves
  (`docs/lesson-1914.md`) — or why it exists if none.
- Every new source is in the registry with `notes` (use and bias).

## Reviewer checklist

Tick each in the PR; a failed item blocks the merge.

### Claims and citations

- [ ] Every **date, number, strength, position, time of day, quotation and
      attribution of motive** cites a `Source`; pages are given where the
      claim is contestable.
- [ ] The cited work actually supports the claim (spot-check at least three
      citations against the book/annex; all of them for documents and numbers).
- [ ] Numbers and positions come from the **official histories or
      archive-based studies**, not from popular narratives (hierarchy in
      `docs/sources.md`); Wikipedia appears only on uncontested biographical
      dates.
- [ ] Quotations are **verbatim**, in the original language where we have it,
      with a translation, cited to the edition/annex that prints them; nothing
      is paraphrased and presented as a quotation.

### Contested points

- [ ] Anything on the contested-points list (`docs/historiography-1914.md`) is
      written as a **debate** — historians named, positions stated, each
      cited — and the text does not resolve it for the learner.
- [ ] `confidence: contested` is set on causal links and routes where the
      evidence or the meaning is disputed.
- [ ] "Miracle", "blunder", "genius" and similar verdict words are either
      quoted from a named historian or absent.

### Hypotheticals

- [ ] Counterfactual content carries `branch: <counterfactual id>`, says
      **Hypothetical** in `dateLabel`, and says so in its first sentence.
- [ ] Feasibility claims point at the branch's checklist; the checklist's
      `met` values are cited.

### Geodata

- [ ] Routes carry `confidence` and a `derivation` note; positions upgraded
      from `low` have a source for the upgrade.
- [ ] Waypoint times and places are plausible against the sources (march
      rates: infantry ~25–30 km/day sustained, more in forced marches;
      cavalry more; nothing teleports).
- [ ] Battle regions and cameras frame the ground the sources describe.

### Images

- [ ] Manifest fields complete: archive, photographer, date, licence, credit,
      caption, content-policy note; Bundesarchiv credit string present.
- [ ] Caption's date, place and unit identification are supported; the
      "misattributed stock photo" check has been done (reverse-image search
      or archive record).
- [ ] Colorized images are labelled, the original is linked, and the
      colourisation is plausible (uniform colours, ribbons as documented);
      nothing added or removed.
- [ ] Content policy: no dead or mutilated bodies, no atrocity imagery.

### People and places

- [ ] Period names used in the narrative with modern names in the registry;
      ranks and posts correct for the date; nationality is the 1914 state.

## Marking the outcome

- Approve with the checklist ticked; or request changes quoting the failing
  item and the source that contradicts it.
- Open follow-up beads for claims that are right but under-sourced
  (`bd create … --type=task --priority=2 --parent=sand-23b`).
- Corrections to already-merged content go through the same workflow.
