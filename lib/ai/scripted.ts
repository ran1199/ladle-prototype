// The scripted engine: fixed answers for the bundled demo inputs (the demo
// video link, the demo caption, Grandma's recipe card, the sample plate photo),
// so the five usability-test tasks behave identically for every participant.
// The demo recipe is "Air-fryer garlic chicken with mushrooms" (serves 4).
// Values come from the project brief. Everything else goes to the mock engine.

import { DEMO_LINK, OLD_DEMO_LINK } from "../content";
import type { ExtractedRecipe, PlateAnalysis } from "./schemas";
import type { DemoAsset, ExtractInput, RecipeSummary } from "./types";

export const DEMO_CAPTION = `Air-fryer garlic chicken with mushrooms 🍗 serves 4
4 chicken legs, bone-in, skin-on (about 1 kg)
300g king oyster mushrooms
150g shiitake mushrooms
200g broccoli
1 carrot
1 red bell pepper
1 yellow bell pepper
10 cloves garlic
2 tbsp soy sauce
1 tsp smoked paprika
salt and pepper
olive oil for brushing`;

export const DEMO_CARD = {
  src: "/demo/recipe-card.jpg",
  alt: "Handwritten recipe card: Grandma’s braised pork. 500g pork belly, 4 eggs, 3 tbsp soy sauce, 30g rock sugar, 2 tbsp Shaoxing wine, ginger + 2 star anise, a little oil. Feeds 6.",
  demoAsset: "recipe-card" as DemoAsset,
};

/** The bundled sample plate photo (Ran’s own photo; metadata removed). */
export const DEMO_PLATE = {
  src: "/demo/plate-airfryer-chicken.jpg",
  alt: "A bowl with a roasted chicken leg, king oyster and shiitake mushrooms, broccoli, carrot, red and yellow peppers and whole garlic cloves.",
  demoAsset: "sample-plate" as DemoAsset,
};

/** Where the sample plate photo used to live (saved photos from older versions point here). */
export const OLD_DEMO_PLATE_SRC = "/demo/plate-stir-fry.jpg";

/** The demo recipe's stable key (its fixes and the test tasks use it). */
export const DEMO_RECIPE_KEY = "air-fryer-garlic-chicken";

// 1,893 kcal before oil; with 2 tbsp olive oil 2,133 (about 533 a serving).
const AIR_FRYER_CHICKEN: ExtractedRecipe = {
  name: "Air-fryer garlic chicken with mushrooms",
  servings: 4,
  servingsConfidence: "stated",
  ingredients: [
    // About 173 g you can eat per leg, at 214 kcal per 100 g: about 370 kcal a leg.
    ing("4 chicken legs, bone-in, skin-on (about 1 kg)", 4, "", "chicken legs", 692, 1480, 131, 0, 104),
    ing("300g king oyster mushrooms", 300, "g", "king oyster mushrooms", 300, 105, 7, 18, 1),
    ing("150g shiitake mushrooms", 150, "g", "shiitake mushrooms", 150, 51, 3, 10, 1),
    ing("200g broccoli", 200, "g", "broccoli", 200, 68, 6, 13, 1),
    ing("1 carrot", 1, "", "carrot", 100, 41, 1, 10, 0),
    ing("1 red bell pepper", 1, "", "red bell pepper", 150, 39, 2, 9, 0),
    ing("1 yellow bell pepper", 1, "", "yellow bell pepper", 148, 40, 1, 9, 0),
    ing("10 cloves garlic", 10, "clove", "garlic", 30, 45, 2, 10, 0),
    ing("2 tbsp soy sauce", 2, "tbsp", "soy sauce", 32, 18, 3, 2, 0),
    ing("1 tsp smoked paprika", 1, "tsp", "smoked paprika", 2.3, 6, 0, 1, 0),
    ing("salt and pepper", null, "", "salt and pepper", null, 0, 0, 0, 0),
    { ...ing("olive oil for brushing", null, "", "olive oil", null, 0, 0, 0, 0), vague: true },
  ],
  questions: [
    {
      id: "oil",
      ingredientIndex: 11,
      prompt: "How much olive oil did you brush on?",
      options: [
        { label: "1 tbsp", kcalDelta: 120, fat: 14 },
        { label: "2 tbsp", kcalDelta: 240, fat: 28 },
        { label: "3 tbsp", kcalDelta: 360, fat: 42 },
      ],
    },
  ],
};

