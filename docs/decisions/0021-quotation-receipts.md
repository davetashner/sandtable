# 0021 — A quotation carries a receipt, and an unreadable source is not quoted

- **Status:** accepted
- **Date:** 2026-08-28
- **Bead:** `sand-23b.57`

## Context

`src/packs/validate/validate.ts` checks that a citation **resolves**: that
`source:herwig-2009` names an entry in the registry, that a footnote in a beat
is among that beat's sources, that Wikipedia is not standing in front of an
operational claim. It has never checked, and cannot check, that the work says
what we say it says.

For a date or a strength that gap is covered by review: a fact reviewer with
the volume open can test the claim, and `docs/fact-check.md` asks them to.
For a quotation the gap is different in kind, because a quotation is not a
claim _about_ a source — it **is** the source, reproduced. There is nothing
else to compare it against. A fabricated quotation carrying a well-formed
citation passes every gate in this repository, and passes them looking more
checked than the paragraph around it.

Two incidents on 27–28 August 2026 turned that from a worry into a fact.

**An agent invented source material.** A research subagent working on the 1917
Russian Revolution pack produced quotations attributed to a named memoirist and
the text of a decree, and retracted two of eight items only after delivering
them. Nothing in CI would have caught it. It was caught by the authoring
agent's own verification discipline, which dropped the affected vignette and
removed two works from the registry rather than cite books it could not open.
The pack's README records the result: of eleven secondary works, none could be
opened at page level, they are cited without pages, and "nothing from any of
them is put inside quotation marks."

**A retrieval would not repeat itself.** Authoring the Pearl Harbor pack, the
same environment's text-extraction layer returned different page markers for
the same sentence on repeated fetches — 196/197 then 195/196; 131 then 132.
The author wrote no page numbers for five transcriptions, and instead **quoted
the sentence and gave the chapter**, on the grounds that a quoted sentence is
checkable and a page number nobody can reproduce is not. That instinct — when
the locator is unreliable, hand over the evidence — is the whole of this
decision, written down before the decision existed.

### What the corpus actually looks like

Any rule here is friction on every content PR for the rest of the project, so
it was worth counting first. Across 104 beats, 152 JSON files and the four eras that existed when it was written (a fifth, 1918, merged while it was in review):

| Where                                                        | Count                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `Document` entities (`excerpt` is by definition a quotation) | **26**                                                                  |
| Quoted spans of ≥4 words in beat prose                       | **3** (of ten spans total; the other seven are terms of art and titles) |
| Quoted spans of ≥4 words in content JSON                     | **~700**                                                                |

The last number decides the shape of everything below. Beat prose barely
quotes at all — the packs push quotation into `Document` entities on purpose,
which is rule 7 of `docs/sources.md` working. But the JSON is full of quoted
spans, overwhelmingly inside `sources[].note`, and they are a mixture that no
regular expression separates: genuine verbatim quotation (the 1941 pack's
twenty-five quoted sentences standing in for page numbers), alongside "race to
the sea", `"Public domain"`, `"Krieg gegen Frankreich"` and the titles of nine
music cues. A gate that fired on all seven hundred would produce several
hundred false demands on day one, and a gate that is wrong several hundred
times is a gate everyone learns to route around.

## Decision

**A verification receipt is retrieved text with the quotation inside it. It
lives outside the packs. And it is required in exactly one place.**

### 1. The receipt

A `Receipt` (`src/packs/schema/entities.ts`) records one quoted passage:

```json
{
  "id": "receipt:1941-operation-order-hitokappu-secrecy",
  "quote": "… depart with utmost secrecy from Hitokappu Bay on 26 November … advance to the standby point (42 N, 170 W) …",
  "source": "source:japanese-monograph-97",
  "pages": "21",
  "usedIn": ["1941-pearl-harbor:document-operation-order"],
  "how": "fetch",
  "url": "https://www.ibiblio.org/pha/myths/jm-097.html",
  "checkedAt": "2026-08-28",
  "checkedBy": "Claude Opus 5 (agent), for sand-23b.57",
  "context": "… Order to: Carrier Striking Task Force The Carrier Striking Task Force will immediately complete taking on supplies and depart with utmost secrecy from Hitokappu Bay on 26 November and advance to the standby point (42 N, 170 W) by the evening of 3 December. Commander-in-Chief, Combined Fleet Yamamoto, Isoroku [Page 22] …",
  "repeat": "agreed"
}
```

**`context` is the receipt; the rest is metadata about it.** The validator
requires that the quotation appear inside the retrieved context, fragment by
fragment, with ellipses and bracketed editorial insertions splitting it and
typography normalised away. That single rule is what converts an
unfalsifiable claim — _I read this_ — into a falsifiable one: _this url
returned this text_. An author who wants to fabricate now has to fabricate a
paragraph of surrounding source text as well, which is a much larger lie, and
one that `npm run receipts -- --fetch` re-runs against the live url.

