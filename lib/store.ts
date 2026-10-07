"use client";

// The app's single source of truth in the browser. Screens read it with
// useLadle() and change it through the actions below. Every change is saved
// to storage straight away.

import { useSyncExternalStore } from "react";
import {
  addFoodLog,
  addRecipe,
  addRecipeLog,
  applyFix,
  editLog,
  activeBatch,
  removeLog,
  resolveSuggestion,
  startBatch,
  updateBatch,
  type NewRecipe,
} from "./logic";
import type { FixOption, Suggestion } from "./fixes";
import { DEMO_RECIPE_KEY } from "./ai/scripted";
import { buildSeed } from "./seed";
import { storage } from "./storage";
import { clearDraft } from "./draft";
import { emitEvent, type LogVia } from "./events";
import { clearPlate } from "./plate";
import { clearSessions } from "./sessions";
import type { AppData, Batch, Confidence, LogEntry, PhotoColor, Prefs, Profile } from "./types";

const DATA_KEY = "ladle:data:v1";
const PREFS_KEY = "ladle:prefs:v1";

const DEFAULT_PREFS: Prefs = { mode: "demo" };

export type LadleState = { data: AppData; prefs: Prefs };

/** What "Delete all data" leaves: Ladle with nothing in it. */
export function emptyData(): AppData {
  return {
    version: 1,
    profile: { name: "", sex: "female", dailyTarget: 1600, startingWeightKg: null },
    recipes: [],
    logs: [],
    batches: [],
    fixes: [],
  };
}

/** Everything Ladle keeps in this browser, for "Export my data". */
export function exportData(): string {
  const { data } = getSnapshot();
  return JSON.stringify(
    { app: "Ladle prototype", exportedAt: new Date().toISOString(), data },
    null,
    2,
  );
}

let state: LadleState | null = null;
const listeners = new Set<() => void>();

/** Brings data saved by an earlier version of the prototype up to date. */
export function upgrade(data: AppData): AppData {
  // Milestone 6 added meal types to Maya's recipes (a hint for plate matching).
  const seedMeals = new Map(buildSeed().recipes.map((r) => [r.id, r.mealTypes]));
  return {
    ...data,
    recipes: data.recipes.map((r) =>
      r.mealTypes || !seedMeals.get(r.id) ? r : { ...r, mealTypes: seedMeals.get(r.id) },
    ),
    // Milestone 5 added `detail` to fixes; the seeded one is "+1 tbsp" of oil.
    // The critique fixes moved the seeded fix from the stir-fry to the new
    // demo recipe, the air-fryer garlic chicken.
    fixes: data.fixes.map((f) => {
      const fix = f.detail ? f : { ...f, detail: f.kind === "more-oil" ? "+1 tbsp" : "" };
      return fix.id === "seed-fix-oil" ? { ...fix, recipeKey: DEMO_RECIPE_KEY } : fix;
    }),
  };
}

function load(): LadleState {
  const saved = storage.get<AppData>(DATA_KEY);
  const data = saved && saved.version === 1 ? upgrade(saved) : buildSeed();
  if (!saved) storage.set(DATA_KEY, data);
  const prefs = { ...DEFAULT_PREFS, ...storage.get<Partial<Prefs>>(PREFS_KEY) };
  return { data, prefs };
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): LadleState {
  if (!state) state = load();
  return state;
}

// On the server there is no browser storage, so screens render nothing until
// the page reaches the browser.
function getServerSnapshot(): LadleState | null {
  return null;
}

/** Read the current state. Returns null during the first server render. */
export function useLadle(): LadleState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function setData(update: (data: AppData) => AppData) {
  const current = getSnapshot();
  const data = update(current.data);
  storage.set(DATA_KEY, data);
  state = { ...current, data };
  emit();
}

