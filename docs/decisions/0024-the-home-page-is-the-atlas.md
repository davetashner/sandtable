# 0024 — The home page is the atlas, and a campaign URL names its campaign

- **Status:** accepted
- **Date:** 2026-08-28
- **Bead:** `sand-shn.25`

## Context

`/` opens the Schlieffen Plan. That was the whole project once. Tonight there
are five eras — `1914-schlieffen-marne`, `1915-attrition`,
`1917-russian-revolution`, `1918-russian-civil-war`, `1941-pearl-harbor` — and
ADR 0019 commits to ten more in the Pacific before Europe is written at all. A
front door that opens onto one campaign says the project is that campaign.

The atlas already exists (`sand-shn.1`, `/atlas.html`) and is a page nobody
arrives at: it is reached from a quiet link in the campaign header and from the
three boot-failure states. It is also, today, the most expensive page in the
app — `packBundlePlugin`'s `transformIndexHtml` hook runs for every HTML entry,
so the atlas inlines the era fetch too and downloads 303 kB gzip of 1914 that
it never reads (`sand-shn.1.4`). The one page that exists because the reader has
not chosen an era pays for one.

Moving it to `/` is not a routing change. It changes what a published link
means, and this project has already refused to do that lightly: ADR 0019
declined to rename `1914` and `1915` to matching directory slugs because "ids
are a durable public contract here in a way they are not in most codebases",
and renaming would "break every deep link anyone has ever shared, and would
break them silently". The same standard applies to the address of the app
itself.

Three link shapes are in the wild, and every option has to answer for all
three:

| shape                     | what it is                                     |
| ------------------------- | ---------------------------------------------- |
| `/`                       | the app, as anyone would bookmark or print it  |
| `/?t=…&focus=…`           | a citation of a view, ADR 0009's whole purpose |
| `/?pack=1915-attrition&…` | the same, written since the atlas landed       |

## Decision

**`/` is one address answering with two pages, and which one it is depends on
whether the URL names a view.**

1. **A URL that fills no slot of ADR 0009's contract names no view, and gets
   the atlas.** A bare `/`; also `/?utm_source=…`, which is a link to the
   project rather than to a view inside it, because unknown parameters are
   `extra` and always were (ADR 0009 rule 4).

2. **A URL that fills any slot gets the campaign**, exactly as it does today —
   same document, same chunks, same boot hook, same era resolution.

3. **`pack` is promoted to a named slot and is written into every campaign
   URL.** ADR 0009's amendment of 2026-08-28 is superseded on this point, and
   only this point.

4. **`/atlas.html` is kept**, serving the same page. It is published — the
   three failure states in `index.html` link to it — and those are precisely
   the case where the reader's copy of `/` may be the broken thing.

### What happens to each published link

| link                                           | before            | after                                                                                                          |
| ---------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `/`                                            | the 1914 campaign | **the atlas.** Deliberate; this is the change.                                                                 |
| `/?t=1914-08-24T12:00:00Z&focus=1914:marne`    | that view of 1914 | **that view of 1914**, unchanged, then the address gains `pack=1914-schlieffen-marne` on the first state write |
| `/?pack=1915-attrition&t=1915-04-22T17:00:00Z` | that view of 1915 | **that view of 1915**, unchanged, byte for byte                                                                |
| `/atlas.html`                                  | the atlas         | the atlas                                                                                                      |

Only the first changes meaning, and it is the only one of the three that
carries no view to lose. A reader who bookmarked `/` for the campaign lands on
a page whose first entry is that campaign, one click away — not a wrong era and
not a blank page.

The second row is the one worth being precise about. Such a link opens the seed
era by ADR 0009's fallback ("an id the build never emitted falls back to the
seed era"), which is what it always did — the parameters name a view, so the
campaign is what `/` answers with. The change is what happens next: on the
first state write `bindUrlState` puts the era it actually loaded into the
address, so the link the reader copies back out says which campaign it is of.
It is a migration performed by use, and it is the reason for point 3.

### Why `pack` has to become a slot

While `/` meant the seed era, a link with no `pack` meant "the seed era",
which was a stable statement because `/` said so. Now `/` says something else,
and a campaign link that does not name its campaign means "whichever era is
seeded when you click it". If the seed era ever changes — and with twenty packs
projected, why would it not — every such link silently opens a different
campaign. That is the wrong-era outcome, arriving later and quietly, which is
the failure this whole record is written to avoid.

