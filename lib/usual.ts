// "Your usual" on Today: the most likely meal for now, ranked by the same rules
// as plate matching (history, weekday, time of day, recently cooked), but
// without a photo. If this meal is already logged, Ladle looks ahead to the
// next one; once dinner is logged (or late at night) there's no suggestion.

import { rankRecipes } from "./mock-ai/plate";
import type { PlateContext, RecipeSummary } from "./ai/types";
import { isSameDay } from "./format";
import type { AppData, MealType, Recipe } from "./types";

export type UsualSlot = Exclude<MealType, "snack">;

const SLOTS: UsualSlot[] = ["breakfast", "lunch", "dinner"];

/** A typical time for each meal, used for ranking. */
const SLOT_TIME: Record<UsualSlot, [number, number]> = {
  breakfast: [8, 0],
  lunch: [12, 30],
  dinner: [19, 0],
};

/** Which meal a time of day belongs to (late afternoon counts towards dinner). */
function slotAt(d: Date): UsualSlot | null {
  const h = d.getHours();
  if (h < 4) return null; // the middle of the night: no suggestion
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  return "dinner";
}

/** Today's logs in a meal's time window (breakfast 4–11, lunch 11–15, dinner 17–24). */
function loggedIn(data: AppData, slot: UsualSlot, now: Date): boolean {
  return data.logs.some((l) => {
    const d = new Date(l.at);
    if (!isSameDay(d, now)) return false;
    const h = d.getHours();
    return slot === "breakfast" ? h >= 4 && h < 11 : slot === "lunch" ? h >= 11 && h < 15 : h >= 17;
  });
}

/** The meal to suggest for: now, or the next one if this one is logged. Null when done for the day. */
export function usualSlot(data: AppData, now: Date): UsualSlot | null {
  const current = slotAt(now);
  if (!current) return null;
  for (const slot of SLOTS.slice(SLOTS.indexOf(current))) {
    if (!loggedIn(data, slot, now)) return slot;
  }
  return null;
}

export type UsualSuggestion = {
  recipe: Recipe;
  /** It's eaten at this meal on this weekday (or it's simply the best match). */
  usual: boolean;
};

/**
 * Up to three suggestions for the meal, best first. `weekday` treats today as
 * another day (the "Treat today as Thursday" test control passes 4).
 */
export function usualSuggestions(
  data: AppData,
  now: Date,
  weekday?: number,
): { slot: UsualSlot; suggestions: UsualSuggestion[] } | null {
  const slot = usualSlot(data, now);
  if (!slot || data.recipes.length === 0) return null;

  // Rank at the meal's typical time (e.g. 7 pm for dinner, even at 4 pm or 9 pm),
  // so "what you usually eat on this day at this time" matches your past meals.
  const at = new Date(now);
  at.setHours(SLOT_TIME[slot][0], SLOT_TIME[slot][1], 0, 0);
  const summaries: RecipeSummary[] = data.recipes.map((r) => ({
    id: r.id,
    name: r.name,
    key: r.key,
    cuisine: r.cuisine,
    servings: r.servings,
    usualPortion: r.usualPortion,
    mealTypes: r.mealTypes,
    createdAt: r.createdAt,
    lastOpenedAt: r.lastOpenedAt ?? null,
    lastEatenAt: r.lastEatenAt,
  }));
  const context: PlateContext = {
    now: at.toISOString(),
    logs: data.logs.map((l) => ({ recipeId: l.recipeId, at: l.at, portion: l.portion })),
    batches: data.batches.map((b) => ({
      recipeId: b.recipeId,
      cookedAt: b.cookedAt,
      servingsLeft: b.servingsLeft,
    })),
    weekday,
  };
  // No photo: a fixed tie-breaker, so the order is the same every time.
  const ranked = rankRecipes(summaries, context, 0).slice(0, 3);
  return {
    slot,
    suggestions: ranked.map((r) => ({
      recipe: data.recipes.find((x) => x.id === r.id)!,
      usual: r.reasons.includes("usual for this day and time"),
    })),
  };
}
