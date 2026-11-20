# Content file format

One Markdown file per case study: YAML frontmatter for the page settings and hero, then `##` body sections. Start from [`template/content-blank.md`](../template/content-blank.md); [`examples/quillmoor/content.md`](../examples/quillmoor/content.md) is a filled one. File paths in it are relative to the content file. `node scripts/build.mjs <content.md> --check` validates it and names each problem by field or line.

## Frontmatter

| Field | Required | Value |
| :--- | :--- | :--- |
| `title` | yes | Product name, as the app writes it. Header, footer and `<title>`. |
| `category` | no | A few words shown as "Case study · *category*" above the headline. |
| `tagline` | yes | Hero headline. Wrap the accent phrase in `*asterisks*`. |
| `summary` | yes | One or two sentences on what the app is and does. Also the meta description. |
| `highlights` | no | Up to three short list items, shown as ticks under the summary. |
| `hero.image` | yes | Screenshot for the hero frame. PNG, JPEG, WebP, GIF or SVG. |
| `hero.alt` | yes | What the screenshot shows, for screen readers. |
| `hero.caption` | no | Line under the frame. Say "Demo data." when it shows demo data. |
| `hero.tab` | no | Label in the frame's tab, such as the screen's name. |
| `logo` | no | Square mark (SVG or PNG) beside the name. Blank gives a monogram of the title's first letter. |
| `palette.light`, `palette.dark` | per theme | Colour blocks, below. |
| `theme` | yes | `light`, `dark` or `auto` (follows the visitor's system setting). |
| `fonts` | yes | `system` or `embedded`, below. |
| `font-body`, `font-heading` | when embedded | Font files, below. |
| `mention-build-tooling` | no | `false` (the default) or `true`. |
| `build-tooling-note` | when tooling is true | The one sentence about how the app was built, worded and confirmed by the user. Shown in the footer. |
| `footer-note` | yes | The footer line that labels the demo data, e.g. "Screens use demo data." |
| `lang` | no | Page language tag, default `en`. |

### Palette

Each block holds hex colours (`#1f2a24` or `#123`) taken from the app:

- `background`: the app's page background. Required.
- `surface`: its cards and panels. Required.
- `text`: its body text. Required.
- `accent`: its brand or primary-action colour. Required.
- `muted`: its secondary text. Optional; derived from text and background when blank.
- `strong`: a deep brand colour for the chat header, step markers and pins. Optional; defaults to the text colour in a light theme and a raised surface in a dark one.

`theme: light` needs `palette.light`, `theme: dark` needs `palette.dark`, and `theme: auto` needs both. [tokens.md](tokens.md) covers what the build derives from them.

### Fonts

`fonts: system` uses the visitor's system UI font throughout. `fonts: embedded` embeds the client's font files in the page as data, so the page still makes no outside request:

```yaml
fonts: embedded
font-body: fonts/Brand-Variable.woff2          # a variable font covers every weight
font-heading:                                  # optional; headings use the body font without it
  - fonts/BrandDisplay-Bold.woff2 700          # or one line per file: path, weight, optional "italic"
```

Accepted files are `.woff2`, `.woff`, `.ttf` and `.otf`; paths take no spaces. Use files the client licenses for web embedding, preferring WOFF2 for size.

## Body

The body is a run of `##` sections, rendered in the order written, except that Problem always follows the hero and Closing always comes last. Each section kind, what it needs and its exact syntax are in [sections.md](sections.md). Shared rules:

- A section starts with `## Kind` or `## Kind: Heading`. An item inside it starts with `### Kind: Title` (or `### Title` where the section has one item kind).
- Field lines (`key: value`, lowercase key) come first, straight under the heading. The first other line starts the prose. An unknown key is an error, which catches typos.
- Prose is plain paragraphs. Inline markup: `*accent*` (the accent colour in headings and the closing line, italic elsewhere), `**bold**`, `` `code` ``.
- `<!-- comments -->` are ignored, and any `<placeholder>` left in the file is an error.
