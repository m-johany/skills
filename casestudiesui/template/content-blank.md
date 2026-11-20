---
# Case-study content file. Field rules: references/content-format.md. Sections: references/sections.md.
title:                      # product name, as the app writes it
category:                   # optional: a few words after "Case study ·" in the hero
tagline:                    # hero headline; wrap the accent phrase in *asterisks*
summary:                    # one or two sentences: what the app is and does
highlights:                 # optional: up to three short ticks under the summary
  -
hero:
  image:                    # screenshot path, relative to this file
  alt:                      # what the screenshot shows
  caption:                  # optional; say "Demo data." when it shows demo data
  tab:                      # optional: label in the screenshot frame's tab
logo:                       # optional: square mark (SVG or PNG); blank uses a monogram
palette:
  light:                    # needed when theme is light or auto
    background: ""
    surface: ""
    text: ""
    accent: ""
    muted: ""               # optional
    strong: ""              # optional
  dark:                     # needed when theme is dark or auto
    background: ""
    surface: ""
    text: ""
    accent: ""
    muted: ""
    strong: ""
theme:                      # light, dark or auto
fonts: system               # system, or embedded with font-body (and font-heading)
mention-build-tooling: false
build-tooling-note: ""      # only when mention-build-tooling is true: the confirmed sentence
footer-note: Screens use demo data.
---

<!-- Keep the sections the resources support and delete the rest. Order showcases as you like. -->

## Problem

<!-- One short paragraph. -->

## Chat: <heading, *accent* optional>
nav:
eyebrow:
note: Illustrative conversation using the product's real reply text.

<!-- Intro paragraph. Bot lines are the product's real reply text, verbatim. -->

### Pane: <who is chatting>
bot: <the bot's display name>

### Step: <step title>
<!-- One sentence on the step, then its messages. With two panes, prefix each message "Pane > ". -->

- user: <message>
- bot: <real reply text; indent two spaces to continue it on the next line>

## Flow: <heading>
nav:
eyebrow:

<!-- Intro paragraph. -->

### Step: <title>
label:
icon:
<!-- One sentence. -->

## Screens: <heading>
nav:
eyebrow:
image:
alt:
caption:
tab:

<!-- Intro paragraph. -->

### Callout: <title>
pin:
<!-- One sentence. pin is "x%, y%" on the screenshot, or delete the line. -->

## Capabilities: <heading>
nav:

<!-- Intro paragraph. -->

### <capability>
icon:
<!-- One sentence. -->

## Closing

<!-- One line; wrap the accent phrase in *asterisks*. -->
