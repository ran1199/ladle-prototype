// The mock plate matcher. It can't see food, so it does what a helpful
// assistant would do with what it knows: it ranks your saved recipes by your
// own history. What you cooked or opened in the last few hours comes first,
// then what you usually eat on this weekday at this time, then what you eat
// most often and most recently, and breakfast foods in the morning, dinners in
// the evening. A light colour signal from the photo gives a small extra nudge.
// Same photo + same history → same answer.

import type { PlateAnalysis } from "../ai/schemas";
import type { MealType, PhotoColor, PlateContext, RecipeSummary } from "../ai/types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Breakfast 4–11, lunch 11–15, snack 15–17, dinner 17–22, snack late at night. */
export function mealTypeAt(date: Date): MealType {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

/** FNV-1a hash of the photo's bytes: a stable number for the same photo. */
export function hashBytes(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(bytes.length / 65536)); // sample big photos
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h ^ bytes.length) >>> 0;
}

function hashString(s: string, seed: number): number {
  let h = seed >>> 0 || 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function colorDistance(a: PhotoColor, b: PhotoColor): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

export type Ranked = { id: string; score: number; reasons: string[] };

/** Scores every recipe for this photo and moment. Highest first. */
export function rankRecipes(
  recipes: RecipeSummary[],
  context: PlateContext,
  photoHash: number,
): Ranked[] {
  const now = new Date(context.now);
  const t = now.getTime();
  const meal = mealTypeAt(now);

  return recipes
    .map((r) => {
      let score = 0;
      const reasons: string[] = [];
      const logs = context.logs.filter((l) => l.recipeId === r.id);

      // Cooked, imported or opened in the last 12 hours: most likely what's on the plate.
      const batch = context.batches.find(
        (b) => b.recipeId === r.id && b.servingsLeft > 0 && t - new Date(b.cookedAt).getTime() < 12 * HOUR,
      );
      const opened = [r.createdAt, r.lastOpenedAt]
        .filter((d): d is string => !!d)
        .some((d) => t - new Date(d).getTime() >= 0 && t - new Date(d).getTime() < 12 * HOUR);
      if (batch) {
        score += 5;
        reasons.push("cooked recently");
      } else if (opened) {
        score += 4;
        reasons.push("opened recently");
      } else if (
        context.batches.some(
          (b) => b.recipeId === r.id && b.servingsLeft > 0 && t - new Date(b.cookedAt).getTime() < 4 * DAY,
        )
      ) {
        score += 2;
        reasons.push("leftovers");
      }

      // Same weekday, similar time of day.
      const sameSlot = logs.filter((l) => {
        const d = new Date(l.at);
        const hours = Math.abs(d.getHours() + d.getMinutes() / 60 - (now.getHours() + now.getMinutes() / 60));
        return d.getDay() === now.getDay() && hours <= 2 && t - d.getTime() > HOUR;
      }).length;
      if (sameSlot > 0) {
        score += Math.min(3, 1.5 * sameSlot);
        reasons.push("usual for this day and time");
      }

      // Recent and frequent.
      const last = r.lastEatenAt ? t - new Date(r.lastEatenAt).getTime() : Infinity;
      if (last < 2 * DAY) score += 1;
      else if (last < 7 * DAY) score += 0.5;
      const lastMonth = logs.filter((l) => t - new Date(l.at).getTime() < 30 * DAY).length;
      score += Math.min(2, 0.3 * lastMonth);

      // Breakfast foods in the morning, dinners in the evening.
      if (r.mealTypes?.length) score += r.mealTypes.includes(meal) ? 1 : -1;

      // Light photo signal: if this photo's average colour is close to photos
      // logged for this recipe before, nudge it up a little. Colour alone can't
      // tell dishes apart, so it never outweighs history.
      if (context.photoColor) {
        const near = logs
          .filter((l) => l.photoColor)
          .map((l) => colorDistance(l.photoColor!, context.photoColor!));
        const best = near.length ? Math.min(...near) : Infinity;
        if (best < 40) score += 0.8;
        else if (best < 80) score += 0.4;
      }

      // A tiny, stable tie-breaker from the photo, so equal scores always resolve the same way.
      score += (hashString(r.id, photoHash) % 1000) / 10000;
      return { id: r.id, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Confidence from how strong the top match is and how far ahead of the next it is. */
export function confidenceFor(ranked: Ranked[]): number {
  if (ranked.length === 0) return 0;
  const top = ranked[0].score;
  const next = ranked[1]?.score ?? 0;
  const c = 0.3 + 0.06 * top + 0.06 * (top - next);
  return Math.round(Math.min(0.92, Math.max(0.1, c)) * 100) / 100;
}

export function analyzePlateMock(
  recipes: RecipeSummary[],
  context: PlateContext,
  photoHash: number,
): PlateAnalysis {
  const ranked = rankRecipes(recipes, context, photoHash);
  const confidence = confidenceFor(ranked);
  if (ranked.length === 0 || confidence < 0.5) {
    return {
      matchRecipeId: null,
      matchConfidence: confidence,
      alternatives: ranked.slice(0, 3).map((r) => r.id),
      portionServings: 1,
      portionReason: "Looks like a standard serving",
      isNewFood: true,
    };
  }
  const top = recipes.find((r) => r.id === ranked[0].id)!;
  const loggedBefore = context.logs.some((l) => l.recipeId === top.id);
  return {
    matchRecipeId: top.id,
    matchConfidence: confidence,
    alternatives: ranked.slice(1, 3).map((r) => r.id),
    portionServings: loggedBefore ? top.usualPortion : 1,
    portionReason: loggedBefore ? "Your usual portion" : "Looks like a standard serving",
    isNewFood: false,
  };
}
