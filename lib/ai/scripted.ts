// The scripted engine: fixed answers for the bundled demo inputs (the demo
// video link, the demo caption, Grandma's recipe card, the sample plate photo),
// so the five usability-test tasks behave identically for every participant.
// Values come from the project brief. Everything else goes to the mock engine.

import { DEMO_LINK } from "../content";
import type { ExtractedRecipe, PlateAnalysis } from "./schemas";
import type { DemoAsset, ExtractInput, RecipeSummary } from "./types";

export const DEMO_CAPTION = `Garlic chicken stir-fry 🧄 serves 4
600g boneless skinless chicken thighs
300g broccoli
6 cloves garlic
2 tbsp soy sauce
1 tbsp oyster sauce
1 tbsp honey
1 tbsp cornstarch
oil for frying`;

export const DEMO_CARD = {
  src: "/demo/recipe-card.jpg",
  alt: "Handwritten recipe card: Grandma’s braised pork. 500g pork belly, 4 eggs, 3 tbsp soy sauce, 30g rock sugar, 2 tbsp Shaoxing wine, ginger + 2 star anise, a little oil. Feeds 6.",
  demoAsset: "recipe-card" as DemoAsset,
};

/** The bundled sample plate photo (Ran’s own photo; metadata removed). */
export const DEMO_PLATE = {
  src: "/demo/plate-stir-fry.jpg",
  alt: "A bowl of chicken with broccoli, mushrooms, garlic and peppers, held over a kitchen counter.",
  demoAsset: "sample-plate" as DemoAsset,
};

const STIR_FRY: ExtractedRecipe = {
  name: "Garlic chicken stir-fry",
  servings: 4,
  servingsConfidence: "stated",
  ingredients: [
    ing("600g boneless skinless chicken thighs", 600, "g", "chicken thighs", 600, 720, 116, 0, 28),
    ing("300g broccoli", 300, "g", "broccoli", 300, 100, 8, 20, 1),
    ing("6 cloves garlic", 6, "clove", "garlic", 18, 27, 1, 6, 0),
    ing("2 tbsp soy sauce", 2, "tbsp", "soy sauce", 32, 18, 2, 2, 0),
    ing("1 tbsp oyster sauce", 1, "tbsp", "oyster sauce", 18, 9, 0, 2, 0),
    ing("1 tbsp honey", 1, "tbsp", "honey", 21, 64, 0, 17, 0),
    ing("1 tbsp cornstarch", 1, "tbsp", "cornstarch", 8, 30, 0, 7, 0),
    { ...ing("oil for frying", null, "", "neutral oil", null, 0, 0, 0, 0), vague: true },
  ],
  questions: [
    {
      id: "oil",
      ingredientIndex: 7,
      prompt: "How much oil did you use for frying?",
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

/** Sorts a pasted link: the demo video, another video (ask for the caption), or a website. */
export function checkLink(input: string): LinkCheck {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid" };
  if (sameLink(url, new URL(DEMO_LINK))) return { ok: true, url: DEMO_LINK, isDemo: true };
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
    t.includes("garlic chicken stir fry") &&
    t.includes("chicken thighs") &&
    t.includes("oil for frying")
  );
}

/** The scripted answer for a demo recipe input, or null if it isn't one. */
export function scriptedExtract(input: ExtractInput): ExtractedRecipe | null {
  if (input.kind === "text") {
    if (input.sourceUrl === DEMO_LINK || isDemoCaption(input.text)) return STIR_FRY;
    return null;
  }
  return input.demoAsset === "recipe-card" ? BRAISED_PORK : null;
}

/**
 * The scripted plate answer for the sample photo: it matches the garlic chicken
 * stir-fry (about 1 serving) once it's saved; before that, Ladle suggests importing it.
 */
export function scriptedPlate(recipes: RecipeSummary[]): PlateAnalysis {
  const stirFry = recipes.find((r) => r.key === "garlic-chicken-stir-fry");
  const others = ["tomato-egg-stir-fry", "kimchi-fried-rice"].filter((id) =>
    recipes.some((r) => r.id === id),
  );
  const roughGuess = { name: "Chicken and broccoli stir-fry", kcal: 480 };
  if (!stirFry) {
    return {
      matchRecipeId: null,
      matchConfidence: 0.3,
      alternatives: others,
      portionServings: 1,
      portionReason: "One bowl",
      isNewFood: true,
      roughGuess,
      suggestImport: true,
    };
  }
  return {
    matchRecipeId: stirFry.id,
    matchConfidence: 0.86,
    alternatives: others,
    portionServings: 1,
    portionReason: "One bowl, about a quarter of the pan",
    isNewFood: false,
    roughGuess,
  };
}
