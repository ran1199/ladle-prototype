// "Try Ladle in 60 seconds": which of the three tour steps are done, worked
// out from what's actually in the app (not from which buttons were tapped).

import { DEMO_RECIPE_KEY } from "./ai/scripted";
import { isSameDay } from "./format";
import type { AppData, LogEntry, Recipe } from "./types";

export type TourProgress = {
  /** Step 1: the demo recipe, once it's imported. */
  recipe: Recipe | null;
  /** Step 2: today's meal of it logged from a plate photo. */
  plateLog: LogEntry | null;
  /** Step 3 opens this meal: today's latest meal of the demo recipe. */
  mealToFix: LogEntry | null;
  /** Step 3: a quick fix made on the demo recipe (the seeded one doesn't count). */
  fixed: boolean;
};

export function tourProgress(data: AppData, now = new Date()): TourProgress {
  const recipe = data.recipes.find((r) => r.key === DEMO_RECIPE_KEY) ?? null;
  const meals = recipe
    ? data.logs
        .filter((l) => l.recipeId === recipe.id && isSameDay(new Date(l.at), now))
        .sort((a, b) => b.at.localeCompare(a.at))
    : [];
  // Older logs have no `via`; a saved photo colour means they came from a photo.
  const fromPhoto = (l: LogEntry) =>
    l.via === "plate-photo" || l.via === "portion-helper" || (!l.via && !!l.photoColor);
  return {
    recipe,
    plateLog: meals.find(fromPhoto) ?? null,
    mealToFix: meals[0] ?? null,
    fixed: data.fixes.some(
      (f) => f.recipeKey === DEMO_RECIPE_KEY && f.id !== "seed-fix-oil" && f.scope !== "dismissed",
    ),
  };
}
