# Decision records

Architecture and policy decisions for Sandtable, one file per decision, numbered
in the order they were made. Each record says what was decided, why, what was
rejected, and what it commits us to. A decision is revisited by writing a new
record that supersedes the old one — never by silently editing history.

Every record maps to a `decision`-type bead; the bead is closed when the record
is merged.

| #                                        | Decision                                                                             | Bead            | Status   |
| ---------------------------------------- | ------------------------------------------------------------------------------------ | --------------- | -------- |
| [0001](0001-stack.md)                    | Application stack: Vite + TypeScript + React; MapLibre GL + deck.gl                  | `sand-a55.1`    | accepted |
| [0002](0002-geography.md)                | Real geography: self-hosted PMTiles + historical borders; schematic only as inset    | `sand-a55.2`    | accepted |
| [0003](0003-scenario-packs.md)           | Data-driven scenario packs as the platform kernel                                    | `sand-a55.3`    | accepted |
| [0004](0004-hosting.md)                  | Static hosting on AWS (S3 + CloudFront), GitHub Actions via OIDC, assets outside git | `sand-a55.4`    | accepted |
| [0005](0005-counterfactuals.md)          | Counterfactuals are hand-authored branches, not a wargame engine                     | `sand-a55.5`    | accepted |
| [0006](0006-information-architecture.md) | Information architecture: one map, one dossier, one timeline                         | `sand-neh.5`    | accepted |
| [0007](0007-imagery.md)                  | Imagery: sourcing, licensing, colorization, content policy                           | `sand-y0u.1`    | accepted |
| [0008](0008-audio.md)                    | Background score: generated audio, provenance and playback                           | `sand-1l0.34.1` | accepted |
| [0009](0009-url-contract.md)             | The URL is the view: a citable deep-link contract                                    | `sand-shn.3`    | accepted |
| [0010](0010-type-floor.md)               | The type floor: nothing below 11px, and one mark that is not type                    | `sand-neh.3`    | accepted |
| [0012](0012-photographs.md)              | Photographs in the war room: toned at rest, one picture per beat                     | `sand-y0u.4`    | accepted |
| [0013](0013-chapter-index.md)            | The chapter index: a table of contents, not a chip row                               | `sand-neh.7`    | accepted |
| [0014](0014-plate-sets.md)               | The plate set: four pictures on one axis, and why that is not a gallery              | `sand-neh.16`   | accepted |

## Template

```markdown
# NNNN — Title

- **Status:** proposed | accepted | superseded by NNNN
- **Date:** YYYY-MM-DD
- **Bead:** sand-xxx

## Context

## Decision

## Alternatives considered

## Consequences
```
