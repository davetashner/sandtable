/**
 * The boot hook, and the face a failed pack fetch wears (`sand-shn.1.2`).
 *
 * `scripts/lib/vite-plugin-pack.ts` inlines the string this module builds into
 * `<head>`. It does two jobs that look unrelated and are the same one: it
 * starts the fetch for this page's era, and it owns what the reader sees when
 * that fetch does not come back.
 *
 * **Why the failure state lives here and not in a component.** ADR 0018 made
 * the pack a network dependency and `src/packs/pack-loader.ts` awaits it at
 * module scope, on purpose. A rejected top-level `await` fails the whole module
 * graph: `main.tsx` never evaluates, so React never mounts, so an error
 * boundary — or any module that imports the pack, or anything that imports
 * *them* — is exactly the code that is not running when it is needed. The only
 * code guaranteed to run is code that is not in that graph. This script is not
 * in it, the markup it reveals is static in `index.html`, and the styles are
 * inline in `<head>` for the same reason the boot frame's are: they have to
 * paint from the markup alone.
 *
 * It is a generated string rather than a module because a module is a request,
 * and a reader whose pack fetch just failed is exactly the reader whose next
 * request will fail too.
 *
 * **This file imports only `content-bundle.ts`, which imports nothing** — both
 * are compiled by `tsconfig.app.json` and `tsconfig.node.json`, and the script
 * this one emits runs before any bundle does.
 */
import { VIEW_SLOTS } from './content-bundle.js';

/**
 * The three faces, which are the three ways this can go wrong.
 *
 * - `missing` — the server answered and said no (4xx). The era named is not
 *   where the page expects it; the atlas is the way out.
 * - `offline` — no answer at all, or the server itself failed (5xx). The link
 *   is fine and the connection is not; trying again is the way out.
 * - `invalid` — something arrived and the app could not build a campaign from
 *   it: unreadable JSON here, or the schema rejecting it in `seed.ts` later.
 *
 * Each name is a `data-failure` block in `index.html`; adding a fourth means
 * adding a block there and a branch here, and nothing else.
 */
export type PackFailure = 'missing' | 'offline' | 'invalid';

/** The ids the markup in `index.html` carries, named once so both sides agree. */
export const BOOT_FRAME_ID = 'boot-frame';
export const BOOT_FAILURE_ID = 'boot-failure';
export const BOOT_NOTE_ID = 'boot-note';

/** What the boot frame says while the atlas — which fetches no era — comes up. */
export const BOOT_NOTE_ATLAS = 'Opening the atlas…';

/**
 * The inline `<head>` script.
 *
 * On the campaign entry (`branching`) it first asks the question ADR 0024 puts
 * at `/`: does this URL name a view? If it does not, the page is the atlas —
 * there is no era to fetch, so the script does nothing but correct the boot
 * frame's line and get out of the way. `src/main.tsx` asks the same question of
 * the same list (`VIEW_SLOTS`) to decide which app to mount, so the fetch the
 * `<head>` starts and the app the module graph brings up cannot disagree.
 *
 * The rest is ADR 0018's original hook: resolve the era, start
 * the fetch, park the promise on `window.__sandtablePack` so the loader awaits
 * the request the browser has already made rather than issuing a second one.
 * The resolution has to agree with `resolvePackUrl` in `content-bundle.ts` —
 * `boot-script.test.ts` is what holds those two together, and ADR 0009's
 * amendment is why an id the build never emitted resolves to the seed era
 * instead of to a 404.
 *
 * The rest is the face. `f(kind)` hides the boot frame, unhides one
 * `data-failure` block, wires the retry buttons and moves focus onto the
 * alert. It is idempotent, and it returns without doing anything when
 * `#boot-failure` is gone — which is precisely the case where React has
 * committed and the app is up, so a late unhandled rejection from the map
 * cannot put an error page over a working campaign.
 *
 * Two listeners cover what the fetch itself cannot see. A pack that arrives
 * and is then rejected by the schema throws inside `seed.ts`, at module scope,
 * which surfaces as an unhandled rejection (top-level `await`) or an error
 * event; either one, while the boot frame is still on screen, means the app
 * never got up, and `invalid` is the honest name for that.
 */
export const bootScript = (
  urls: Record<string, string>,
  fallback: string,
  branching = false,
): string =>
  [
    `(function(){`,
    `var U=${JSON.stringify(urls)},D=${JSON.stringify(fallback)};`,
    `var q=new URLSearchParams(location.search);`,
    // The homepage branch (ADR 0024). A URL that fills no slot of the contract
    // names no view, so this page is the atlas: there is no era to fetch, and
    // saying "laying out the campaign" at a reader who has not chosen one is a
    // small lie the boot frame does not need to tell. Only the campaign entry
    // branches — the gallery is one page with one era and always wants it.
    ...(branching
      ? [
          `var S=${JSON.stringify([...VIEW_SLOTS])},v=0,j;`,
          `for(j=0;j<S.length;j++)if(q.get(S[j]))v=1;`,
          `if(!v){var n=document.getElementById(${JSON.stringify(BOOT_NOTE_ID)});`,
          `if(n)n.textContent=${JSON.stringify(BOOT_NOTE_ATLAS)};return}`,
        ]
      : []),
    `var w=q.get("pack");`,
    `var u=(w&&U[w])||U[D]||"";window.__sandtablePackUrl=u;`,
    `var s=0;function f(k){`,
    `if(s)return;var b=document.getElementById(${JSON.stringify(BOOT_FAILURE_ID)});if(!b)return;s=1;`,
    `var l=document.getElementById(${JSON.stringify(BOOT_FRAME_ID)});if(l)l.hidden=true;`,
    `var c=b.querySelector('[data-failure="'+k+'"]');if(c)c.hidden=false;`,
    `var r=b.querySelectorAll("[data-retry]");`,
    `for(var i=0;i<r.length;i++)r[i].onclick=function(){location.reload()};`,
    `b.hidden=false;b.focus()}`,
    `window.__sandtablePackFailure=f;`,
    `var p=fetch(u).then(function(r){`,
    `if(!r.ok){var e=new Error("Sandtable: pack "+u+" answered "+r.status+" "+r.statusText);`,
    `e.face=r.status<500?"missing":"offline";throw e}`,
    `return r.json().catch(function(){`,
    `var e=new Error("Sandtable: pack "+u+" did not arrive as readable JSON");`,
    `e.face="invalid";throw e})});`,
    `p.catch(function(e){f((e&&e.face)||"offline")});window.__sandtablePack=p;`,
    `addEventListener("unhandledrejection",function(){f("invalid")});`,
    `addEventListener("error",function(){f("invalid")});`,
    `})()`,
  ].join('');
