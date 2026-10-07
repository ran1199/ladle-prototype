// "Your usual" on Today: which meal, and which recipe first.

import { expect, test } from "vitest";
import { emptyData } from "@/lib/store";
import { addRecipeLog } from "@/lib/logic";
import { buildSeed } from "@/lib/seed";
import { usualSlot, usualSuggestions } from "@/lib/usual";

/** The next Thursday at the given time. */
function thursday(hour: number, minute = 0) {
  const d = new Date(2026, 9, 8, hour, minute); // Thu Oct 8, 2026
  expect(d.getDay()).toBe(4);
  return d;
}

test("Thursday dinner: Maya's usual chicken adobo comes first", () => {
  const now = thursday(18, 30);
  const data = buildSeed(now);
  const r = usualSuggestions(data, now)!;
  expect(r.slot).toBe("dinner");
  expect(r.suggestions[0]).toMatchObject({ recipe: { id: "chicken-adobo" }, usual: true });
  expect(r.suggestions).toHaveLength(3);
});

test("'Treat today as Thursday' gives the same answer on another day", () => {
  const monday = new Date(2026, 9, 12, 18, 30);
  const data = buildSeed(monday);
  expect(usualSuggestions(data, monday, 4)!.suggestions[0].recipe.id).toBe("chicken-adobo");
});

test("a meal already logged moves on to the next; none once dinner is logged", () => {
  const now = thursday(12, 50);
  let data = buildSeed(now);
  // Maya's seed day already has turkey chili at 12:40, so lunch is done.
  expect(usualSlot(data, now)).toBe("dinner");
  data = addRecipeLog(data, "chicken-adobo", 1, { at: thursday(19, 0) }).data;
  expect(usualSlot(data, thursday(19, 30))).toBeNull();
  expect(usualSuggestions(data, thursday(19, 30))).toBeNull();
});

test("no suggestions without recipes, or in the middle of the night", () => {
  expect(usualSuggestions(emptyData(), thursday(18))).toBeNull();
  expect(usualSlot(buildSeed(), thursday(2))).toBeNull();
});
