// The shape of a recipe extraction, shared with the AI engines (lib/ai/schemas.ts),
// and where an import came from.

export type {
  ClarifyingQuestion,
  ExtractedIngredient,
  ExtractedRecipe as ExtractResult,
  QuestionOption,
} from "./ai/schemas";

/** Where a recipe is being imported from. */
export type ImportSource =
  | { kind: "link"; url: string }
  | { kind: "text"; text: string; link?: string }
  /** `src` is the bundled example card, or the user's photo as a (downscaled) data URL. */
  | { kind: "photo"; src: string; alt: string; isExample: boolean };
