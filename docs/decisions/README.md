# Decision records

Architecture and policy decisions for Sandtable, one file per decision, numbered
in the order they were made. Each record says what was decided, why, what was
rejected, and what it commits us to. A decision is revisited by writing a new
record that supersedes the old one — never by silently editing history.

Every record maps to a `decision`-type bead; the bead is closed when the record
is merged.

| #                               | Decision                                                                             | Bead         | Status   |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------------ | -------- |
| [0001](0001-stack.md)           | Application stack: Vite + TypeScript + React; MapLibre GL + deck.gl                  | `sand-a55.1` | accepted |
| [0002](0002-geography.md)       | Real geography: self-hosted PMTiles + historical borders; schematic only as inset    | `sand-a55.2` | accepted |
| [0003](0003-scenario-packs.md)  | Data-driven scenario packs as the platform kernel                                    | `sand-a55.3` | accepted |
| [0004](0004-hosting.md)         | Static hosting on AWS (S3 + CloudFront), GitHub Actions via OIDC, assets outside git | `sand-a55.4` | accepted |
| [0005](0005-counterfactuals.md) | Counterfactuals are hand-authored branches, not a wargame engine                     | `sand-a55.5` | accepted |
| 0006                            | Information architecture: one map, one dossier, one timeline                         | `sand-neh.5` | pending  |
| 0007                            | Imagery: sourcing, licensing, colorization, content policy                           | `sand-y0u.1` | pending  |

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
