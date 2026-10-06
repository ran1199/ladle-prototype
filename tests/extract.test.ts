import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { extractFromText } from "@/lib/mock-ai/extract";
import { ExtractedRecipeSchema } from "@/lib/ai/schemas";

const total = (r: ReturnType<typeof extractFromText>) => r.ingredients.reduce((s, i) => s + i.kcal, 0);

describe("cleaning and structure", () => {
  test("strips emoji, hashtags, mentions and link-in-bio noise", () => {
    const r = extractFromText(`Easy Honey Garlic Salmon 🍯🐟 #dinner #easyrecipes @chefjo
Full recipe below! Serves 2
2 salmon fillets (about 300 g)
2 tbsp honey
1 tbsp soy sauce
Link in bio for more 💛`);
    expect(r.name).toBe("Easy Honey Garlic Salmon");
    expect(r.servings).toBe(2);
    expect(r.servingsConfidence).toBe("stated");
    expect(r.ingredients.map((i) => i.item)).toEqual(["salmon fillets", "honey", "soy sauce"]);
  });

  test("skips headings, steps and timing lines", () => {
    const r = extractFromText(`Weeknight Fried Rice
Prep time: 10 minutes
Ingredients:
3 cups cooked rice
2 eggs
For the sauce:
2 tbsp soy sauce
Instructions
Heat the oil in a wok over high heat.
Add the rice and stir-fry for 3 minutes.`);
    expect(r.ingredients).toHaveLength(3);
    expect(r.ingredients.every((i) => !i.unreadable)).toBe(true);
  });

  test("splits a comma list when several parts have amounts", () => {
    const r = extractFromText("Pancakes\n1 cup flour, 1 cup milk, 1 egg, 1 tbsp sugar");
    expect(r.ingredients).toHaveLength(4);
  });

  test("servings from many phrasings", () => {
    for (const [line, n] of [
      ["Serves 4", 4],
      ["Feeds 6", 6],
      ["Makes 12", 12],
      ["4 servings", 4],
      ["Yield: 8", 8],
      ["for 2 people", 2],
    ] as const) {
      expect(extractFromText(`Soup\n${line}\n2 cups stock\n1 onion`).servings).toBe(n);
    }
  });

  test("infers servings (2–4) from calories and asks about them first", () => {
    const r = extractFromText("Chicken and rice\n500g chicken thighs\n2 cups rice\n2 tbsp olive oil");
    expect(r.servingsConfidence).toBe("inferred");
    expect(r.servings).toBeGreaterThanOrEqual(2);
    expect(r.servings).toBeLessThanOrEqual(4);
    expect(r.questions[0]).toMatchObject({ kind: "servings", ingredientIndex: -1 });
    expect(r.questions[0].options.map((o) => o.servings)).toEqual([r.servings - 1, r.servings, r.servings + 2]);
  });

  test("every result fits the shared shape", () => {
    const r = extractFromText("Toast\n2 slices bread\nbutter\njam to taste");
    expect(ExtractedRecipeSchema.safeParse(r).success).toBe(true);
  });

  test("no ingredients → a friendly error", () => {
    expect(() => extractFromText("What a lovely evening it was.")).toThrow(/ingredient/);
  });
});

