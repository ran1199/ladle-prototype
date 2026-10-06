// The shapes every AI engine (scripted, mock, and later live Claude) must return.
// Each result is checked against these zod schemas before a screen uses it, so a
// faulty engine shows a friendly error instead of breaking the app.
// Field names follow the original API plan; a few optional fields marked
// "Ladle extension" carry extra hints for the screens.

import { z } from "zod";

export const ExtractedIngredientSchema = z.object({
  /** The line as written in the source. */
  text: z.string(),
  quantity: z.number().nullable(),
  unit: z.string(),
  item: z.string(),
  grams: z.number().nullable(),
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  vague: z.boolean(),
  unreadable: z.boolean(),
  /** Ladle extension: a vague amount Ladle filled in with a middle value (no question asked). */
  estimated: z.boolean().optional(),
});

export const QuestionOptionSchema = z.object({
  label: z.string(),
  /** Calories this answer adds to the recipe (amount questions). */
  kcalDelta: z.number(),
  /** Ladle extension: fat in grams for this answer, so macros stay in step. */
  fat: z.number().optional(),
  /** Ladle extension: the servings this answer sets (servings questions). */
  servings: z.number().optional(),
});

export const ClarifyingQuestionSchema = z.object({
  id: z.string(),
  /** The ingredient this question is about (-1 for a servings question). */
  ingredientIndex: z.number().int(),
  prompt: z.string(),
  options: z.array(QuestionOptionSchema).min(2),
  /** Ladle extension: "servings" questions set the number of servings. Default "amount". */
  kind: z.enum(["amount", "servings"]).optional(),
});

export const ExtractedRecipeSchema = z.object({
  name: z.string().min(1),
  servings: z.number().int().positive(),
  servingsConfidence: z.enum(["stated", "inferred", "unknown"]),
  ingredients: z.array(ExtractedIngredientSchema),
  questions: z.array(ClarifyingQuestionSchema).max(3),
  /** Ladle extension: a short note for the review screen, e.g. "Check that nothing's missing." */
  notice: z.string().optional(),
  /** Ladle extension: photo text recognition was unsure; show the photo and an editable box. */
  lowConfidence: z.boolean().optional(),
  /** Ladle extension: the raw text read from a photo, to prefill that box. */
  readText: z.string().optional(),
});

export const PlateAnalysisSchema = z.object({
  matchRecipeId: z.string().nullable(),
  matchConfidence: z.number().min(0).max(1),
  alternatives: z.array(z.string()),
  portionServings: z.number().positive(),
  portionReason: z.string(),
  isNewFood: z.boolean(),
  /** Ladle extension (scripted demo): a photo-only rough guess for "It's something new". */
  roughGuess: z.object({ name: z.string(), kcal: z.number() }).nullable().optional(),
  /** Ladle extension (scripted demo): the dish looks like a recipe worth importing. */
  suggestImport: z.boolean().optional(),
});

export const CorrectionEstimateSchema = z.object({
  kcalDelta: z.number(),
  summary: z.string(),
  /** Ladle extension: false when the description couldn't be worked out. */
  recognized: z.boolean().optional(),
});

export const FoodResultSchema = z.object({
  name: z.string(),
  servingLabel: z.string(),
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export type ExtractedIngredient = z.infer<typeof ExtractedIngredientSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;
export type ExtractedRecipe = z.infer<typeof ExtractedRecipeSchema>;
export type PlateAnalysis = z.infer<typeof PlateAnalysisSchema>;
export type CorrectionEstimate = z.infer<typeof CorrectionEstimateSchema>;
export type FoodResult = z.infer<typeof FoodResultSchema>;
