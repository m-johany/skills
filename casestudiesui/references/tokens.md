# Colour tokens

`node scripts/build.mjs <content.md> --tokens` prints every token per theme. This file says where each is used and how the contrast adjustment works, so you can explain the result to the user.

## From palette to tokens

| Token | Built from | Used for |
| :--- | :--- | :--- |
| `--bg` | `background` | Page background, header |
| `--surface` | `surface` | Cards, screenshot frames, bot messages |
| `--tint` | background with a touch of accent | Alternate section bands |
| `--line`, `--line-strong` | background mixed with text | Borders, frame dots, outline buttons |
| `--frame-bar` | surface mixed with text | Screenshot window bar |
| `--chat-bg` | background with a touch of accent | Chat pane background |
| `--text` | `text` | Body text and headings |
| `--muted` | `muted`, or text faded toward background | Secondary text: summaries, captions, step notes |
| `--accent-text` | `accent` | Eyebrows, small labels, capability icons |
| `--accent-large` | `accent` | Accent words in large headings, focus ring, hover borders |
| `--accent-soft` | surface with some accent | User chat messages, capability icon tiles |
| `--fill`, `--on-fill` | `accent`, with white or dark text | Primary button, monogram, active step numbers |
| `--strong`, `--on-strong` | `strong` (default: text in light themes, a raised surface in dark), with white or dark text | Chat header, flow markers, pins, hero ticks |

## The contrast adjustment

The page keeps the client's colours wherever they are readable and changes only what fails. Each pair below is measured with the WCAG 2 contrast ratio:

- Body text, secondary text and accent text need **4.5:1** on every ground they sit on (page background, card surface, tinted band, and the chat background, frame bar or accent tint where they appear).
- The accent in large headings and the focus ring need **3:1** on the page grounds.
- The button and strong fills need **4.5:1** with the text on them: the build picks white or the palette's dark colour, whichever reads better, and keeps the fill unchanged when either passes.

A colour that misses its threshold moves toward black or white, whichever needs the smaller step, until it passes; hue is kept as far as the mix allows. Only colours the client gave (`text`, `accent`, `muted`, `strong`) are reported; derived shades adjust silently. A dark theme is detected from the background's luminance, so dark palettes move text toward white.

An error saying no shade reaches the threshold means the background sits mid-way between black and white; ask the client for the app's lighter or darker background.

## Reporting the changes

Give every printed adjustment to the user in plain words: which colour, where it shows, old and new value, and why. For example: "Your marigold accent (#e0a526) is too light to read as small text on the page, so eyebrows and labels use a darker marigold, #8b6618 (4.56:1, where AA needs 4.5:1). Buttons keep #e0a526 with dark text."