describe("vague amounts", () => {
  test("calorie-dense vague lines get a question with three options", () => {
    const r = extractFromText("Salad\nServes 2\n1 head lettuce\na drizzle of olive oil");
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0].prompt).toBe("How much is “a drizzle of olive oil”?");
    expect(r.questions[0].options.map((o) => o.label)).toEqual(["1 tsp", "1 tbsp", "2 tbsp"]);
    expect(r.ingredients[1]).toMatchObject({ vague: true, kcal: 0 });
  });

  test("a splash of soy sauce: 1 tsp / 1 tbsp / 2 tbsp", () => {
    const r = extractFromText("Greens\nServes 2\n1 bunch bok choy\na splash of soy sauce");
    expect(r.questions[0].options.map((o) => o.label)).toEqual(["1 tsp", "1 tbsp", "2 tbsp"]);
  });

  test("negligible items are never asked about or flagged", () => {
    const r = extractFromText("Eggs\nServes 1\n2 eggs\nsalt to taste\npepper to taste\nwater as needed");
    expect(r.questions).toHaveLength(0);
    expect(r.ingredients.every((i) => !i.unreadable && !i.vague)).toBe(true);
  });

  test("at most 3 questions, ranked by calorie spread; the rest use the middle option", () => {
    const r = extractFromText(`Loaded noodles
Serves 4
400g egg noodles
oil for frying
a handful of peanuts
some honey
a splash of soy sauce
grated parmesan to serve`);
    expect(r.questions).toHaveLength(3);
    const spreads = r.questions.map((q) => q.options[2].kcalDelta - q.options[0].kcalDelta);
    expect([...spreads].sort((a, b) => b - a)).toEqual(spreads);
    const asked = new Set(r.questions.map((q) => q.ingredientIndex));
    const estimated = r.ingredients.filter((i, idx) => i.vague && !asked.has(idx));
    expect(estimated.length).toBe(2);
    for (const i of estimated) {
      expect(i.estimated).toBe(true);
      expect(i.kcal).toBeGreaterThan(0);
    }
  });
});

describe("unmatched lines", () => {
  test("are kept, flagged unreadable and count 0 kcal", () => {
    const r = extractFromText("Mystery stew\nServes 4\n500g beef\n2 tbsp zorblax powder\n1 onion");
    expect(r.ingredients).toHaveLength(3);
    expect(r.ingredients[1]).toMatchObject({ text: "2 tbsp zorblax powder", unreadable: true, kcal: 0 });
  });
});

describe("five real-world recipes land within 10% of their expected totals", () => {
  // Expected totals were worked out by hand from USDA FoodData Central values
  // (see the comments), independently of the parser.
  const cases = [
    // pork ribs 1 kg (2,770) + onion, tomatoes, radish, kangkong, beans, eggplant (~330)
    // + sinigang mix 40 g (~130) + fish sauce, chilies (~30)
    { file: "sinigang", name: "Pork Sinigang (Filipino Sour Soup)", servings: 6, expected: 3256 },
    // rice 370 g raw (1,325) + beef 300 g (762) + eggs (286) + oils 3 tbsp (360)
    // + gochujang (~160) + sauce, sugar, sesame, vegetables (~290)
    { file: "bibimbap", name: "Korean Bibimbap", servings: 4, expected: 3180 },
    // chicken breast 2 lb (1,089) + oil (240) + tortillas 12 (680) + avocado (~230)
    // + crema (~230) + cotija (~100) + tomatoes, chipotles, onion, broth, spices (~240)
    { file: "tinga", name: "Chicken Tinga Tacos", servings: 6, expected: 2810 },
    // chickpeas 2 cans drained ~480 g (667) + ghee 3 tbsp (345) + onion, tomatoes,
    // aromatics and spices (~180)
    { file: "chana-masala", name: "Chana Masala", servings: 4, expected: 1191 },
    // spaghetti 1 lb (1,683) + beef 500 g (1,270) + oil (240) + parmesan ½ cup (~210)
    // + crushed tomatoes (~255) + wine (~100) + vegetables, paste (~115)
    { file: "bolognese", name: "Spaghetti Bolognese", servings: 6, expected: 3875 },
  ];
  test.each(cases)("$file", ({ file, name, servings, expected }) => {
    const r = extractFromText(readFileSync(`tests/fixtures/${file}.txt`, "utf8"));
    expect(r.name).toBe(name);
    expect(r.servings).toBe(servings);
    expect(r.ingredients.every((i) => !i.unreadable)).toBe(true);
    expect(Math.abs(total(r) - expected) / expected).toBeLessThan(0.1);
  });
});
