// Copies the on-device text recognition files (Tesseract.js) from node_modules
// into public/tesseract, so Ladle serves them itself instead of a public CDN.
// Runs automatically before `npm run dev` and `npm run build` (also on Vercel).
// The copied files are not committed (see .gitignore).

import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const out = "public/tesseract";
mkdirSync(join(out, "core"), { recursive: true });
mkdirSync(join(out, "lang"), { recursive: true });

copyFileSync("node_modules/tesseract.js/dist/worker.min.js", join(out, "worker.min.js"));

// All core builds: Tesseract picks the right one for each device.
for (const f of readdirSync("node_modules/tesseract.js-core")) {
  if (f.endsWith(".wasm.js")) copyFileSync(join("node_modules/tesseract.js-core", f), join(out, "core", f));
}

// English language data (integer "best" model, the library's default).
copyFileSync(
  "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
  join(out, "lang", "eng.traineddata.gz"),
);

console.log("Copied OCR assets to public/tesseract");
