// The one AI interface every screen calls. Engines behind it can change
// (scripted demo answers, the mock rule-based engine, later real Claude)
// without touching the screens.

import type {
  CorrectionEstimate,
  ExtractedRecipe,
  FoodResult,
  PlateAnalysis,
} from "./schemas";
import type { MealType, PhotoColor, Recipe } from "../types";

export type { CorrectionEstimate, ExtractedRecipe, FoodResult, PlateAnalysis } from "./schemas";

/** The bundled demo files, recognised by a hidden tag rather than by their bytes. */
export type DemoAsset = "recipe-card" | "sample-plate";

export type ExtractInput =
  | { kind: "text"; text: string; sourceUrl?: string }
  | { kind: "image"; file: Blob; demoAsset?: DemoAsset };

export type ExtractOptions = {
  /** Progress from 0 to 1 (photo text recognition). */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/** What the plate matcher needs to know about each saved recipe. */
export type RecipeSummary = {
  id: string;
  name: string;
  key?: string;
  cuisine: string | null;
  servings: number;
  usualPortion: number;
  mealTypes?: MealType[];
  createdAt: string;
  lastOpenedAt?: string | null;
  lastEatenAt: string | null;
};

export type { MealType, PhotoColor } from "../types";

/** The user's history, which the mock uses the way a real assistant would use what it knows. */
export type PlateContext = {
  /** ISO time the photo was taken. */
  now: string;
  logs: { recipeId: string | null; at: string; portion: number; photoColor?: PhotoColor }[];
  batches: { recipeId: string; cookedAt: string; servingsLeft: number }[];
  photoColor?: PhotoColor;
  demoAsset?: DemoAsset;
};

export interface LadleAI {
  extractRecipe(input: ExtractInput, options?: ExtractOptions): Promise<ExtractedRecipe>;
  analyzePlate(input: {
    photo: Blob;
    recipes: RecipeSummary[];
    context: PlateContext;
  }): Promise<PlateAnalysis>;
  estimateCorrection(input: {
    recipe: Recipe | null;
    text: string;
    /** Servings on this plate, so recipe-based changes are scaled to the plate (default 1). */
    portion?: number;
  }): Promise<CorrectionEstimate>;
  searchFood(query: string): Promise<FoodResult[]>;
  estimateRestaurantPlate(input: { photo?: Blob; dishType: string }): Promise<FoodResult>;
}

/** A friendly error any engine can throw; screens show `message` as is. */
export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}
