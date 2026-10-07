// Rules shared by several screens: confidence levels, portions, calories and
// time-of-day groups. Kept free of React so they're easy to read and test.

import {
  applyToRecipe,
  optionFor,
  pendingSuggestion,
  type FixOption,
  type Suggestion,
} from "./fixes";
import { recipeTotalKcal } from "./seed";
import type { AppData, Batch, Confidence, Fix, LogEntry, Recipe } from "./types";

/** Confirmed portions needed before a recipe shows "Your recipe ✓". */
export const CONFIRMATIONS_NEEDED = 3;

/**
 * Ways of logging where the user actively confirms the portion. Only these
 * count towards "Your recipe ✓"; quick logs (one-tap, "Your usual", leftovers,
 * Pantry) don't.
 */
export const CONFIRMING_VIA: NonNullable<LogEntry["via"]>[] = [
  "plate-photo",
  "portion-helper",
  "portion-picker",
];

export function confirmsPortion(via: LogEntry["via"]): boolean {
  return !!via && CONFIRMING_VIA.includes(via);
}

/** How long a batch shows in the leftovers nudge. */
export const BATCH_FRESH_DAYS = 4;

/**
 * "Your recipe ✓" needs 3+ confirmed logs and no pending correction (a repeated
 * "Just this time" fix the user hasn't decided on yet). Otherwise "Good estimate".
 */
export function recipeConfidence(recipe: Recipe, fixes: Fix[] = []): Confidence {
  return recipe.confirmedLogs >= CONFIRMATIONS_NEEDED && !pendingSuggestion(recipe, fixes)
    ? "confirmed"
    : "good";
}

/** Calories from "Just this time" fixes on a log. */
function adjustmentKcal(log: LogEntry): number {
  return (log.adjustments ?? []).reduce((s, a) => s + a.kcalDelta, 0);
}

/** Calories for a portion, from the exact recipe total (2 servings of 2,133 ÷ 4 = 1,067). */
export function kcalFor(recipe: Recipe, portion: number): number {
  return Math.round(exactKcalPerServing(recipe) * portion);
}

/** kcal per serving before rounding (for portion chips). */
export function exactKcalPerServing(recipe: Recipe): number {
  return recipeTotalKcal(recipe) / recipe.servings;
}

const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** 0.5 → "½", 1.5 → "1½", 1.25 → "1¼", 2 → "2". */
export function formatAmount(n: number): string {
  const whole = Math.floor(n);
  const rest = Math.round((n - whole) * 100) / 100;
  const frac = FRACTIONS[rest];
  if (rest === 0) return String(whole);
  if (frac) return whole === 0 ? frac : `${whole}${frac}`;
  return String(Math.round(n * 100) / 100);
}

/** 1 → "1 serving", 1.5 → "1½ servings", 0.5 → "½ serving". */
export function formatPortion(n: number): string {
  return `${formatAmount(n)} ${n > 1 ? "servings" : "serving"}`;
}

export type MealGroup = "Morning" | "Midday" | "Afternoon" | "Evening" | "Late";

export const MEAL_GROUPS: MealGroup[] = ["Morning", "Midday", "Afternoon", "Evening", "Late"];

/** Groups meals by the clock, so the user never picks a meal type. */
export function mealGroup(iso: string): MealGroup {
  const d = new Date(iso);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 11) return "Morning";
  if (h >= 11 && h < 15) return "Midday";
  if (h >= 15 && h < 17) return "Afternoon";
  if (h >= 17 && h < 22) return "Evening";
  return "Late";
}

/** Days since the batch was cooked, or since the user last said they still have it. */
function batchAgeDays(batch: Batch, now: Date): number {
  const since = Math.max(
    new Date(batch.cookedAt).getTime(),
    batch.checkedAt ? new Date(batch.checkedAt).getTime() : 0,
  );
  return (now.getTime() - since) / 86_400_000;
}

/** A batch with servings left, cooked (or checked) in the last 4 days: shown in the leftovers nudge. */
export function isFreshBatch(batch: Batch, now: Date): boolean {
  return batch.servingsLeft > 0 && batchAgeDays(batch, now) <= BATCH_FRESH_DAYS;
}

