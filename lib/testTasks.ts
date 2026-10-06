// Which usability-test task (T1–T5) is next, worked out from what's in the
// app: the moderator's "next task" indicator.

import { isSameDay } from "./format";
import type { AppData } from "./types";

export const TASKS: { id: string; short: string }[] = [
  { id: "T1", short: "Add the stir-fry video" },
  { id: "T2", short: "Log the plate" },
  { id: "T3", short: "Fix today’s oil" },
  { id: "T4", short: "Log the usual adobo" },
  { id: "T5", short: "Add Grandma’s recipe card" },
];

const STIR_FRY = "garlic-chicken-stir-fry";

/** For each task, whether it's done. */
export function tasksDone(data: AppData, now = new Date()): Record<string, boolean> {
  const stirFry = data.recipes.find((r) => r.key === STIR_FRY);
  const today = data.logs.filter((l) => isSameDay(new Date(l.at), now));
  return {
    T1: !!stirFry,
    T2: !!stirFry && today.some((l) => l.recipeId === stirFry.id),
    // The seeded fix doesn't count; any fix made during the session does.
    T3: data.fixes.some((f) => f.recipeKey === STIR_FRY && f.id !== "seed-fix-oil"),
    T4: today.some((l) => l.recipeId === "chicken-adobo"),
    T5: data.recipes.some((r) => r.key === "grandma-s-braised-pork"),
  };
}

/** The first task not done yet, or null when all five are done. */
export function nextTask(data: AppData, now = new Date()) {
  const done = tasksDone(data, now);
  return TASKS.find((t) => !done[t.id]) ?? null;
}