Two fields carry the incidents directly. `how` distinguishes a `fetch`, which
a machine can repeat, from a `read` — an attestation that a person or agent
opened a copy nothing here can link, which requires `copy` to name it and
which no script can ever re-run. And `repeat: "differed"` **forbids `pages`**:
a locator taken from a retrieval that would not repeat itself is not a
locator, and the alternative is the one the Pearl Harbor author already found
— quote the sentence, give the chapter.

### 2. Receipts live in `content/receipts/`, one file per era

Not in the pack. A receipt is apparatus: no reader sees one, and shipping
paragraphs of retrieved context inside `dist/pack/<id>.json` would spend the
content budget (ADR 0018) on bytes that render nothing. `content/receipts/` is
outside `content/eras/`, so the pack build never reads it and the budget never
moves. One file per era because several agents author several eras at once,
and a single register would be a merge conflict on every content PR.

### 3. The gate is one field wide: `Document.excerpt`

`Document.excerpt` is described in the schema as "the real text, in the
original language where we have it". It is the only field in the content model
whose _definition_ is a quotation, which makes it the only place a validator
can demand a receipt without first guessing what a quotation is. So: every
`Document` needs a receipt naming it in `usedIn`, and the receipts together
must show every passage the excerpt prints.

`translation` is **not** gated. Where the pack translated the text itself —
1917 does, and says so in the field — there is no source text to retrieve; a
translation quoted from a published edition gets its own receipt, and the
validator will hold that receipt to its context like any other, but it does
not demand one.

Nothing else is gated. The ~700 quoted spans in citation notes are governed by
`docs/sources.md` and by review, as they were yesterday. `sand-23b.58` holds
the question of widening this, deliberately unanswered until somebody has
lived with the narrow version.

### 4. "Unverifiable from here" is not an exception, it is the main road

Most of this corpus cannot be fetched. Gallica answers this environment with a
security check; `history.army.mil`, `usmcu.edu` and `marines.mil` answer 403;
Morison, Prange, Layton, Figes and nearly every Russian monograph exist here
only as lending copies. **The correct response to an unreadable source is to
stop quoting it, not to stop citing it.** A work nobody could open is cited
without pages and without quotation marks, and the pack says so — which is
precisely what `docs/sources.md` already does for the Reichsarchiv and Gallica
and what both the 1917 and 1941 READMEs already do at length.

So the receipt rule has no "unverifiable" escape hatch, because it does not
need one. Deleting an excerpt you cannot verify satisfies the gate, keeps the
citation, and makes the pack more honest rather than less. That is not a
grudging fallback; for most of the shelf it is the expected outcome.

### 5. The script fetches bytes, and that is not a detail

`npm run receipts` re-verifies offline; `-- --fetch` re-fetches every `fetch`
receipt and reports agreement, difference or unavailability; `-- --capture
<url> --find "<phrase>"` fetches a page, extracts its text and prints the
passage around a phrase, ready to paste. It is never run in CI: it is
network-dependent, several hosts refuse this project outright, and a gate that
fails when a transcription site is down teaches everyone to ignore it. Drift is
reported to a person, who decides.

`--capture` is the reason anybody will use the other two — it turns writing a
receipt into two commands instead of copying a paragraph out of a browser. It
also exists to head off a specific temptation. A tool that hands a page to a
language model and asks what the page says returns the _model's_ rendering of
the text; a receipt built from one is a paraphrase wearing the costume of a
retrieval, which is the exact failure this mechanism exists to prevent.
Nothing in the script summarises anything.

### 6. Twenty-two documents get a bead-referenced allowance

All 26 existing documents predate the rule. **Four were verified in this PR
against live transcriptions**, and what those four cost is the best evidence
this ADR has:

