/**
 * What `/` is (ADR 0024).
 *
 * One address, two pages: a URL that names a view opens that view of that
 * campaign; a URL that names none — a bare `/` — opens the atlas. The
 * question is asked once, by `namesAView` over the slots of the URL contract,
 * and it is asked in two places that must agree: here, and in the boot script
 * inlined into `<head>` (`src/packs/boot-script.ts`), which uses the answer to
 * decide whether to start the era fetch at all. `boot-script.test.ts` holds them
 * against each other: it walks both answers on both sides.
 *
 * **Both branches are dynamic imports, and the campaign one has to be.**
 * `src/packs/pack-loader.ts` awaits the content bundle at module scope
 * (ADR 0018), so anything that imports the campaign — however indirectly —
 * suspends until an era has been fetched. A static import here would mean the
 * atlas waited on a request it never wanted, which is the whole thing this
 * record is undoing. The atlas is dynamic for symmetry and for one chunk
 * boundary rather than two.
 *
 * The stylesheets are static, and that is not an oversight: keeping them on
 * this module keeps `<link rel="stylesheet">` in `index.html` where the
 * browser's preload scanner sees it, so neither page waits a round trip for
 * its own paint. They are the two both pages share.
 */
import { namesAView } from './packs/content-bundle.js';
import './styles/tokens.css';
import './styles/global.css';

if (namesAView(window.location.search)) {
  await import('./campaign-main.js');
} else {
  const { mountAtlas } = await import('./atlas/mount.js');
  mountAtlas();
}
