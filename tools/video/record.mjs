// Records the app scenes (2–9) of the demo video from a local production build
// (http://localhost:3100), in one continuous story: each scene starts where the
// last one ended. Playwright drives Chromium like a person (move, pause 0.4 s,
// tap, hold), and each frame is captured at true 2× (780×1688) with Chrome's
// screenshot API, with timestamps, so ffmpeg can rebuild the exact timing.
//
// Actions are timed to the narration (tools/video/timing.mjs): e.g. "Save" is
// tapped when "She saves it once" is spoken. Zooms are done while recording,
// by capturing a smaller part of the screen at a higher scale (still sharp).
// The "thinking" moments (Reading the recipe… / Looking at your plate…) are
// kept for about 1 s; the rest is cut from the scene's timeline.
//
// Nothing in the app changes: the tap circles are an overlay injected into the
// page, the starting state uses the app's own Test controls, and the clock is
// set by Playwright (a Thursday, with "that afternoon", "tonight" and "the
// next day" at matching times).
//
//   node tools/video/record.mjs 4          → scene 4 only (scenes 2–3 set up off camera)
//   node tools/video/record.mjs 2-9        → all app scenes

import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LAYOUT } from "./layout.mjs";
import { SCENES } from "./script.mjs";
import { timeOf } from "./timing.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const RAW = resolve(ROOT, "video-output/raw");
const U = process.env.LADLE_URL ?? "http://localhost:3100";
const { width: W, height: H, scale: SCALE } = LAYOUT.capture;

const arg = process.argv[2] ?? "2-9";
const [from, to] = arg.includes("-") ? arg.split("-").map(Number) : [Number(arg), Number(arg)];
const wanted = (n) => n >= from && n <= to;

