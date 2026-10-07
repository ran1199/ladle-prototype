// The demo recipe (air-fryer garlic chicken) end to end: import with 2 tbsp of
// oil, log one serving, the "+1 tbsp" quick fix, and the learning suggestion.

import { expect, test } from "vitest";
import { DEMO_CAPTION, DEMO_RECIPE_KEY, scriptedExtract, scriptedPlate } from "@/lib/ai/scripted";
import { fixOptions } from "@/lib/fixes";
import { addRecipe, addRecipeLog, applyFix, kcalFor } from "@/lib/logic";
import { buildSeed } from "@/lib/seed";
import { upgrade } from "@/lib/store";
import type { AppData } from "@/lib/types";

/** Saves the scripted recipe as the review screen would, with "2 tbsp" answered. */
function importDemo(data: AppData) {
  const r = scriptedExtract({ kind: "text", text: DEMO_CAPTION })!;
  const q = r.questions[0];
  const ingredients = r.ingredients.map((i, idx) =>
    idx === q.ingredientIndex ? { ...i, quantity: 2, unit: "tbsp", kcal: 240, fat: 28 } : i,
  );
  return addRecipe(data, {
    name: r.name,
    servings: r.servings,
    ingredients,
    source: "From a link · tiktok.com",
    illustration: "plate",
    cuisine: null,
    historyNote: "Imported",
  });
}

test("the demo recipe saves with its short key and 533 kcal a serving", () => {
  const { data, id } = importDemo(buildSeed());
  const recipe = data.recipes.find((r) => r.id === id)!;
  expect(recipe.key).toBe(DEMO_RECIPE_KEY);
  expect(kcalFor(recipe, 1)).toBe(533);
  expect([0.5, 1, 1.5, 2].map((p) => kcalFor(recipe, p))).toEqual([267, 533, 800, 1067]);
});

test("the sample plate matches it: 1 serving, a quarter of the batch", () => {
  const { data, id } = importDemo(buildSeed());
  const recipe = data.recipes.find((r) => r.id === id)!;
  const plate = scriptedPlate([{ ...recipe, lastOpenedAt: null }]);
  expect(plate.matchRecipeId).toBe(id);
  expect(plate.portionServings).toBe(1);
  expect(plate.portionReason).toBe("One chicken leg with vegetables, about a quarter of the batch");
});

test("more oil: +120 for the batch, +30 on the plate, then the learning suggestion", () => {
  const imported = importDemo(buildSeed());
  const logged = addRecipeLog(imported.data, imported.id, 1);
  const recipe = logged.data.recipes.find((r) => r.id === imported.id)!;
  const [plusOne] = fixOptions("more-oil", recipe, 1, logged.log!.kcal);
  expect(plusOne).toMatchObject({ potDelta: 120, plateDelta: 30, alwaysNote: "oil 2 → 3 tbsp" });

  const fixed = applyFix(logged.data, { option: plusOne, scope: "once", logId: logged.log!.id });
  expect(fixed.data.logs.find((l) => l.id === logged.log!.id)!.kcal).toBe(563);
  // The seeded fix from an earlier day + this one → Ladle asks.
  expect(fixed.suggestion?.text).toBe("You usually brush on more oil. Update your recipe?");
});

test("data saved by an older version moves the seeded fix to the new recipe", () => {
  const old = buildSeed();
  old.fixes = old.fixes.map((f) => ({ ...f, recipeKey: "garlic-chicken-stir-fry" }));
  expect(upgrade(old).fixes.find((f) => f.id === "seed-fix-oil")?.recipeKey).toBe(DEMO_RECIPE_KEY);
});

test("portion helper wording", async () => {
  const { portionLabel, shareText } = await import("@/components/PortionHelper");
  expect(portionLabel(1, 4, 533, "pan")).toBe("¼ of the pan · 1 serving · 533 kcal");
  expect(portionLabel(4, 4, 2133, "pan")).toBe("all of the pan · 4 servings · 2,133 kcal");
  expect(shareText(0.5 / 6)).toBe("1/12");
  expect(shareText(1.25 / 4)).toBe("about 31%");
});
