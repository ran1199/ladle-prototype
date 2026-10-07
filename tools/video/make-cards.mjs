// Builds the video's still pieces as HTML (in tools/video/cards/) and captures
// them with Chromium: the title, quote, idea and end cards (1920×1080), the
// caption pills, the phone's rounded-corner mask and the background with the
// phone's soft shadow. Uses the app's fonts (Fraunces, Inter), colours and icon.
//
//   node tools/video/make-cards.mjs   → video-output/cards/*.png

import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES } from "./script.mjs";
import { LAYOUT } from "./layout.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUT = resolve(ROOT, "video-output/cards");
const CARDS = resolve(HERE, "cards");
mkdirSync(OUT, { recursive: true });
mkdirSync(CARDS, { recursive: true });

const icon = readFileSync(resolve(ROOT, "app/icon.svg"), "utf8");
const font = (f) => `file://${resolve(HERE, "fonts", f)}`;

const BASE_CSS = `
@font-face { font-family: Fraunces; src: url(${font("Fraunces-SemiBold.ttf")}); font-weight: 600; }
@font-face { font-family: Inter; src: url(${font("Inter-Medium.ttf")}); font-weight: 500; }
@font-face { font-family: Inter; src: url(${font("Inter-SemiBold.ttf")}); font-weight: 600; }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; background: #FBF7F0; color: #2B2420; font-family: Inter; }
/* Cards keep the bottom band free for the subtitles. */
.stage { position: absolute; inset: 0 0 200px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 36px; padding: 0 240px; }
.icon svg { width: 140px; height: 140px; display: block; }
h1 { font-family: Fraunces; font-weight: 600; font-size: 132px; line-height: 1; letter-spacing: -2px; }
.sub { font-size: 44px; font-weight: 500; color: #6B5F57; }
blockquote { font-family: Fraunces; font-weight: 600; font-size: 76px; line-height: 1.15; letter-spacing: -0.5px; }
blockquote::before { content: "“"; color: #D9603B; }
blockquote::after { content: "”"; color: #D9603B; }
.pill { display: inline-block; font-size: 28px; font-weight: 500; color: #6B5F57; background: #F3ECE1; border-radius: 999px; padding: 12px 26px; }
.line { font-family: Fraunces; font-weight: 600; font-size: 72px; line-height: 1.2; letter-spacing: -0.5px; }
.url { font-size: 36px; font-weight: 600; color: #B4512E; }
`;

function page(body, extra = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${extra}</style></head><body>${body}</body></html>`;
}

const cards = {
  title: page(`<div class="stage"><div class="icon">${icon}</div><h1>Ladle</h1><p class="sub">Calorie tracking for home cooks</p></div>`),
  quote1: page(`<div class="stage"><span class="pill">Real user reviews</span><blockquote>It COMPLETELY ignores the oiliness</blockquote></div>`),
  quote2: page(`<div class="stage"><span class="pill">Real user reviews</span><blockquote>Logging a stir fry with 8 ingredients took forever</blockquote></div>`),
  // Both quotes together, while "Across nearly 200 reviews and forum posts…" is spoken.
  quotes: page(
    `<div class="stage" style="gap:44px"><span class="pill">Real user reviews</span><blockquote style="font-size:60px">It COMPLETELY ignores the oiliness</blockquote><blockquote style="font-size:60px">Logging a stir fry with 8 ingredients took forever</blockquote></div>`,
  ),
  idea: page(`<div class="stage"><p class="line">The recipe knows the ingredients.<br>The photo only measures your share.</p></div>`),
  end: page(`<div class="stage"><div class="icon">${icon}</div><p class="line">The recipe knows.<br>The photo measures.</p><p class="url">ladle-prototype.vercel.app</p></div>`),
};

const { phone } = LAYOUT;
// Background for app scenes: cream, with a soft shadow where the phone sits.
const background = page(
  `<div style="position:absolute;left:${phone.x}px;top:${phone.y}px;width:${phone.w}px;height:${phone.h}px;border-radius:${phone.radius}px;box-shadow:0 30px 80px rgb(43 36 32 / 0.22), 0 8px 24px rgb(43 36 32 / 0.10);background:#FBF7F0"></div>`,
);
// The phone's rounded corners: white where the screen shows, black elsewhere.
const mask = `<!doctype html><html><head><style>*{margin:0}html,body{width:${phone.w}px;height:${phone.h}px;background:#000}div{width:100%;height:100%;border-radius:${phone.radius}px;background:#fff}</style></head><body><div></div></body></html>`;

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
async function shoot(name, html, opts = {}) {
  const file = resolve(CARDS, `${name}.html`);
  writeFileSync(file, html);
  await p.setViewportSize(opts.viewport ?? { width: 1920, height: 1080 });
  await p.goto(`file://${file}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: resolve(OUT, `${name}.png`), omitBackground: !!opts.transparent, ...(opts.clip ? { clip: opts.clip } : {}) });
}

for (const [name, html] of Object.entries(cards)) await shoot(name, html);
await shoot("background", background);
await shoot("phone-mask", mask, { viewport: { width: phone.w, height: phone.h } });

// Caption pills (transparent PNGs, sized to the text).
for (const s of SCENES.filter((s) => s.caption)) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS} html,body{background:transparent;width:auto;height:auto} .pill{font-size:28px;margin:0}</style></head><body><span class="pill" id="pill">${s.caption.text}</span></body></html>`;
  const file = resolve(CARDS, `caption-${s.n}.html`);
  writeFileSync(file, html);
  await p.setViewportSize({ width: 1000, height: 200 });
  await p.goto(`file://${file}`);
  await p.evaluate(() => document.fonts.ready);
  await p.locator("#pill").screenshot({ path: resolve(OUT, `caption-${s.n}.png`), omitBackground: true });
}
await b.close();
console.log("cards written to", OUT);