/** A batch with servings left but older than 4 days: Ladle asks "Still have it?". */
export function isStaleBatch(batch: Batch, now: Date): boolean {
  return batch.servingsLeft > 0 && batchAgeDays(batch, now) > BATCH_FRESH_DAYS;
}

/** The recipe's batch that logging should take from (the freshest with servings left), if any. */
export function activeBatch(data: AppData, recipeId: string, now = new Date()): Batch | null {
  return (
    data.batches
      .filter((b) => b.recipeId === recipeId && isFreshBatch(b, now))
      .sort((a, b) => b.cookedAt.localeCompare(a.cookedAt))[0] ?? null
  );
}

/**
 * Calories for a portion. From a batch, a serving is the batch's share of the
 * pot (the pot may have made more or fewer servings than the recipe says).
 */
export function logKcal(recipe: Recipe, portion: number, batch?: Batch | null): number {
  if (!batch || batch.servingsMade === recipe.servings) return kcalFor(recipe, portion);
  return Math.round((recipeTotalKcal(recipe) / batch.servingsMade) * portion);
}

/** "Cook as a batch": a new batch of the recipe. Earlier batches of it are finished. */
export function startBatch(
  data: AppData,
  recipeId: string,
  servingsMade: number,
  at = new Date(),
): { data: AppData; batch: Batch } {
  const batch: Batch = {
    id: newId("batch"),
    recipeId,
    cookedAt: at.toISOString(),
    servingsMade,
    servingsLeft: servingsMade,
  };
  return {
    batch,
    data: {
      ...data,
      batches: [
        ...data.batches.map((b) => (b.recipeId === recipeId ? { ...b, servingsLeft: 0 } : b)),
        batch,
      ],
    },
  };
}

/** Changes a batch (e.g. "Still have it? Yes", "Clear", or fixing the servings left). */
export function updateBatch(
  data: AppData,
  batchId: string,
  changes: Partial<Pick<Batch, "servingsLeft" | "checkedAt">>,
): AppData {
  return {
    ...data,
    batches: data.batches.map((b) =>
      b.id === batchId
        ? {
            ...b,
            ...changes,
            servingsLeft: Math.min(
              b.servingsMade,
              Math.max(0, changes.servingsLeft ?? b.servingsLeft),
            ),
          }
        : b,
    ),
  };
}

