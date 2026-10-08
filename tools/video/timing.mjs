// Subtitle timing. With a recorded voiceover, every word's time comes from the
// recording (forced alignment); without one, a normal speaking pace is used:
// 150 words a minute (0.4 s a word),
// plus 0.25 s after commas, colons and semicolons and 0.5 s after a sentence.
// Each scene's narration starts 0.8 s in. Every word gets a start time; cues
// are built from those times at natural phrase breaks.
//
//   node tools/video/timing.mjs   → writes the SRT, ASS, voiceover guide and a report

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SCENES, sceneStarts } from "./script.mjs";

const WORD = 0.4;
const COMMA = 0.25;
const SENTENCE = 0.5;
const LEAD_IN = 0.8;
const MAX_LINE = 42;
const MAX_CUE = 6;
const MIN_CUE = 1.2;
const GAP = 0.1;
const MAX_CPS = 17;

/** A line or cue never breaks after these (keeps "Cal AI", "533 calories", "about 240" whole). */
const NO_BREAK_AFTER =
  /^(?:a|an|the|to|of|and|or|her|his|its|with|about|on|in|at|for|from|by|like|Cal|one|two|three|four|is|are|has|just|who|that|\d[\d,.]*)$/i;

const endsSentence = (w) => /[.?!]["”]?$/.test(w);
const endsPhrase = (w) => /[,:;]["”]?$/.test(w);

/** Where the recorded voice starts in each scene (seconds), when there is a recording. */
export const VOICE_LEAD = 0.7;

// Ran's recorded voiceover, aligned word by word to the script (tools/video/voice/align.py).
const ALIGNMENT_FILE = new URL("./voice/alignment.json", import.meta.url);
const ALIGNMENT = existsSync(ALIGNMENT_FILE) ? JSON.parse(readFileSync(ALIGNMENT_FILE, "utf8")) : {};

/** The recording for a scene: which take, and where its speech starts and ends in the take. */
export function voiceFor(narration) {
  const scene = SCENES.find((s) => s.narration === narration);
  const a = scene && ALIGNMENT[scene.n];
  if (!a?.ok) return null;
  return { take: a.take, words: a.words, speechStart: a.words[0].start, speechEnd: a.words[a.words.length - 1].end };
}

/**
 * Word-by-word times for one scene (seconds from the scene's start): from the
 * recorded voice when there is one, otherwise at the normal speaking pace.
 */
export function wordTimes(narration) {
  const voice = voiceFor(narration);
  if (voice) {
    return voice.words.map((w) => ({
      text: w.text,
      start: VOICE_LEAD + w.start - voice.speechStart,
      end: VOICE_LEAD + w.end - voice.speechStart,
    }));
  }
  let t = LEAD_IN;
  return narration.split(/\s+/).map((text) => {
    const start = t;
    const end = start + WORD;
    t = end + (endsSentence(text) ? SENTENCE : endsPhrase(text) ? COMMA : 0);
    return { text, start, end };
  });
}

/** Seconds into the scene where `phrase` is spoken (its first word), for syncing actions. */
export function timeOf(narration, phrase) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']+/g, "");
  const words = wordTimes(narration);
  const target = phrase.split(/\s+/).map(norm);
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, k) => norm(words[i + k].text) === w)) return words[i].start;
  }
  throw new Error(`"${phrase}" isn't in the narration`);
}

const chars = (ws) => ws.map((w) => w.text).join(" ").length;

/** Splits a run of words at the best break near the middle (never after NO_BREAK_AFTER words). */
function splitAt(ws) {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 1; i < ws.length; i++) {
    if (NO_BREAK_AFTER.test(ws[i - 1].text.replace(/[^\w,.]/g, ""))) continue;
    const a = chars(ws.slice(0, i));
    const b = chars(ws.slice(i));
    // Prefer breaking after punctuation, then balanced halves.
    const score = Math.abs(a - b) - (endsPhrase(ws[i - 1].text) ? 25 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best < 0 ? Math.ceil(ws.length / 2) : best;
}

/** One cue's text as 1–2 lines of at most 42 characters. */
function lines(ws) {
  if (chars(ws) <= MAX_LINE) return [ws.map((w) => w.text).join(" ")];
  const i = splitAt(ws);
  return [ws.slice(0, i), ws.slice(i)].map((p) => p.map((w) => w.text).join(" "));
}

function fits(ws) {
  if (chars(ws) > MAX_LINE * 2) return false;
  const l = lines(ws);
  if (l.length > 2 || l.some((x) => x.length > MAX_LINE)) return false;
  const dur = ws[ws.length - 1].end - ws[0].start;
  return dur <= MAX_CUE - 0.3 && chars(ws) / Math.max(MIN_CUE, dur + 0.3) <= MAX_CPS;
}

/** Cues for one scene: phrases merged up to two lines, never across a sentence end. */
export function sceneCues(narration) {
  const words = wordTimes(narration);
  // 1. Phrases: split after every comma, colon or sentence end.
  const phrases = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (endsSentence(w.text) || endsPhrase(w.text)) {
      phrases.push(cur);
      cur = [];
    }
  }
  if (cur.length) phrases.push(cur);
  // 2. Long phrases are split at a natural word break.
  const pieces = [];
  const push = (ws) => {
    if (fits(ws) || ws.length < 2) pieces.push(ws);
    else {
      const i = splitAt(ws);
      push(ws.slice(0, i));
      push(ws.slice(i));
    }
  };
  phrases.forEach(push);
  // 3. Merge neighbouring pieces into one cue while they fit and stay in one sentence.
  const cues = [];
  for (const p of pieces) {
    const last = cues[cues.length - 1];
    const lastEndsSentence = last && endsSentence(last[last.length - 1].text);
    if (last && !lastEndsSentence && fits([...last, ...p])) cues[cues.length - 1] = [...last, ...p];
    else if (last && lastEndsSentence && last[last.length - 1].end - last[0].start < MIN_CUE - 0.3 && fits([...last, ...p]))
      cues[cues.length - 1] = [...last, ...p];
    else cues.push(p);
  }
  // 4. Timing: from the first word to just after the last, at least 1.2 s, a 0.1 s gap.
  return cues.map((ws, i) => {
    const next = cues[i + 1];
    const start = ws[0].start;
    let end = ws[ws.length - 1].end + 0.3;
    end = Math.max(end, start + MIN_CUE);
    end = Math.min(end, start + MAX_CUE);
    if (next) end = Math.min(end, next[0].start - GAP);
    const text = lines(ws);
    return { start, end, lines: text, cps: text.join(" ").length / (end - start) };
  });
}

