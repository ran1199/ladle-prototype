import { describe, expect, test } from "vitest";
import { analyzePlateMock, confidenceFor, hashBytes, rankRecipes } from "@/lib/mock-ai/plate";
import type { PlateContext, RecipeSummary } from "@/lib/ai/types";

const now = "2026-10-08T19:10:00"; // a Thursday evening
const recipe = (id: string, extra: Partial<RecipeSummary> = {}): RecipeSummary => ({
  id,
  name: id,
  cuisine: null,
  servings: 4,
  usualPortion: 1.5,
  createdAt: "2026-08-01T12:00:00",
  lastEatenAt: null,
  ...extra,
});
const ctx = (extra: Partial<PlateContext> = {}): PlateContext => ({ now, logs: [], batches: [], ...extra });
const hash = hashBytes(new Uint8Array([1, 2, 3, 4, 5]));

describe("plate matching by context", () => {
  test("cooked an hour ago beats eaten last week", () => {
    const recipes = [
      recipe("chili", { lastEatenAt: "2026-10-01T19:00:00" }),
      recipe("curry"),
    ];
    const context = ctx({
      logs: [{ recipeId: "chili", at: "2026-10-01T19:00:00", portion: 1 }],
      batches: [{ recipeId: "curry", cookedAt: "2026-10-08T18:10:00", servingsLeft: 4 }],
    });
    const result = analyzePlateMock(recipes, context, hash);
    expect(result.matchRecipeId).toBe("curry");
    expect(result.matchConfidence).toBeGreaterThanOrEqual(0.7);
    expect(result.isNewFood).toBe(false);
    expect(result.portionReason).toBe("Looks like a standard serving");
    expect(result.portionServings).toBe(1);
  });

  test("a recipe imported this evening ranks first", () => {
    const ranked = rankRecipes(
      [recipe("old"), recipe("new", { createdAt: "2026-10-08T18:30:00" })],
      ctx(),
      hash,
    );
    expect(ranked[0].id).toBe("new");
  });

  test("the usual Thursday dinner, with the usual portion", () => {
    const thursdays = ["2026-10-01T19:15:00", "2026-09-24T19:05:00", "2026-09-17T19:30:00"];
    const recipes = [
      recipe("adobo", { lastEatenAt: thursdays[0], mealTypes: ["dinner"] }),
      recipe("oats", { lastEatenAt: "2026-10-08T07:30:00", mealTypes: ["breakfast"] }),
      recipe("dal", { lastEatenAt: "2026-10-05T13:00:00", mealTypes: ["lunch", "dinner"] }),
    ];
    const context = ctx({
      logs: [
        ...thursdays.map((at) => ({ recipeId: "adobo", at, portion: 1.5 })),
        { recipeId: "oats", at: "2026-10-08T07:30:00", portion: 1 },
        { recipeId: "dal", at: "2026-10-05T13:00:00", portion: 1 },
      ],
    });
    const result = analyzePlateMock(recipes, context, hash);
    expect(result.matchRecipeId).toBe("adobo");
    expect(result.portionServings).toBe(1.5);
    expect(result.portionReason).toBe("Your usual portion");
    expect(result.alternatives).toHaveLength(2);
    expect(result.alternatives[1]).toBe("oats"); // breakfast food ranks last in the evening
  });

  test("no useful history → it's something new, with recipes to pick from", () => {
    const result = analyzePlateMock([recipe("a"), recipe("b"), recipe("c"), recipe("d")], ctx(), hash);
    expect(result.isNewFood).toBe(true);
    expect(result.matchRecipeId).toBeNull();
    expect(result.matchConfidence).toBeLessThan(0.5);
    expect(result.alternatives).toHaveLength(3);
  });

  test("a weaker signal → 'Might be' range", () => {
    const recipes = [recipe("dal", { mealTypes: ["dinner"], lastEatenAt: "2026-10-04T19:00:00" }), recipe("b")];
    const context = ctx({ logs: [{ recipeId: "dal", at: "2026-10-04T19:00:00", portion: 1 }] });
    const c = confidenceFor(rankRecipes(recipes, context, hash));
    expect(c).toBeGreaterThanOrEqual(0.5);
    expect(c).toBeLessThan(0.7);
  });

  test("a similar photo colour nudges a recipe up", () => {
    const recipes = [recipe("a"), recipe("b")];
    const color = { r: 180, g: 120, b: 60 };
    const context = ctx({
      photoColor: color,
      logs: [
        { recipeId: "a", at: "2026-09-01T12:00:00", portion: 1, photoColor: { r: 40, g: 160, b: 60 } },
        { recipeId: "b", at: "2026-09-01T12:00:00", portion: 1, photoColor: { r: 175, g: 125, b: 70 } },
      ],
    });
    expect(rankRecipes(recipes, context, hash)[0].id).toBe("b");
  });

  test("same photo and same history → same answer", () => {
    const recipes = [recipe("a"), recipe("b"), recipe("c")];
    const bytes = new Uint8Array(5000).map((_, i) => (i * 31) % 256);
    const one = analyzePlateMock(recipes, ctx(), hashBytes(bytes));
    const two = analyzePlateMock(recipes, ctx(), hashBytes(bytes.slice()));
    expect(two).toEqual(one);
  });

  test("no recipes yet", () => {
    expect(analyzePlateMock([], ctx(), hash)).toMatchObject({ isNewFood: true, matchRecipeId: null });
  });
});