const BRAISED_PORK: ExtractedRecipe = {
  name: "Grandma’s braised pork",
  servings: 6,
  servingsConfidence: "stated",
  ingredients: [
    ing("500g pork belly", 500, "g", "pork belly", 500, 2590, 46, 0, 265),
    ing("4 eggs", 4, "", "eggs", 200, 280, 25, 2, 19),
    ing("3 tbsp soy sauce", 3, "tbsp", "soy sauce", 48, 27, 3, 3, 0),
    ing("30g rock sugar", 30, "g", "rock sugar", 30, 116, 0, 30, 0),
    ing("2 tbsp Shaoxing wine", 2, "tbsp", "Shaoxing wine", 30, 40, 0, 2, 0),
    {
      ...ing("ginger + 2 star anise", null, "", "ginger and star anise", 15, 10, 0, 2, 0),
      unreadable: true,
    },
    { ...ing("a little oil", null, "", "neutral oil", null, 0, 0, 0, 0), vague: true },
  ],
  questions: [
    {
      id: "oil",
      ingredientIndex: 6,
      prompt: "How much is “a little oil”?",
      options: [
        { label: "1 tsp", kcalDelta: 40, fat: 5 },
        { label: "1 tbsp", kcalDelta: 120, fat: 14 },
        { label: "2 tbsp", kcalDelta: 240, fat: 28 },
      ],
    },
  ],
};

function ing(
  text: string,
  quantity: number | null,
  unit: string,
  item: string,
  grams: number | null,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
) {
  return {
    text,
    quantity,
    unit,
    item,
    grams,
    kcal,
    protein,
    carbs,
    fat,
    vague: false,
    unreadable: false,
  };
}

const SOCIAL_HOSTS = [
  "tiktok.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "fb.watch",
  "xiaohongshu.com",
  "xhslink.com",
];

export type LinkCheck =
  | { ok: true; url: string; isDemo: boolean }
  | { ok: false; reason: "invalid" | "social" };

function sameLink(a: URL, b: URL): boolean {
  const clean = (u: URL) => `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  return clean(a) === clean(b);
}

/** The demo video link, or the older demo link (it now opens the same recipe). */
export function isDemoLink(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return [DEMO_LINK, OLD_DEMO_LINK].some((d) => sameLink(url, new URL(d)));
  } catch {
    return false;
  }
}

/** Sorts a pasted link: the demo video, another video (ask for the caption), or a website. */
export function checkLink(input: string): LinkCheck {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid" };
  if (isDemoLink(url.toString())) return { ok: true, url: DEMO_LINK, isDemo: true };
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { ok: false, reason: "social" };
  }
  return { ok: true, url: url.toString(), isDemo: false };
}

/** True if pasted text is the demo caption (ignoring spacing, emoji and case). */
export function isDemoCaption(text: string): boolean {
  const norm = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const t = norm(text);
  return (
    t.includes("air fryer garlic chicken") &&
    t.includes("chicken legs") &&
    t.includes("olive oil for brushing")
  );
}

/** The scripted answer for a demo recipe input, or null if it isn't one. */
export function scriptedExtract(input: ExtractInput): ExtractedRecipe | null {
  if (input.kind === "text") {
    if ((input.sourceUrl && isDemoLink(input.sourceUrl)) || isDemoCaption(input.text)) {
      return AIR_FRYER_CHICKEN;
    }
    return null;
  }
  return input.demoAsset === "recipe-card" ? BRAISED_PORK : null;
}

/**
 * The scripted plate answer for the sample photo: it matches the air-fryer garlic
 * chicken (about 1 serving) once it's saved; before that, Ladle suggests importing it.
 */
export function scriptedPlate(recipes: RecipeSummary[]): PlateAnalysis {
  const chicken = recipes.find((r) => r.key === DEMO_RECIPE_KEY);
  const others = ["chicken-adobo", "tomato-egg-stir-fry"].filter((id) =>
    recipes.some((r) => r.id === id),
  );
  const roughGuess = { name: "Chicken leg with roasted vegetables", kcal: 520 };
  if (!chicken) {
    return {
      matchRecipeId: null,
      matchConfidence: 0.3,
      alternatives: others,
      portionServings: 1,
      portionReason: "One chicken leg with vegetables",
      isNewFood: true,
      roughGuess,
      suggestImport: true,
    };
  }
  return {
    matchRecipeId: chicken.id,
    matchConfidence: 0.86,
    alternatives: others,
    portionServings: 1,
    portionReason: "One chicken leg with vegetables, about a quarter of the batch",
    isNewFood: false,
    roughGuess,
  };
}

/** The demo recipe's name, for "Looks like …" before it's imported. */
export const DEMO_RECIPE_NAME = AIR_FRYER_CHICKEN.name;
