// A short, silent portfolio clip (about 7.5 s) of Ladle's core loop, in the
// same 1920×1080 look as the demo video: Today → camera → sample photo →
// "Looks like…" with the pan showing your share → Log it → back on Today with
// "Nice, that's logged". Recorded from the local production build like the
// demo (true 2× frames, tap circles), with snappier taps and the
// "Looking at your plate…" moment kept short.
//
// Off camera first: reset to test start (pill and tour hidden), import the
// demo recipe, and answer the one-time "Use this photo for the recipe?" with
// Not now (then Undo that log), so the clip shows only the loop.
//
//   node tools/video/clip.mjs   → video-output/clip/ladle-key-flow.mp4

import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LAYOUT } from "./layout.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../video-output");
const RAW = resolve(OUT, "raw", "clip");
const CARDS = resolve(OUT, "cards");
const U = process.env.LADLE_URL ?? "http://localhost:3100";
const { width: W, height: H, scale: SCALE } = LAYOUT.capture;
const { phone, fps } = LAYOUT;
const SECONDS = 7.5;

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

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
// Thursday evening, dinner time.
await ctx.clock.setFixedTime(new Date("2026-10-08T19:15:00-07:00"));
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

/* ---------- Off camera ---------- */

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

await p.goto(U + "/");
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
// Import the demo recipe.
await p.goto(U + "/recipes");
await p.getByRole("button", { name: "Add recipe" }).click();
await p.getByRole("button", { name: "Use demo link" }).click();
await p.getByRole("button", { name: "Import recipe" }).click();
await p.getByRole("button", { name: "2 tbsp · +240" }).click();
await p.getByRole("button", { name: "Save recipe" }).click();
await p.waitForURL(/recipes\/air-fryer/);
// Answer the one-time photo question now (Not now), then undo that log.
await p.goto(U + "/camera");
await p.getByRole("button", { name: "Use sample photo" }).click();
await p.getByRole("button", { name: "Log it" }).click();
await p.getByRole("button", { name: "Not now" }).click();
await p.waitForURL(U + "/");
await p.getByRole("button", { name: "Undo" }).click();
await p.waitForFunction(() => !document.body.innerText.includes("Undo"), null, { timeout: 10000 }).catch(() => {});
await p.goto(U + "/");
await p.getByText("870").first().waitFor();
if (!(await p.locator("main").innerText()).includes("730 eaten of 1,600")) throw new Error("Today isn't at 870 left");
await sleep(0.6);

/* ---------- On camera ---------- */

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
const cdp = await ctx.newCDPSession(p);
const frames = [];
let cut = 0; // "thinking" time cut from the timeline
let pausedAt = null;
let stop = false;
const start = performance.now();
const elapsed = () => (performance.now() - start - cut - (pausedAt ? performance.now() - pausedAt : 0)) / 1000;
const loop = (async () => {
  let n = 0;
  while (!stop) {
    const t = elapsed();
    const paused = !!pausedAt;
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 92,
      clip: { x: 0, y: 0, width: W, height: H, scale: SCALE },
    });
    if (!paused && !pausedAt) {
      const file = `f${String(++n).padStart(5, "0")}.jpg`;
      writeFileSync(`${RAW}/${file}`, Buffer.from(data, "base64"));
      frames.push({ file, t });
    }
  }
})();
const until = async (t) => {
  while (elapsed() < t) await sleep(0.02);
};
/** A quick, natural tap: a short pause on the target, then the tap. */
async function tapAt(t, locator) {
  await locator.waitFor();
  await until(t - 0.25);
  await sleep(0.25);
  await locator.click();
}

await tapAt(0.8, p.getByRole("link", { name: /Camera/ }));
await tapAt(1.7, p.getByRole("button", { name: "Use sample photo" }));
// Keep "Looking at your plate…" for 0.45 s, cut the rest of the wait.
await sleep(0.45);
const result = p.getByRole("button", { name: "Log it" });
if (!(await result.isVisible().catch(() => false))) {
  pausedAt = performance.now();
  await result.waitFor({ timeout: 15000 });
  await sleep(0.15);
  cut += performance.now() - pausedAt;
  pausedAt = null;
}
const resultAt = elapsed();
// Hold on "Looks like…" and the pan (¼ of the pan · 1 serving · about 530 kcal).
await tapAt(Math.max(resultAt + 2.1, 4.4), result);
await p.waitForURL(U + "/");
await until(SECONDS);
stop = true;
await loop;
await b.close();
console.log(`${frames.length} frames (${(frames.length / SECONDS).toFixed(1)} fps); result on screen at ${resultAt.toFixed(1)} s; errors: ${errors.length ? errors : "none"}`);

/* ---------- Edit (same look as the demo video) ---------- */

let list = "ffconcat version 1.0\n";
frames.forEach((f, i) => {
  const s = i === 0 ? 0 : f.t;
  const e = frames[i + 1]?.t ?? SECONDS;
  list += `file '${resolve(RAW, f.file)}'\nduration ${Math.max(0.001, e - s).toFixed(4)}\n`;
});
list += `file '${resolve(RAW, frames[frames.length - 1].file)}'\n`;
writeFileSync(resolve(RAW, "frames.txt"), list);
const outDir = resolve(OUT, "clip");
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "ladle-key-flow.mp4");
execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-f", "concat", "-safe", "0", "-i", resolve(RAW, "frames.txt"),
  "-loop", "1", "-framerate", String(fps), "-i", resolve(CARDS, "background.png"),
  "-loop", "1", "-framerate", String(fps), "-i", resolve(CARDS, "phone-mask.png"),
  "-filter_complex",
  `[0:v]fps=${fps},scale=${phone.w}:${phone.h}:flags=lanczos,format=rgba[ph0];[2:v]format=gray[m];[ph0][m]alphamerge[ph];` +
    `[1:v]format=rgba[bg];[bg][ph]overlay=${phone.x}:${phone.y}:shortest=1,` +
    // A gentle fade in and out, so the clip loops softly on a portfolio page.
    `fade=t=in:st=0:d=0.3,fade=t=out:st=${(SECONDS - 0.35).toFixed(2)}:d=0.35,format=yuv420p[v]`,
  "-map", "[v]", "-an", "-t", String(SECONDS),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(fps), "-movflags", "+faststart",
  out,
], { stdio: "inherit" });
console.log("clip:", out);
