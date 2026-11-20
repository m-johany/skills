#!/usr/bin/env node
// casestudiesui build: a case-study content file (Markdown) -> one self-contained HTML page.
// Zero dependencies, Node 18+. Run with --help for usage.

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { dirname, resolve, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_PATH = join(SKILL_DIR, "template", "page.html");
const ICONS_PATH = join(SKILL_DIR, "template", "icons.svg");

const USAGE = `Usage: node build.mjs <content.md> [--check | --tokens] [--out <page.html>]

  (no flag)  validate the content file, derive colour tokens, write the page
  --check    validate the content file only
  --tokens   validate, then print every derived colour token
  --out      where to write the page (default: index.html beside the content file)

Exit code 0 means no errors. Warnings still need a decision before you report.`;

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ---------------------------------------------------------------- schema

const META_KEYS = [
  "title", "category", "tagline", "summary", "highlights", "hero", "logo", "palette", "theme",
  "fonts", "font-body", "font-heading", "mention-build-tooling", "build-tooling-note",
  "footer-note", "lang", "labels",
];
const HERO_KEYS = ["image", "alt", "caption", "tab"];
const PALETTE_KEYS = ["background", "surface", "text", "accent", "muted", "strong"];
const PALETTE_REQUIRED = ["background", "surface", "text", "accent"];

const LABEL_DEFAULTS = {
  skip: "Skip to content",
  "case-study": "Case study",
  sections: "Sections",
  highlights: "Highlights",
  problem: "The problem",
  "primary-action": "See how it works",
  "secondary-action": "What it can do",
  capabilities: "Capabilities",
  "chat-steps": "What happens in the conversation",
  play: "Play",
  replay: "Replay",
  buttons: "Buttons",
  step: "Step",
  callouts: "What the numbered markers point to",
  "scroll-hint": "Scroll sideways to see the whole screen.",
  "scroll-region": "Screenshot, scroll sideways to see all of it",
  summary: "Summary",
  "back-to-top": "Back to top",
};

const SECTION_KINDS = ["problem", "chat", "flow", "screens", "capabilities", "closing"];
const SHOWCASE_KINDS = ["chat", "flow", "screens"];
const SECTION_FIELDS = {
  problem: [],
  chat: ["id", "nav", "eyebrow", "note"],
  flow: ["id", "nav", "eyebrow"],
  screens: ["id", "nav", "eyebrow", "image", "alt", "caption", "tab"],
  capabilities: ["id", "nav", "eyebrow"],
  closing: [],
};
const ITEM_FIELDS = {
  chat: { pane: ["bot", "avatar"], step: [] },
  flow: { step: ["label", "icon"] },
  screens: { callout: ["pin"] },
  capabilities: { capability: ["icon"] },
};
const DEFAULT_ITEM = { flow: "step", screens: "callout", capabilities: "capability" };
const DEFAULT_CHAT_NOTE = "Illustrative conversation using the product's real reply text.";

const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ---------------------------------------------------------------- text helpers

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const pad2 = (n) => String(n).padStart(2, "0");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline Markdown: **bold**, *accent* or _accent_, `code`. Everything else is escaped text.
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function plain(s) {
  return String(s)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1$2")
    .replace(/`(.+?)`/g, "$1");
}

// A chat message: blank-line paragraphs become <p>, single newlines become <br>.
function messageHtml(s) {
  const paras = s.split(/\n{2,}/);
  if (paras.length === 1) return paras[0].split("\n").map(inline).join("<br>");
  return paras.map((p) => `<p>${p.split("\n").map(inline).join("<br>")}</p>`).join("");
}

function slug(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ---------------------------------------------------------------- frontmatter

function splitFrontmatter(src) {
  const lines = src.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0].trim() !== "---") {
    err("content file", "must start with a --- frontmatter block");
    return { front: "", body: lines.join("\n"), bodyLine: 1 };
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) {
    err("content file", "the frontmatter has no closing --- line");
    return { front: "", body: "", bodyLine: 1 };
  }
  return { front: lines.slice(1, end).join("\n"), body: lines.slice(end + 1).join("\n"), bodyLine: end + 2 };
}