So the era is named in the address. `pack` joins `SLOTS` in
`src/engine/url-state.ts`, first, because it names the document the other slots
are read against. It is not a slot a reader sets: the page knows which era it
loaded, `App` passes it to `ClockProvider`, and `applyUrl` writes it over
whatever the address claimed. An address naming an era the build never emitted
is therefore **corrected** to the era actually served, rather than copied back
out as a link that only works by falling back.

The cost is ADR 0009's rule 3. "The ordinary view has no parameters at all" is
now false: the ordinary view of a campaign is `/?pack=1914-schlieffen-marne`,
twenty-eight characters that were previously implied. The deepest state the
1914 pack can reach is still comfortably inside the 300-character bound that
record set, and `url-state.test.ts` still says so.

### One question, asked in two places, from one list

`/` branches before React exists. The boot script in `<head>`
(`src/packs/boot-script.ts`) has to know whether to start an era fetch at all,
and `src/main.tsx` has to know which app to mount. If those two disagree, a
reader gets a fetch for an era nothing will render, or an atlas waiting on a
request it never wanted.

They ask `namesAView` over `VIEW_SLOTS`, both of which live in
`src/packs/content-bundle.ts` — the one module a Node build step and the browser
both read, which imports nothing. `url-state.ts` owns how each slot is _read
and written_; `content-bundle.ts` owns what they are _called_; and
`url-state.test.ts` asserts the two lists are the same set, because a slot added
to one and not the other is a URL that names a view the campaign would render
and the boot script would answer with the atlas. `boot-script.test.ts` walks
both answers on both sides of the real script.

### The campaign moves behind a dynamic import, and the budget follows it

`src/packs/pack-loader.ts` awaits the content bundle at module scope
(ADR 0018), so anything that imports the campaign — however indirectly —
suspends until an era has been fetched. The atlas branch therefore _cannot_ be
reached through a module that statically imports the campaign. `src/main.tsx`
is a router: two dynamic imports and the two stylesheets both pages share,
which stay static so `index.html` keeps a `<link rel="stylesheet">` the preload
scanner can see.

That breaks how `eager` was measured. ADR 0016's number is "index.html plus
everything it names", and index.html now names a two-kilobyte router. Reading
the HTML would report ten kilobytes for a page that downloads two hundred —
a budget met by hiding from it, which is exactly what ADR 0018 refused when it
turned down an async bootstrap in `main.tsx` for this reason.

So the measurement is taken from Vite's build manifest instead
(`build.manifest`, `scripts/lib/bundle-size.mjs`): a cold load is the HTML
entry's chunk plus the branch's chunk, each closed under its **static** imports
and stylesheets. Dynamic imports stay out — `MapSurface` is behind one and not
needing it before first paint is the point of ADR 0016's lazy boundary. The
manifest is a build artefact and is not deployed.

`eager` keeps its name, its ceiling and its history and now means the campaign
cold load. `home` is new and means the other page. Measured on this branch
against `04f1469`:

| gzip                                | before       | after        |
| ----------------------------------- | ------------ | ------------ |
| **`/` — what the front door costs** | **520.6 kB** | **75.2 kB**  |
| ├ code                              | 217.1 kB     | 75.2 kB      |
| └ the 1914 era bundle, fetched      | 303.5 kB     | none         |
| **`eager` — a campaign cold load**  | 217.1 kB     | **218.8 kB** |
| `code` (every chunk)                | 820.0 kB     | 822.6 kB     |
| `pack` (heaviest era + atlas index) | 306.1 kB     | 306.1 kB     |

The front door costs **a seventh** of what it did. A campaign link costs
**1.7 kB more** — the router, the preload helper, and one more chunk boundary —
and one extra round trip before the campaign chunk starts downloading, which is
the honest cost of the branch. That round trip is spent while the era bundle,
three hundred kilobytes of it, is already in flight from the `<head>` hook: the
module graph is not what a campaign cold load waits on. First contentful paint
does not move at all, because it is the boot frame, and the boot frame is
markup (ADR 0018).

The atlas's 75.2 kB is mostly React and react-dom. Its own code and stylesheet
are 2.6 kB of it.

### The atlas earns the address

A front door should say what the project is, not list directories. Two changes,
which are the part of `sand-shn.14` that could not wait:

- **It leads with a sentence about the project** rather than "Pick a campaign",
  and it prints only the first paragraph of an era's summary. Pearl Harbor's
  runs to three, and printing all of them buried the two campaigns underneath.
- **Eras are grouped by arc**, each arc carrying its own one-line argument.
  A pack declares its arc (`pack.json#arc`, optional in the schema); the arc's
  name and argument live in `src/atlas/arcs.ts`, because they are editorial
  statements about the project rather than facts about any one era. Arcs with
  no eras are not shown, so the list can already name the shape ADR 0019
  commits to. An era whose arc this build does not know is listed under
  "Elsewhere" rather than dropped — a pack is a great deal of work — and
  `Atlas.test.tsx` reads `content/eras/` and fails if any era is in that
  position.

