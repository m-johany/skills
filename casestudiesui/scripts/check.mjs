#!/usr/bin/env node
// casestudiesui check: serves a built page statically and checks it in Chromium with Playwright.
// Usage: node check.mjs <page.html> [--out <screenshot dir>]

import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const USAGE = `Usage: node check.mjs <page.html> [--out <screenshot dir>]

Serves the page on 127.0.0.1, then checks it in Chromium: full-page screenshots at 1440px
and 390px, reduced motion, JavaScript disabled, dark scheme when the page has one, no
horizontal page scroll from 360px to 1920px, no console errors, no requests beyond the page
itself, image attributes, focus outline, text contrast and the chat demo's Play button.

Playwright is found through PLAYWRIGHT_MODULE (a path to its index.mjs), a local install,
or the global npm root. Screenshots go to --out (default: a new folder in the OS temp dir).`;

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  candidates.push("playwright");
  try {
    const root = execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (root) candidates.push(join(root, "playwright", "index.mjs"));
  } catch {
    /* npm missing: rely on the other candidates */
  }
  for (const c of candidates) {
    try {
      const spec = c.includes("/") || c.includes("\\") ? pathToFileURL(resolve(c)).href : c;
      const mod = await import(spec);
      const pw = mod.chromium ? mod : mod.default;
      if (pw && pw.chromium) return pw;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(
    `Playwright not found (tried: ${candidates.join(", ")}).\n` +
      `Install it with "npm i -g playwright && npx playwright install chromium", or set PLAYWRIGHT_MODULE to its index.mjs.`,
  );
}

const MIME = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };

function serve(file) {
  const dir = dirname(file);
  const name = basename(file);
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
      const target = resolve(dir, path || name);
      if (!target.startsWith(dir) || !existsSync(target)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = target.slice(target.lastIndexOf(".")).toLowerCase();
      res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(target));
    });
    server.listen(0, "127.0.0.1", () => ok({ server, url: `http://127.0.0.1:${server.address().port}/${encodeURIComponent(name)}` }));
  });
}

// Scroll top to bottom so every fade-in has fired, then return to the top.
async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.7));
    const to = (top) => window.scrollTo({ top, behavior: "instant" });
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      to(y);
      await new Promise((r) => setTimeout(r, 60));
    }
    to(document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 700));
    to(0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

// Runs inside the page: text whose colour misses WCAG AA against its nearest opaque background.
function contrastFailures() {
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const lum = (c) => {
    const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const blend = (top, under) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  };
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
    return out;
  };
  const fails = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest(".sr-only, svg, script, style")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || cs.display === "none" || r.width === 0 || r.height === 0 || r.bottom < 0) continue;
    let opacity = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
    if (opacity < 0.99) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const c = blend(fg, bg);
    const a = lum(c);
    const b = lum(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const min = large ? 3 : 4.5;
    if (ratio < min - 0.01) {
      fails.push(`${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).trim().split(/\s+/).join(".") : ""} "${el.textContent.trim().slice(0, 40)}" ${ratio.toFixed(2)}:1 (needs ${min}:1)`);
    }
  }
  return fails;
}

