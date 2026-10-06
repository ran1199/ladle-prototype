import { describe, expect, test } from "vitest";
import { parseAmount, parseNumber, gramsFor } from "@/lib/mock-ai/quantity";
import { entryNamed } from "@/lib/mock-ai/match";

describe("parseNumber", () => {
  test.each([
    ["2", 2],
    ["1.5", 1.5],
    [".5", 0.5],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["½", 0.5],
    ["1½", 1.5],
    ["2-3", 2.5],
    ["2 to 4", 3],
    ["1⁄4", 0.25],
  ])("%s → %d", (text, value) => {
    expect(parseNumber(text)).toBeCloseTo(value);
  });
});

describe("parseAmount", () => {
  test.each([
    ["600g boneless skinless chicken thighs", 600, "g", "boneless skinless chicken thighs"],
    ["2 tbsp soy sauce", 2, "tbsp", "soy sauce"],
    ["2 T soy sauce", 2, "tbsp", "soy sauce"],
    ["2 t sugar", 2, "tsp", "sugar"],
    ["1 Tbsp. honey", 1, "tbsp", "honey"],
    ["1½ cups rice", 1.5, "cup", "rice"],
    ["2-3 cloves garlic, minced", 2.5, "clove", "garlic, minced"],
    ["a pinch of salt", 1, "pinch", "salt"],
    ["one onion", 1, "", "onion"],
    ["half an onion", 0.5, "", "onion"],
    ["1 lb ground beef", 1, "lb", "ground beef"],
    ["250 ml milk", 250, "ml", "milk"],
    ["Chicken thighs 600g", 600, "g", "Chicken thighs"],
    ["Garlic - 6 cloves", 6, "clove", "Garlic"],
    ["4 eggs", 4, "", "eggs"],
  ])("%s", (line, quantity, unit, rest) => {
    const a = parseAmount(line);
    expect(a.quantity).toBeCloseTo(quantity);
    expect(a.unit).toBe(unit);
    expect(a.rest).toBe(rest);
  });

  test("no amount", () => {
    expect(parseAmount("oil for frying")).toMatchObject({ quantity: null, unit: "", rest: "oil for frying" });
    expect(parseAmount("a little oil").quantity).toBeNull();
  });

  test("weights in brackets and multipliers", () => {
    expect(parseAmount("1 (14 oz) can diced tomatoes")).toMatchObject({ quantity: 1, unit: "can" });
    expect(parseAmount("1 (14 oz) can diced tomatoes").perUnitGrams).toBeCloseTo(396.9);
    expect(parseAmount("2 x 400g cans chickpeas")).toMatchObject({ quantity: 2, unit: "can", perUnitGrams: 400 });
    expect(parseAmount("1 can (400 g) coconut milk")).toMatchObject({ quantity: 1, unit: "can", perUnitGrams: 400 });
  });
});

describe("gramsFor", () => {
  test("uses each ingredient's own unit weights", () => {
    expect(gramsFor(1, "tbsp", entryNamed("neutral oil")!)).toBeCloseTo(13.6);
    expect(gramsFor(6, "clove", entryNamed("garlic")!)).toBe(18);
    expect(gramsFor(1, "lb", entryNamed("ground beef")!)).toBeCloseTo(453.6);
    expect(gramsFor(4, "", entryNamed("eggs")!)).toBe(200);
  });
  test("spices counted one by one weigh about a gram", () => {
    expect(gramsFor(1, "", entryNamed("bay leaves")!)).toBeLessThan(2);
  });
});
