"use client";

// The AI router, loaded the first time a screen needs it, so screens open
// without first downloading the simulated AI's ingredient tables.

import type { LadleAI } from "./types";

export function loadAI(): Promise<LadleAI> {
  return import("./index").then((m) => m.ai);
}
