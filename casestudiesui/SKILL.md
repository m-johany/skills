---
name: casestudiesui
description: Case-study web page for a client's app, built as one self-contained HTML file in the app's own palette from a confirmed Markdown content file and screenshots. Use when a user wants a case-study page for an app, or has confirmed a case study's details and resources and asks for its page.
---

# Case-study page

Builds one self-contained HTML page from one Markdown content file: a sticky header, a hero with a framed app screenshot, the sections the content's resources support, a closing line and a demo-data footer. The page wears the client app's palette, theme and fonts, and stays restrained: the app's screens carry it.

Paths are relative to this skill's folder. The scripts need Node 18+; the checks also need Playwright with Chromium. [`examples/quillmoor/`](examples/quillmoor/) holds a filled content file, its claims ledger and the built page for a fictional app.

## Workflow

### 1. Confirmation gate

Build only after the user confirms each item below. Show them what you have for every item and ask.

- **Content**: every required field in [content-format.md](references/content-format.md) filled, and each optional field filled or deliberately left out.
- **Screenshots**: image files present, captured with Playwright ([screenshot-capture.md](references/screenshot-capture.md)) or supplied by the client, showing demo data.
- **Palette**: background, surface, text and accent (muted and strong optional), taken from the app, for each theme the page uses.
- **Theme**: light, dark or auto. Auto needs both palettes and matches the app's own dark mode.
- **Fonts**: the system stack, or font files the client licenses for web embedding.
- **Build tooling**: `mention-build-tooling: false` by default; true only with the exact sentence the user confirms.

Done when the user has confirmed every item in words. Anything missing goes back to them as a named list, and the run waits for it.

### 2. Write or validate the content file

Write the content file from the confirmed details, starting from [`template/content-blank.md`](template/content-blank.md), or take the user's. Choose sections by [sections.md](references/sections.md). Hold every line to the honesty rules below, and record each claim in the claims ledger. Then run:

```bash
node scripts/build.mjs <content.md> --check
```

Done when it exits 0, every warning it printed is fixed or kept with a ledger row, and every claim on the page has a ledger row.

### 3. Derive the colour tokens

```bash
node scripts/build.mjs <content.md> --tokens
```

It derives the page's colours from the palette and shifts any text colour that misses WCAG AA toward black or white until it passes, printing each change. [tokens.md](references/tokens.md) says where each token is used.

Done when you hold the adjustments in plain words for the report (which colour, where it is used, old and new value, why), or know there are none.

### 4. Build the page

```bash
node scripts/build.mjs <content.md> --out <page.html>
```

It renders [`template/page.html`](template/page.html) with the content and tokens and embeds the screenshots, fonts and icons, so the page is one file that requests nothing else. Any change to the template or a built page follows [design-rules.md](references/design-rules.md).

Done when the build exits 0 and the page file exists.

### 5. Run the quality checks

```bash
node scripts/check.mjs <page.html> --out <screenshot dir outside the client's repo>
```

Then open every screenshot it lists. [quality-checks.md](references/quality-checks.md) covers locating Playwright, what each check means and what to look for in the screenshots.

Done when the check exits 0, you have viewed every screenshot and found no visual fault, and the built page still meets the honesty rules. A fix goes into the content file or template, then rebuild and re-check; it counts only after a clean re-run.

### 6. Report

Give the user:

- the page's path and size;
- the sections included, and each section left out with the resource it lacked;
- the colour adjustments from step 3;
- each claim dropped or reworded because the app contradicted it, with what the app shows;
- the check result and the screenshot paths.

## Honesty rules

1. Check every capability and behaviour claim against the app itself (its running screens, its data or its code) before writing it.
2. Word each claim for the surface where it is true: a warning shown only on a web timeline is described on the timeline, not as appearing in chat.
3. Figures and social proof (usage, adoption, durations, user counts, results, percentages, time saved, customers, testimonials, logos) come only from the client with a source; otherwise the page leaves them out.
4. Label demo data as demo data, in the footer note and the screenshot captions. Label an illustrative conversation as illustrative, and give the bot the product's real reply text, verbatim.
5. When the app's own data contradicts a claim the user wants, tell the user what the app shows, then drop or reword the claim.
6. The page is silent on how the app was built unless `mention-build-tooling` is true, and then carries only the user's confirmed sentence. No wording claims anything was hand-coded; the build stops on it.

The **claims ledger** makes these checkable: a `claims.md` beside the content file with one table row per claim on the page, giving the claim, the surface it is true on, and the evidence (a screen, a route, a file, a reply string). The build's warnings flag figures and tooling wording; the ledger covers every other claim.
