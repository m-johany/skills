# Quality checks

```bash
node scripts/check.mjs <page.html> --out <screenshot dir>
```

The script serves the page's folder on `127.0.0.1` (a static server, so the page loads over HTTP as it will in production), opens it in Chromium with Playwright, prints one line per check group with each problem under it, and lists the screenshots. Exit code 0 means every group passed. Keep the screenshot folder outside the client's repository.

## Locating Playwright

The script tries, in order:

1. `PLAYWRIGHT_MODULE`, a path to Playwright's `index.mjs`;
2. `playwright` resolved from the script's folder (a local install);
3. `playwright/index.mjs` under the global npm root (`npm root -g`). With a global prefix of `~/.local`, for example, that is `/home/ubuntu/.local/lib/node_modules/playwright/index.mjs`.

Without Playwright: `npm i -g playwright && npx playwright install chromium`. If Chromium itself is missing, Playwright's launch error names the install command.

## What it checks

| Group | Passes when |
| :--- | :--- |
| `desktop-1440`, `mobile-390` | Full-page screenshot taken after scrolling through (so every fade-in has run). No horizontal scroll (`scrollWidth` equals the viewport width). Every image has `alt`, `width` and `height`; screenshots have non-empty alt; images below the fold are `loading="lazy"`; one `h1`; headings in order; links and buttons named; no external resource tags. At 1440px, the first Tab shows a visible focus outline, and the chat demo's Play button runs the whole conversation and then reads Replay. |
| `widths 360–1920` | No horizontal page scroll at 360, 390, 768, 1024, 1280, 1440 and 1920px. |
| `reduced-motion-1440` (and `-dark`) | With reduced motion emulated, every element is visible without scrolling and the Play button is hidden; every visible text element meets WCAG AA against its background (4.5:1, or 3:1 for large text). The dark run appears when the page has a dark theme. |
| `no-js-1440` | With JavaScript disabled, every section and chat message is visible. |

Every group also fails on a console error, a page error, a request to another origin, or a request for any file beside the page itself.

## Looking at the screenshots

Open each screenshot the script lists and look for what the script cannot see:

- text overlapping, clipped or wrapping one word to a line; a headline that breaks badly;
- an empty or half-filled section, or a section whose resources were missing;
- pins sitting on the wrong feature or covering its text;
- a screenshot that is blurry, cut off, or shows real names or data;
- the client's palette and fonts actually applied, in each theme;
- anything that reads as decoration competing with the screens ([design-rules.md](design-rules.md)).

## Fixing

Fix in the content file, or in `template/page.html` for a layout fault, then rebuild and run the check again. A check counts as passed only on a clean re-run after the last change. Common causes:

- **Horizontal scroll**: a template edit that set a fixed width or removed a `min-width: 0` from a grid child.
- **Contrast**: a template edit that used a colour outside the tokens; the token step covers the palette itself.
- **Extra request**: an image or font referenced by path instead of embedded; build again from the content file.
- **Play button**: a hand edit to the chat markup or its `data-sequence`; rebuild from the content file.