/** True if the most recent log is more than a day old (or there are no logs). */
export function isReturningAfterBreak(logs: LogEntry[], now: Date): boolean {
  if (logs.length === 0) return false;
  const last = Math.max(...logs.map((l) => new Date(l.at).getTime()));
  return now.getTime() - last > 86_400_000;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Adds a log of a saved recipe. Returns the new data and the new log. */
export function addRecipeLog(
  data: AppData,
  recipeId: string,
  portion: number,
  opts: {
    batchId?: string;
    at?: Date;
    photoColor?: LogEntry["photoColor"];
    via?: LogEntry["via"];
    /** Counts towards "Your recipe ✓". Defaults to whether `via` confirms the portion. */
    confirmed?: boolean;
  } = {},
): { data: AppData; log: LogEntry | null } {
  const recipe = data.recipes.find((r) => r.id === recipeId);
  if (!recipe) return { data, log: null };
  const confirmed = opts.confirmed ?? confirmsPortion(opts.via);
  const at = (opts.at ?? new Date()).toISOString();
  const batch = opts.batchId ? (data.batches.find((b) => b.id === opts.batchId) ?? null) : null;
  const log: LogEntry = {
    id: newId("log"),
    at,
    name: recipe.name,
    recipeId,
    batchId: opts.batchId ?? null,
    portion,
    kcal: logKcal(recipe, portion, batch),
    confidence: recipeConfidence(recipe, data.fixes),
    confirmed,
    countedConfirmation: confirmed,
    prevLastEatenAt: recipe.lastEatenAt,
    ...(opts.photoColor ? { photoColor: opts.photoColor } : {}),
    ...(opts.via ? { via: opts.via } : {}),
  };
  return {
    log,
    data: {
      ...data,
      logs: [...data.logs, log],
      recipes: data.recipes.map((r) =>
        r.id === recipeId
          ? { ...r, confirmedLogs: r.confirmedLogs + (confirmed ? 1 : 0), lastEatenAt: at }
          : r,
      ),
      batches: opts.batchId
        ? data.batches.map((b) =>
            b.id === opts.batchId
              ? { ...b, servingsLeft: Math.max(0, b.servingsLeft - portion) }
              : b,
          )
        : data.batches,
    },
  };
}

/** Removes a log and undoes what it changed (confirmed count, last eaten, batch servings). */
export function removeLog(data: AppData, logId: string): AppData {
  const log = data.logs.find((l) => l.id === logId);
  if (!log) return data;
  return {
    ...data,
    logs: data.logs.filter((l) => l.id !== logId),
    // A deleted (or undone) log takes its "Just this time" fixes with it.
    fixes: data.fixes.filter((f) => f.logId !== logId),
    recipes: data.recipes.map((r) => {
      if (r.id !== log.recipeId) return r;
      return {
        ...r,
        confirmedLogs: log.countedConfirmation ? Math.max(0, r.confirmedLogs - 1) : r.confirmedLogs,
        lastEatenAt:
          r.lastEatenAt === log.at && log.prevLastEatenAt !== undefined
            ? log.prevLastEatenAt
            : r.lastEatenAt,
      };
    }),
    batches: data.batches.map((b) =>
      b.id === log.batchId
        ? { ...b, servingsLeft: Math.min(b.servingsMade, b.servingsLeft + log.portion) }
        : b,
    ),
  };
}

/**
 * Changes a log's portion and/or time. Calories follow the recipe; batches stay
 * in step. Changing the portion confirms it: a quick log now counts towards
 * "Your recipe ✓".
 */
export function editLog(
  data: AppData,
  logId: string,
  changes: { portion?: number; at?: string },
): AppData {
  const log = data.logs.find((l) => l.id === logId);
  if (!log) return data;
  const recipe = data.recipes.find((r) => r.id === log.recipeId);
  const batch = data.batches.find((b) => b.id === log.batchId) ?? null;
  const portion = changes.portion ?? log.portion;
  const base = log.kcal - adjustmentKcal(log);
  const kcal =
    (recipe ? logKcal(recipe, portion, batch) : Math.round((base / log.portion) * portion)) +
    adjustmentKcal(log);
  const delta = portion - log.portion;
  const newlyConfirmed = delta !== 0 && !!recipe && !log.countedConfirmation;
  return {
    ...data,
    logs: data.logs.map((l) =>
      l.id === logId
        ? {
            ...l,
            portion,
            kcal,
            at: changes.at ?? l.at,
            ...(newlyConfirmed ? { confirmed: true, countedConfirmation: true } : {}),
          }
        : l,
    ),
    recipes: newlyConfirmed
      ? data.recipes.map((r) =>
          r.id === recipe.id ? { ...r, confirmedLogs: r.confirmedLogs + 1 } : r,
        )
      : data.recipes,
    batches: data.batches.map((b) =>
      b.id === log.batchId && delta !== 0
        ? {
            ...b,
            servingsLeft: Math.min(b.servingsMade, Math.max(0, b.servingsLeft - delta)),
          }
        : b,
    ),
  };
}

/** "Tomato and egg stir-fry" → "tomato-and-egg-stir-fry" */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "recipe"
  );
}

/**
 * Short, stable keys for recipes whose full names are long. The demo recipe
 * keeps "air-fryer-garlic-chicken", which its seeded fix and the test tasks use.
 */
const KEY_ALIASES: Record<string, string> = {
  "air-fryer-garlic-chicken-with-mushrooms": "air-fryer-garlic-chicken",
};

/** The key a recipe gets from its name (matches fixes to the recipe). */
export function recipeKeyFor(name: string): string {
  const slug = slugify(name);
  return KEY_ALIASES[slug] ?? slug;
}

export type NewRecipe = Pick<
  Recipe,
  "name" | "servings" | "ingredients" | "source" | "photo" | "illustration" | "cuisine"
> & { historyNote: string };

/** Adds an imported recipe. Returns the new data and the recipe's id. */
export function addRecipe(data: AppData, input: NewRecipe): { data: AppData; id: string } {
  const key = recipeKeyFor(input.name);
  let id = key;
  for (let n = 2; data.recipes.some((r) => r.id === id); n++) id = `${key}-${n}`;
  const now = new Date().toISOString();
  const recipe: Recipe = {
    id,
    key,
    name: input.name,
    cuisine: input.cuisine,
    servings: input.servings,
    ingredients: input.ingredients,
    confirmedLogs: 0,
    usualPortion: 1,
    illustration: input.illustration,
    source: input.source,
    photo: input.photo ?? null,
    lastEatenAt: null,
    createdAt: now,
    history: [{ at: now, summary: input.historyNote }],
  };
  return { id, data: { ...data, recipes: [recipe, ...data.recipes] } };
}

