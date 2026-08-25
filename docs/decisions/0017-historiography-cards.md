# 0017 — A contested point is a card, and the doc is its register

- **Status:** accepted
- **Date:** 2026-08-25
- **Bead:** `sand-23b.28`

## Context

`docs/sources.md` rule 6 says a contested point must be written as the debate
it is and must not be settled for the learner. `docs/historiography-1914.md`
holds sixteen numbered notes doing exactly that, each with the positions, who
argues them, and a paragraph headed **How the pack presents it**.

The pack could not present them. Three mechanisms existed and none of them
carries an argument as an argument:

- **A `historiography` field** on `Branch`, `CausalLink` and `CasualtyRecord`
  — one Markdown paragraph, attached to the one entity whose claim is
  contested, with nothing to stop it holding a single side.
- **`DecisionPoint.verdict`** — described in the schema as "outcome and the
  historians' assessment", which is a verdict with a footnote, and is where
  the reader arrives after choosing.
- **Beat prose**, where the debate is a sentence in a paragraph about
  something else.

`used_by` found the gap. Hentsch's portrait manifest had named
`1914:historiography-hentsch-authority` since the imagery pass, and PR #112,
promoting a dangling `used_by` to an error, had to delete it: "There is no
historiography entity — the contested points live in
`docs/historiography-1914.md` and inside beat prose." The picture wanted a
card that the content model had no way to build. It is not the only one:
whether a lieutenant-colonel could order two armies to retreat touches five
entities — the decision, the minute taken at Mareuil, the vignette of the
drive, Hentsch himself, and the battle — and a field on any one of them makes
the other four the wrong place to read it.

## Decision

**A contested point is its own card family — the twelfth — and it is an
ordinary entity with an ordinary address.**

`content/eras/<pack>/historiography.json` holds `Historiography[]`:

| Field       | What it is                                                                    |
| ----------- | ----------------------------------------------------------------------------- |
| `question`  | The dispute stated as a question, not as a finding                            |
| `positions` | **At least two**, each with a `label`, the `who` that holds it, and a summary |
| `settled`   | What is _not_ in dispute                                                      |
| `unread`    | The evidence that would settle it, and why it has not been read               |
| `links`     | The entities the dispute is about, rendered as chips                          |
| `sources`   | Required, as for every card                                                   |

**`positions` has a floor of two and the schema enforces it**, with the reason
in the error message. This is the point of making it an entity rather than a
field: rule 6 stops being a convention a reviewer has to notice and becomes
something `npm run validate:content` refuses. The validator adds what a schema
cannot say — that two positions with the same label, or the same holder, are
one argument written twice.

**Within ADR 0006 it is a card, and nothing else changed.** No panel, no mode,
no fourth surface. **It has no timeline glyph**, and that is a positive
finding rather than an omission: ADR 0006 gives a glyph to anything with a
moment, and a dispute has none — the argument about 9 September 1914 opened
that autumn and is still open. So the door is a chip: `Links` gains a
`historiography` key, and every entity a dispute touches names it. That makes
the reference two-way — the decision card reaches the argument, the argument's
own `links` reach back — without a reverse index nothing else in the engine
has.

**Within ADR 0009 nothing changed either.** `?card=1914:historiography-…` is
an era-qualified entity id in the existing card slot. It is deliberately _not_
the reserved-unqualified-address pattern PR #120 established for
`?card=bibliography`: that address is unqualified because the bibliography is
of whatever pack is loaded, and era-qualifying it would give one view a
different address in every era. A contested point is the opposite — Hentsch's
authority is a fact about the 1914 pack and belongs to it.

### The doc and the cards are one source of truth, and the card is it

`docs/historiography-1914.md` **stays**, and stops carrying the argument twice.
Where a numbered note has a card, the note keeps only what is doc-shaped —
that the point is contested, which entity carries it, how the pack presents
it, and what cannot be read — and the positions, the quotations and the page
numbers live in the entity. Note 4 is rewritten that way in this record's PR;
the other fifteen keep their prose until they get cards, and the "Using these
notes" section says which is which.

The direction of flow is one way and it is worth stating plainly: **the doc
points at the card; the card does not point back.** The doc is an authoring
and review artefact — `docs/fact-check.md` sends a reviewer to it, and it
lists points that are out of the reader's scope entirely (note 9 belongs to a
pack that does not exist yet). Giving the entity a field naming its note
number would be a second pointer to keep in step, and note numbers move. The
same argument PR #120 made against printing "further reading" applies: an
authoring list is not a reader-facing artefact, and the card carries no field
whose only purpose is to name one.

## Alternatives considered

- **A `historiography` Markdown field on `DecisionPoint`, like the one on
  `CausalLink`.** The closest existing mechanism and the one to beat. Rejected
  on two counts. It has no floor — a paragraph holding one side is valid — so
  the rule the family exists for cannot be checked. And the dispute is not
  attached to the decision: it is equally about the document, the vignette and
  the man, and a field on the decision makes those the wrong place to look
  while duplicating it into all four makes four sources of truth.
- **Stretching `CausalLink`.** It already carries a claim, a contested
  confidence, a `historiography` paragraph and its evidence, and is the
  nearest fit in shape. It fails for a nameable reason: a causal link is `from → to`, and the
  Hentsch dispute is not about whether the mission caused the retreat — which
  nobody denies — but about whether the man had the standing to order it.
  Filing it as a link would mean inventing an uncontested causal claim to hang
  a dispute about something else on.
- **Stretching `Document`.** A `Document` carries a text. A dispute is not a
  text, and the two texts at the centre of this one — the minute taken at
  Mareuil and Moltke's verbal order — are already a `Document` and a
  recollection respectively.
- **Leaving it distributed across the entities that exist**, as it is today.
  This is the status quo and it is what produced the bead: the vignette tells
  the drive, the decision records the outcome, and a reader who wants to know
  whether the order was lawful has nowhere to go. It also leaves rule 6
  unenforceable.
- **Generating `docs/historiography-1914.md` from the entities.** One source
  of truth by construction, and rejected: the doc carries points that are
  deliberately not reader-facing — a note about a pack that has not been
  written, a note recording that two official histories disagree — and a
  generator would have to grow a way to say "this one is for authors", which
  is a doc with extra steps.
- **A dossier mode, like the causal explorer.** A mode replaces the beat until
  closed and has no back link. A contested point is somewhere you go _from_ a
  decision card and want to come back from, which is what a card is.

## Consequences

- `Historiography` joins the schema (`src/packs/schema/entities.ts`),
  `historiography.json` joins `PACK_COLLECTIONS`, and `schema/` gains a
  generated JSON Schema. `Links` gains `historiography`.
- `src/ui/HistoriographyCardView.tsx` renders it inside the shared card frame:
  the positions as an ordered list, both on screen at once. **Not tabs, not
  disclosures** — a card that makes the reader open one side has made them
  choose before they have read.
- The validator holds the two-position floor, distinct labels and holders,
  footnotes that resolve to the card's own sources, and entity links in every
  Markdown field.
- Authors adding a contested point add the entity, point at it from the
  entities it is about, and reduce the note in `docs/historiography-1914.md`
  to its register entry in the same PR.
- Fifteen notes still have no card. That is a backlog, not a debt this record
  discharges; the doc says so at the point where it matters.
