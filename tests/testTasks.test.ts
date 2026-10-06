import { expect, test } from "vitest";
import { nextTask, tasksDone } from "@/lib/testTasks";
import { addRecipe, addRecipeLog } from "@/lib/logic";
import { buildSeed } from "@/lib/seed";

test("next task follows what the participant has done", () => {
  const now = new Date();
  let data = buildSeed(now);
  expect(nextTask(data, now)?.id).toBe("T1");
  // T4 can be done out of order; T1 is still next.
  data = addRecipeLog(data, "chicken-adobo", 1, { at: now }).data;
  expect(tasksDone(data, now).T4).toBe(true);
  expect(nextTask(data, now)?.id).toBe("T1");
  const added = addRecipe(data, {
    name: "Garlic chicken stir-fry",
    servings: 4,
    ingredients: [],
    source: null,
    illustration: "bowl",
    cuisine: null,
    historyNote: "Imported",
  });
  data = added.data;
  expect(nextTask(data, now)?.id).toBe("T2");
  data = addRecipeLog(data, added.id, 1, { at: now }).data;
  expect(nextTask(data, now)?.id).toBe("T3");
  data = { ...data, fixes: [...data.fixes, { id: "f1", at: now.toISOString(), recipeKey: "garlic-chicken-stir-fry", kind: "more-oil", detail: "+1 tbsp", scope: "always" }] };
  expect(nextTask(data, now)?.id).toBe("T5");
  data = addRecipe(data, { name: "Grandma’s braised pork", servings: 6, ingredients: [], source: null, illustration: "pot", cuisine: null, historyNote: "Imported" }).data;
  expect(nextTask(data, now)).toBeNull();
});
