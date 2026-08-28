# Historiography notes — 1917 contested points

The contested points of the Russian Revolution, and where each one lives. The
same rules apply as to [`historiography-1914.md`](historiography-1914.md): a
contested point is written as the debate it is, positions are named and cited,
and nothing is settled for the learner (rule 6 of [`sources.md`](sources.md);
reviewer checklist in [`fact-check.md`](fact-check.md)). Story: `sand-ekc.7`.

Under [ADR 0017](decisions/0017-historiography-cards.md) the **card is the
source of truth and this doc is the register**. Where a point has a card, the
entry below says so and does not repeat the positions. Where a point has no
card, the entry says why not — which for this pack is usually the same reason,
and it is worth stating once at the top.

## The constraint this pack is under

Of the eleven secondary works in the 1917 bibliography, **none can be opened at
page level from this project's environment**: every copy on the Internet
Archive is borrow-only. Four things can be read in full — Trotsky's _History_,
Lyandres's open-access study of the German-gold accusations, the Internet
Archive scan of Zeman's document collection, and Lenin's _Collected Works_ —
and those four are what the pack quotes.

ADR 0017 sets a higher bar for this card family than for any other, because a
card asserts _who holds a position_ and a card built on second-hand attribution
misrepresents a named historian. It also provides the escape: a point can be
worth a card and still not be writable, and when the historians who hold the
sides cannot be opened, the note stays in this doc and says why. Both of those
provisions are exercised below.

## 1. October: a revolution, or a coup? — **carried by a card**

`1917-russian-revolution:historiography-october-coup-or-revolution`

Four positions: Trotsky (a mass insurrection in which conspiracy is the servant
of the rising); Pipes (a coup by a minority with no popular mandate);
Rabinowitch (an open, divided party that won by being responsive rather than
disciplined); Fitzpatrick and Smith (the question mistakes the unit of analysis
— the revolution is a social process over decades, not a night in a capital).

**Sourcing status: one position of four is quoted from a text that was read.**
Trotsky is quoted from vol. III chs. 43–44 of the Marxists Internet Archive
text. The other three are stated from each work's central published argument
and are explicitly not quoted; the card's `unread` field says so in as many
words. Raising this card to the full bar needs the four volumes at page level.

Reached from: the October insurrection event, the `october-petrograd` chapter,
the Winter Palace marker, and Lenin's letter of 24 October.

## 2. Who led the February Revolution? — **carried by a card**

`1917-russian-revolution:historiography-february-who-led-it`

Three positions: that nobody led it and it happened of itself (the formula
Trotsky reports in order to attack it); that it was led by workers educated by
Lenin's party, though that leadership was not sufficient to keep the revolution
(Trotsky's own answer); and that it was an autonomous insurrection of workers
and then soldiers that the party organisations followed rather than directed
(Hasegawa).

**Sourcing status: mixed, and the card says which is which.** Trotsky's two
quotations are from his own chapter, which is literally titled with the
question. Hasegawa's position is stated from his work's central argument and is
not quoted. The first position is the weakest attribution on any card in this
pack: it is reached only through a hostile summary in Trotsky, and for that
reason no individual holder is named for it.

## 3. German money — **carried by a card**

`1917-russian-revolution:historiography-german-gold`

Four positions: the charge as the Provisional Government made it in July 1917;
the Bolshevik and later Soviet answer that it was a forgery of the
counter-revolution; the German Foreign Ministry's own record as Zeman published
it; and Lyandres's re-examination, which finds that the 1917 evidence does not
support the accusation while stating plainly that this is not a claim that no
German money reached the Bolsheviks.

**Sourcing status: this is the card written to the full ADR 0017 bar.**
Lyandres is quoted with page numbers from the open-access text; the Kühlmann
telegram of 3 December 1917 is quoted verbatim from the Zeman scan and cited by
document number, because the scan's text layer carries no printed page for that
item. The second position is named without being quoted — no Soviet
historiographical text is readable from here — and the card marks it.

The distinction the card is built to protect is the one everybody collapses:
_did Berlin fund Russian defeatism_ (yes, and it said so), _did money reach the
Bolsheviks_ (Lyandres documents one instance and says the question is open),
and _was the July 1917 evidence evidence of either_ (no).

## 4. The Kornilov affair — **no card, deliberately**

Three readings are in circulation: that Kerensky manufactured the rupture and
destroyed the army's command with it; that the two men had a real understanding
about moving troops to the capital and Kerensky broke it once V. N. Lvov's
report convinced him he was about to be displaced; and the Soviet reading, in
which the affair is a counter-revolutionary conspiracy of generals and property
and the "misunderstanding" is a story told afterwards by its authors.

**Why there is no card.** Katkov's monograph is borrow-only. The two journal
articles that carry the second and third readings — Asher in _The Russian
Review_ 29:3 (1970) and White in _Soviet Studies_ 20:2 (1968) — are paywalled,
and **neither carries a published abstract**, so there is not even an author's
own sentence to attribute. The version of Asher's thesis that circulates freely
comes from secondary literature and reference works, not from Asher, and
putting it on a card would be exactly the failure ADR 0017 exists to prevent:
a named historian made to hold a position through somebody else's summary.

The dispute is therefore prose historiography in
`beats/07-kornilov.md`, which names the three readings, attributes only the one
whose work is in the registry, and says out loud that the others could not be
opened. What it needs: Katkov at page level, and the two articles.

## 5. Order No. 1 and the collapse of the army — **carried by a causal link**

`1917-russian-revolution:link-order-no-1-to-the-offensive`, at
`confidence: "contested"`, with the argument in its `historiography` field: the
officers' and Kerensky's version that a single Soviet document destroyed the
army, against the observations that the order was addressed to one garrison,
that discipline was fraying through 1916, and that both sides read it as a
transfer of authority.

This is a `CausalLink` rather than a card because the dispute really is about
whether _this caused that_, which is the shape a causal link has. It would
become a card if a future pass could put named holders on both sides from works
it had read.

## What would change all of this

Access. Nine of the works this pack cites are ordinary, in-print, widely held
books; the argument here is not that the scholarship is unavailable but that it
was unavailable _from here_, which is a fact about the authoring pass and not
about the field. A reading pass with the volumes in hand would upgrade cards 1
and 2 to the full bar and would probably make card 4 writable. That is a bead,
not a defect in the record.
