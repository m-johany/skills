# Agent Skills

A collection of production-grade skills for AI coding agents ([Pi](https://github.com/earendil-works/pi-coding-agent), [Claude Code](https://github.com/anthropics/claude-code), Cursor, OpenCode, and others).

Each skill gives your AI agents deep domain expertise, strict conventions, and access to implementation references.

---

## Available Skills

| Skill | Description | Invocation |
| :--- | :--- | :--- |
| [`alignui`](./alignui) | Build, compose, and style React components with the [AlignUI](https://alignui.com) design system, semantic tokens, and Tailwind CSS. | `/alignui` |

---

## Quick Install

You can install skills globally (accessible across all projects) or locally inside a specific project repository.

### Option 1: One-Line Install (`alignui`)

#### Global (All Projects)
Clone or symlink the `alignui` skill into your agent harness's global skills directory:

**For Pi:**
```bash
# macOS / Linux / WSL
mkdir -p ~/.pi/agent/skills
git clone https://github.com/m-johany/skills.git /tmp/m-johany-skills && \
  cp -r /tmp/m-johany-skills/alignui ~/.pi/agent/skills/ && \
  rm -rf /tmp/m-johany-skills

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$HOME\.pi\agent\skills"
git clone https://github.com/m-johany/skills.git "$env:TEMP\m-johany-skills"
Copy-Item -Recurse "$env:TEMP\m-johany-skills\alignui" "$HOME\.pi\agent\skills\"
Remove-Item -Recurse -Force "$env:TEMP\m-johany-skills"
```

**For Claude Code:**
```bash
mkdir -p ~/.claude/skills
git clone https://github.com/m-johany/skills.git /tmp/m-johany-skills && \
  cp -r /tmp/m-johany-skills/alignui ~/.claude/skills/ && \
  rm -rf /tmp/m-johany-skills
```

---

#### Project-Local (Current Repository Only)
Place the skill into your project's `.agents/skills` folder:

```bash
# Inside your project root:
mkdir -p .agents/skills
git clone https://github.com/m-johany/skills.git /tmp/m-johany-skills && \
  cp -r /tmp/m-johany-skills/alignui .agents/skills/ && \
  rm -rf /tmp/m-johany-skills
```

---

### Option 2: Clone the Entire Skills Collection

If you want to track all skills and keep them updated with `git pull`:

```bash
# In your agent skills directory (e.g. ~/.agents/skills or ~/.pi/agent/skills):
git clone https://github.com/m-johany/skills.git m-johany
```

---

## How to Use

Once installed, your agent can use the skill in two ways:

### 1. Manual Invocation (`/alignui`)
Type the slash command in your chat session:
```text
/alignui create a settings dialog with form controls
```

### 2. Autonomous Triggering
Because the skill includes a model-facing description, your agent will automatically reach for it when you ask relevant prompts, for example:
```text
"Build a user profile card using AlignUI and Tailwind CSS"
"Add an AlignUI button with an icon"
"Set up AlignUI design tokens and utilities in this Next.js app"
```

---

## Repository Structure

```
skills/
├── README.md               # Collection overview & install instructions
└── alignui/                # AlignUI Skill
    ├── SKILL.md            # Primary agent contract & design system guide
    └── alignui-docs/       # Complete pre-scraped documentation & component specs
        ├── foundation/     # Color tokens & typography rules
        ├── utils/          # cn, tv, polymorphic, and recursiveCloneChildren
        └── ui/             # 47 raw component TypeScript source specs
```
