// Logging rules: which logs count towards "Your recipe ✓", and how estimates are shown.

import { expect, test } from "vitest";
import { kcalNumber, shownKcal } from "@/lib/format";
import { addRecipeLog, editLog, recipeConfidence, removeLog } from "@/lib/logic";
import { buildSeed } from "@/lib/seed";

const count = (data: ReturnType<typeof buildSeed>, id: string) =>
  data.recipes.find((r) => r.id === id)!.confirmedLogs;

test("seeded recipes keep their levels", () => {
  const data = buildSeed();
  expect(count(data, "chicken-adobo")).toBe(9);
  expect(count(data, "kimchi-fried-rice")).toBe(1);
  expect(recipeConfidence(data.recipes.find((r) => r.id === "lentil-dal")!)).toBe("good");
});

test("quick logs don't count towards Your recipe ✓", () => {
  for (const via of ["one-tap", "leftovers", "pantry"] as const) {
    const { data, log } = addRecipeLog(buildSeed(), "lentil-dal", 1, { via });
    expect(log).toMatchObject({ confirmed: false, countedConfirmation: false });
    expect(count(data, "lentil-dal")).toBe(2);
  }
});

test("confirmed portions count: plate photo, portion helper, portion picker", () => {
  for (const via of ["plate-photo", "portion-helper", "portion-picker"] as const) {
    const { data, log } = addRecipeLog(buildSeed(), "lentil-dal", 1, { via });
    expect(log).toMatchObject({ confirmed: true });
    expect(count(data, "lentil-dal")).toBe(3);
    expect(recipeConfidence(data.recipes.find((r) => r.id === "lentil-dal")!)).toBe("confirmed");
  }
});

test("editing a quick log's portion confirms it; deleting takes the count back", () => {
  const quick = addRecipeLog(buildSeed(), "lentil-dal", 1, { via: "one-tap" });
  const edited = editLog(quick.data, quick.log!.id, { portion: 1.5 });
  expect(count(edited, "lentil-dal")).toBe(3);
  expect(edited.logs.find((l) => l.id === quick.log!.id)).toMatchObject({ confirmed: true });
  // Editing again doesn't count twice.
  expect(count(editLog(edited, quick.log!.id, { portion: 2 }), "lentil-dal")).toBe(3);
  // Changing only the time isn't confirming the portion.
  expect(
    count(editLog(quick.data, quick.log!.id, { at: new Date().toISOString() }), "lentil-dal"),
  ).toBe(2);

  expect(count(removeLog(edited, quick.log!.id), "lentil-dal")).toBe(2);
  // Deleting an unconfirmed quick log leaves the count alone.
  expect(count(removeLog(quick.data, quick.log!.id), "lentil-dal")).toBe(2);
});

test("estimates are shown rounded with 'about'; Your recipe ✓ and labels are exact", () => {
  expect(kcalNumber(533, "good")).toBe("about 530");
  expect(kcalNumber(1067, "good")).toBe("about 1,070");
  expect(kcalNumber(267, "rough")).toBe("about 270");
  expect(kcalNumber(533, "confirmed")).toBe("533");
  expect(kcalNumber(1067, "label")).toBe("1,067");
  expect(shownKcal(535, "good")).toBe(540);
});
