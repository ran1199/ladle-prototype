// Approximate values for a prototype. Not for medical or dietary use.
//
// Restaurant plates by dish type: the middle of a typical range for one
// restaurant portion. Always shown as a Rough estimate.

import type { FoodResult } from "../ai/schemas";

export type DishType = {
  label: string;
  /** Typical calories for one restaurant portion. */
  range: [number, number];
  /** Share of calories from protein, carbs and fat (adds up to 1). */
  split: [protein: number, carbs: number, fat: number];
};

export const DISH_TYPES: DishType[] = [
  { label: "Burger", range: [550, 900], split: [0.2, 0.35, 0.45] },
  { label: "Pizza slice", range: [250, 400], split: [0.17, 0.45, 0.38] },
  { label: "Pasta", range: [700, 1100], split: [0.15, 0.5, 0.35] },
  { label: "Ramen", range: [500, 900], split: [0.17, 0.48, 0.35] },
  { label: "Pho", range: [400, 700], split: [0.25, 0.55, 0.2] },
  { label: "Curry with rice", range: [700, 1000], split: [0.16, 0.5, 0.34] },
  { label: "Fried rice", range: [600, 900], split: [0.13, 0.55, 0.32] },
  { label: "Stir-fry", range: [500, 800], split: [0.22, 0.43, 0.35] },
  { label: "Sushi roll", range: [250, 500], split: [0.15, 0.62, 0.23] },
  { label: "Burrito", range: [800, 1200], split: [0.2, 0.48, 0.32] },
  { label: "Salad", range: [300, 700], split: [0.2, 0.25, 0.55] },
  { label: "Sandwich", range: [400, 700], split: [0.22, 0.45, 0.33] },
  { label: "Fried chicken", range: [500, 900], split: [0.27, 0.18, 0.55] },
  { label: "Dumplings", range: [350, 600], split: [0.18, 0.45, 0.37] },
];

/** "Other" sends the user to food search instead. */
export const OTHER_DISH = "Other";

export function restaurantEstimate(dishType: string): FoodResult | null {
  const dish = DISH_TYPES.find((d) => d.label.toLowerCase() === dishType.trim().toLowerCase());
  if (!dish) return null;
  const kcal = Math.round((dish.range[0] + dish.range[1]) / 2 / 10) * 10;
  const [p, c, f] = dish.split;
  return {
    name: dish.label,
    servingLabel: `1 restaurant portion (usually ${dish.range[0]}–${dish.range[1]} kcal)`,
    kcal,
    protein: Math.round((kcal * p) / 4),
    carbs: Math.round((kcal * c) / 4),
    fat: Math.round((kcal * f) / 9),
  };
}
