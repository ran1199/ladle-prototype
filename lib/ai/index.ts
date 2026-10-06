"use client";

// The one place screens call for AI work. It sends the bundled demo inputs to
// the scripted engine (so usability tasks T1–T5 behave the same for everyone)
// and everything else to the mock engine; adds a short "thinking" delay so the
// prototype feels like a real assistant; can simulate an error for testing;
// and checks every answer against the shared shapes before a screen uses it.

import type { z } from "zod";
import { mockEngine } from "../mock-ai/engine";
import { getTestFlags, setTestFlags } from "../testControls";
import {
  CorrectionEstimateSchema,
  ExtractedRecipeSchema,
  FoodResultSchema,
  PlateAnalysisSchema,
} from "./schemas";
import { scriptedExtract, scriptedPlate } from "./scripted";
import { AIError, type LadleAI } from "./types";

export { AIError } from "./types";
export type * from "./types";

/** Waits `ms`, or rejects if cancelled. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Cancelled", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Runs one AI request: simulated error (if the test control is on), the work
 * itself, a minimum "thinking" time, and the shape check.
 */
async function run<T>(
  work: () => Promise<T>,
  schema: z.ZodType<T>,
  minMs: number,
  signal?: AbortSignal,
): Promise<T> {
  const flags = getTestFlags();
  if (flags.failNext) {
    setTestFlags({ failNext: false });
    await wait(minMs, signal);
    throw new AIError("Ladle’s AI didn’t answer this time. Try again.");
  }
  const [result] = await Promise.all([work(), wait(minMs, signal)]);
  const parsed = schema.safeParse(result);
  if (!parsed.success) {
    console.error("AI result didn’t match the expected shape", parsed.error);
    throw new AIError("Something went wrong reading that. Try again.");
  }
  return parsed.data;
}

export const ai: LadleAI = {
  extractRecipe(input, options) {
    const scripted = scriptedExtract(input);
    const ms =
      scripted !== null ? between(1500, 2000) : input.kind === "image" ? between(2000, 3200) : between(1200, 2500);
    return run(
      async () => scripted ?? mockEngine.extractRecipe(input, options),
      ExtractedRecipeSchema,
      ms,
      options?.signal,
    );
  },

  analyzePlate(input) {
    const scripted = input.context.demoAsset === "sample-plate";
    return run(
      async () => (scripted ? scriptedPlate(input.recipes) : mockEngine.analyzePlate(input)),
      PlateAnalysisSchema,
      scripted ? between(1500, 2000) : between(1800, 2800),
    );
  },

  estimateCorrection(input) {
    return run(() => mockEngine.estimateCorrection(input), CorrectionEstimateSchema, between(900, 1400));
  },

  searchFood(query) {
    return run(() => mockEngine.searchFood(query), FoodResultSchema.array().max(8), 250);
  },

  estimateRestaurantPlate(input) {
    return run(() => mockEngine.estimateRestaurantPlate(input), FoodResultSchema, between(1200, 2000));
  },
};