/** All cues for the video, in video time, with their scene. */
export function allCues() {
  const starts = sceneStarts();
  return SCENES.flatMap((s, i) =>
    sceneCues(s.narration).map((c) => ({ ...c, start: c.start + starts[i], end: c.end + starts[i], scene: s })),
  );
}

const pad = (n, w = 2) => String(n).padStart(w, "0");
function srtTime(t) {
  const ms = Math.round(t * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}
function assTime(t) {
  const cs = Math.round(t * 100);
  return `${Math.floor(cs / 360000)}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`;
}
const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

export function writeSubtitles(outDir) {
  mkdirSync(outDir, { recursive: true });
  const cues = allCues();

  const srt = cues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.lines.join("\n")}\n`)
    .join("\n");
  writeFileSync(`${outDir}/ladle-demo.srt`, srt);

  // Burned-in style: Inter Medium 40 px, warm charcoal, centred in the band under the phone.
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter Medium,40,&H0020242B,&H0020242B,&H00F0F7FB,&H00F0F7FB,0,0,0,0,100,100,0,0,1,0,0,2,200,200,52,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Sub,,0,0,0,,${c.lines.join("\\N")}`).join("\n")}
`;
  writeFileSync(`${outDir}/ladle-demo.ass`, ass);

  const starts = sceneStarts();
  let guide = `# Ladle demo: voiceover guide

Read each line when its time comes. The times match the subtitles in
\`ladle-demo-subtitled.mp4\` and \`ladle-demo.srt\` (a normal speaking pace: about
150 words a minute, with short pauses after commas and full stops).

`;
  SCENES.forEach((s, i) => {
    guide += `## Scene ${s.n}: ${s.name} (${clock(starts[i])}–${clock(starts[i] + s.seconds)})\n\n| # | Start | End | Say |\n| --- | --- | --- | --- |\n`;
    cues.forEach((c, k) => {
      if (c.scene === s) guide += `| ${k + 1} | ${clock(c.start)} | ${clock(c.end)} | ${c.lines.join(" ").replace(/\|/g, "\\|")} |\n`;
    });
    guide += "\n";
  });
  writeFileSync(`${outDir}/voiceover-guide.md`, guide);
  return cues;
}

/** Scene-by-scene check: narration length vs window, total, fastest cue. */
export function report() {
  const cues = allCues();
  const rows = SCENES.map((s) => {
    const w = wordTimes(s.narration);
    const ends = w[w.length - 1].end;
    return { scene: s.n, name: s.name, voice: voiceFor(s.narration)?.take ?? "none (estimated pace)", narration: +ends.toFixed(1), window: s.seconds, spare: +(s.seconds - ends).toFixed(1) };
  });
  const fastest = cues.reduce((a, c) => (c.cps > a.cps ? c : a));
  const longest = cues.reduce((a, c) => (c.end - c.start > a.end - a.start ? c : a));
  return {
    rows,
    total: SCENES.reduce((t, s) => t + s.seconds, 0),
    cues: cues.length,
    fastest: { cps: +fastest.cps.toFixed(1), text: fastest.lines.join(" ") },
    longestCue: +(longest.end - longest.start).toFixed(1),
    shortestCue: +Math.min(...cues.map((c) => c.end - c.start)).toFixed(1),
    widestLine: Math.max(...cues.flatMap((c) => c.lines.map((l) => l.length))),
  };
}

if (process.argv[1]?.endsWith("timing.mjs")) {
  const out = process.argv[2] ?? "video-output";
  writeSubtitles(out);
  console.log(JSON.stringify(report(), null, 1));
}