// Story clock (America/Los_Angeles): Thursday Oct 8, 2026, and Friday for scene 8.
const at = (day, hh, mm) => new Date(`2026-10-${day}T${hh}:${mm}:00-07:00`);
const CLOCK = {
  setup: at("08", "15", "20"),
  2: at("08", "15", "25"),
  3: at("08", "15", "32"),
  4: at("08", "18", "40"),
  5: at("08", "18", "44"),
  6: at("08", "19", "15"),
  7: at("08", "19", "22"),
  8: at("09", "12", "10"),
  9: at("08", "19", "30"),
};

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const b = await pw.chromium.launch();
const ctx = await b.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  timezoneId: "America/Los_Angeles",
  locale: "en-US",
});
await ctx.clock.setFixedTime(CLOCK.setup);
// Tap circles: terracotta at 35%, about 44 px, fading out over 400 ms. Not part of the app.
await ctx.addInitScript(() => {
  addEventListener(
    "pointerdown",
    (e) => {
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(217,96,59,.35);pointer-events:none;z-index:2147483647;transition:opacity .4s ease-out,transform .4s ease-out`;
      document.documentElement.appendChild(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.style.opacity = "0"; d.style.transform = "scale(1.3)"; }));
      setTimeout(() => d.remove(), 450);
    },
    true,
  );
});
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(p);

/* ---------- Recording ---------- */

let rec = null; // the scene being recorded

/** Scene time in seconds, not counting cut "thinking" time. */
function elapsed() {
  if (!rec) return 0;
  const now = performance.now();
  return (now - rec.start - rec.cut - (rec.pausedAt ? now - rec.pausedAt : 0)) / 1000;
}

/** The part of the screen to capture now (the whole screen, or a zoomed area). */
function clipNow() {
  const z = rec?.zoom;
  let f = 1;
  let cx = W / 2;
  let cy = H / 2;
  if (z) {
    const t = elapsed();
    const k = ease(Math.min(1, Math.max(0, (t - z.t0) / z.dur)));
    f = z.from + (z.to - z.from) * k;
    cx = W / 2 + (z.cx - W / 2) * (z.to > z.from ? k : 1 - k);
    cy = H / 2 + (z.cy - H / 2) * (z.to > z.from ? k : 1 - k);
    if (z.to === 1 && k === 1) rec.zoom = null;
  }
  const w = W / f;
  const h = H / f;
  const x = Math.min(W - w, Math.max(0, cx - w / 2));
  const y = Math.min(H - h, Math.max(0, cy - h / 2));
  return { x, y, width: w, height: h, scale: SCALE * f };
}

async function captureLoop() {
  let n = 0;
  while (rec && !rec.stop) {
    const t = elapsed();
    const paused = !!rec.pausedAt;
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 92,
      clip: clipNow(),
      captureBeyondViewport: false,
    });
    if (!paused && !rec.pausedAt) {
      const file = `f${String(++n).padStart(5, "0")}.jpg`;
      writeFileSync(`${rec.dir}/${file}`, Buffer.from(data, "base64"));
      rec.frames.push({ file, t });
    }
  }
}

async function startScene(n) {
  const dir = resolve(RAW, `scene-${n}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await ctx.clock.setFixedTime(CLOCK[n]);
  rec = { n, dir, start: performance.now(), cut: 0, pausedAt: null, frames: [], zoom: null, log: [] };
  rec.loop = captureLoop();
}

async function endScene(seconds) {
  await until(seconds);
  rec.stop = true;
  await rec.loop;
  writeFileSync(`${rec.dir}/timeline.json`, JSON.stringify({ seconds, frames: rec.frames, log: rec.log }, null, 1));
  const fps = rec.frames.length / seconds;
  console.log(`scene ${rec.n}: ${rec.frames.length} frames (${fps.toFixed(1)} fps)`);
  for (const l of rec.log) console.log(`   ${l}`);
  rec = null;
}

/** Waits until the scene reaches `t` seconds. */
async function until(t) {
  for (;;) {
    const left = t - elapsed();
    if (left <= 0) return;
    await sleep(Math.min(left, 0.05));
  }
}

/** Notes how far an action landed from its word (for the report). */
function note(what, target) {
  rec.log.push(`${what}: wanted ${target.toFixed(1)} s, got ${elapsed().toFixed(1)} s`);
}

/** A person's tap: find the target, pause 0.4 s, tap, then hold ~1 s (or until the next cue). */
async function tap(locator, { hold = 1 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(0.4);
  await locator.click();
  if (hold) await sleep(hold);
}

/** Taps so the tap lands when `phrase` is spoken (+offset seconds). */
async function tapOn(scene, phrase, locator, offset = 0) {
  const t = timeOf(scene.narration, phrase) + offset;
  await locator.waitFor();
  await until(t - 0.4);
  await locator.scrollIntoViewIfNeeded();
  await sleep(Math.max(0, t - elapsed()));
  await locator.click();
  note(`tap on "${phrase}"`, t);
}

/** Keeps a "thinking" moment to about 1 s: waits, then cuts the rest until `ready` appears. */
async function shortThinking(ready, keep = 1) {
  await sleep(keep);
  if (await ready.isVisible().catch(() => false)) return;
  rec.pausedAt = performance.now();
  await ready.waitFor({ timeout: 15000 });
  await sleep(0.15);
  rec.cut += performance.now() - rec.pausedAt;
  rec.pausedAt = null;
}

/**
 * The area the content of `locator` really covers: its text (not the full
 * width of its block) and its buttons, so a zoom can frame it without cropping.
 */
async function contentBox(locator) {
  return locator.evaluate((root) => {
    const rects = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = walk.currentNode; n; n = walk.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
        const r = document.createRange();
        r.selectNodeContents(n);
        rects.push(r.getBoundingClientRect());
      } else if (n.nodeType === Node.ELEMENT_NODE && (n.matches("button, svg, input, img") || n === root && !root.children.length)) {
        rects.push(n.getBoundingClientRect());
      }
    }
    const x = Math.min(...rects.map((r) => r.left));
    const y = Math.min(...rects.map((r) => r.top));
    const r = Math.max(...rects.map((r) => r.right));
    const b = Math.max(...rects.map((r) => r.bottom));
    return { x, y, width: r - x, height: b - y };
  });
}

/**
 * A gentle zoom (0.6 s ease) towards what `locator` shows, or back out. About
 * 1.4×, less (down to 1.2×) when the content would otherwise be cropped.
 */
async function zoomTo(locator, factor = 1.4) {
  const box = await contentBox(locator);
  const fit = Math.min((W - 28) / box.width, (H - 28) / box.height);
  const f = Math.max(1.2, Math.min(factor, fit));
  rec.zoom = { from: 1, to: f, t0: elapsed(), dur: 0.6, cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
  rec.log.push(`zoom ${f.toFixed(2)}× on a ${Math.round(box.width)}×${Math.round(box.height)} area`);
}
function zoomOut() {
  if (!rec.zoom) return;
  rec.zoom = { ...rec.zoom, from: rec.zoom.to, to: 1, t0: elapsed() };
}

/** Smooth scroll of the app's main area. */
async function scrollMain(y) {
  await p.evaluate((top) => document.querySelector("main")?.scrollTo({ top, behavior: "smooth" }), y);
}
async function scrollMainTo(locator, offset = 120) {
  const y = await locator.evaluate((el, off) => {
    const main = document.querySelector("main");
    return main.scrollTop + el.getBoundingClientRect().top - off;
  }, offset);
  await scrollMain(y);
}

/* ---------- Starting state (off camera) ---------- */

async function openTestControls() {
  await p.goto(U + "/me");
  const v = p.getByRole("button", { name: "Ladle prototype · v1.0" });
  await v.scrollIntoViewIfNeeded();
  await sleep(0.3);
  const box = await v.boundingBox();
  await p.mouse.move(box.x + 20, box.y + 10);
  await p.mouse.down();
  await sleep(0.9);
  await p.mouse.up();
  await p.getByRole("dialog", { name: "Test controls" }).waitFor();
}

async function setSwitch(name, on) {
  const s = p.getByRole("switch", { name: new RegExp(`^${name}`) });
  if ((await s.getAttribute("aria-checked")) !== String(on)) await s.click();
}

async function setup() {
  await openTestControls();
  await p.getByRole("button", { name: "Reset to test start" }).click();
  await p.getByRole("button", { name: "Reset now" }).click();
  await p.waitForURL(U + "/");
  await openTestControls();
  await setSwitch("Treat today as Thursday", true);
  await setSwitch("Hide the Prototype pill", true);
  await setSwitch("Hide the 60-second tour", true);
  await setSwitch("Show task timer", false);
  await setSwitch("Show the next test task", false);
  await p.getByRole("button", { name: "Done" }).click();
  await p.goto(U + "/");
  await p.getByText("870").first().waitFor();
  const budget = await p.locator("main").innerText();
  if (!budget.includes("870") || !budget.includes("730 eaten of 1,600")) throw new Error("Today doesn't show 870 left");
  console.log("starting state: 870 left, 730 eaten of 1,600; pill and tour hidden; Thursday on");
}

/* ---------- Scenes ---------- */

const S = Object.fromEntries(SCENES.map((s) => [s.n, s]));

const scenes = {
  // Meet Maya: Today, scroll down to the meals' confidence dots and back up.
  async 2(s) {
    await p.goto(U + "/");
    await p.getByText("Welcome back, Maya.").waitFor();
    await sleep(0.3);
    await startScene(2);
    await until(timeOf(s.narration, "every number shows") - 1.2);
    await scrollMainTo(p.getByRole("heading", { name: "Today’s meals" }), 60);
    note("meals in view", timeOf(s.narration, "every number shows"));
    await until(timeOf(s.narration, "so we can test") + 0.6);
    await scrollMain(0);
    await endScene(s.seconds);
  },

  // An afternoon latte: Add other food → tabs → Search → "matcha latte" → log it.
  async 3(s) {
    await startScene(3);
    const add = p.getByRole("link", { name: /Add other food/ });
    await until(0.6);
    await scrollMainTo(add, 380);
    await tapOn(s, "For food she didn't cook,", add);
    await p.getByRole("tab", { name: "Restaurant" }).waitFor();
    await tapOn(s, "search, and restaurant", p.getByRole("tab", { name: "Search" }));
    const box = p.getByPlaceholder(/latte/);
    await box.waitFor();
    await sleep(0.4);
    await box.pressSequentially("matcha latte", { delay: 125 });
    await tapOn(s, "taps,", p.getByRole("button", { name: /^Matcha latte/ }));
    await tapOn(s, "it's logged:", p.getByRole("button", { name: "Log it" }));
    await p.waitForURL(U + "/");
    await endScene(s.seconds);
  },

  // Import a recipe: Recipes → Add recipe → Link → Use demo link → Import → review → 2 tbsp → Save.
  async 4(s) {
    await startScene(4);
    await until(0.5);
    await tap(p.getByRole("link", { name: "Recipes", exact: true }), { hold: 0.9 });
    await tap(p.getByRole("button", { name: "Add recipe" }), { hold: 0.9 });
    await tap(p.getByRole("tab", { name: "Link" }), { hold: 0.6 });
    await tapOn(s, "pastes the link,", p.getByRole("button", { name: "Use demo link" }));
    await tapOn(s, "Ladle reads the recipe", p.getByRole("button", { name: "Import recipe" }));
    await shortThinking(p.getByRole("heading", { name: "Review recipe" }));
    // The ingredient list, while "every ingredient, with its calories" is spoken.
    await sleep(0.4);
    await until(timeOf(s.narration, "every ingredient,") - 0.6);
    await scrollMainTo(p.getByRole("heading", { name: "Ingredients" }), 40);
    note("ingredient list", timeOf(s.narration, "every ingredient,"));
    // The oil question, centred and zoomed on "olive oil for brushing".
    const question = p.getByText("How much olive oil did you brush on?").locator("..");
    await until(timeOf(s.narration, "olive oil for brushing") - 1.2);
    await scrollMainTo(question, 260);
    await sleep(0.8);
    await zoomTo(question);
    note("oil question zoom", timeOf(s.narration, "olive oil for brushing"));
    await until(timeOf(s.narration, "Maya picks") - 0.8);
    zoomOut();
    await tapOn(s, "two tablespoons:", p.getByRole("button", { name: "2 tbsp · +240" }));
    await tapOn(s, "She saves it once,", p.getByRole("button", { name: "Save recipe" }));
    await p.waitForURL(/recipes\/air-fryer/);
    await endScene(s.seconds);
  },

  // Cook as a batch: 4 servings → Start batch → toast.
  async 5(s) {
    await startScene(5);
    await tapOn(s, "She cooks", p.getByRole("button", { name: "Cook as a batch" }));
    await tapOn(s, "with one tap.", p.getByRole("button", { name: /^Start batch · 4 servings/ }));
    await endScene(s.seconds);
  },

  // Snap your plate: camera → sample → result → pan zoom → slider → Log it → Use photo.
  async 6(s) {
    await startScene(6);
    await tapOn(s, "snaps her plate.", p.getByRole("link", { name: /Camera/ }), -0.2);
    await tap(p.getByRole("button", { name: "Use sample photo" }), { hold: 0 });
    await shortThinking(p.getByRole("button", { name: "Log it" }));
    note("Looks like… on screen", timeOf(s.narration, "Ladle recognizes the dish,"));
    const pan = p.getByText("How much did you take?").locator("xpath=ancestor::div[2]");
    await until(timeOf(s.narration, "The pot shows her share:") - 0.3);
    await zoomTo(pan.locator("svg").first().locator(".."), 1.4);
    note("pan zoom", timeOf(s.narration, "The pot shows her share:"));
    await until(timeOf(s.narration, "If she took more,") - 0.3);
    zoomOut();
    // Drag the slider up a step and back to 1 serving.
    const slider = p.getByRole("slider");
    const sb = await slider.boundingBox();
    const max = Number(await slider.getAttribute("max"));
    const xFor = (v) => sb.x + 16 + ((v - 0.25) / (max - 0.25)) * (sb.width - 32);
    const y = sb.y + sb.height / 2;
    await until(timeOf(s.narration, "she slides it."));
    await p.mouse.move(xFor(1), y);
    await p.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await p.mouse.move(xFor(1) + ((xFor(1.25) - xFor(1)) * i) / 8 + 6, y);
      await sleep(0.04);
    }
    await sleep(0.7);
    for (let i = 1; i <= 8; i++) {
      await p.mouse.move(xFor(1.25) + ((xFor(1) - xFor(1.25)) * i) / 8, y);
      await sleep(0.04);
    }
    await p.mouse.up();
    note("slider", timeOf(s.narration, "she slides it."));
    const value = await slider.getAttribute("aria-valuetext");
    if (!value.includes("1 serving")) throw new Error(`slider ended at ${value}`);
    await tapOn(s, "One tap logs", p.getByRole("button", { name: "Log it" }));
    await tapOn(s, "her photo becomes", p.getByRole("button", { name: "Use photo" }));
    await p.waitForURL(U + "/");
    await endScene(s.seconds);
  },

  // Fix and learn: the meal → More oil → +30 zoom → Just this time → Update recipe.
  async 7(s) {
    await startScene(7);
    const meal = p.getByRole("button", { name: /^Air-fryer garlic chicken with mushrooms, 1 serving/ });
    await until(0.8);
    await scrollMainTo(meal, 420);
    await tapOn(s, "Today was different,\"", meal);
    const sheet = p.getByRole("dialog");
    await tapOn(s, "More oil,\"", sheet.getByRole("button", { name: "More oil", exact: true }));
    const plate = sheet.getByText(/^On your plate:/).locator("..");
    await until(timeOf(s.narration, "30 more on her plate.") - 0.5);
    await zoomTo(plate, 1.4);
    note("+30 zoom", timeOf(s.narration, "30 more on her plate."));
    await until(timeOf(s.narration, "She chooses") - 0.2);
    zoomOut();
    await tapOn(s, "Just this time.\"", sheet.getByRole("button", { name: /Just this time/ }));
    await sheet.getByText("You usually brush on more oil. Update your recipe?").waitFor();
    await tapOn(s, "One tap, and", sheet.getByRole("button", { name: "Update recipe" }));
    await endScene(s.seconds);
  },

  // Tomorrow's lunch: Pantry with 3 of 4 left (not tapped), then Turkey chili.
  async 8(s) {
    await startScene(8);
    await until(0.6);
    await tap(p.getByRole("link", { name: "Pantry", exact: true }), { hold: 0 });
    await p.getByText(/of 4 servings left/).waitFor();
    note("3 of 4 on screen", timeOf(s.narration, "three of four servings left,"));
    await until(timeOf(s.narration, "No photo,") - 0.4);
    await scrollMainTo(p.getByRole("link", { name: "Turkey chili" }), 300);
    await endScene(s.seconds);
  },

  // Close: Today, budget and the day's meals (the end card is added in the edit).
  async 9(s) {
    await startScene(9);
    await until(0.6);
    await tap(p.getByRole("link", { name: "Today", exact: true }), { hold: 0 });
    await p.getByText("Welcome back, Maya.").waitFor();
    await until(timeOf(s.narration, "Every meal Maya repeats") - 0.5);
    await scrollMainTo(p.getByRole("heading", { name: "Today’s meals" }), 60);
    await endScene(s.seconds);
  },
};

/** Off-camera steps that bring the app to the state at the start of scene n (for single-scene tests). */
async function catchUpTo(n) {
  if (n > 3) {
    await ctx.clock.setFixedTime(CLOCK[3]);
    await p.goto(U + "/add-food");
    await p.getByRole("tab", { name: "Search" }).click();
    await p.getByPlaceholder(/latte/).fill("matcha latte");
    await p.getByRole("button", { name: /^Matcha latte/ }).click();
    await p.getByRole("button", { name: "Log it" }).click();
    await p.waitForURL(U + "/");
  }
  if (n > 4) throw new Error("Single-scene tests are only set up for scenes 2–4.");
  await p.goto(U + "/");
  await p.getByText("Welcome back, Maya.").waitFor();
  // Let the latte's toast finish before recording.
  await p.waitForFunction(() => !document.body.innerText.includes("Undo"), null, { timeout: 10000 }).catch(() => {});
}

await p.goto(U + "/");
await setup();
if (from > 2) await catchUpTo(from);
for (const s of SCENES.filter((s) => wanted(s.n) && s.n >= 2)) {
  await scenes[s.n](s);
}
console.log("errors:", errors.length ? errors : "none");
await b.close();
