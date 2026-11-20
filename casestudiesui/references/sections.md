# Section library

The page is built from the sections below. **A section appears only when its resources exist**: a chat demo only for a real chat flow the product has, an annotated screenshot only with a screenshot, a capability only once checked in the app. When a resource is missing, leave the section out of the content file and name it, with the missing resource, in the report.

The header, hero and footer are always present. The others render in the order written, except that Problem follows the hero and Closing comes last. Showcase sections (Chat, Flow, Screens) are numbered 01, 02, … in their eyebrows, and the sections after the problem alternate between a tinted and a plain band; both happen automatically.

| Section | Shows | Needs |
| :--- | :--- | :--- |
| Hero | Headline, summary, up to three ticks, buttons, framed screenshot | `title`, `tagline`, `summary`, `hero.image`, `hero.alt` (frontmatter) |
| Problem | One large statement of the problem the app solves | A problem the user confirms |
| Chat | A conversation with the product's bot, readable at rest, with Play/Replay | A real chat flow and its real reply text |
| Flow | Numbered steps with icons, beside the section heading | A real sequence in the app |
| Screens | A framed screenshot with numbered pins and callouts | A screenshot |
| Capabilities | A grid of capability cards with icons | Capabilities checked in the app |
| Closing | One large closing line and a Back to top button | A line the user confirms |

`nav: <label>` on Chat, Flow, Screens or Capabilities adds the section to the header nav. `eyebrow:` sets the small label above its heading (default: the nav label), and `id:` sets its anchor (default: from the nav label or heading).

## Problem

```markdown
## Problem
A paper sign-out sheet only tells you what is on the shelf if you are standing next to it.
```

One short paragraph. `## Problem: <label>` replaces the "The problem" label.

## Chat

For apps whose users talk to a bot in a messaging app, by SMS or in an in-app assistant. The whole conversation shows at rest; the Play button replays it message by message, with each step lit in turn. One or two panes, side by side on wide screens.

```markdown
## Chat: Reserve a tool *by text*
nav: Text
eyebrow: Reserve by text
note: Illustrative conversation using the product's real reply text.

Intro paragraph.

### Pane: Member
bot: Quillmoor

### Pane: Volunteer
bot: Quillmoor

### Step: Ask in plain words
One sentence on the step.

- Member > user: can I borrow the hedge trimmer on saturday?
- Member > bot: **Reserved: Hedge trimmer**
  Sat 14 Mar · pick-up 10:00–12:00

  Reply CANCEL to cancel.
- Volunteer > buttons: Ready | Not available
```

- Each pane is one person's view: `bot:` is the bot's display name, and `avatar:` (optional) the letter in its avatar.
- Each step lists its messages in order. Roles are `user`, `bot` and `buttons` (a row of the bot's buttons, split by `|`). With two panes, every message starts with its pane's name and `>`.
- Indent a line two spaces to continue a message; a blank line before the indented line starts a new paragraph.
- `note:` labels the conversation; it defaults to "Illustrative conversation using the product's real reply text."

## Flow

The step flow: for a process the app walks people through, when there is no chat to show.

```markdown
## Flow: From the shelf to the shed *and back*
nav: Loans

Intro paragraph.

### Step: Reserve
label: Member
icon: chat
One sentence.
```

`label:` adds a word after "Step 1 ·"; `icon:` picks from [`template/icons.svg`](../template/icons.svg) (default `check`).

## Screens

The annotated screenshot showcase: one framed screenshot, with optional numbered pins matched to callout cards below it. Use one Screens section per screen.

```markdown
## Screens: Everything about a tool *on one page*
nav: Tools
image: screens/tool.png
alt: Tool page showing status, due date, waitlist and condition notes
caption: A tool page. Demo data.
tab: Tile cutter

Intro paragraph.

### Callout: Waitlist
pin: 70%, 43.5%
One sentence.
```

- `image` and `alt` are required; `caption` should say when the screen shows demo data.
- `pin: x%, y%` places a numbered marker on the screenshot, measured from its top-left corner. Place it beside the feature, not over its text. A callout without `pin:` is a numbered card only.
- With pins, the screenshot scrolls sideways inside its frame on phones so the pins stay legible.

## Capabilities

```markdown
## Capabilities: What it can do
nav: Capabilities

Intro paragraph.

### Waitlists
icon: users
Members queue for a tool that is out.
```

Each card needs a title and one sentence. The grid picks three, four or five columns on wide screens from the count.

## Closing

```markdown
## Closing
Text to reserve. Pick up at the shed. *See the whole shelf.*
```

One line, usually a short recap of the showcases with the last phrase as the accent.
