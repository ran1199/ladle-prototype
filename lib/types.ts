// Shared data shapes for Ladle. Everything here is stored in the visitor's own browser.

export type Mode = "demo" | "live";

/** How sure Ladle is about a calorie number (shown as 1–3 dots). */
export type Confidence = "rough" | "good" | "confirmed";

export type Ingredient = {
  /** The line as written in the recipe, e.g. "2 tbsp neutral oil". */
  text: string;
  quantity: number | null;
  unit: string;
  item: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ChangeEntry = {
  /** ISO date-time of the change. */
  at: string;
  /** Plain description, e.g. "oil 2 → 3 tbsp". */
  summary: string;
};

export type Recipe = {
  id: string;
  name: string;
  cuisine: string | null;
  servings: number;
  ingredients: Ingredient[];
  /** How many logs of this recipe the user has confirmed (3+ = "Your recipe ✓"). */
  confirmedLogs: number;
  /** The portion the user usually eats, in servings. */
  usualPortion: number;
  /** Which placeholder illustration to show until a real photo is added. */
  illustration: "bowl" | "plate" | "jar" | "pot";
  /** Where the recipe came from (a link, or a note like "Recipe card"). */
  source: string | null;
  lastEatenAt: string | null;
  createdAt: string;
  history: ChangeEntry[];
};

export type LogEntry = {
  id: string;
  /** ISO date-time the food was eaten. */
  at: string;
  name: string;
  recipeId: string | null;
  batchId: string | null;
  /** Portion in servings. */
  portion: number;
  kcal: number;
  confidence: Confidence;
  /** True if this log added one to its recipe's confirmed count (undone if the log is deleted). */
  countedConfirmation?: boolean;
  /** The recipe's previous "last eaten" time, restored if this log is deleted. */
  prevLastEatenAt?: string | null;
};

export type Batch = {
  id: string;
  recipeId: string;
  cookedAt: string;
  servingsMade: number;
  servingsLeft: number;
};

/** A quick correction made to a log ("Just this time") or a recipe ("Always"). */
export type Fix = {
  id: string;
  at: string;
  /** Matches a recipe by a stable key, so a fix can apply before the recipe is saved. */
  recipeKey: string;
  kind: "more-oil" | "less-oil" | "halved" | "swapped" | "other";
  scope: "once" | "always";
};

export type Profile = {
  name: string;
  sex: "female" | "male";
  dailyTarget: number;
  startingWeightKg: number | null;
};

/** Maya's data: what "Reset demo" restores. */
export type AppData = {
  version: 1;
  profile: Profile;
  recipes: Recipe[];
  logs: LogEntry[];
  batches: Batch[];
  fixes: Fix[];
};

/** Settings that survive "Reset demo". */
export type Prefs = {
  welcomeDismissed: boolean;
  mode: Mode;
};