// Runs inside the page: structural and accessibility checks.
function domChecks() {
  const out = [];
  const vh = window.innerHeight;
  const imgs = [...document.images];
  imgs.forEach((img, i) => {
    const label = `img #${i + 1}${img.alt ? ` ("${img.alt.slice(0, 40)}")` : ""}`;
    if (!img.hasAttribute("alt")) out.push(`${label} has no alt attribute`);
    if (!img.getAttribute("width") || !img.getAttribute("height")) out.push(`${label} lacks width/height attributes`);
    const top = img.getBoundingClientRect().top + window.scrollY;
    const inHeader = img.closest(".site-head, .site-foot");
    if (!inHeader && top > vh && img.getAttribute("loading") !== "lazy") out.push(`${label} is below the fold but not loading="lazy"`);
    if (!img.complete || img.naturalWidth === 0) out.push(`${label} did not load`);
  });
  const contentImgs = imgs.filter((img) => !img.closest(".site-head, .site-foot"));
  contentImgs.forEach((img) => {
    if (!img.alt.trim()) out.push(`a content screenshot has empty alt text`);
  });
  if (!document.documentElement.lang) out.push("<html> has no lang attribute");
  if (document.querySelectorAll("h1").length !== 1) out.push(`expected one <h1>, found ${document.querySelectorAll("h1").length}`);
  let prev = 0;
  for (const h of document.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
    const lvl = Number(h.tagName[1]);
    if (prev && lvl > prev + 1) out.push(`heading level jumps from h${prev} to h${lvl} at "${h.textContent.trim().slice(0, 40)}"`);
    prev = lvl;
  }
  for (const b of document.querySelectorAll("button, a[href]")) {
    if (!(b.textContent.trim() || b.getAttribute("aria-label"))) out.push(`a ${b.tagName.toLowerCase()} has no accessible name`);
  }
  for (const s of document.querySelectorAll("script[src], link[rel=stylesheet], iframe, object, embed")) out.push(`external resource tag: <${s.tagName.toLowerCase()}>`);
  if (!document.querySelector("main")) out.push("no <main> landmark");
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("-h") || args.includes("--help")) {
    console.log(USAGE);
    return args.length ? 0 : 2;
  }
  let outDir = null;
  let file = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") outDir = args[++i];
    else file = args[i];
  }
  file = resolve(file);
  if (!existsSync(file)) {
    console.error(`Page not found: ${file}`);
    return 2;
  }
  outDir = resolve(outDir || mkdtempSync(join(tmpdir(), "casestudiesui-check-")));
  mkdirSync(outDir, { recursive: true });

  const pw = await loadPlaywright();
  const { server, url } = await serve(file);
  const origin = new URL(url).origin;
  let browser;
  try {
    browser = await pw.chromium.launch();
    const results = [];
    const shots = [];
    const record = (name, problems) => results.push({ name, problems });
    const html = readFileSync(file, "utf8");
    const hasDark = /prefers-color-scheme:\s*dark/.test(html);
    const hasChat = /<[^>]*\sdata-demo[\s>]/.test(html);

    async function open(name, options) {
      const context = await browser.newContext({ viewport: { width: options.width, height: options.height || 900 }, ...options.context });
      const page = await context.newPage();
      const problems = [];
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(`console error: ${m.text()}`);
      });
      page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
      page.on("request", (r) => {
        const u = r.url();
        if (u.startsWith("data:") || u.startsWith("blob:")) return;
        if (!u.startsWith(origin)) problems.push(`third-party request: ${u}`);
        else if (u.split("#")[0] !== url) problems.push(`extra request (the page must be one self-contained file): ${u}`);
      });
      await page.goto(url, { waitUntil: "load" });
      return { context, page, problems };
    }

    async function overflow(page) {
      return page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth > d.clientWidth ? `page scrolls sideways: scrollWidth ${d.scrollWidth}px > viewport ${d.clientWidth}px` : null;
      });
    }

    // Full-page screenshots at desktop and phone widths.
    for (const [name, width, height] of [["desktop-1440", 1440, 900], ["mobile-390", 390, 844]]) {
      const { context, page, problems } = await open(name, { width, height });
      await settle(page);
      const o = await overflow(page);
      if (o) problems.push(o);
      problems.push(...(await page.evaluate(domChecks)));
      const path = join(outDir, `${name}.png`);
      await page.screenshot({ path, fullPage: true });
      shots.push(path);
      if (name === "desktop-1440") {
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => {
          const el = document.activeElement;
          const cs = getComputedStyle(el);
          return { tag: el.tagName, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
        });
        if (focus.tag === "BODY" || focus.style === "none" || focus.width < 2) problems.push(`keyboard focus is not visible (first Tab lands on ${focus.tag}, outline ${focus.style} ${focus.width}px)`);
      }
      if (name === "desktop-1440" && hasChat) {
        const toggle = page.locator("[data-demo-toggle]").first();
        if (!(await toggle.isVisible())) problems.push("chat demo: the Play button is not visible with JavaScript on");
        else {
          await toggle.scrollIntoViewIfNeeded();
          await toggle.click();
          const done = await page
            .waitForFunction(() => [...document.querySelectorAll("[data-demo] [data-seq]")].every((el) => el.classList.contains("is-shown")), null, { timeout: 60000 })
            .then(() => true, () => false);
          if (!done) problems.push("chat demo: Play did not finish showing every message");
          const label = (await toggle.textContent()).trim();
          const replay = await toggle.getAttribute("data-replay");
          if (label !== replay) problems.push(`chat demo: after Play the button reads "${label}", expected "${replay}"`);
        }
      }
      record(`${name}: screenshot, overflow, DOM, ${name === "desktop-1440" ? "focus, chat demo" : "images"}`, problems);
      await context.close();
    }

    // No horizontal page scroll across the width range.
    {
      const problems = [];
      const { context, page, problems: p } = await open("widths", { width: 360, height: 800 });
      for (const w of [360, 390, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.waitForTimeout(120);
        const o = await overflow(page);
        if (o) problems.push(`${w}px: ${o}`);
      }
      record("widths 360–1920: no horizontal page scroll", [...p, ...problems]);
      await context.close();
    }

    // Reduced motion: everything visible without scrolling, no Play button, text contrast.
    const schemes = hasDark ? ["light", "dark"] : [null];
    for (const scheme of schemes) {
      const name = `reduced-motion-1440${scheme === "dark" ? "-dark" : ""}`;
      const { context, page, problems } = await open(name, { width: 1440, context: { reducedMotion: "reduce", ...(scheme ? { colorScheme: scheme } : {}) } });
      const hidden = await page.evaluate(() => [...document.querySelectorAll(".reveal, [data-seq]")].filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
      if (hidden) problems.push(`${hidden} element(s) still faded out with reduced motion`);
      const play = await page.locator("[data-demo-toggle]").evaluateAll((els) => els.some((el) => !el.hidden));
      if (play) problems.push("the chat Play button shows with reduced motion");
      const contrast = await page.evaluate(contrastFailures);
      problems.push(...contrast.map((c) => `contrast: ${c}`));
      // Scroll through only now, after the no-scroll checks, so lazy images load before the screenshot.
      await settle(page);
      const path = join(outDir, `${name}.png`);
      await page.screenshot({ path, fullPage: true });
      shots.push(path);
      record(`${name}: all content visible, no Play button, text contrast (WCAG AA)`, problems);
      await context.close();
    }

    // JavaScript disabled: every section readable.
    {
      const { context, page, problems } = await open("no-js-1440", { width: 1440, context: { javaScriptEnabled: false } });
      const hidden = await page.evaluate(() => [...document.querySelectorAll(".reveal, [data-seq], .statement, .msg")].filter((el) => Number(getComputedStyle(el).opacity) < 1 || getComputedStyle(el).visibility === "hidden").length);
      if (hidden) problems.push(`${hidden} element(s) hidden without JavaScript`);
      const path = join(outDir, "no-js-1440.png");
      await page.screenshot({ path, fullPage: true });
      shots.push(path);
      record("no-js-1440: content readable with JavaScript disabled", problems);
      await context.close();
    }

    let failed = 0;
    console.log(`casestudiesui check: ${file}\n`);
    for (const r of results) {
      const unique = [...new Set(r.problems)];
      if (unique.length) failed++;
      console.log(`${unique.length ? "✗" : "✓"} ${r.name}`);
      for (const p of unique) console.log(`    - ${p}`);
    }
    console.log(`\nScreenshots (open and look at each one):`);
    for (const s of shots) console.log(`  ${s}`);
    console.log(failed ? `\n${failed} check group(s) failed. Fix the content or template, rebuild, and run the check again.` : "\nAll checks passed. Now look at every screenshot.");
    return failed ? 1 : 0;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    console.error(e.message || e);
    process.exitCode = 2;
  },
);
