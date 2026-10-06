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
  /** Weight in grams, when known. */
  grams?: number | null;
  /** The amount was vague in the source (e.g. "oil for frying"). */
  vague?: boolean;
  /** Ladle couldn't read this line clearly; the user should check it. */
  unreadable?: boolean;
  /** The user picked "Not sure", so Ladle used a sensible middle value. */
  estimated?: boolean;
};

export type ChangeEntry = {
  /** ISO date-time of the change. */
  at: string;
  /** Plain description, e.g. "oil 2 → 3 tbsp". */
  summary: string;
};

export type Recipe = {
  id: string;
  /** Stable key from the imported name (e.g. "garlic-chicken-stir-fry"), used to match fixes. */
  key?: string;
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
  /** A photo of the recipe (e.g. the recipe card it was imported from). */
  photo?: { src: string; alt: string } | null;
  lastEatenAt: string | null;
  createdAt: string;
  /** When the recipe card was last opened (a hint for plate matching). */
  lastOpenedAt?: string | null;
  /** Usual meals for this dish (a hint for plate matching), e.g. ["breakfast"]. */
  mealTypes?: MealType[];
  history: ChangeEntry[];
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** A photo's average colour (0–255 per channel). */
export type PhotoColor = { r: number; g: number; b: number };

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
  /** "Just this time" quick fixes; their calories are included in `kcal`. */
  adjustments?: LogAdjustment[];
  /** Average colour of the plate photo it was logged from (kept instead of the photo). */
  photoColor?: PhotoColor;
};

export type Batch = {
  id: string;
  recipeId: string;
  cookedAt: string;
  servingsMade: number;
  servingsLeft: number;
};

export type FixKind = "more-oil" | "less-oil" | "halved" | "swapped" | "other";

/**
 * A quick correction. "once" changed one log ("Just this time"); "always" changed
 * the saved recipe; "dismissed" means the user said "Not now" to a suggestion.
 * Ladle learns from these: the same "once" fix twice → suggest updating the recipe.
 */
export type Fix = {
  id: string;
  at: string;
  /** Matches a recipe by a stable key, so a fix can apply before the recipe is saved. */
  recipeKey: string;
  kind: FixKind;
  /** Which variant, e.g. "+1 tbsp", "chicken thighs>chicken breast", "cheese". */
  detail: string;
  scope: "once" | "always" | "dismissed";
  /** The log a "once" fix changed (removed again if that log is deleted). */
  logId?: string;
};

/** A "Just this time" change on one log, e.g. { label: "More oil: +1 tbsp", kcalDelta: 30 }. */
export type LogAdjustment = { fixId: string; label: string; kcalDelta: number };

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
