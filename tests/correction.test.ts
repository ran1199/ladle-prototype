import { describe, expect, test } from "vitest";
import { estimateCorrectionMock } from "@/lib/mock-ai/correction";
import { buildSeed } from "@/lib/seed";

const seed = buildSeed(new Date("2026-10-08T19:00:00"));
const adobo = seed.recipes.find((r) => r.id === "chicken-adobo")!; // serves 4

const est = (text: string, recipe = adobo, portion = 1) => estimateCorrectionMock({ recipe, text, portion });

describe("free-text corrections", () => {
  test("added 30g cheddar → about +121", () => {
    const r = est("added 30g cheddar");
    expect(r.recognized).toBe(true);
    expect(r.kcalDelta).toBeGreaterThan(110);
    expect(r.kcalDelta).toBeLessThan(130);
    expect(r.summary).toBe("Added 30 g cheddar");
  });

  test("extra tbsp butter → about +100", () => {
    const r = est("extra tbsp butter");
    expect(r.kcalDelta).toBeGreaterThan(90);
    expect(r.kcalDelta).toBeLessThan(110);
  });

  test("more garlic → one typical clove", () => {
    const r = est("more garlic");
    expect(r.kcalDelta).toBeGreaterThan(0);
    expect(r.kcalDelta).toBeLessThan(10);
    expect(r.summary).toMatch(/1 clove garlic/);
  });

  test("no rice (not in the recipe) → minus a typical portion", () => {
    const r = est("no rice");
    expect(r.kcalDelta).toBeLessThan(-150);
    expect(r.summary).toMatch(/^No rice/);
  });

  test("skipped the sugar → minus this plate's share of it", () => {
    const r = est("skipped the brown sugar");
    expect(r.kcalDelta).toBe(-13); // 52 kcal in the pot ÷ 4 servings
  });

  test("double the soy sauce → plus this plate's share again", () => {
    expect(est("double the soy sauce").kcalDelta).toBe(17); // 68 ÷ 4
  });

  test("double the sauce → finds the recipe's sauce line", () => {
    expect(est("double the sauce").kcalDelta).toBe(17);
  });

  test("half the oil → minus half of this plate's oil", () => {
    expect(est("half the oil").kcalDelta).toBe(-30); // 240 ÷ 4 ÷ 2
  });

  test("bigger portion scales recipe-based changes", () => {
    expect(est("half the oil", adobo, 2).kcalDelta).toBe(-60);
  });

  test("several changes at once", () => {
    const r = est("added a fried egg and 30g cheddar");
    expect(r.kcalDelta).toBeGreaterThan(180);
    expect(r.summary.split("; ")).toHaveLength(2);
  });

  test("works without a saved recipe", () => {
    const r = estimateCorrectionMock({ recipe: null, text: "added 2 tbsp mayo" });
    expect(r.kcalDelta).toBeGreaterThan(150);
  });

  test("unrecognised text asks the user", () => {
    const r = est("it was a bit different today");
    expect(r).toMatchObject({ recognized: false, kcalDelta: 0 });
    expect(r.summary).toBe("I couldn’t work that out. Enter the calories yourself?");
  });
});

test("“a banana” counts one banana", () => {
  const r = estimateCorrectionMock({ recipe: null, text: "added a banana" });
  expect(r.summary).toBe("Added a banana");
  expect(r.kcalDelta).toBeGreaterThan(80);
  expect(r.kcalDelta).toBeLessThan(130);
});