The rest of `sand-shn.14` stays open: `content/threads/` as the second axis,
and giving the arc table a home in `content/` so an author can add an arc
without touching the app.

`sand-shn.1.4` is closed on the way past. The boot hook is now injected only
into the entries that read an era, so the atlas no longer fetches a bundle it
never opens; the gallery keeps it, because `src/gallery/specimens.tsx` builds
all 57 specimens from the pack.

## Alternatives considered

**Swap the entries: the atlas becomes `index.html`, the campaign moves to
`campaign.html`.** Conceptually the cleanest, and it costs the most in exactly
the currency this project has said it will not spend. Every citation in the
second and third rows of the table above would land on the atlas with its view
silently dropped — the state is still in the address, and nothing would read
it. A forwarding script on the atlas page can rescue them, but then the
canonical address of a view becomes `/campaign.html?…` and every URL ever
written has two forms, or the campaign has to `replaceState` its way back to
`/?…` and the citable address is a trick. Sending readers through a redirect on
the one path ADR 0009 exists to protect is the wrong way round.

**A redirect at the edge.** ADR 0004 is S3 + CloudFront and
`infra/functions/spa-rewrite.js` is already a viewer-request function; it has
`request.querystring`, so "rewrite `/` to `/atlas.html` when there is no query
string" is four lines and no application change at all. Rejected on honesty:
the rule would live where neither `vite dev`, `vite preview`, nor the visual
gate can see it, so `/` would mean the campaign on every machine a contributor
owns and the atlas in production — and the gate whose whole job is to notice
what changed on screen would be blind to the change. It would also need writing
twice, since the PR previews are a second distribution with a second function,
and the two would drift. Behaviour that decides what a URL means belongs in the
thing that is tested.

**Any query string means the campaign**, rather than any _known slot_. Simpler
to write and one word wrong: `/?utm_source=twitter` is a link to the home page
with a campaign tag on it, and it would have opened 1914. Unknown parameters
are already defined as things the app carries and does not act on (ADR 0009
rule 4); acting on them here would contradict that.

**Leave `pack` out of the contract** and let a view-carrying link without one go
on meaning the seed era. It works today and it is a trap: it makes the meaning
of every such link a function of which era is seeded, so the day the seed
changes, links break silently and in the worst way — by opening the wrong
campaign. Writing the era into the address costs 28 characters and closes that
for good.

**Render the atlas as static markup at build time** — the pack index is already
known to the build, so `/` could be a page with no JavaScript at all, and its
75.2 kB would be closer to 8. Genuinely attractive, and rejected as scope: it
means either a second implementation of the atlas or rendering the component
with `react-dom/server` in the Vite plugin, and it does not change what any URL
means. It belongs with `sand-shn.14`, where the atlas is being reworked anyway.

## Consequences

- **`/` is two pages, and `src/main.tsx` is the router that says which.** The
  campaign's mounting moved to `src/campaign-main.tsx` unchanged; the atlas's
  to `src/atlas/mount.tsx`, which `/atlas.html`'s entry now calls too, so both
  addresses run one implementation.
- **`build.manifest` is on**, `scripts/lib/bundle-size.mjs` walks it, and
  `scripts/deploy-static.sh` excludes `.vite/` from the sync. A build that
  emits no manifest now fails the budget rather than reporting a small number.
- **The budget has four ceilings.** `home` is the first measurement the atlas
  has ever had.
- **`pack` is in `KNOWN`**, so it is no longer an `extra`. Anything that
  assumed it round-tripped as one — there was a test — now finds it in the
  slot.
- **The visual gate's `opening` scene names its era** and its `atlas` scene is
  now `/`. The scene count is unchanged; both baselines legitimately move, and
  so does every campaign scene's address bar once the app writes `pack` into it.
- **`Pack.arc` is a new optional field** on five packs, and
  `npm run new-pack` does not yet ask for it. An era without an arc is listed
  under "Elsewhere" and the atlas's own test fails, which is the reminder;
  teaching the scaffold is on `sand-shn.14`.
- **The campaign is one round trip further from interactive** on a cold load,
  behind an era fetch that is longer than the round trip. If that ever stops
  being true, the fix is a `<link rel="modulepreload">` for the campaign chunk
  emitted conditionally by the boot script, which the plugin has the bundle to
  do — not a return to a static import, which the top-level `await` forbids.
