// Edits the video with ffmpeg: each scene becomes a 1920×1080, 30 fps clip
// (scenes/scene-N.mp4) with the phone recording on the cream background
// (rounded corners, soft shadow), captions to the right of the phone, and the
// cards for scenes 1 and 9. Then the scenes are joined (clean video) and the
// subtitles are burned in (subtitled video).
//
//   node tools/video/compose.mjs 4 --test   → video-output/test/scene-4-test.mp4 (with subtitles)
//   node tools/video/compose.mjs all        → every scene, the clean and the subtitled video

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LAYOUT } from "./layout.mjs";
import { SCENES } from "./script.mjs";
import { sceneCues, timeOf, writeSubtitles } from "./timing.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUT = resolve(ROOT, "video-output");
const CARDS = resolve(OUT, "cards");
const FONTS = resolve(HERE, "fonts");
const { phone, fps } = LAYOUT;
const FADE = 0.5;

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const ENCODE = ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(fps), "-movflags", "+faststart"];

/** Cards that change at given times, cross-faded (0.5 s), for `seconds`. */
function cardSequence(steps, seconds, out) {
  // steps: [{ png, at }] with the first at 0.
  const inputs = [];
  steps.forEach((s, i) => {
    const next = steps[i + 1]?.at ?? seconds;
    const dur = next - s.at + FADE + 0.1;
    inputs.push("-loop", "1", "-framerate", String(fps), "-t", dur.toFixed(3), "-i", s.png);
  });
  let filter = "";
  let last = "[0:v]";
  steps.slice(1).forEach((s, i) => {
    const label = `[x${i}]`;
    filter += `${last}[${i + 1}:v]xfade=transition=fade:duration=${FADE}:offset=${(s.at - FADE / 2).toFixed(3)}${label};`;
    last = label;
  });
  filter += `${last}format=yuv420p[v]`;
  ff([...inputs, "-filter_complex", filter, "-map", "[v]", "-t", String(seconds), ...ENCODE, out]);
}

/** The phone recording on the background, with an optional caption. */
function phoneScene(scene, out) {
  const raw = resolve(OUT, "raw", `scene-${scene.n}`);
  const { seconds, frames } = JSON.parse(readFileSync(resolve(raw, "timeline.json"), "utf8"));
  // Each frame shows until the next one; the first starts at 0, the last holds to the end.
  let list = "ffconcat version 1.0\n";
  frames.forEach((f, i) => {
    const start = i === 0 ? 0 : f.t;
    const end = frames[i + 1]?.t ?? seconds;
    list += `file '${resolve(raw, f.file)}'\nduration ${Math.max(0.001, end - start).toFixed(4)}\n`;
  });
  list += `file '${resolve(raw, frames[frames.length - 1].file)}'\n`;
  writeFileSync(resolve(raw, "frames.txt"), list);

  const inputs = [
    "-f", "concat", "-safe", "0", "-i", resolve(raw, "frames.txt"),
    "-loop", "1", "-framerate", String(fps), "-i", resolve(CARDS, "background.png"),
    "-loop", "1", "-framerate", String(fps), "-i", resolve(CARDS, "phone-mask.png"),
  ];
  let filter =
    `[0:v]fps=${fps},scale=${phone.w}:${phone.h}:flags=lanczos,format=rgba[ph0];` +
    `[2:v]format=gray[m];[ph0][m]alphamerge[ph];` +
    `[1:v]format=rgba[bg];[bg][ph]overlay=${phone.x}:${phone.y}:shortest=1[v1]`;
  let last = "[v1]";
  if (scene.caption) {
    const c = timeOf(scene.narration, scene.caption.at);
    const png = resolve(CARDS, `caption-${scene.n}.png`);
    const h = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=height", "-of", "csv=p=0", png]).toString().trim());
    inputs.push("-loop", "1", "-framerate", String(fps), "-i", png);
    filter +=
      `;[3:v]format=rgba,fade=t=in:st=${c.toFixed(2)}:d=0.4:alpha=1,fade=t=out:st=${(c + 3).toFixed(2)}:d=0.4:alpha=1[cap]` +
      `;${last}[cap]overlay=x=${LAYOUT.caption.x}:y=${Math.round(LAYOUT.caption.centerY - h / 2)}:enable='between(t,${c.toFixed(2)},${(c + 3.5).toFixed(2)})'[v2]`;
    last = "[v2]";
  }
  filter += `;${last}format=yuv420p[v]`;
  ff([...inputs, "-filter_complex", filter, "-map", "[v]", "-t", String(seconds), ...ENCODE, out]);
}

