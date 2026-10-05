"use client";

// The recipe being imported, kept between the import sheet, the "reading the
// recipe" screen and the review screen. Saved in browser storage, so a reload
// on the review screen doesn't lose the user's answers.

import type { ExtractResult, ImportSource } from "./importTypes";
import { storage } from "./storage";
import type { Ingredient } from "./types";

const KEY = "ladle:draft:v1";

/** A clarifying-question answer: an option index, or "unsure" (middle value, marked as an estimate). */
export type Answer = number | "unsure";

/** An ingredient on the review screen: `uid` keeps rows stable, `qid` links a clarifying question. */
export type ReviewIngredient = Ingredient & { uid: string; qid?: string };

export type ReviewState = {
  name: string;
  servings: number;
  ingredients: ReviewIngredient[];
  answers: Record<string, Answer>;
};

export type Draft = {
  id: string;
  source: ImportSource;
  /** Null while Ladle is still reading the recipe. */
  result: ExtractResult | null;
  review: ReviewState | null;
};

export function getDraft(): Draft | null {
  return storage.get<Draft>(KEY);
}

export function setDraft(draft: Draft): void {
  storage.set(KEY, draft);
}

export function clearDraft(): void {
  storage.remove(KEY);
}

export function startDraft(source: ImportSource): Draft {
  const draft: Draft = {
    id: `draft-${Date.now().toString(36)}`,
    source,
    result: null,
    review: null,
  };
  setDraft(draft);
  return draft;
}

/** First review state from an extraction: the vague lines wait for their question. */
export function reviewFromResult(result: ExtractResult): ReviewState {
  return {
    name: result.name,
    servings: result.servings,
    ingredients: result.ingredients.map((i, index) => ({
      uid: `ing-${index}`,
      qid: result.questions.find((q) => q.ingredientIndex === index)?.id,
      text: i.text,
      quantity: i.quantity,
      unit: i.unit,
      item: i.item,
      grams: i.grams,
      kcal: i.kcal,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      vague: i.vague,
      unreadable: i.unreadable,
    })),
    answers: {},
  };
}