export const actions = {
  /**
   * Restore Maya's starting data exactly ("Reset demo" / "Reset to test start"),
   * and drop any import or plate photo in progress.
   */
  resetDemo() {
    clearDraft();
    clearPlate();
    setData(() => buildSeed());
  },
  /** "Delete all data": an empty Ladle (no recipes, logs or batches) in this browser. */
  deleteAllData() {
    clearDraft();
    clearPlate();
    clearSessions();
    setData(() => emptyData());
  },
  /** Change profile fields (name, sex, daily target, starting weight). */
  updateProfile(changes: Partial<Profile>) {
    setData((data) => ({ ...data, profile: { ...data.profile, ...changes } }));
  },
  /**
   * Log a portion of a saved recipe to today (optionally from a batch).
   * `via` says how (plate photo, one-tap…); `suggestedPortion` is what Ladle
   * suggested, for the usability session recorder.
   */
  logRecipe(
    recipeId: string,
    portion: number,
    opts: {
      batchId?: string;
      photoColor?: PhotoColor;
      via?: LogVia;
      suggestedPortion?: number;
      acceptedEstimate?: boolean;
    } = {},
  ): LogEntry | null {
    let created: LogEntry | null = null;
    const { suggestedPortion, acceptedEstimate, ...logOpts } = opts;
    setData((data) => {
      // Cooked as a batch? Then this serving comes out of the batch.
      const batchId = logOpts.batchId ?? activeBatch(data, recipeId)?.id;
      const result = addRecipeLog(data, recipeId, portion, { ...logOpts, batchId });
      created = result.log;
      return result.data;
    });
    if (created) {
      const recipe = getSnapshot().data.recipes.find((r) => r.id === recipeId);
      emitEvent({
        type: "meal-logged",
        recipeId,
        recipeKey: recipe ? (recipe.key ?? recipe.id) : null,
        via: opts.via ?? "other",
        portion,
        suggestedPortion,
        acceptedEstimate,
      });
    }
    return created;
  },
  /** "Cook as a batch". Returns the new batch and a way to undo it. */
  startBatch(recipeId: string, servingsMade: number) {
    const before = getSnapshot().data.batches;
    let created = null as Batch | null;
    setData((data) => {
      const result = startBatch(data, recipeId, servingsMade);
      created = result.batch;
      return result.data;
    });
    return {
      batch: created!,
      undo: () => setData((data) => ({ ...data, batches: before })),
    };
  },
  /** "Still have it?" Yes / Clear, or fixing how many servings are left. */
  updateBatch(batchId: string, changes: { servingsLeft?: number; checkedAt?: string }) {
    setData((data) => updateBatch(data, batchId, changes));
  },
  /** Test control: make every batch look `days` older (to try "Still have it?"). */
  ageBatches(days: number) {
    const shift = (iso: string) =>
      new Date(new Date(iso).getTime() - days * 86_400_000).toISOString();
    setData((data) => ({
      ...data,
      batches: data.batches.map((b) => ({
        ...b,
        cookedAt: shift(b.cookedAt),
        ...(b.checkedAt ? { checkedAt: shift(b.checkedAt) } : {}),
      })),
    }));
  },
  /** Log food that isn't a saved recipe (e.g. a rough photo estimate). */
  logFood(food: {
    name: string;
    kcal: number;
    confidence: Confidence;
    portion?: number;
  }): LogEntry {
    let created: LogEntry | null = null;
    setData((data) => {
      const result = addFoodLog(data, food);
      created = result.log;
      return result.data;
    });
    emitEvent({ type: "meal-logged", recipeId: null, via: "food", portion: food.portion ?? 1 });
    return created!;
  },
  updateLog(logId: string, changes: { portion?: number; at?: string }) {
    setData((data) => editLog(data, logId, changes));
  },
  /** Save an imported recipe. Returns its id. `oilAnswer` is noted for test sessions. */
  saveRecipe(input: NewRecipe, opts: { oilAnswer?: string } = {}): string {
    let id = "";
    setData((data) => {
      const result = addRecipe(data, input);
      id = result.id;
      return result.data;
    });
    const key = getSnapshot().data.recipes.find((r) => r.id === id)?.key ?? id;
    emitEvent({ type: "recipe-saved", recipeId: id, key, oilAnswer: opts.oilAnswer });
    return id;
  },
  /** Apply a quick fix to a log. Returns a suggestion if the same fix was made twice. */
  applyFix(input: { option: FixOption; scope: "once" | "always"; logId: string }) {
    let suggestion: Suggestion | null = null;
    const before = getSnapshot().data;
    const log = before.logs.find((l) => l.id === input.logId);
    const recipe = before.recipes.find((r) => r.id === log?.recipeId);
    setData((data) => {
      const result = applyFix(data, input);
      suggestion = result.suggestion;
      return result.data;
    });
    emitEvent({
      type: "fix-applied",
      recipeKey: recipe ? (recipe.key ?? recipe.id) : null,
      kind: input.option.kind,
      scope: input.scope,
    });
    return suggestion as Suggestion | null;
  },
  /** "Update recipe" (accept) or "Not now". */
  resolveSuggestion(recipeId: string, suggestion: Suggestion, accept: boolean) {
    setData((data) => resolveSuggestion(data, recipeId, suggestion, accept));
    emitEvent({ type: "suggestion-resolved", accept });
  },
  /** Remember that a recipe card was opened (plate matching ranks it higher for a few hours). */
  markOpened(recipeId: string) {
    setData((data) => ({
      ...data,
      recipes: data.recipes.map((r) =>
        r.id === recipeId ? { ...r, lastOpenedAt: new Date().toISOString() } : r,
      ),
    }));
  },
  /** Close (true) or bring back (false) the "Try Ladle in 60 seconds" card. */
  setTourDismissed(dismissed: boolean) {
    const current = getSnapshot();
    const prefs = { ...current.prefs, tourDismissed: dismissed };
    storage.set(PREFS_KEY, prefs);
    state = { ...current, prefs };
    emit();
  },
  /** "Use this photo for the recipe?" → Use photo. */
  setRecipePhoto(recipeId: string, photo: { src: string; alt: string }) {
    setData((data) => ({
      ...data,
      recipes: data.recipes.map((r) =>
        r.id === recipeId ? { ...r, photo: { ...photo, fromPlate: true } } : r,
      ),
    }));
  },
  /** "Use this photo for the recipe?" → Not now (Ladle won't ask again for this recipe). */
  declineRecipePhoto(recipeId: string) {
    setData((data) => ({
      ...data,
      recipes: data.recipes.map((r) => (r.id === recipeId ? { ...r, photoDeclined: true } : r)),
    }));
  },
  /** Delete a log (also used for Undo). */
  deleteLog(logId: string) {
    setData((data) => removeLog(data, logId));
  },
};
