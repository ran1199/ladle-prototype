"use client";

// The app's single source of truth in the browser. Screens read it with
// useLadle() and change it through the actions below. Every change is saved
// to storage straight away.

import { useSyncExternalStore } from "react";
import { addFoodLog, addRecipe, addRecipeLog, editLog, removeLog, type NewRecipe } from "./logic";
import { buildSeed } from "./seed";
import { storage } from "./storage";
import type { AppData, Confidence, LogEntry, Prefs } from "./types";

const DATA_KEY = "ladle:data:v1";
const PREFS_KEY = "ladle:prefs:v1";

const DEFAULT_PREFS: Prefs = { welcomeDismissed: false, mode: "demo" };

export type LadleState = { data: AppData; prefs: Prefs };

let state: LadleState | null = null;
const listeners = new Set<() => void>();

function load(): LadleState {
  const saved = storage.get<AppData>(DATA_KEY);
  const data = saved && saved.version === 1 ? saved : buildSeed();
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

function setPrefs(update: Partial<Prefs>) {
  const current = getSnapshot();
  const prefs = { ...current.prefs, ...update };
  storage.set(PREFS_KEY, prefs);
  state = { ...current, prefs };
  emit();
}

export const actions = {
  /** Restore Maya's starting data. Keeps the welcome sheet dismissed and the mode. */
  resetDemo() {
    setData(() => buildSeed());
  },
  dismissWelcome() {
    setPrefs({ welcomeDismissed: true });
  },
  /** Log a portion of a saved recipe to today (optionally from a batch). */
  logRecipe(recipeId: string, portion: number, batchId?: string): LogEntry | null {
    let created: LogEntry | null = null;
    setData((data) => {
      const result = addRecipeLog(data, recipeId, portion, { batchId });
      created = result.log;
      return result.data;
    });
    return created;
  },
  /** Log food that isn't a saved recipe (e.g. a rough photo estimate). */
  logFood(food: { name: string; kcal: number; confidence: Confidence }): LogEntry {
    let created: LogEntry | null = null;
    setData((data) => {
      const result = addFoodLog(data, food);
      created = result.log;
      return result.data;
    });
    return created!;
  },
  updateLog(logId: string, changes: { portion?: number; at?: string }) {
    setData((data) => editLog(data, logId, changes));
  },
  /** Save an imported recipe. Returns its id. */
  saveRecipe(input: NewRecipe): string {
    let id = "";
    setData((data) => {
      const result = addRecipe(data, input);
      id = result.id;
      return result.data;
    });
    return id;
  },
  /** Delete a log (also used for Undo). */
  deleteLog(logId: string) {
    setData((data) => removeLog(data, logId));
  },
};
