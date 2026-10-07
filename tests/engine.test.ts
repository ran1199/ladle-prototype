import { describe, expect, test } from "vitest";
import { mockEngine } from "@/lib/mock-ai/engine";
import { checkLink, DEMO_CAPTION, scriptedExtract } from "@/lib/ai/scripted";
import { DEMO_LINK, OLD_DEMO_LINK } from "@/lib/content";
import { ExtractedRecipeSchema } from "@/lib/ai/schemas";

describe("T1 demo caption through the mock engine (not the script)", () => {
  test("matches the scripted result within 5%", async () => {
    const mock = await mockEngine.extractRecipe({ kind: "text", text: DEMO_CAPTION });
    const scripted = scriptedExtract({ kind: "text", text: DEMO_CAPTION })!;
    expect(ExtractedRecipeSchema.safeParse(mock).success).toBe(true);

    expect(mock.name).toBe("Air-fryer garlic chicken with mushrooms");
    expect(mock.servings).toBe(4);
    expect(mock.servingsConfidence).toBe("stated");

    const matched = mock.ingredients.filter((i) => !i.unreadable && !i.vague);
    expect(matched).toHaveLength(11);

    expect(mock.questions).toHaveLength(1);
    const oil = mock.questions[0];
    expect(mock.ingredients[oil.ingredientIndex]).toMatchObject({ vague: true });
    expect(oil.prompt).toBe("How much olive oil did you brush on?");
    expect(oil.options.map((o) => o.label)).toEqual(["1 tbsp", "2 tbsp", "3 tbsp"]);

    const noOil = (r: typeof mock) => r.ingredients.reduce((s, i) => s + i.kcal, 0);
    const withTwoTbsp = (r: typeof mock) => noOil(r) + r.questions[0].options[1].kcalDelta;
    expect(noOil(scripted)).toBe(1893);
    expect(withTwoTbsp(scripted)).toBe(2133);
    expect(Math.round(withTwoTbsp(scripted) / 4)).toBe(533);
    expect(Math.abs(withTwoTbsp(mock) - 2133) / 2133).toBeLessThan(0.05);

    // Each line within 5% (or 3 kcal for the tiny ones).
    scripted.ingredients.forEach((s, idx) => {
      const m = mock.ingredients[idx];
      expect(Math.abs(m.kcal - s.kcal)).toBeLessThanOrEqual(Math.max(3, s.kcal * 0.05));
    });
  });
});

describe("demo links", () => {
  test("the new demo link and the old one both open the demo recipe", () => {
    const fresh = checkLink(DEMO_LINK);
    const old = checkLink(OLD_DEMO_LINK);
    expect(fresh).toEqual({ ok: true, url: DEMO_LINK, isDemo: true });
    expect(old).toEqual({ ok: true, url: DEMO_LINK, isDemo: true });
    const recipe = scriptedExtract({ kind: "text", text: "", sourceUrl: OLD_DEMO_LINK });
    expect(recipe?.name).toBe("Air-fryer garlic chicken with mushrooms");
  });
});

describe("other mock answers", () => {
  test("restaurant estimate is the middle of the range", async () => {
    const r = await mockEngine.estimateRestaurantPlate({ dishType: "Burger" });
    expect(r.kcal).toBe(730);
    await expect(mockEngine.estimateRestaurantPlate({ dishType: "Other" })).rejects.toThrow();
  });

  test("food search finds snacks and drinks, at most 8", async () => {
    expect((await mockEngine.searchFood("banana"))[0].name).toBe("Banana");
    expect((await mockEngine.searchFood("latte"))[0].name).toBe("Latte");
    expect((await mockEngine.searchFood("boba"))[0].name).toBe("Bubble tea");
    expect((await mockEngine.searchFood("chiken nugets"))[0].name).toBe("Chicken nuggets");
    expect((await mockEngine.searchFood("chicken")).length).toBeLessThanOrEqual(8);
    expect(await mockEngine.searchFood("")).toEqual([]);
  });
});

test("OCR clean-up of common misreads", async () => {
  const { fixOcrText } = await import("@/lib/mock-ai/engine");
  expect(fixOcrText("1 1b shrimp\n8 0z cheese\n2 Ibs beef")).toBe("1 lb shrimp\n8 oz cheese\n2 lbs beef");
});