- **The Hawaii operation order** (HyperWar's Japanese Monograph 97). All five
  passages verbatim; the page markers came back `7, 11, 13, 21` on two
  independent fetches and matched the citation exactly — in the one pack whose
  author had found page markers _not_ repeating elsewhere.
- **The Schlieffen memorandum** (the BSB transcription). Four passages
  verbatim; no page written, because that transcription has no pagination.
- **The Petropavlovsk resolution** and **the Red Terror decree**, from the 1918
  pack, whose author never saw this rule — which makes them the honest test.
  Both verbatim, all fifteen clauses of the one and the whole of the other.

The other twenty-two are named in `content/receipts/backlog.txt` with the
reason, the recipe for removing a line, and `sand-23b.57.1`. The validator
refuses a backlog line for a document that already has a receipt, so the
allowance cannot quietly outlive the debt — the same bargain, and the same
shape of file, as `scripts/media-index-backlog.txt` (PR #151).

### 7. What the first real use of the gate found

The 1918 pack merged before this one, so its four documents met the gate
without their author having heard of it. That is the trial this design wanted,
and it is worth recording what came back, because none of it was fabrication
and all of it was worth knowing.

Two passed outright. The other two failed on **one editorial character each**:
`hist.msu.ru` prints the calendar decree's title and date on separate lines and
the excerpt joins them with an added full stop; Avalon heads the Brest-Litovsk
articles `ARTICLE 1` and the excerpt renumbers them `**Article I.**`. Every
word of both documents matches. They are on the backlog with the finding
written beside them rather than edited here, because a gate's own PR is the
wrong place to rewrite somebody else's freshly merged pack.

Three things in the checker exist **because** of that trial, and each was a
real false negative before it was a rule:

- **Character encoding.** `hist.msu.ru` serves Windows-1251 with no charset in
  the header. Read as UTF-8, every Cyrillic character is mojibake and the
  decree reads as absent — which would have pushed the Russian sources, the
  ones the fabrication incident was actually about, into "unverifiable" for a
  reason that was ours and not theirs.
- **Brackets in retrieved text.** The Marxists Internet Archive prints "they
  [are] to be appointed", repairing the 1921 pamphlet. Quoting that clause with
  or without the brackets is honest, so the delimiters come off the haystack
  and every word inside them stays.
- **Blank lines in an excerpt.** The same transcription carries the
  transcriber's notes _between_ the numbered clauses, so a quotation of clauses
  4 and 5 is two passages with somebody else's words in between. A paragraph
  break is where an excerpt says a passage ends, and the checker now reads it
  that way instead of demanding one continuous run.

The general lesson is the one worth carrying. **The failure mode of a check
like this is not that it lets a lie through; it is that it cries wolf about
typography.** Each rule above narrows the crying-wolf surface without letting a
single word through unseen.

## Alternatives considered

- **Scan prose for quotation marks and demand a receipt for each.** Rejected on
  the count: ~700 spans, of which a large minority are terms of art, work
  titles and licence strings. The rule would be wrong hundreds of times on the
  day it landed. This is the version the bead sketched, and the corpus argued
  it down.
- **A field on `Document` instead of a separate register.** Rejected twice
  over: a receipt's context is hundreds of characters of text nothing renders,
  so it would go into the pack bundle and into the browser's re-validation for
  no reader benefit (ADR 0018); and quotations are not confined to documents,
  so a document-shaped home would be the wrong shape the first time a
  historiography card wanted one.
- **Require a receipt for every citation, not just quoted ones.** Rejected:
  most citations support a date or a strength, which review can test against
  the book. The receipt exists for the one claim review cannot test any better
  than the author could.
- **Fetch and verify in CI.** Rejected: the network is not a build input.
  Gallica and three US military history hosts refuse this project already, and
  a required check that goes red when ibiblio has a bad afternoon would be
  disabled within a month.
- **Make the missing-receipt rule a warning.** Rejected: the validator already
  carries 62 warnings, and a warning nobody must act on is documentation with
  extra steps. The backlog gives the same "don't break `main` today" property
  while naming every debt and expiring itself.
- **Do the ADR only, and defer the script.** Considered seriously and rejected
  once `--capture` was written: without a tool that produces the context, the
  rule asks authors to hand-copy paragraphs, which is exactly the friction that
  makes a discipline decay. The script cost about a hundred lines and it is
  what makes the gate affordable.

## Consequences

- **A content PR that adds a `Document` now also adds a receipt.** In the good
  case that is two commands and a paste. In the bad case the work cannot be
  opened, and the PR loses the excerpt and keeps the citation — a thinner and
  more honest pack, which `docs/sources.md` has always said is the right
  trade.
- **`main` stays green.** The gate finds 26 documents today; 4 carry receipts
  and 22 are on the backlog. The validator reports 62 warnings, unchanged.
- **A pack in flight collided with this, and the collision was useful.** PR
  #156 merged first, so the 1918 pack's four documents had to be handled here:
  two got real receipts, two went on the backlog with the exact discrepancy
  recorded. Section 7 is what that cost and what it bought. There is no way to
  introduce a gate without that cost falling on someone; the next collision is
  cheaper, because the checker learned three things from this one.
- **`checkedBy` puts a name on an unverifiable claim.** A `read` receipt is
  worth exactly what the person who signed it is worth, and the schema says so
  rather than pretending otherwise. That is the honest floor for a corpus this
  much of which is behind a lending wall.
- **The mechanism is general, the gate is narrow.** A receipt can name any
  entity in `usedIn`, and the validator checks that the entity still carries
  the words — so an author quoting inside a citation note may write one today
  and get drift detection for free. Widening the _requirement_ is
  `sand-23b.58`, and it waits until somebody has felt the friction of the
  narrow version rather than being argued about in advance.
