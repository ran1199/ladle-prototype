// Ran's voiceover: cleans each recorded take, places it in its scene, and adds
// the voice to the finished videos.
//
// Each take (video-output/voice/takes/julian-N.m4a) is trimmed to its speech
// (from the word alignment in voice/alignment.json, with a little air before
// and after), then gently processed so all takes sound alike: rumble removed
// (high-pass 80 Hz), light noise reduction, a soft de-esser, mild compression
// (2:1), and two-pass loudness normalisation to −16 LUFS (true peak −1.5 dB).
// Short fades avoid clicks. A very quiet room-tone bed runs under the whole
// video, so the pauses between lines never drop to dead silence. Each take
// starts so its first word lands 0.7 s into its scene (VOICE_LEAD), which is
// where the subtitles and the recorded actions expect it.
//
//   node tools/video/voice.mjs   → voice/voiceover.wav, and the voiced videos and scene clips

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, sceneStarts } from "./script.mjs";
import { VOICE_LEAD, voiceFor } from "./timing.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../video-output");
const VOICE = resolve(OUT, "voice");
const RATE = 48000;
const PRE = 0.45; // air kept before the first word
const POST = 0.6; // and after the last
/** The room-tone bed's level, matched to the background in the cleaned takes (about −50 dB). */
const ROOM_DB = -51;

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());

const CLEAN = "highpass=f=80,afftdn=nr=8:nf=-55:tn=1,deesser=i=0.35,acompressor=threshold=-24dB:ratio=2:attack=8:release=160:makeup=2";

/** Measures a cleaned take's loudness (loudnorm pass 1; ffmpeg prints it on stderr). */
function loudnormJson(take, pre) {
  const out = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "$0" -af "$1" -f null - 2>&1 | sed -n '/^{/,/^}/p'`, take, `${pre},loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json`], { encoding: "utf8" });
  return JSON.parse(out);
}

/** Trims, cleans and normalises one take; returns the file and where it starts in its scene. */
function cleanTake(scene) {
  const v = voiceFor(scene.narration);
  const take = resolve(VOICE, "takes", `${v.take}.m4a`);
  const from = Math.max(0, v.speechStart - PRE);
  const to = Math.min(duration(take), v.speechEnd + POST);
  const len = to - from;
  const pre = `atrim=start=${from.toFixed(3)}:end=${to.toFixed(3)},asetpts=PTS-STARTPTS,aresample=${RATE},${CLEAN}`;
  const m = loudnormJson(take, pre);
  const norm = `loudnorm=I=-16:TP=-1.5:LRA=9:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const out = resolve(VOICE, `scene-${scene.n}-voice.wav`);
  // Fades only over the air around the speech, never over a word (a take may end right on its last word).
  const fadeIn = Math.max(0.03, Math.min(0.3, v.speechStart - from - 0.08));
  const fadeOut = Math.max(0.03, Math.min(0.4, to - v.speechEnd - 0.08));
  ff([
    "-i", take,
    "-af", `${pre},${norm},aresample=${RATE},afade=t=in:d=${fadeIn.toFixed(3)},afade=t=out:st=${(len - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)},pan=stereo|c0=c0|c1=c0`,
    "-ar", String(RATE), "-c:a", "pcm_s16le", out,
  ]);
  // Where it starts in its scene: the first word at VOICE_LEAD.
  const offset = VOICE_LEAD - (v.speechStart - from);
  return { scene, file: out, offset, len, loudness: m.input_i };
}

mkdirSync(VOICE, { recursive: true });
const starts = sceneStarts();
const total = SCENES.reduce((t, s) => t + s.seconds, 0);
const clips = SCENES.filter((s) => voiceFor(s.narration)).map(cleanTake);
for (const c of clips) {
  console.log(`scene ${c.scene.n}: ${c.len.toFixed(1)} s of voice at ${(starts[SCENES.indexOf(c.scene)] + c.offset).toFixed(2)} s (take was ${c.loudness} LUFS)`);
}

// Room tone: soft pink noise, shaped like a quiet room and calibrated to ROOM_DB.
const ROOM_SHAPE = `highpass=f=100,lowpass=f=5000,pan=stereo|c0=c0|c1=c0`;
const rms = (src) =>
  Number(
    execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -f lavfi -t 6 -i "$0" -af "$1,astats=measure_overall=RMS_level" -f null - 2>&1 | grep "RMS level dB" | tail -1 | awk '{print $NF}'`, src, ROOM_SHAPE], { encoding: "utf8" }).trim(),
  );
const probe = rms(`anoisesrc=color=pink:amplitude=0.01:sample_rate=${RATE}:seed=7`);
const amplitude = 0.01 * Math.pow(10, (ROOM_DB - probe) / 20);

// The full voice track: room tone, plus every take at its place, then a safety limiter.
const inputs = ["-f", "lavfi", "-t", String(total), "-i", `anoisesrc=color=pink:amplitude=${amplitude.toFixed(6)}:sample_rate=${RATE}:seed=7,${ROOM_SHAPE}`];
let filter = "";
clips.forEach((c, i) => {
  const at = Math.round((starts[SCENES.indexOf(c.scene)] + c.offset) * 1000);
  inputs.push("-i", c.file);
  filter += `[${i + 1}:a]adelay=${at}|${at}[v${i}];`;
});
filter += `[0:a]${clips.map((_, i) => `[v${i}]`).join("")}amix=inputs=${clips.length + 1}:normalize=0:duration=first,alimiter=limit=0.89:level=false[a]`;
const track = resolve(VOICE, "voiceover.wav");
ff([...inputs, "-filter_complex", filter, "-map", "[a]", "-t", String(total), "-ar", String(RATE), "-c:a", "pcm_s16le", track]);

// The voiced videos: same pictures (copied, not re-encoded), voice as AAC 192 kbps.
const withVoice = (video, out, start = 0, len = total) =>
  ff(["-i", video, "-ss", start.toFixed(3), "-t", len.toFixed(3), "-i", track, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
withVoice(resolve(OUT, "ladle-demo-subtitled.mp4"), resolve(OUT, "ladle-demo-subtitled-voice.mp4"));
withVoice(resolve(OUT, "ladle-demo-clean.mp4"), resolve(OUT, "ladle-demo-clean-voice.mp4"));
mkdirSync(resolve(OUT, "scenes-voice"), { recursive: true });
SCENES.forEach((s, i) => withVoice(resolve(OUT, "scenes", `scene-${s.n}.mp4`), resolve(OUT, "scenes-voice", `scene-${s.n}.mp4`), starts[i], s.seconds));
const loud = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "$0" -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input (Integrated|True Peak)"`, track], { encoding: "utf8" });
console.log("voice track:", loud.trim().replace(/\s+/g, " "));