// A "#" starts a comment only when it stands alone ("# note"), so unquoted colours like #1f2a24 survive.
function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote && line[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      const before = line.slice(0, i).trimEnd();
      if (before === "" || before.endsWith(":") || before.endsWith("-")) quote = c;
      continue;
    }
    if (c === "#" && (i === 0 || /\s/.test(line[i - 1])) && (i + 1 === line.length || /\s/.test(line[i + 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function scalar(raw) {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "~" || s === "null") return "";
  return s;
}

// The YAML subset the content file uses: nested maps, lists of scalars, scalars.
function parseYaml(src) {
  const rows = [];
  src.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 2;
    if (/^\s*\t/.test(raw)) err(`frontmatter line ${line}`, "indent with spaces, not tabs");
    const text = stripComment(raw.replace(/\t/g, "  "));
    if (!text.trim()) return;
    rows.push({ indent: text.match(/^ */)[0].length, text: text.trim(), line });
  });
  let pos = 0;
  const isItem = (t) => t === "-" || t.startsWith("- ");

  function block(indent) {
    if (isItem(rows[pos].text)) {
      const list = [];
      while (pos < rows.length && rows[pos].indent === indent && isItem(rows[pos].text)) {
        list.push(scalar(rows[pos].text.slice(1)));
        pos++;
        while (pos < rows.length && rows[pos].indent > indent) {
          err(`frontmatter line ${rows[pos].line}`, "list items hold one value each; nest nothing under them");
          pos++;
        }
      }
      return list;
    }
    const map = {};
    while (pos < rows.length && rows[pos].indent === indent) {
      const row = rows[pos++];
      const m = row.text.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
      if (!m) {
        err(`frontmatter line ${row.line}`, `expected "key: value", found "${row.text}"`);
        continue;
      }
      if (m[2] !== undefined && m[2] !== "") map[m[1]] = scalar(m[2]);
      else if (pos < rows.length && rows[pos].indent > indent) map[m[1]] = block(rows[pos].indent);
      else map[m[1]] = "";
    }
    return map;
  }

  if (!rows.length) return {};
  const root = block(rows[0].indent);
  if (pos < rows.length) err(`frontmatter line ${rows[pos].line}`, "unexpected indentation");
  return Array.isArray(root) ? {} : root;
}

// ---------------------------------------------------------------- files

function sniffImage(buf, ext) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { mime: "image/png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "GIF") {
    return { mime: "image/gif", w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xff) {
        i += marker === 0xff ? 1 : 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { mime: "image/jpeg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  }
  if (buf.length > 30 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") {
    const chunk = buf.toString("latin1", 12, 16);
    if (chunk === "VP8 ") return { mime: "image/webp", w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { mime: "image/webp", w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { mime: "image/webp", w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    return null;
  }
  const head = buf.toString("utf8", 0, Math.min(buf.length, 4096));
  if (ext === ".svg" || /<svg[\s>]/i.test(head)) {
    const tag = (head.match(/<svg\b[^>]*>/i) || [""])[0];
    const num = (name) => {
      const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']\\s*([\\d.]+)\\s*(px)?\\s*["']`, "i"));
      return m ? parseFloat(m[1]) : null;
    };
    let w = num("width");
    let h = num("height");
    const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
    if ((!w || !h) && vb) {
      w = parseFloat(vb[1]);
      h = parseFloat(vb[2]);
    }
    return w && h ? { mime: "image/svg+xml", w: Math.round(w), h: Math.round(h) } : null;
  }
  return null;
}

function loadImage(where, rel, baseDir) {
  if (typeof rel !== "string" || !rel.trim()) {
    err(where, "needs an image file path");
    return null;
  }
  const file = resolve(baseDir, rel.trim());
  if (!existsSync(file) || !statSync(file).isFile()) {
    err(where, `image not found: ${rel}`);
    return null;
  }
  const buf = readFileSync(file);
  const info = sniffImage(buf, extname(file).toLowerCase());
  if (!info) {
    err(where, `${rel} is not a PNG, JPEG, WebP, GIF or SVG with readable dimensions`);
    return null;
  }
  if (buf.length > 1.5 * 1024 * 1024) warn(where, `${rel} is ${(buf.length / 1048576).toFixed(1)} MB; compress it (WebP or JPEG) to keep the page light`);
  return { ...info, bytes: buf.length, rel, src: `data:${info.mime};base64,${buf.toString("base64")}` };
}

const FONT_MIME = { ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };

function loadFontFaces(where, value, family, baseDir) {
  const entries = Array.isArray(value) ? value : [value];
  const faces = [];
  for (const entry of entries) {
    if (typeof entry !== "string" || !entry.trim()) {
      err(where, "needs a font file path");
      continue;
    }
    const parts = entry.trim().split(/\s+/);
    const rel = parts.shift();
    let weight = "100 900";
    let style = "normal";
    for (const p of parts) {
      if (/^\d{3}$/.test(p)) weight = p;
      else if (/^\d{3}-\d{3}$/.test(p)) weight = p.replace("-", " ");
      else if (p === "italic") style = "italic";
      else err(where, `"${p}" is not a weight (400, 100-900) or "italic"`);
    }
    const file = resolve(baseDir, rel);
    const mime = FONT_MIME[extname(file).toLowerCase()];
    if (!mime) {
      err(where, `${rel}: use a .woff2, .woff, .ttf or .otf file`);
      continue;
    }
    if (!existsSync(file)) {
      err(where, `font not found: ${rel}`);
      continue;
    }
    const data = readFileSync(file).toString("base64");
    const format = { "font/woff2": "woff2", "font/woff": "woff", "font/ttf": "truetype", "font/otf": "opentype" }[mime];
    faces.push(
      `@font-face { font-family: "${family}"; src: url(data:${mime};base64,${data}) format("${format}"); font-weight: ${weight}; font-style: ${style}; font-display: swap; }`,
    );
  }
  return faces;
}

// ---------------------------------------------------------------- frontmatter validation

function str(meta, key, where = key) {
  const v = meta[key];
  if (v === undefined || v === "") return "";
  if (typeof v !== "string") {
    err(where, "must be text");
    return "";
  }
  return v.trim();
}

function required(meta, key, where = key) {
  const v = str(meta, key, where);
  if (!v && !errors.some((e) => e.startsWith(`${where}:`))) err(where, "is empty; fill it in");
  return v;
}

function validateMeta(meta, baseDir) {
  for (const k of Object.keys(meta)) if (!META_KEYS.includes(k)) err(k, `unknown frontmatter field; known fields: ${META_KEYS.join(", ")}`);

  const page = {
    title: required(meta, "title"),
    category: str(meta, "category"),
    tagline: required(meta, "tagline"),
    summary: required(meta, "summary"),
    footerNote: required(meta, "footer-note"),
    lang: str(meta, "lang") || "en",
  };
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/.test(page.lang)) err("lang", `"${page.lang}" is not a language tag such as en or pt-BR`);

  const hl = meta.highlights;
  page.highlights = [];
  if (hl !== undefined && hl !== "") {
    if (!Array.isArray(hl)) err("highlights", "must be a list (- item)");
    else {
      hl.forEach((h, i) => {
        if (typeof h !== "string" || !h.trim()) err(`highlights[${i + 1}]`, "is empty; fill it in or delete the line");
        else page.highlights.push(h.trim());
      });
      if (page.highlights.length > 3) err("highlights", "keep it to three at most");
    }
  }

  const hero = meta.hero;
  if (!hero || typeof hero !== "object" || Array.isArray(hero)) {
    err("hero", "needs image and alt");
    page.hero = {};
  } else {
    for (const k of Object.keys(hero)) if (!HERO_KEYS.includes(k)) err(`hero.${k}`, `unknown field; fields here: ${HERO_KEYS.join(", ")}`);
    page.hero = {
      image: loadImage("hero.image", hero.image, baseDir),
      alt: required(hero, "alt", "hero.alt"),
      caption: str(hero, "caption", "hero.caption"),
      tab: str(hero, "tab", "hero.tab"),
    };
  }

  page.logo = null;
  if (meta.logo) {
    page.logo = loadImage("logo", meta.logo, baseDir);
    if (page.logo && Math.abs(page.logo.w / page.logo.h - 1) > 0.2) warn("logo", "use a square mark; the product name is set beside it as text");
  }

  page.theme = str(meta, "theme");
  if (!["light", "dark", "auto"].includes(page.theme)) err("theme", 'must be "light", "dark" or "auto"');
  const needed = page.theme === "auto" ? ["light", "dark"] : page.theme ? [page.theme] : [];

  page.palette = {};
  const pal = meta.palette;
  if (!pal || typeof pal !== "object" || Array.isArray(pal)) {
    err("palette", 'needs a "light:" and/or "dark:" block of colours');
  } else {
    for (const k of Object.keys(pal)) {
      if (!["light", "dark"].includes(k)) err(`palette.${k}`, 'palette blocks are "light" and "dark"');
      else if (!needed.includes(k) && page.theme) warn(`palette.${k}`, `is ignored because theme is ${page.theme}`);
    }
    for (const t of needed) {
      const block = pal[t];
      if (!block || typeof block !== "object") {
        err(`palette.${t}`, `theme ${page.theme} needs a palette.${t} block`);
        continue;
      }
      const colours = {};
      for (const k of Object.keys(block)) if (!PALETTE_KEYS.includes(k)) err(`palette.${t}.${k}`, `unknown colour; colours: ${PALETTE_KEYS.join(", ")}`);
      for (const k of PALETTE_KEYS) {
        const v = block[k];
        if (v === undefined || v === "") {
          if (PALETTE_REQUIRED.includes(k)) err(`palette.${t}.${k}`, "is empty; fill it in");
          continue;
        }
        if (typeof v !== "string" || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim())) err(`palette.${t}.${k}`, `"${v}" is not a hex colour like #1f2a24`);
        else colours[k] = v.trim().toLowerCase();
      }
      page.palette[t] = colours;
    }
  }

  page.fonts = str(meta, "fonts");
  page.fontCss = "";
  page.fontBody = SYSTEM_STACK;
  page.fontHeading = SYSTEM_STACK;
  if (!["system", "embedded"].includes(page.fonts)) err("fonts", 'must be "system" or "embedded"');
  if (page.fonts === "embedded") {
    if (!meta["font-body"]) err("font-body", "fonts is embedded, so name the body font file");
    else {
      const faces = loadFontFaces("font-body", meta["font-body"], "Case Body", baseDir);
      page.fontBody = `"Case Body", ${SYSTEM_STACK}`;
      page.fontHeading = page.fontBody;
      if (meta["font-heading"]) {
        faces.push(...loadFontFaces("font-heading", meta["font-heading"], "Case Heading", baseDir));
        page.fontHeading = `"Case Heading", ${SYSTEM_STACK}`;
      }
      page.fontCss = faces.join("\n");
    }
  } else if (page.fonts === "system" && (meta["font-body"] || meta["font-heading"])) {
    warn("font-body", 'font files are ignored because fonts is "system"');
  }

  const tooling = meta["mention-build-tooling"];
  if (tooling === undefined || tooling === "") page.mentionTooling = false;
  else if (typeof tooling !== "boolean") {
    err("mention-build-tooling", "must be true or false");
    page.mentionTooling = false;
  } else page.mentionTooling = tooling;
  page.toolingNote = str(meta, "build-tooling-note");
  if (page.mentionTooling && !page.toolingNote) err("build-tooling-note", "mention-build-tooling is true, so write the confirmed sentence here");
  if (!page.mentionTooling && page.toolingNote) {
    warn("build-tooling-note", "is left off the page because mention-build-tooling is false");
    page.toolingNote = "";
  }

  page.labels = {};
  const labels = meta.labels && typeof meta.labels === "object" && !Array.isArray(meta.labels) ? meta.labels : {};
  if (meta.labels && meta.labels !== labels) err("labels", "must be a block of label: text lines");
  for (const k of Object.keys(labels)) if (!(k in LABEL_DEFAULTS)) err(`labels.${k}`, `unknown label; labels: ${Object.keys(LABEL_DEFAULTS).join(", ")}`);
  for (const [k, v] of Object.entries(LABEL_DEFAULTS)) {
    const given = labels[k];
    page.labels[camel(k)] = typeof given === "string" && given.trim() ? given.trim() : v;
  }
  return page;
}

// ---------------------------------------------------------------- body

function parseBody(body, firstLine) {
  // Blank out HTML comments but keep their newlines, so line numbers stay true.
  const clean = body.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
  const sections = [];
  let sec = null;
  let target = null;
  clean.split(/\r?\n/).forEach((text, i) => {
    const line = firstLine + i;
    let m;
    if ((m = text.match(/^##(?!#)\s+(.+?)\s*$/))) {
      const h = m[1].match(/^([A-Za-z]+)\s*(?::\s*(.*))?$/);
      const kind = h && h[1].toLowerCase();
      if (!kind || !SECTION_KINDS.includes(kind)) {
        err(`line ${line}`, `unknown section "## ${m[1]}"; sections: ${SECTION_KINDS.map(cap).join(", ")}`);
        sec = target = null;
        return;
      }
      sec = { kind, title: (h[2] || "").trim(), line, lines: [], items: [] };
      sections.push(sec);
      target = sec;
      return;
    }
    if ((m = text.match(/^###\s+(.+?)\s*$/))) {
      if (!sec) {
        err(`line ${line}`, "### item outside a ## section");
        return;
      }
      const kinds = ITEM_FIELDS[sec.kind];
      if (!kinds) {
        err(`line ${line}`, `"## ${cap(sec.kind)}" takes no ### items`);
        target = null;
        return;
      }
      const h = m[1].match(/^([A-Za-z]+)\s*:\s*(.*)$/);
      let kind = h && kinds[h[1].toLowerCase()] ? h[1].toLowerCase() : null;
      const title = kind ? h[2].trim() : m[1].trim();
      if (!kind) kind = DEFAULT_ITEM[sec.kind];
      if (!kind) {
        err(`line ${line}`, 'in "## Chat" an item is "### Pane: <name>" or "### Step: <title>"');
        target = null;
        return;
      }
      const item = { kind, title, line, lines: [] };
      sec.items.push(item);
      target = item;
      return;
    }
    if (/^#\s/.test(text)) {
      warn(`line ${line}`, "a # heading is not used; the page title comes from the frontmatter");
      return;
    }
    if (!target) {
      if (text.trim()) warn(`line ${line}`, "text outside a ## section is not used");
      return;
    }
    target.lines.push({ text, line });
  });
  return sections;
}

// Leading "key: value" lines are fields; the first other line starts the prose.
function splitBlock(lines, allowed, where) {
  const fields = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const t = lines[i].text;
    if (!t.trim()) continue;
    const m = t.match(/^([a-z][a-z0-9-]{0,23}):(?:\s+(.*))?$/);
    if (!m) break;
    if (!allowed.includes(m[1])) {
      err(`line ${lines[i].line}`, `unknown field "${m[1]}" in ${where}; fields here: ${allowed.join(", ") || "none"}`);
      continue;
    }
    fields[m[1]] = (m[2] || "").trim();
  }
  return { fields, rest: lines.slice(i) };
}

function paragraphs(lines) {
  const out = [];
  let cur = [];
  for (const l of lines) {
    if (!l.text.trim()) {
      if (cur.length) out.push(cur.join(" "));
      cur = [];
    } else cur.push(l.text.trim());
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

function parseMessages(lines) {
  const prose = [];
  const msgs = [];
  let cur = null;
  let blank = false;
  for (const l of lines) {
    const t = l.text;
    const m = t.match(/^[-*]\s+(?:(.+?)\s*>\s*)?(user|bot|buttons)\s*:\s*(.*)$/i);
    if (m) {
      cur = { pane: (m[1] || "").trim(), role: m[2].toLowerCase(), text: m[3].trim(), line: l.line };
      msgs.push(cur);
      blank = false;
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      err(`line ${l.line}`, 'a message reads "- user: …", "- bot: …" or "- buttons: A | B", optionally prefixed "Pane > "');
      cur = null;
      continue;
    }
    if (!t.trim()) {
      if (cur) blank = true;
      continue;
    }
    if (cur && /^\s{2,}\S/.test(t)) {
      cur.text += (blank ? "\n\n" : "\n") + t.trim();
      blank = false;
      continue;
    }
    if (cur) {
      err(`line ${l.line}`, "indent a line two spaces to continue the message above it");
      continue;
    }
    prose.push(l);
  }
  return { prose, msgs };
}

function loadIcons() {
  const svg = readFileSync(ICONS_PATH, "utf8");
  const icons = {};
  for (const m of svg.matchAll(/<symbol\s+id="i-([a-z0-9-]+)"[\s\S]*?<\/symbol>/g)) icons[m[1]] = m[0];
  return icons;
}

function iconName(value, where, icons, used) {
  const name = (value || "check").trim();
  if (!icons[name]) {
    err(where, `unknown icon "${name}"; icons: ${Object.keys(icons).join(", ")}`);
    return "check";
  }
  used.add(name);
  return name;
}

function parsePin(value, where) {
  if (!value) return "";
  const m = value.match(/^\s*([\d.]+)\s*%?\s*,\s*([\d.]+)\s*%?\s*$/);
  const x = m && parseFloat(m[1]);
  const y = m && parseFloat(m[2]);
  if (!m || !(x >= 0 && x <= 100) || !(y >= 0 && y <= 100)) {
    err(where, `pin "${value}" must be "x%, y%" with both between 0 and 100`);
    return "";
  }
  return { x: +x.toFixed(2), y: +y.toFixed(2) };
}

function buildSections(raw, page, baseDir, icons) {
  const L = page.labels;
  const usedIcons = new Set();
  const ids = new Set(["top", "main"]);
  const out = { problem: null, closing: null, sections: [], usedIcons };
  let showcaseN = 0;
  let band = 0;
  let msgN = 0;

  const uniqueId = (wanted, fallback) => {
    let base = slug(wanted) || fallback;
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };

  for (const s of raw) {
    const where = `line ${s.line} (## ${cap(s.kind)})`;
    const { fields, rest } = splitBlock(s.lines, SECTION_FIELDS[s.kind], `## ${cap(s.kind)}`);
    const paras = paragraphs(rest);

    if (s.kind === "problem" || s.kind === "closing") {
      if (out[s.kind]) {
        err(where, `the page has one ${cap(s.kind)} section`);
        continue;
      }
      if (!paras.length) {
        err(where, "is empty; write the text or delete the section");
        continue;
      }
      if (s.kind === "problem") out.problem = { label: s.title || L.problem, paras: paras.map((p) => ({ html: inline(p) })), text: paras.join(" ") };
      else {
        if (s.title) warn(where, `"## Closing" takes no heading; "${s.title}" is not used`);
        out.closing = { html: inline(paras.join(" ")), text: paras.join(" ") };
      }
      continue;
    }

    if (!s.title) err(where, `needs a heading: "## ${cap(s.kind)}: <heading>"`);
    const isShowcase = SHOWCASE_KINDS.includes(s.kind);
    if (isShowcase) showcaseN++;
    const id = uniqueId(fields.id || fields.nav || s.title, `section-${out.sections.length + 1}`);
    const eyebrowText = fields.eyebrow || fields.nav || (s.kind === "capabilities" ? L.capabilities : "");
    const sec = {
      kind: s.kind,
      isChat: s.kind === "chat",
      isFlow: s.kind === "flow",
      isScreens: s.kind === "screens",
      isCapabilities: s.kind === "capabilities",
      id,
      nav: fields.nav || "",
      tinted: band++ % 2 === 0,
      eyebrow: isShowcase ? [pad2(showcaseN), eyebrowText].filter(Boolean).join(" · ") : eyebrowText,
      title: s.title,
      headingHtml: inline(s.title),
      intro: paras.join(" "),
      introHtml: paras.length ? inline(paras.join(" ")) : "",
      texts: [],
    };
    const items = s.items.map((it) => {
      const allowed = ITEM_FIELDS[s.kind][it.kind];
      const split = splitBlock(it.lines, allowed, `### ${cap(it.kind)}`);
      return { ...it, fields: split.fields, rest: split.rest, where: `line ${it.line} (### ${cap(it.kind)})` };
    });

    if (s.kind === "chat") {
      sec.note = fields.note || DEFAULT_CHAT_NOTE;
      const panes = items.filter((it) => it.kind === "pane");
      const steps = items.filter((it) => it.kind === "step");
      if (!panes.length) err(where, 'needs a "### Pane: <who>" with "bot: <bot name>"');
      if (panes.length > 2) err(where, "shows one or two panes");
      sec.panes = panes.map((p, i) => {
        if (!p.title) err(p.where, 'needs a name: "### Pane: <who>"');
        if (!p.fields.bot) err(p.where, 'needs "bot: <the bot\'s display name>"');
        if (paragraphs(p.rest).length) warn(p.where, "text under a pane is not used; put messages under a ### Step");
        const bot = p.fields.bot || "";
        return {
          paneId: `${id}-pane-${i + 1}`,
          label: p.title,
          bot,
          avatar: (p.fields.avatar || bot.trim().charAt(0) || "?").slice(0, 2),
          logLabel: `${p.title}: ${bot}`,
          messages: [],
        };
      });
      if (!steps.length) err(where, 'needs at least one "### Step: <title>" with messages');
      const sequence = [];
      sec.steps = steps.map((st, i) => {
        const { prose, msgs } = parseMessages(st.rest);
        if (!st.title) err(st.where, 'needs a title: "### Step: <title>"');
        if (!msgs.length) err(st.where, 'needs at least one message ("- user: …" or "- bot: …")');
        const text = paragraphs(prose).join(" ");
        for (const m of msgs) {
          let pane = sec.panes.length === 1 ? sec.panes[0] : null;
          if (m.pane) pane = sec.panes.find((p) => p.label.toLowerCase() === m.pane.toLowerCase()) || null;
          if (!pane) {
            err(`line ${m.line}`, m.pane ? `no pane named "${m.pane}"` : 'with two panes, start the message with its pane: "- Pane > bot: …"');
            continue;
          }
          if (!m.text) err(`line ${m.line}`, "the message is empty");
          const seq = `m${++msgN}`;
          const msg = {
            seq,
            isUser: m.role === "user",
            isBot: m.role === "bot",
            isButtons: m.role === "buttons",
            speaker: m.role === "user" ? pane.label : pane.bot,
            html: m.role === "buttons" ? "" : messageHtml(m.text),
            buttons: m.role === "buttons" ? m.text.split("|").map((b) => ({ html: inline(b.trim()) })).filter((b) => b.html) : [],
          };
          pane.messages.push(msg);
          sequence.push({ k: seq, s: i + 1, t: m.role });
          sec.texts.push({ where: `line ${m.line}`, text: m.text, chat: true });
        }
        sec.texts.push({ where: st.where, text: `${st.title} ${text}` });
        return { n: i + 1, nn: pad2(i + 1), titleHtml: inline(st.title), textHtml: text ? inline(text) : "" };
      });
      sec.multiPane = sec.panes.length > 1;
      sec.sequenceJson = JSON.stringify(sequence);
    }

    if (s.kind === "flow") {
      const steps = items;
      if (!steps.length) err(where, 'needs at least one "### Step: <title>"');
      sec.steps = steps.map((st, i) => {
        if (!st.title) err(st.where, "needs a title");
        const text = paragraphs(st.rest).join(" ");
        sec.texts.push({ where: st.where, text: `${st.title} ${text} ${st.fields.label || ""}` });
        return {
          label: [`${L.step} ${i + 1}`, st.fields.label].filter(Boolean).join(" · "),
          titleHtml: inline(st.title),
          textHtml: text ? inline(text) : "",
          icon: iconName(st.fields.icon, st.where, icons, usedIcons),
        };
      });
    }

    if (s.kind === "screens") {
      const img = loadImage(`${where} image`, fields.image, baseDir);
      if (!fields.alt) err(where, 'needs "alt: <what the screenshot shows>"');
      sec.image = img ? { src: img.src, w: img.w, h: img.h, alt: fields.alt || "" } : { src: "", w: 0, h: 0, alt: "" };
      sec.imageBytes = img ? img.bytes : 0;
      sec.caption = fields.caption || "";
      sec.tab = fields.tab || "";
      sec.callouts = items.map((c, i) => {
        if (!c.title) err(c.where, "needs a title");
        const text = paragraphs(c.rest).join(" ");
        sec.texts.push({ where: c.where, text: `${c.title} ${text}` });
        return { n: i + 1, titleHtml: inline(c.title), textHtml: text ? inline(text) : "", pin: parsePin(c.fields.pin, c.where) };
      });
      sec.hasCallouts = sec.callouts.length > 0;
      sec.hasPins = sec.callouts.some((c) => c.pin);
      sec.calloutsLabel = sec.hasPins ? L.callouts : sec.title;
      sec.texts.push({ where: `${where} alt`, text: fields.alt || "", alt: true }, { where: `${where} caption`, text: sec.caption });
    }

    if (s.kind === "capabilities") {
      if (!items.length) err(where, 'needs at least one "### <capability>"');
      sec.items = items.map((c, i) => {
        const text = paragraphs(c.rest).join(" ");
        if (!c.title) err(c.where, "needs a title");
        if (!text) err(c.where, "needs a sentence describing it");
        sec.texts.push({ where: c.where, text: `${c.title} ${text}` });
        return { nn: pad2(i + 1), titleHtml: inline(c.title), textHtml: inline(text), icon: iconName(c.fields.icon, c.where, icons, usedIcons) };
      });
      const n = sec.items.length;
      sec.cols = n <= 4 ? n : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : n % 5 === 0 ? 5 : 3;
    }

    sec.texts.push({ where, text: `${s.title} ${sec.intro} ${fields.eyebrow || ""}` });
    out.sections.push(sec);
  }
  return out;
}

// ---------------------------------------------------------------- honesty lint

const HAND_CODED = /\bhand[\s-]?coded\b|\bcoded by hand\b|\bhand[\s-]?written code\b|\b(?:built|coded|written|programmed|made)\s+(?:entirely\s+)?(?:by hand|from scratch)\b/i;
const HAND_LIKE = /\bhand[\s-]?(?:crafted|built|made|rolled)\b/i;
const TOOLING = /\b(?:built|made|created|developed|coded|generated|designed|written)\s+(?:with|using|in|by)\b|\bpowered by\b|\b(?:no|low)[\s-]code\b|\bAI[\s-](?:built|generated|assisted|written|powered)\b|\b(?:Claude|ChatGPT|GPT-?\d|Copilot|Cursor|Lovable|Bolt|v0|Replit|Bubble|Webflow|Framer)\b/i;
const FIGURE_WORDS = /\b(?:customers?|clients?|users|testimonials?|trusted|rated|ratings?|reviews?|adoption|adopted|saves?|saved|faster|percent|ROI|increased?|reduced?|boost(?:s|ed)?|loved)\b|%/i;

function lintHonesty(page, built) {
  const texts = [
    { where: "title", text: page.title },
    { where: "tagline", text: page.tagline },
    { where: "summary", text: page.summary },
    { where: "category", text: page.category },
    ...page.highlights.map((h, i) => ({ where: `highlights[${i + 1}]`, text: h })),
    { where: "hero.alt", text: page.hero.alt || "", alt: true },
    { where: "hero.caption", text: page.hero.caption || "" },
    { where: "footer-note", text: page.footerNote },
  ];
  if (built.problem) texts.push({ where: "## Problem", text: built.problem.text });
  if (built.closing) texts.push({ where: "## Closing", text: built.closing.text });
  for (const s of built.sections) texts.push(...s.texts);
  const all = page.toolingNote ? [...texts, { where: "build-tooling-note", text: page.toolingNote }] : texts;

  for (const { where, text } of all) {
    if (!text) continue;
    const t = plain(text);
    const hand = t.match(HAND_CODED);
    if (hand) err(where, `"${hand[0]}" claims the app was hand-coded; reword it`);
    else if (HAND_LIKE.test(t)) warn(where, `"${t.match(HAND_LIKE)[0]}" may read as a hand-coding claim; keep it only if it describes the product itself`);
  }
  for (const { where, text, chat, alt } of texts) {
    if (!text) continue;
    const t = plain(text);
    if (!page.mentionTooling) {
      const m = t.match(TOOLING);
      if (m) warn(where, `"${m[0]}" may describe how the app was built; mention-build-tooling is false, so keep it only if it describes what the product does`);
    }
    if (chat || alt) continue;
    const fig = t.match(/\d[\d.,:]*\s*%?|\b(?:dozens|hundreds|thousands|millions)\b/i);
    const word = t.match(FIGURE_WORDS);
    if (fig || word) warn(where, `"${(fig || word)[0].trim()}" is a figure or result claim; keep it only with a claims-ledger row, or remove it`);
  }
}

// ---------------------------------------------------------------- colour tokens

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

function rgbOf(hexStr) {
  let h = hexStr.slice(1);
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const hexOf = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
function lum(c) {
  const [r, g, b] = c.map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const r2 = (n) => (Math.floor(n * 100) / 100).toFixed(2);

// Move fg toward black or white, whichever needs the smaller step, until it reaches min against every background.
function ensure(theme, label, fg, against, min, report = true) {
  const worst = (c) => Math.min(...against.map(([, b]) => ratio(c, b)));
  const before = worst(fg);
  if (before >= min) return fg;
  let best = null;
  for (const pole of [BLACK, WHITE]) {
    for (let step = 1; step <= 100; step++) {
      const c = mix(fg, pole, step / 100);
      if (worst(c) >= min) {
        if (!best || step < best.step) best = { c, step };
        break;
      }
    }
  }
  if (!best) {
    err(`palette.${theme.name}`, `${label}: no shade of ${hexOf(fg)} reaches ${min}:1 against ${against.map(([n]) => n).join(", ")}; choose a lighter or darker background`);
    return fg;
  }
  if (report) {
    const weakest = against.reduce((w, a) => (ratio(fg, a[1]) < ratio(fg, w[1]) ? a : w));
    theme.changes.push(
      `${label}: ${hexOf(fg)} → ${hexOf(best.c)}. It measured ${r2(before)}:1 on the ${weakest[0]}; WCAG AA needs ${min}:1. Now ${r2(worst(best.c))}:1.`,
    );
  }
  return best.c;
}

// A fill colour with text on it: keep the fill when white or dark text reaches 4.5:1, else shift the fill.
function fillPair(theme, label, fill, darkInk) {
  let pick = null;
  for (const ink of [WHITE, darkInk]) {
    const r = ratio(fill, ink);
    if (r >= 4.5 && (!pick || r > pick.r)) pick = { ink, r };
  }
  if (pick) return { fill, on: pick.ink };
  let best = null;
  for (const [ink, pole] of [[WHITE, BLACK], [darkInk, WHITE]]) {
    for (let step = 1; step <= 100; step++) {
      const c = mix(fill, pole, step / 100);
      if (ratio(c, ink) >= 4.5) {
        if (!best || step < best.step) best = { c, ink, step };
        break;
      }
    }
  }
  const before = Math.max(ratio(fill, WHITE), ratio(fill, darkInk));
  theme.changes.push(
    `${label}: ${hexOf(fill)} → ${hexOf(best.c)}. Neither white nor dark text reached 4.5:1 on it (best ${r2(before)}:1). Now ${r2(ratio(best.c, best.ink))}:1 with ${best.ink === WHITE ? "white" : "dark"} text.`,
  );
  return { fill: best.c, on: best.ink };
}

function deriveTheme(name, p) {
  const theme = { name, changes: [] };
  const bg = rgbOf(p.background);
  const surface = rgbOf(p.surface);
  const accent = rgbOf(p.accent);
  const rawText = rgbOf(p.text);
  const dark = lum(bg) < 0.18;
  const tint = mix(bg, accent, dark ? 0.05 : 0.06);
  const frameBar = mix(surface, rawText, dark ? 0.06 : 0.045);
  const chatBg = mix(bg, accent, dark ? 0.03 : 0.045);
  const grounds = [["page background", bg], ["card surface", surface], ["tinted band", tint]];

  const text = ensure(theme, "Body text", rawText, [...grounds, ["chat background", chatBg]], 4.5);
  const muted = ensure(theme, "Secondary text", p.muted ? rgbOf(p.muted) : mix(text, bg, 0.32), [...grounds, ["screenshot frame bar", frameBar]], 4.5, Boolean(p.muted));
  let accentSoftT = dark ? 0.24 : 0.16;
  let accentSoft = mix(surface, accent, accentSoftT);
  while (ratio(text, accentSoft) < 4.5 && accentSoftT > 0) accentSoft = mix(surface, accent, (accentSoftT = Math.max(0, accentSoftT - 0.02)));
  const accentText = ensure(theme, "Accent text (eyebrows, labels, icons)", accent, [...grounds, ["accent tint", accentSoft]], 4.5);
  const accentLarge = ensure(theme, "Accent in large headings and the focus ring", accent, grounds, 3);
  const darkInk = lum(rawText) < lum(bg) ? text : bg;
  const fill = fillPair(theme, "Button colour", accent, darkInk);
  const fillHover = mix(fill.fill, fill.on === WHITE ? BLACK : WHITE, 0.14);
  const strongStart = p.strong ? rgbOf(p.strong) : dark ? mix(surface, text, 0.16) : text;
  const strong = fillPair(theme, "Strong fill (chat header, step markers, pins)", strongStart, darkInk);
  const onStrongSoft = ensure(theme, "", mix(strong.on, strong.fill, 0.22), [["strong fill", strong.fill]], 4.5, false);
  const shadowRgb = dark ? "0, 0, 0" : rawText.join(", ");

  theme.vars = {
    bg: hexOf(bg),
    surface: hexOf(surface),
    tint: hexOf(tint),
    line: hexOf(mix(bg, text, dark ? 0.2 : 0.13)),
    "line-strong": hexOf(mix(bg, text, dark ? 0.4 : 0.32)),
    "frame-bar": hexOf(frameBar),
    "chat-bg": hexOf(chatBg),
    text: hexOf(text),
    muted: hexOf(muted),
    "accent-text": hexOf(accentText),
    "accent-large": hexOf(accentLarge),
    "accent-soft": hexOf(accentSoft),
    fill: hexOf(fill.fill),
    "on-fill": hexOf(fill.on),
    "fill-hover": hexOf(fillHover),
    strong: hexOf(strong.fill),
    "on-strong": hexOf(strong.on),
    "on-strong-soft": hexOf(onStrongSoft),
    shadow: `0 1px 2px rgba(${shadowRgb}, ${dark ? 0.35 : 0.06}), 0 14px 34px -20px rgba(${shadowRgb}, ${dark ? 0.7 : 0.3})`,
  };
  return theme;
}

function tokenCss(page, themes) {
  const block = (t) => `color-scheme: ${t.name}; ` + Object.entries(t.vars).map(([k, v]) => `--${k}: ${v};`).join(" ");
  if (page.theme === "auto") {
    return `:root { ${block(themes.light)} }\n@media (prefers-color-scheme: dark) { :root { ${block(themes.dark)} } }`;
  }
  return `:root { ${block(themes[page.theme])} }`;
}

// ---------------------------------------------------------------- template rendering (Mustache subset)

function renderTemplate(tpl, view) {
  const re = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([#^/]?)\s*([\w.]+)\s*\}\}/g;
  const tokens = [];
  let last = 0;
  for (let m; (m = re.exec(tpl)); ) {
    if (m.index > last) tokens.push({ type: "text", v: tpl.slice(last, m.index) });
    if (m[1]) tokens.push({ type: "raw", name: m[1] });
    else if (m[2] === "#" || m[2] === "^") tokens.push({ type: "open", name: m[3], inverted: m[2] === "^" });
    else if (m[2] === "/") tokens.push({ type: "close", name: m[3] });
    else tokens.push({ type: "var", name: m[3] });
    last = re.lastIndex;
  }
  if (last < tpl.length) tokens.push({ type: "text", v: tpl.slice(last) });

  // A section tag alone on its line takes the line with it.
  tokens.forEach((t, i) => {
    if (t.type !== "open" && t.type !== "close") return;
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const prevOk = !prev || (prev.type === "text" && /(^|\n)[ \t]*$/.test(prev.v));
    const nextOk = !next || (next.type === "text" && /^[ \t]*(\r?\n|$)/.test(next.v));
    if (prevOk && nextOk && (prev || next)) {
      if (prev) prev.v = prev.v.replace(/[ \t]*$/, "");
      if (next) next.v = next.v.replace(/^[ \t]*\r?\n?/, "");
    }
  });

  let i = 0;
  function tree(closing) {
    const nodes = [];
    while (i < tokens.length) {
      const t = tokens[i++];
      if (t.type === "close") {
        if (t.name !== closing) throw new Error(`template: {{/${t.name}}} closes {{#${closing}}}`);
        return nodes;
      }
      if (t.type === "open") nodes.push({ ...t, children: tree(t.name) });
      else nodes.push(t);
    }
    if (closing) throw new Error(`template: {{#${closing}}} is never closed`);
    return nodes;
  }
  const root = tree(null);

  const lookup = (name, stack) => {
    if (name === ".") return stack[stack.length - 1];
    const [head, ...restPath] = name.split(".");
    for (let s = stack.length - 1; s >= 0; s--) {
      const ctx = stack[s];
      if (ctx && typeof ctx === "object" && Object.prototype.hasOwnProperty.call(ctx, head)) {
        return restPath.reduce((v, k) => (v == null ? undefined : v[k]), ctx[head]);
      }
    }
    return undefined;
  };
  const truthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
  const walk = (nodes, stack) =>
    nodes
      .map((n) => {
        if (n.type === "text") return n.v;
        const v = n.type === "open" ? lookup(n.name, stack) : lookup(n.name, stack);
        if (n.type === "raw") return v == null ? "" : String(v);
        if (n.type === "var") return v == null ? "" : esc(v);
        if (n.inverted) return truthy(v) ? "" : walk(n.children, stack);
        if (!truthy(v)) return "";
        if (Array.isArray(v)) return v.map((item) => walk(n.children, [...stack, item])).join("");
        if (typeof v === "object") return walk(n.children, [...stack, v]);
        return walk(n.children, stack);
      })
      .join("");
  return walk(root, [view]);
}

// ---------------------------------------------------------------- view

function monogramSvg(letter, fill, on) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${fill}"/><text x="16" y="22" text-anchor="middle" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="${on}">${esc(letter)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function buildView(page, built, themes, icons) {
  const L = page.labels;
  const main = themes[page.theme === "dark" ? "dark" : "light"];
  const letter = (page.title.trim().charAt(0) || "?").toUpperCase();
  const mark = page.logo
    ? `<img src="${page.logo.src}" width="30" height="30" alt="">`
    : `<span class="mark" aria-hidden="true">${esc(letter)}</span>`;
  const firstShowcase = built.sections.find((s) => SHOWCASE_KINDS.includes(s.kind));
  const capsSection = built.sections.find((s) => s.kind === "capabilities");
  const actions = [];
  if (firstShowcase) actions.push({ primary: true, href: `#${firstShowcase.id}`, label: L.primaryAction, down: true });
  if (capsSection) actions.push({ primary: false, href: `#${capsSection.id}`, label: L.secondaryAction, down: false });
  const symbols = [...built.usedIcons].map((n) => icons[n]).join("");
  const themeColors =
    page.theme === "auto"
      ? [
          { color: themes.light.vars.bg, media: "(prefers-color-scheme: light)" },
          { color: themes.dark.vars.bg, media: "(prefers-color-scheme: dark)" },
        ]
      : [{ color: main.vars.bg, media: "" }];
  return {
    lang: page.lang,
    colorScheme: page.theme === "auto" ? "light dark" : page.theme,
    pageTitle: `${plain(page.title)} · ${L.caseStudy}`,
    title: plain(page.title),
    description: plain(page.summary),
    themeColors,
    favicon: page.logo ? page.logo.src : monogramSvg(letter, main.vars.fill, main.vars["on-fill"]),
    fontFaces: page.fontCss,
    tokens: tokenCss(page, themes),
    fontBody: page.fontBody,
    fontHeading: page.fontHeading,
    iconSprite: symbols ? `<svg class="sprite" aria-hidden="true" focusable="false"><defs>${symbols}</defs></svg>` : "",
    brandMark: mark,
    labels: L,
    nav: built.sections.filter((s) => s.nav).map((s) => ({ href: `#${s.id}`, label: s.nav })),
    hasNav: built.sections.some((s) => s.nav),
    hero: {
      eyebrow: [L.caseStudy, page.category].filter(Boolean).join(" · "),
      taglineHtml: inline(page.tagline),
      summaryHtml: inline(page.summary),
      highlights: page.highlights.map((h) => ({ html: inline(h) })),
      hasHighlights: page.highlights.length > 0,
      actions,
      hasActions: actions.length > 0,
      image: page.hero.image ? { src: page.hero.image.src, w: page.hero.image.w, h: page.hero.image.h } : { src: "", w: 0, h: 0 },
      alt: page.hero.alt || "",
      caption: page.hero.caption || "",
      tab: page.hero.tab || "",
    },
    problem: built.problem,
    sections: built.sections,
    closing: built.closing,
    footerNote: page.footerNote,
    toolingNote: page.mentionTooling ? page.toolingNote : "",
  };
}

// ---------------------------------------------------------------- main

function printIssues() {
  if (errors.length) {
    console.log(`\nErrors (${errors.length}) — fix these in the content file:`);
    for (const e of errors) console.log(`  ✗ ${e}`);
  }
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}) — decide each one before reporting:`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
}

function printChanges(page, themes) {
  const names = page.theme === "auto" ? ["light", "dark"] : [page.theme];
  console.log("\nColour adjustments for readable text:");
  let any = false;
  for (const n of names) {
    for (const c of themes[n].changes) {
      any = true;
      console.log(`  - ${cap(n)} theme. ${c}`);
    }
  }
  if (!any) console.log("  none; every text colour in the palette already meets WCAG AA.");
}

function main() {
  const args = process.argv.slice(2);
  let mode = "build";
  let out = null;
  let content = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--check") mode = "check";
    else if (a === "--tokens") mode = "tokens";
    else if (a === "--out") out = args[++i];
    else if (a === "-h" || a === "--help") {
      console.log(USAGE);
      return 0;
    } else if (a.startsWith("-")) {
      console.error(`Unknown option ${a}\n\n${USAGE}`);
      return 2;
    } else content = a;
  }
  if (!content || (args.includes("--out") && !out)) {
    console.error(USAGE);
    return 2;
  }
  const contentPath = resolve(content);
  if (!existsSync(contentPath)) {
    console.error(`Content file not found: ${contentPath}`);
    return 2;
  }
  const baseDir = dirname(contentPath);
  const icons = loadIcons();
  const source = readFileSync(contentPath, "utf8");
  source
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .forEach((l, i) => {
      const m = stripComment(l).match(/<[a-z][^<>]{0,80}>/i);
      if (m) err(`line ${i + 1}`, `unfilled placeholder ${m[0]}`);
    });
  const { front, body, bodyLine } = splitFrontmatter(source);
  const page = validateMeta(parseYaml(front), baseDir);
  const built = buildSections(parseBody(body, bodyLine), page, baseDir, icons);
  if (!built.sections.length && !built.problem) warn("content", "the page has no sections beyond the hero");
  lintHonesty(page, built);

  let themes = null;
  const themeNames = page.theme === "auto" ? ["light", "dark"] : page.theme ? [page.theme] : [];
  const paletteReady = themeNames.length && themeNames.every((t) => page.palette[t] && PALETTE_REQUIRED.every((k) => page.palette[t][k]));
  if (paletteReady) {
    themes = {};
    for (const t of themeNames) themes[t] = deriveTheme(t, page.palette[t]);
  }

  console.log(`casestudiesui ${mode}: ${contentPath}`);
  console.log(
    `Sections: hero${built.problem ? ", problem" : ""}${built.sections.map((s) => `, ${s.kind} "${plain(s.title)}"`).join("")}${built.closing ? ", closing" : ""}`,
  );
  if (themes) printChanges(page, themes);
  if (mode === "tokens" && themes) {
    for (const t of themeNames) {
      console.log(`\n${cap(t)} theme tokens:`);
      for (const [k, v] of Object.entries(themes[t].vars)) if (k !== "shadow") console.log(`  --${k}: ${v}`);
    }
  }
  printIssues();
  if (errors.length) {
    console.log(`\n${errors.length} error(s): the content file is not ready.`);
    return 1;
  }
  if (mode !== "build") {
    console.log(`\nContent file is valid${warnings.length ? ` with ${warnings.length} warning(s) to decide` : ""}.`);
    return 0;
  }

  const view = buildView(page, built, themes, icons);
  const html = renderTemplate(readFileSync(TEMPLATE_PATH, "utf8"), view);
  const outPath = resolve(out || join(baseDir, "index.html"));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  const kb = Buffer.byteLength(html) / 1024;
  console.log(`\nWrote ${outPath} (${kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`}).`);
  if (kb > 5 * 1024) console.log("  ! Over 5 MB: compress the screenshots (WebP or JPEG) and rebuild.");
  return 0;
}

process.exitCode = main();
