import { expect, test } from "vitest";
import { matchIngredient, singular } from "@/lib/mock-ai/match";

const name = (text: string) => matchIngredient(text)?.entry.name ?? null;

test("plurals become singular", () => {
  expect(singular("tomatoes")).toBe("tomato");
  expect(singular("berries")).toBe("berry");
  expect(singular("leaves")).toBe("leaf");
  expect(singular("radishes")).toBe("radish");
  expect(singular("asparagus")).toBe("asparagus");
});

test("exact names and aliases, any case", () => {
  expect(name("Broccoli")).toBe("broccoli");
  expect(name("pak choi")).toBe("bok choy");
  expect(name("patis")).toBe("fish sauce");
  expect(name("Shaoxing wine")).toBe("shaoxing wine");
  expect(name("cooking wine")).toBe("shaoxing wine");
  expect(name("gochujang")).toBe("gochujang");
  expect(name("jalapeño")).toBe("chili");
});

test("the longest match wins", () => {
  expect(name("toasted sesame oil")).toBe("sesame oil");
  expect(name("oil")).toBe("neutral oil");
  expect(name("dark soy sauce")).toBe("dark soy sauce");
  expect(name("coconut milk")).toBe("coconut milk");
  expect(name("chicken stock")).toBe("stock");
  expect(name("garlic powder")).toBe("garlic powder");
  expect(name("red bell pepper")).toBe("bell pepper");
  expect(name("freshly ground black pepper")).toBe("black pepper");
});

test("all words present, in any order (when no exact phrase fits)", () => {
  expect(matchIngredient("sauce, soy")).toMatchObject({ how: "tokens" });
  expect(name("sauce, soy")).toBe("soy sauce");
  expect(name("vinegar (balsamic)")).toBe("balsamic vinegar");
});

test("near spellings", () => {
  expect(name("brocoli")).toBe("broccoli");
  expect(name("parmesan chese")).toBe("parmesan");
});

test("unknown food", () => {
  expect(matchIngredient("unobtainium flakes")).toBeNull();
});
