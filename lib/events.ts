// What just happened in the app, announced by the screens: a recipe saved, a
// meal logged, a quick fix applied, an edit, a wrong turn. The usability
// session recorder listens to these to time tasks and count edits. Nothing
// here is stored by itself.

import type { FixKind } from "./types";

/** How a meal was logged. */
export type LogVia =
  | "plate-photo" // the sample photo or a photo matched to a recipe
  | "portion-helper" // a photo, with the portion set on the pan
  | "one-tap" // a "Log" button on a recipe card or the Recipes list
  | "portion-picker" // "Log a portion" with the portion chips (Recipes list)
  | "leftovers" // the leftovers nudge on Today
  | "pantry" // "Log" on a Pantry batch
  | "suggestion" // the "Your usual" card on Today
  | "food" // other food: barcode, search, restaurant, rough estimate
  | "other";

export type LadleEvent =
  | { type: "recipe-saved"; recipeId: string; key: string; oilAnswer?: string }
  | {
      type: "meal-logged";
      recipeId: string | null;
      /** The recipe's key (e.g. "air-fryer-garlic-chicken"), if it's a recipe. */
      recipeKey?: string | null;
      via: LogVia;
      portion: number;
      /** The portion Ladle suggested, when it suggested one. */
      suggestedPortion?: number;
      /** True if the suggested recipe and portion were logged unchanged. */
      acceptedEstimate?: boolean;
    }
  | { type: "fix-applied"; recipeKey: string | null; kind: FixKind; scope: "once" | "always" }
  | { type: "suggestion-resolved"; accept: boolean }
  /** The participant changed something Ladle filled in (an ingredient, servings, a portion). */
  | { type: "edit"; what: string }
  /** Back, Cancel, closing a sheet without finishing. */
  | { type: "wrong-turn"; what: string }
  | { type: "tab"; tab: string };

type Listener = (event: LadleEvent) => void;

const listeners = new Set<Listener>();

export function emitEvent(event: LadleEvent): void {
  listeners.forEach((l) => l(event));
}

/** Listen for events. Returns a function that stops listening. */
export function onEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
