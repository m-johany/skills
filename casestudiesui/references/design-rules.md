# Design rules

The fixed rules of every case-study page. [`template/page.html`](../template/page.html) already meets them, so the build output meets them too; they govern any change to the template or to a built page, and [quality-checks.md](quality-checks.md) tests the checkable ones.

## Character

Restrained and polished. The client's screenshots and words carry the page; the page frames them in the client's own palette and fonts and adds nothing that competes with them.

- **Motion**: at most a short fade-in as sections scroll into view, plain hover states (a border or background colour change), and the chat demo's Play/Replay sequence. Every other effect stays out: parallax, tilt, looping or decorative animation, glows, gradients behind content.
- **Screenshots**: flat frames with a plain window bar, a 1px border and a soft shadow, shown straight on at their own aspect ratio.
- **Chat demo**: fully readable at rest. A single Play button runs the sequence once and then reads Replay.
- **Type**: the palette's text colour on its background; one accent phrase per headline at most.

## Layout

- Responsive from 360px to 1440px and wider, with a 16px side gutter on phones.
- No horizontal page scroll at any width. A wide annotated screenshot may scroll sideways inside its own frame on phones, with a visible hint.

## Accessibility

- Text contrast meets WCAG AA: 4.5:1 for body text, 3:1 for large text and the focus ring. The build's token step enforces it ([tokens.md](tokens.md)).
- Keyboard focus is always visible, and a skip link leads to the main content.
- Semantic HTML: one `h1`, headings in order, landmarks (`header`, `nav`, `main`, `footer`), lists for lists, real buttons.
- Every content image has alt text describing what it shows, plus `width` and `height` attributes; images below the fold load lazily.
- `prefers-reduced-motion: reduce` turns off the fade-ins and the chat sequence, and shows everything at once.
- With JavaScript disabled, every section and every chat message is visible and readable.

## Self-contained

One HTML file with inline CSS and JS. Screenshots, fonts, icons and the favicon are embedded as data, so the page makes no third-party request and loads nothing beside itself. Fonts are the system stack unless the content file embeds the client's.