export function sumMacros(ingredients: Recipe["ingredients"]) {
  return ingredients.reduce(
    (t, i) => ({
      kcal: t.kcal + i.kcal,
      protein: t.protein + i.protein,
      carbs: t.carbs + i.carbs,
      fat: t.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Logs food that isn't a saved recipe (e.g. a photo-only rough estimate). */
export function addFoodLog(
  data: AppData,
  food: { name: string; kcal: number; confidence: Confidence; portion?: number },
): { data: AppData; log: LogEntry } {
  const log: LogEntry = {
    id: newId("log"),
    at: new Date().toISOString(),
    name: food.name,
    recipeId: null,
    batchId: null,
    portion: food.portion ?? 1,
    kcal: Math.round(food.kcal),
    confidence: food.confidence,
  };
  return { log, data: { ...data, logs: [...data.logs, log] } };
}

function fixRecord(recipe: Recipe, option: FixOption, scope: Fix["scope"], logId?: string): Fix {
  return {
    id: newId("fix"),
    at: new Date().toISOString(),
    recipeKey: recipe.key ?? recipe.id,
    kind: option.kind,
    detail: option.detail,
    scope,
    ...(logId ? { logId } : {}),
  };
}

/**
 * Applies a quick fix. "once" changes only the log (adds an adjustment);
 * "always" updates the saved recipe (with a history line) and recalculates the log.
 * Returns the suggestion to show next, if the same "once" fix has now been made twice.
 */
export function applyFix(
  data: AppData,
  input: { option: FixOption; scope: "once" | "always"; logId: string },
): { data: AppData; suggestion: Suggestion | null } {
  const log = data.logs.find((l) => l.id === input.logId);
  if (!log) return { data, suggestion: null };
  const recipe = data.recipes.find((r) => r.id === log.recipeId) ?? null;
  const { option } = input;

  if (input.scope === "once" || !recipe) {
    const fix = recipe ? fixRecord(recipe, option, "once", log.id) : null;
    const adjustment = {
      fixId: fix?.id ?? newId("adj"),
      label: option.label,
      kcalDelta: option.plateDelta,
    };
    const next: AppData = {
      ...data,
      fixes: fix ? [...data.fixes, fix] : data.fixes,
      logs: data.logs.map((l) =>
        l.id === log.id
          ? {
              ...l,
              kcal: l.kcal + option.plateDelta,
              adjustments: [...(l.adjustments ?? []), adjustment],
            }
          : l,
      ),
    };
    return { data: next, suggestion: recipe ? pendingSuggestion(recipe, next.fixes) : null };
  }

  const updated = applyToRecipe(recipe, option);
  const next: AppData = {
    ...data,
    fixes: [...data.fixes, fixRecord(recipe, option, "always")],
    recipes: data.recipes.map((r) => (r.id === recipe.id ? updated : r)),
    logs: data.logs.map((l) =>
      l.id === log.id
        ? {
            ...l,
            kcal:
              logKcal(updated, l.portion, data.batches.find((b) => b.id === l.batchId)) +
              adjustmentKcal(l),
          }
        : l,
    ),
  };
  return { data: next, suggestion: null };
}

/** The user's answer to "You usually … Update your recipe?" */
export function resolveSuggestion(
  data: AppData,
  recipeId: string,
  suggestion: Suggestion,
  accept: boolean,
): AppData {
  const recipe = data.recipes.find((r) => r.id === recipeId);
  if (!recipe) return data;
  const option = optionFor(recipe, suggestion.kind, suggestion.detail);
  if (!option) return data;
  const fix = fixRecord(recipe, option, accept ? "always" : "dismissed");
  return {
    ...data,
    fixes: [...data.fixes, fix],
    recipes: accept
      ? data.recipes.map((r) => (r.id === recipeId ? applyToRecipe(r, option) : r))
      : data.recipes,
  };
}
