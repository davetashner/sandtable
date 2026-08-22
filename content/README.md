# Content

Everything the engine renders is data in this directory. Layout decided in
[ADR 0003](../docs/decisions/0003-scenario-packs.md):

```text
content/
  eras/<yyyy>-<slug>/   one self-contained scenario pack per campaign or period
  shared/               cross-era registries referenced by ID (people, places,
                        sources, geo/borders, links, media)
  threads/<slug>/       curated learning paths across packs
```

Entity IDs are era-qualified (`1870:sedan`, `1914:marne`). A pack must be
valid on its own; `shared/` is the only cross-pack dependency. Every factual
claim cites a `Source`; image binaries live in the assets bucket, not here
(see `shared/media/README.md`). The schema and validator rules are described in
[`docs/content-model.md`](../docs/content-model.md) and the step-by-step how-to in
[`docs/authoring.md`](../docs/authoring.md); JSON Schema for editors is under
`schema/`. Run `npm run validate:content` before opening a PR.
