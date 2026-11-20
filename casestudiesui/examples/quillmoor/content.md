---
title: Quillmoor
category: Tool library
tagline: Borrow the tool, *skip the sign-out sheet.*
summary: Quillmoor is a placeholder app for neighbourhood tool libraries. Members reserve tools by text or from the shelf, volunteers hand them over at the shed, and everyone can see what is in and what is out.
highlights:
  - Reserve by text
  - Pick-up windows
  - Waitlists for tools on loan
hero:
  image: screens/shelf.png
  alt: Quillmoor shelf screen showing tool cards in a grid, each with a status of Available, On loan with a return day, or Waitlist, and a Reserve button on available tools
  caption: The shelf, with each tool's status. Placeholder screen, demo data.
  tab: Shelf
palette:
  light:
    background: "#f6f4ee"
    surface: "#ffffff"
    text: "#1f2a24"
    accent: "#e0a526"
    muted: ""
    strong: "#2d4a3e"
  dark:
    background: "#131a16"
    surface: "#1c2520"
    text: "#e7ece8"
    accent: "#f0b93a"
    muted: ""
    strong: "#3f6b58"
theme: auto
fonts: system
mention-build-tooling: false
build-tooling-note: ""
footer-note: Placeholder example. Quillmoor is a fictional app; its screens are generated placeholders with demo data.
---

## Problem

A paper sign-out sheet only tells you what is on the shelf if you are standing next to it.

## Chat: Reserve a tool *by text*
nav: Text
eyebrow: Reserve by text
note: Illustrative conversation using the placeholder app's reply text.

Members text the library the way they would text a neighbour. Volunteers get each pick-up by text too.

### Pane: Member
bot: Quillmoor

### Pane: Volunteer
bot: Quillmoor

### Step: Ask in plain words
The reply names the tool, the pick-up window and the place.

- Member > user: can I borrow the hedge trimmer on saturday?
- Member > bot: **Reserved: Hedge trimmer**
  Sat 14 Mar · pick-up 10:00–12:00
  Elm Street shed

  Reply CANCEL to cancel.

### Step: A volunteer gets the pick-up
It arrives with a button to mark the tool ready.

- Volunteer > bot: **New pick-up**
  Hedge trimmer for Rowan P.
  Sat 14 Mar · 10:00–12:00
- Volunteer > buttons: Ready | Not available

### Step: Out on loan? Join the waitlist
Ask for a tool that is out, and the reply offers the waitlist.

- Member > user: and the tile cutter?
- Member > bot: The tile cutter is out until Thu 12 Mar. Reply WAIT to join the waitlist.

## Flow: From the shelf to the shed *and back*
nav: Loans
eyebrow: Lend

A loan goes from the shelf, to the shed, and back.

### Step: Reserve
label: Member
icon: chat
Members reserve by text, or with the Reserve button on the shelf.

### Step: Pick up
label: Volunteer
icon: place
A volunteer marks the tool ready, and the member collects it from the shed in their pick-up window.

### Step: Return
label: Volunteer
icon: repeat
The member brings it back, and the tool's page keeps its condition notes and recent loans.

## Screens: Everything about a tool *on one page*
nav: Tools
eyebrow: Each tool
image: screens/tool.png
alt: Quillmoor page for a tile cutter, showing status On loan, due back Thursday 12 March, pick-up at Elm Street shed, a waitlist of two members with a Join waitlist button, condition notes and recent loans
caption: A tool page. Placeholder screen, demo data.
tab: Tile cutter

A member or volunteer opens a tool to see where it is and who is next.

### Callout: Status and due date
pin: 78%, 28%
Whether the tool is in, and when a loan is due back.

### Callout: Waitlist
pin: 70%, 43.5%
Members queue for a tool that is out, in the order they joined.

### Callout: Condition notes
pin: 32%, 72.8%
Wear and safety notes travel with the tool.

### Callout: Pick-up place
pin: 86%, 38%
Where to collect the tool.

## Capabilities: What it can do
nav: Capabilities

From the first text to the tool's return.

### Text reservations
icon: chat
Reserve, cancel or join a waitlist by text message.

### The shelf at a glance
icon: grid
Every tool with its status: available, on loan, or waitlisted.

### Waitlists
icon: users
Members queue for a tool that is out.

### Pick-up windows
icon: calendar
Each reservation comes with a pick-up time and place.

### Condition notes
icon: doc
Each tool's page keeps notes on wear and safety.

### Volunteer pick-ups
icon: check
Volunteers get each pick-up by text and mark it ready.

## Closing

Text to reserve. Pick up at the shed. *See the whole shelf.*
