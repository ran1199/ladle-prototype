// The shape of a recipe extraction. Demo mode returns scripted results in this
// shape; in Milestone 6 the /api/extract-recipe route returns the same JSON from Claude.

export type ExtractedIngredient = {
  /** The line as written in the source. */
  text: string;
  quantity: number | null;
  unit: string;
  item: string;
  grams: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  vague: boolean;
  unreadable: boolean;
};

export type QuestionOption = {
  label: string;
  /** Calories this answer adds to the recipe. */
  kcalDelta: number;
  /** Fat in grams for this answer (cooking fats), so macros stay in step. */
  fat?: number;
};

export type ClarifyingQuestion = {
  id: string;
  ingredientIndex: number;
  prompt: string;
  options: QuestionOption[];
};

export type ExtractResult = {
  name: string;
  servings: number;
  servingsConfidence: "stated" | "inferred" | "unknown";
  ingredients: ExtractedIngredient[];
  questions: ClarifyingQuestion[];
};

/** Where a recipe is being imported from. */
export type ImportSource =
  | { kind: "link"; url: string }
  | { kind: "text"; text: string; link?: string }
  | { kind: "photo"; src: string; alt: string; isExample: boolean };
