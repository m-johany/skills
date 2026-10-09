# AlignUI Skill

An AI agent skill for building and styling React components with the [AlignUI Design System](https://alignui.com) and Tailwind CSS.

Compatible with **Pi**, **Claude Code**, **Cursor**, **Codex**, and any harness supporting `SKILL.md`.

---

## What It Gives Your Agent

- **Zero-Guessing Semantic Tokens**: Strict enforcement of AlignUI semantic classes (`bg-bg-white-0`, `text-text-strong-950`, `stroke-soft-200`) instead of raw palette colors.
- **Compound Architecture**: Correct implementations of `Root`, `Icon`, and slot patterns using `tv` (Tailwind Variants) and `@radix-ui/react-slot`.
- **4 Foundation Utilities**: In-file reference for `cn.ts`, `tv.ts`, `polymorphic.ts`, and `recursive-clone-children.tsx`.
- **Complete Component Catalog**: Pre-scraped source code and variant tables for all 47 AlignUI components under `alignui-docs/ui/`.

---

## Installation

### For Pi
```bash
# Global
cp -r alignui ~/.pi/agent/skills/

# Project-Local
cp -r alignui .agents/skills/
```

### For Claude Code
```bash
cp -r alignui ~/.claude/skills/
```

---

## Usage

In your agent chat, type:

```text
/alignui build a login form with email, password, and social buttons
```

Or prompt naturally:
```text
"Create an AlignUI modal dialog with a primary action button"
```
Your agent will automatically load `SKILL.md` and reference `alignui-docs/` to generate exact code matching AlignUI specifications.