/** Scene 9: the phone part, then the end card fading in on the final "Ladle:". */
function closingScene(scene, out) {
  const app = out.replace(/\.mp4$/, "-app.mp4");
  phoneScene(scene, app);
  const t = timeOf(scene.narration, "Ladle: the recipe knows;");
  ff([
    "-i", app,
    "-loop", "1", "-framerate", String(fps), "-t", String(scene.seconds), "-i", resolve(CARDS, "end.png"),
    "-filter_complex", `[0:v]settb=1/${fps},fps=${fps},format=yuv420p[a];[1:v]settb=1/${fps},fps=${fps},format=yuv420p[e];[a][e]xfade=transition=fade:duration=0.8:offset=${(t - 0.4).toFixed(3)},format=yuv420p[v]`,
    "-map", "[v]", "-t", String(scene.seconds), ...ENCODE, out,
  ]);
}

/** Scene 1: title, the two quotes (about 4 s each), both quotes, then the idea card. */
function introScene(scene, out) {
  const at = (phrase) => timeOf(scene.narration, phrase);
  const q1 = at("Cal AI");
  const q2 = at("MyFitnessPal");
  cardSequence(
    [
      { png: resolve(CARDS, "title.png"), at: 0 },
      { png: resolve(CARDS, "quote1.png"), at: q1 },
      { png: resolve(CARDS, "quote2.png"), at: q2 },
      { png: resolve(CARDS, "quotes.png"), at: q2 + 4.2 },
      { png: resolve(CARDS, "idea.png"), at: at("Ladle is built around one idea:") },
    ],
    scene.seconds,
    out,
  );
}

function composeScene(scene) {
  mkdirSync(resolve(OUT, "scenes"), { recursive: true });
  const out = resolve(OUT, "scenes", `scene-${scene.n}.mp4`);
  if (scene.n === 1) introScene(scene, out);
  else if (scene.n === 9) closingScene(scene, out);
  else phoneScene(scene, out);
  return out;
}

/** Subtitles for one scene only (for test clips), in that scene's own time. */
function sceneAss(scene, path) {
  const full = readFileSync(resolve(OUT, "ladle-demo.ass"), "utf8");
  const header = full.slice(0, full.indexOf("[Events]"));
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const t = (s) => {
    const cs = Math.round(s * 100);
    return `${Math.floor(cs / 360000)}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`;
  };
  const events = sceneCues(scene.narration)
    .map((c) => `Dialogue: 0,${t(c.start)},${t(c.end)},Sub,,0,0,0,,${c.lines.join("\\N")}`)
    .join("\n");
  writeFileSync(path, `${header}[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events}\n`);
}

function burn(input, ass, out) {
  ff(["-i", input, "-vf", `ass=${ass}:fontsdir=${FONTS}`, ...ENCODE, out]);
}

const which = process.argv[2] ?? "all";
writeSubtitles(OUT);
if (which === "all") {
  const files = SCENES.map(composeScene);
  writeFileSync(resolve(OUT, "scenes.txt"), files.map((f) => `file '${f}'`).join("\n") + "\n");
  ff(["-f", "concat", "-safe", "0", "-i", resolve(OUT, "scenes.txt"), "-c", "copy", "-movflags", "+faststart", resolve(OUT, "ladle-demo-clean.mp4")]);
  burn(resolve(OUT, "ladle-demo-clean.mp4"), resolve(OUT, "ladle-demo.ass"), resolve(OUT, "ladle-demo-subtitled.mp4"));
  console.log("done: ladle-demo-clean.mp4, ladle-demo-subtitled.mp4, scenes/");
} else {
  const scene = SCENES.find((s) => s.n === Number(which));
  const clean = composeScene(scene);
  if (process.argv.includes("--test")) {
    mkdirSync(resolve(OUT, "test"), { recursive: true });
    const ass = resolve(OUT, "test", `scene-${scene.n}.ass`);
    sceneAss(scene, ass);
    const out = resolve(OUT, "test", `scene-${scene.n}-test.mp4`);
    burn(clean, ass, out);
    console.log("test clip:", out, existsSync(out));
  }
}
