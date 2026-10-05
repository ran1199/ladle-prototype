// Maya's starting data: what every visitor sees first, and what "Reset demo" restores.
// Dates are relative to the visitor's today. Ingredient kcal values add up exactly to
// each recipe's total (kcal per serving × servings); macros are approximate.

import type { AppData, Ingredient, Recipe } from "./types";

/** Short helper for ingredient rows: [text, quantity, unit, item, kcal, protein, carbs, fat]. */
function ing(
  text: string,
  quantity: number | null,
  unit: string,
  item: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
): Ingredient {
  return { text, quantity, unit, item, kcal, protein, carbs, fat };
}

function daysAgo(now: Date, days: number, hour = 19, minute = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Days since the most recent Thursday (0 if today is Thursday). Chicken adobo is a Thursday dish. */
function daysSinceThursday(now: Date): number {
  return (now.getDay() - 4 + 7) % 7;
}

export function buildSeed(now: Date = new Date()): AppData {
  const thursday = daysSinceThursday(now);
  const lastAdobo = thursday === 0 ? 7 : thursday;

  const recipes: Recipe[] = [
    {
      id: "chicken-adobo",
      name: "Chicken adobo",
      cuisine: "Filipino",
      servings: 4,
      ingredients: [
        ing("1 kg boneless skinless chicken thighs", 1, "kg", "chicken thighs", 1196, 197, 0, 45),
        ing("½ cup soy sauce", 0.5, "cup", "soy sauce", 68, 10, 6, 0),
        ing("½ cup cane vinegar", 0.5, "cup", "cane vinegar", 24, 0, 1, 0),
        ing("1 head garlic, smashed", 1, "head", "garlic", 45, 2, 10, 0),
        ing("3 bay leaves", 3, "", "bay leaves", 5, 0, 1, 0),
        ing("1 tsp black peppercorns", 1, "tsp", "black peppercorns", 6, 0, 2, 0),
        ing("2 tbsp neutral oil", 2, "tbsp", "neutral oil", 240, 0, 0, 28),
        ing("1 tbsp brown sugar", 1, "tbsp", "brown sugar", 52, 0, 13, 0),
        ing("1 onion, sliced", 1, "", "onion", 44, 1, 10, 0),
      ],
      confirmedLogs: 9,
      usualPortion: 1,
      illustration: "pot",
      source: null,
      lastEatenAt: daysAgo(now, lastAdobo, 19, 15),
      createdAt: daysAgo(now, 60),
      history: [],
    },
    {
      id: "overnight-oats",
      name: "Overnight oats",
      cuisine: null,
      servings: 1,
      ingredients: [
        ing("½ cup rolled oats", 0.5, "cup", "rolled oats", 150, 5, 27, 3),
        ing("½ cup unsweetened almond milk", 0.5, "cup", "almond milk", 20, 1, 1, 2),
        ing("⅓ cup plain Greek yogurt (2%)", 0.33, "cup", "Greek yogurt", 60, 8, 3, 2),
        ing("1 tbsp chia seeds", 1, "tbsp", "chia seeds", 60, 2, 5, 4),
        ing("½ cup blueberries", 0.5, "cup", "blueberries", 42, 1, 11, 0),
        ing("1 tsp maple syrup", 1, "tsp", "maple syrup", 18, 0, 5, 0),
      ],
      confirmedLogs: 14,
      usualPortion: 1,
      illustration: "jar",
      source: null,
      lastEatenAt: daysAgo(now, 0, 8, 10),
      createdAt: daysAgo(now, 45),
      history: [],
    },
    {
      id: "turkey-chili",
      name: "Turkey chili",
      cuisine: "American",
      servings: 6,
      ingredients: [
        ing("570 g lean ground turkey (93%)", 570, "g", "ground turkey", 855, 107, 0, 45),
        ing("2 cans kidney beans, drained", 2, "can", "kidney beans", 680, 47, 122, 3),
        ing("1 large can crushed tomatoes", 1, "can", "crushed tomatoes", 180, 8, 38, 1),
        ing("1 tbsp tomato paste", 1, "tbsp", "tomato paste", 11, 1, 3, 0),
        ing("1 onion, diced", 1, "", "onion", 44, 1, 10, 0),
        ing("1 red bell pepper, diced", 1, "", "red bell pepper", 37, 1, 7, 0),
        ing("4 cloves garlic", 4, "clove", "garlic", 18, 1, 4, 0),
        ing("2 tbsp olive oil", 2, "tbsp", "olive oil", 240, 0, 0, 28),
        ing("2 tbsp chili powder", 2, "tbsp", "chili powder", 48, 2, 8, 2),
        ing("1 tbsp ground cumin", 1, "tbsp", "ground cumin", 22, 1, 3, 1),
        ing("1 cup corn kernels", 1, "cup", "corn", 130, 4, 30, 1),
        ing("1 cup low-sodium chicken broth", 1, "cup", "chicken broth", 15, 2, 1, 0),
      ],
      confirmedLogs: 6,
      usualPortion: 1,
      illustration: "bowl",
      source: null,
      lastEatenAt: daysAgo(now, 0, 12, 40),
      createdAt: daysAgo(now, 30),
      history: [],
    },
    {
      id: "tomato-egg-stir-fry",
      name: "Tomato and egg stir-fry",
      cuisine: "Chinese",
      servings: 2,
      ingredients: [
        ing("4 large eggs", 4, "", "eggs", 288, 25, 2, 19),
        ing("3 medium tomatoes, cut in wedges", 3, "", "tomatoes", 59, 3, 13, 1),
        ing("1 tbsp neutral oil", 1, "tbsp", "neutral oil", 120, 0, 0, 14),
        ing("2 tsp sugar", 2, "tsp", "sugar", 32, 0, 8, 0),
        ing("2 scallions", 2, "", "scallions", 11, 1, 2, 0),
        ing("1 tsp cornstarch", 1, "tsp", "cornstarch", 10, 0, 2, 0),
        ing("½ tsp salt", 0.5, "tsp", "salt", 0, 0, 0, 0),
      ],
      confirmedLogs: 5,
      usualPortion: 1,
      illustration: "plate",
      source: null,
      lastEatenAt: daysAgo(now, 3, 18, 45),
      createdAt: daysAgo(now, 40),
      history: [],
    },
    {
      id: "kimchi-fried-rice",
      name: "Kimchi fried rice",
      cuisine: "Korean",
      servings: 2,
      ingredients: [
        ing("2 cups cooked short-grain rice", 2, "cup", "cooked rice", 484, 9, 106, 1),
        ing("1 cup kimchi, chopped", 1, "cup", "kimchi", 23, 2, 4, 1),
        ing("1 tbsp gochujang", 1, "tbsp", "gochujang", 34, 1, 7, 0),
        ing("100 g pork shoulder, diced", 100, "g", "pork shoulder", 190, 18, 0, 13),
        ing("1 tbsp neutral oil", 1, "tbsp", "neutral oil", 120, 0, 0, 14),
        ing("1 tsp sesame oil", 1, "tsp", "sesame oil", 40, 0, 0, 5),
        ing("2 large eggs, fried", 2, "", "eggs", 144, 13, 1, 10),
        ing("1 scallion", 1, "", "scallion", 5, 0, 1, 0),
      ],
      confirmedLogs: 1,
      usualPortion: 1,
      illustration: "bowl",
      source: null,
      lastEatenAt: daysAgo(now, 5, 19, 30),
      createdAt: daysAgo(now, 6),
      history: [],
    },
    {
      id: "lentil-dal",
      name: "Lentil dal",
      cuisine: "Indian",
      servings: 4,
      ingredients: [
        ing("1¼ cups dried red lentils", 1.25, "cup", "red lentils", 860, 58, 145, 5),
        ing("1 large onion, diced", 1, "", "onion", 64, 2, 15, 0),
        ing("2 large tomatoes, chopped", 2, "", "tomatoes", 55, 3, 12, 1),
        ing("3 cloves garlic", 3, "clove", "garlic", 13, 1, 3, 0),
        ing("1 tbsp grated ginger", 1, "tbsp", "ginger", 5, 0, 1, 0),
        ing("2 tbsp ghee", 2, "tbsp", "ghee", 224, 0, 0, 25),
        ing("1 tsp cumin seeds", 1, "tsp", "cumin seeds", 8, 0, 1, 0),
        ing("1 tsp ground turmeric", 1, "tsp", "turmeric", 8, 0, 1, 0),
        ing("1 tsp garam masala", 1, "tsp", "garam masala", 6, 0, 1, 0),
        ing("1 green chili", 1, "", "green chili", 4, 0, 1, 0),
        ing("2 tbsp chopped cilantro", 2, "tbsp", "cilantro", 1, 0, 0, 0),
        ing("¾ cup light coconut milk", 0.75, "cup", "light coconut milk", 112, 1, 3, 11),
      ],
      confirmedLogs: 2,
      usualPortion: 1,
      illustration: "pot",
      source: null,
      lastEatenAt: daysAgo(now, 9, 19, 0),
      createdAt: daysAgo(now, 20),
      history: [],
    },
  ];

  return {
    version: 1,
    profile: { name: "Maya", sex: "female", dailyTarget: 1600, startingWeightKg: null },
    recipes,
    logs: [
      {
        id: "seed-log-oats",
        at: daysAgo(now, 0, 8, 10),
        name: "Overnight oats",
        recipeId: "overnight-oats",
        batchId: null,
        portion: 1,
        kcal: 350,
        confidence: "confirmed",
        countedConfirmation: true,
        prevLastEatenAt: daysAgo(now, 1, 8, 5),
      },
      {
        id: "seed-log-chili",
        at: daysAgo(now, 0, 12, 40),
        name: "Turkey chili",
        recipeId: "turkey-chili",
        batchId: "seed-batch-chili",
        portion: 1,
        kcal: 380,
        confidence: "confirmed",
        countedConfirmation: true,
        prevLastEatenAt: daysAgo(now, 1, 19, 0),
      },
    ],
    batches: [
      {
        id: "seed-batch-chili",
        recipeId: "turkey-chili",
        cookedAt: daysAgo(now, 1, 18, 0),
        servingsMade: 6,
        servingsLeft: 4,
      },
    ],
    // One earlier "Just this time: more oil" fix on the garlic chicken stir-fry (task T3).
    // It applies once that recipe is imported, so a second identical fix triggers the
    // "You usually add more oil to this" suggestion.
    fixes: [
      {
        id: "seed-fix-oil",
        at: daysAgo(now, 4, 19, 30),
        recipeKey: "garlic-chicken-stir-fry",
        kind: "more-oil",
        scope: "once",
      },
    ],
  };
}

/** Total kcal for a recipe (sum of its ingredients). */
export function recipeTotalKcal(recipe: Recipe): number {
  return recipe.ingredients.reduce((sum, i) => sum + i.kcal, 0);
}

/** kcal per serving, rounded. */
export function recipeKcalPerServing(recipe: Recipe): number {
  return Math.round(recipeTotalKcal(recipe) / recipe.servings);
}
