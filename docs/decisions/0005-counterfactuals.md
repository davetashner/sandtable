# 0005 — Counterfactuals are hand-authored branches, not a wargame engine

- **Status:** accepted
- **Date:** 2026-08-22
- **Bead:** `sand-a55.5`

## Context

The headline experience asks the viewer to see _where the plan would have
succeeded_ — Schlieffen's concept west of Paris, the pocket closing — and to
pause at decision points (25 August, 30 August, 4 September, 8–9 September)
and choose. That demands alternative timelines. There are two ways to get
them: author them, or compute them with an operational simulation (march
rates, supply, combat resolution). The project is called Sandtable, so the
question deserves an explicit answer.

## Decision

**Counterfactuals are authored, clearly labelled branches.** A `Branch`
shares the historical timeline up to a divergence timestamp and then carries
its own routes, events and narrative beats. Every non-historical branch is
rendered with a persistent _hypothetical_ treatment on the map and in the
dossier, and carries:

- the historiographical debate attached (for 1914: Zuber, Holmes, Mombauer,
  Herwig, Foley on whether "the" plan existed as deployed and whether the
  sweep was feasible);
- for a "success" branch, a visible **feasibility checklist** — what would
  have had to be true (rails intact, no Antwerp mask, no eastern detachment,
  Kluck west of Paris, Joffre failing to redeploy, march rates the troops
  could not sustain) — each condition checked or unchecked against what
  actually happened.

**Decision points** reuse the same mechanism: the viewer chooses, the engine
reveals the historical choice, the reasoning available at the time, the
outcome and the historians' verdict; the alternative is an authored branch,
not a computed one.

A lightweight operational simulation engine is **deferred** to a Phase 6
research spike (`sand-shn.9`) that must recommend go/no-go on the basis of
credibility and transparency, not spectacle.

## Alternatives considered

- **A computed operational simulation now.** Seductive and on-brand, but a
  simulation that produces a plausible-looking, unsourced outcome is worse
  than an honest authored one: it would lend false precision to a contested
  question, the parameters (march rates under fire, supply beyond railheads,
  morale) are exactly the things historians disagree about, and it would
  cost months before any content shipped.
- **No counterfactuals at all — history only.** Loses the central lesson
  ("a timetable the world fell behind") and the interactivity that makes the
  plan comprehensible.
- **Counterfactuals as prose only.** Safe, but the map is where the argument
  is clearest; a branch that moves the tokens and closes (or fails to close)
  the pocket teaches more than a paragraph.

## Consequences

- The schema carries `Branch` and `DecisionPoint` entities (0003); the engine
  ships branch switching with hypothetical labelling in Phase 0
  (`sand-a55.13`).
- Phase 1 authors the concept and success branches with the feasibility
  checklist (`sand-1l0.11`) and the four decision points (`sand-1l0.22`).
- Content review treats every branch as a historiographical claim needing
  sources (`sand-23b`).
- If the Phase 6 spike recommends a simulation, it plugs in as a generator
  of branches that are still reviewed and labelled like authored ones.
