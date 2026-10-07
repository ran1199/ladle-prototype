// The mock recipe reader. Takes recipe text the way a person pastes it (a
// caption, a list, a whole web page's ingredients) and returns the same shape
// a real AI would: name, servings, ingredients with calories, and at most three
// clarifying questions about the vague amounts that matter most.

import { AIError } from "../ai/types";
import type { ClarifyingQuestion, ExtractedIngredient, ExtractedRecipe } from "../ai/schemas";
import { matchIngredient } from "./match";
import { CALORIE_DENSE, type NutritionEntry } from "./nutrition";
import { gramsFor, hasLeadingAmount, parseAmount, type AnyUnit } from "./quantity";

/** Calories per serving used to guess servings when a recipe doesn't say. */
const KCAL_PER_SERVING = 450;
const MAX_QUESTIONS = 3;

export type ExtractHints = {
  /** A name from the page (e.g. schema.org Recipe name). */
  name?: string;
  /** A yield from the page, e.g. "4 servings". */
  yieldText?: string;
  /** A note for the review screen. */
  notice?: string;
  /** Every line is an ingredient (no title, steps or headings to skip). */
  ingredientsOnly?: boolean;
};

// ---------- Cleaning ----------

const NOISE = [
  /https?:\/\/\S+/gi,
  /(?:^|\s)[#@][\p{L}\p{N}_.]+/gu,
  /\blink in (?:my )?bio\b.*$/gi,
  /\b(?:full )?recipe (?:below|in (?:the )?caption|on (?:my|the) (?:blog|website))\b/gi,
  /\b(?:follow|save|share|like|comment)(?: this(?: post| recipe)?| me| us)? for more(?: recipes?)?!*/gi,
  /^\s*(?:follow|save|share|like|comment|subscribe|tag)\b.*$/gi,
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu,
];

function clean(line: string): string {
  let t = line;
  for (const re of NOISE) t = t.replace(re, " ").replace(/\s+/g, " ");
  return t
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—•*▢☐◦▪·✓✔>]+/, "")
    .replace(/^\d+[.)]\s+(?=\D)/, "")
    .trim();
}

// ---------- Servings ----------

const SERVINGS_PATTERNS: RegExp[] = [
  /\b(?:serves|feeds|serving size|servings|portions|yield|yields|makes)\s*:?\s*(\d+(?:\s*(?:-|–|to)\s*\d+)?)(?:\s*(?:servings?|portions?|people|persons|pax)\b)?/i,
  /\b(\d+(?:\s*(?:-|–|to)\s*\d+)?)\s*(?:servings?|portions?|people|persons|pax)\b/i,
  /\bfor\s+(\d+)\s*(?:people|persons)?\s*$/i,
];

function servingsFrom(text: string): { servings: number; match: string } | null {
  for (const re of SERVINGS_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const nums = m[1].split(/\s*(?:-|–|to)\s*/).map(Number);
    const n = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    if (n >= 1 && n <= 50) return { servings: n, match: m[0] };
  }
  return null;
}

// ---------- Line types ----------

const HEADINGS =
  /^(?:ingredients?(?: list)?|you(?:'|’)?ll need|what you need|for the .+|sauce|marinade|garnish(?:es)?|toppings?|to serve|dressing|filling|batter|dough|seasoning|notes?|equipment|optional|main|base|broth|soup|salad|aromatics|vegetables|protein)$/i;
const METHOD_HEADINGS =
  /^(?:method|instructions?|directions?|steps?|preparation|prep|how to make(?: it)?|procedure|cooking instructions|to make)$/i;
const TIMING =
  /^(?:prep(?:aration)?|cook(?:ing)?|total|active|ready in|bake|resting|marinating|chill)(?: time)?\b.*\d|^\d+\s*(?:min|mins|minutes|hours?|hrs?)\b|^(?:calories|kcal|nutrition|per serving)\b/i;
const VERBS =
  /^(?:add|heat|stir|cook|mix|combine|bake|boil|bring|place|pour|serve|season|simmer|fry|saute|sauté|preheat|remove|transfer|toss|whisk|blend|cut|chop|slice|dice|marinate|let|set|cover|reduce|drain|rinse|wash|soak|garnish|top|sprinkle|spread|fold|knead|grill|roast|steam|broil|turn|flip|return|taste|adjust|divide|arrange|prepare|make|use|enjoy|repeat|keep|allow|put|melt|beat|lower|increase|sear|deglaze|scoop|squeeze|mash|store|refrigerate|chill|freeze|microwave|crack|peel|pat|lay|line|grease|wrap|fill|pound|char|discard|strain|skim|thicken|poach|shred|blanch|grate|puree|purée|sizzle|finish|coat|dip|dredge|glaze|baste|rest|cool|soften|layer|assemble|ladle|scatter|drizzle|bring|break|carve|cream|sift|press|rub|shape|form|stuff|toast|warm up|then|once|when|after|while|meanwhile|finally|first|next|step|in a|in the|to make|using|start|begin|leave|wait|check|give|it|you|this|i|we)\b/i;

/** True for an instruction line ("Heat the oil…"), not an ingredient. */
export function isStep(line: string): boolean {
  if (hasLeadingAmount(line)) return false;
  const words = line.split(" ").length;
  return VERBS.test(line) || words > 12 || /[.!?]\s+\S/.test(line) || (/[.!]$/.test(line) && words >= 6);
}

/** Splits "2 eggs, 1 cup milk" into separate lines (only when 2+ parts have amounts). */
function splitList(line: string): string[] {
  const parts = line.split(/\s*[,;]\s*|\s+\+\s+/).filter(Boolean);
  const withAmount = parts.filter((p) => hasLeadingAmount(p));
  return withAmount.length >= 2 ? parts : [line];
}

// ---------- Vague amounts ----------

const VAGUE =
  /\b(?:for (?:deep[- ]|shallow[- ]|pan[- ])?frying|to fry|to taste|as (?:needed|required|desired)|a little|little bit|a bit|a splash|splash of|drizzle|a dash|handful|a knob|knob of|generous(?:ly)?|some|a glug|for greasing|for brushing|for drizzling|for (?:the )?garnish|to garnish|to serve|for serving|few drops|optional|a pinch)\b/i;
const FRYING = /\b(?:fry|frying|deep|shallow|generous(?:ly)?|glug|brush|brushing)\b/i;

type Option = { label: string; unit: "tsp" | "tbsp" | "cup"; amount: number };
const OPTIONS: Record<string, Option[]> = {
  frying: [
    { label: "1 tbsp", unit: "tbsp", amount: 1 },
    { label: "2 tbsp", unit: "tbsp", amount: 2 },
    { label: "3 tbsp", unit: "tbsp", amount: 3 },
  ],
  small: [
    { label: "1 tsp", unit: "tsp", amount: 1 },
    { label: "1 tbsp", unit: "tbsp", amount: 1 },
    { label: "2 tbsp", unit: "tbsp", amount: 2 },
  ],
  nut: [
    { label: "1 tbsp", unit: "tbsp", amount: 1 },
    { label: "2 tbsp", unit: "tbsp", amount: 2 },
    { label: "¼ cup", unit: "cup", amount: 0.25 },
  ],
  cheese: [
    { label: "1 tbsp", unit: "tbsp", amount: 1 },
    { label: "¼ cup", unit: "cup", amount: 0.25 },
    { label: "½ cup", unit: "cup", amount: 0.5 },
  ],
};

function optionSet(entry: NutritionEntry, line: string): Option[] {
  if (entry.category === "nut") return OPTIONS.nut;
  if (entry.category === "cheese") return OPTIONS.cheese;
  if ((entry.category === "oil" || entry.category === "fat") && FRYING.test(line)) return OPTIONS.frying;
  return OPTIONS.small;
}

// ---------- Calories ----------

function macros(entry: NutritionEntry, grams: number) {
  const f = grams / 100;
  return {
    kcal: Math.round(entry.kcal * f),
    protein: Math.round(entry.protein * f),
    carbs: Math.round(entry.carbs * f),
    fat: Math.round(entry.fat * f),
  };
}

/** Default grams when a non-dense ingredient has no amount ("cilantro", "salt to taste"). */
function defaultGrams(entry: NutritionEntry): number {
  switch (entry.category) {
    case "negligible":
      return 0;
    case "spice":
    case "herb":
      return 2;
    case "liquid":
      return 30;
    default:
      return (entry.unitWeights as Partial<Record<string, number>>).piece ?? 100;
  }
}

// ---------- Main ----------

type Working = ExtractedIngredient & {
  entry: NutritionEntry | null;
  options?: { label: string; kcalDelta: number; fat: number; grams: number; option: Option }[];
};

function readIngredient(text: string): Working {
  const amount = parseAmount(text);
  // Match on the part before the first comma or bracket ("onion, finely chopped"), then the whole line.
  const core = amount.rest.replace(/\([^)]*\)/g, " ").split(/,| - | – /)[0].trim();
  const match = matchIngredient(core) ?? matchIngredient(amount.rest);

  if (!match) {
    return {
      text,
      quantity: amount.quantity,
      unit: amount.unit,
      item: core || text,
      grams: null,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      vague: false,
      unreadable: true,
      entry: null,
    };
  }

  const { entry } = match;
  const wordAmount = /^(?:a|an|some)\b/i.test(text) && ["handful", "knob", "dash", "pinch"].includes(amount.unit);
  const vague = amount.quantity === null || wordAmount;
  const base = {
    text,
    item: match.label,
    unreadable: false,
    entry,
  };

  if (vague && CALORIE_DENSE.includes(entry.category)) {
    const options = optionSet(entry, text).map((option) => {
      const grams = gramsFor(option.amount, option.unit, entry)!;
      const m = macros(entry, grams);
      return { label: option.label, kcalDelta: m.kcal, fat: m.fat, grams, option };
    });
    return {
      ...base,
      quantity: null,
      unit: "",
      grams: null,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      vague: true,
      options,
    };
  }

  let grams =
    amount.quantity === null
      ? defaultGrams(entry)
      : (gramsFor(amount.quantity, amount.unit as AnyUnit, entry, amount.perUnitGrams) ?? 0);
  // "2 (400 g) cans chickpeas, drained": the label weight includes the liquid; about 60% is left.
  if (amount.perUnitGrams !== undefined && /\bdrained\b/i.test(text)) grams *= 0.6;
  const m = macros(entry, grams);
  return {
    ...base,
    quantity: amount.quantity,
    unit: amount.unit,
    grams: Math.round(grams),
    ...m,
    vague: false,
    ...(vague && m.kcal >= 5 ? { estimated: true } : {}),
  };
}

/**
 * Calories for one typed ingredient line, e.g. "2 tbsp olive oil" (for the
 * review screen's "Pick a food"). A vague amount uses its middle option.
 */
export function ingredientFromLine(text: string): ExtractedIngredient {
  const w = readIngredient(text);
  if (w.options) {
    const mid = w.options[1];
    return {
      text,
      quantity: mid.option.amount,
      unit: mid.option.unit,
      item: w.item,
      grams: Math.round(mid.grams),
      ...macros(w.entry!, mid.grams),
      vague: false,
      unreadable: false,
      estimated: true,
    };
  }
  return {
    text: w.text,
    quantity: w.quantity,
    unit: w.unit,
    item: w.item,
    grams: w.grams,
    kcal: w.kcal,
    protein: w.protein,
    carbs: w.carbs,
    fat: w.fat,
    vague: w.vague,
    unreadable: w.unreadable,
    ...(w.estimated ? { estimated: true } : {}),
  };
}

function cleanName(line: string): string {
  const name = line
    // "Chicken tinga tacos — easy weeknight recipe!" → "Chicken tinga tacos"
    .replace(/\s+[-–—|:]\s+[^-–—|:]*\brecipe\b.*$/i, "")
    .replace(/[\s!.]+$/, "")
    .replace(/\s*[-–—|:]*\s*recipe\s*$/i, "")
    .replace(/^recipe\s*[:\-–—]\s*/i, "")
    .replace(/[\s\-–—|:,.!]+$/, "")
    .trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

/** Reads recipe text into the shared ExtractedRecipe shape. */
export function extractFromText(text: string, hints: ExtractHints = {}): ExtractedRecipe {
  const rawLines = text.split(/\r?\n|\s+[•·▪]\s+/);
  let servings: number | null = hints.yieldText ? (servingsFrom(hints.yieldText)?.servings ?? null) : null;
  if (servings === null && hints.yieldText && /^\s*\d+\s*$/.test(hints.yieldText)) {
    servings = Number(hints.yieldText);
  }

  let name = hints.name ? cleanName(clean(hints.name)) : "";
  let inMethod = false;
  const ingredientLines: string[] = [];

  for (const raw of rawLines) {
    let line = clean(raw);
    if (!/[\p{L}\p{N}]/u.test(line)) continue;

    if (!hints.ingredientsOnly) {
      // Servings can sit anywhere ("Garlic chicken stir-fry serves 4", "Yield: 6").
      const s = servingsFrom(line);
      const servingsLine = /^\d+(?:\s*(?:-|–|to)\s*\d+)?\s*(?:servings?|portions?|people|persons|pax)\b/i.test(line);
      if (s && (!hasLeadingAmount(line) || servingsLine)) {
        if (servings === null) servings = s.servings;
        line = clean(line.replace(s.match, " "));
        if (!/[\p{L}\p{N}]/u.test(line)) continue;
      }
      const bare = line.replace(/:$/, "").trim();
      if (METHOD_HEADINGS.test(bare)) {
        inMethod = true;
        continue;
      }
      if (/^ingredients?\b/i.test(bare) && bare.split(" ").length <= 3) {
        inMethod = false;
        continue;
      }
      if (inMethod || TIMING.test(line)) continue;
      if (HEADINGS.test(bare) || (line.endsWith(":") && bare.split(" ").length <= 5)) continue;
      if (!name && !hasLeadingAmount(line) && !VAGUE.test(line) && ingredientLines.length === 0) {
        // A title can end with "!" or be long-ish; only an instruction verb rules it out.
        if (!VERBS.test(line) && line.split(" ").length <= 14) name = cleanName(line);
        continue;
      }
      if (isStep(line)) continue;
    }
    ingredientLines.push(...splitList(line));
  }

  const working = ingredientLines.map(readIngredient);
  if (working.length === 0 || working.every((w) => w.unreadable)) {
    throw new AIError(
      "I couldn’t find an ingredient list in that. Paste the ingredients, one per line.",
    );
  }

  // Vague, calorie-dense lines: ask about the biggest differences, estimate the rest.
  const vague = working
    .map((w, index) => ({ w, index }))
    .filter(({ w }) => w.options)
    .sort((a, b) => spread(b.w) - spread(a.w) || a.index - b.index);

  const middleTotal =
    working.reduce((s, w) => s + w.kcal, 0) +
    vague.reduce((s, { w }) => s + w.options![1].kcalDelta, 0);

  const servingsConfidence = servings !== null ? "stated" : "inferred";
  if (servings === null) {
    servings = Math.min(4, Math.max(2, Math.round(middleTotal / KCAL_PER_SERVING)));
  }

  const questions: ClarifyingQuestion[] = [];
  if (servingsConfidence === "inferred") {
    const choices = [servings - 1, servings, servings + 2];
    questions.push({
      id: "servings",
      ingredientIndex: -1,
      prompt: "How many servings does this make?",
      kind: "servings",
      options: choices.map((n) => ({
        label: `${n} ${n === 1 ? "serving" : "servings"}`,
        kcalDelta: 0,
        servings: n,
      })),
    });
  }

  vague.forEach(({ w, index }) => {
    if (questions.length < MAX_QUESTIONS) {
      questions.push({
        id: `q${index}`,
        ingredientIndex: index,
        prompt: /\bfry(?:ing)?\b/i.test(w.text)
          ? `How much ${w.entry!.category === "oil" ? "oil" : w.item} did you use for frying?`
          : /\bbrush(?:ing)?\b/i.test(w.text)
            ? `How much ${w.item.toLowerCase()} did you brush on?`
            : `How much is “${w.text}”?`,
        options: w.options!.map(({ label, kcalDelta, fat }) => ({ label, kcalDelta, fat })),
      });
      return;
    }
    // No question left: use the middle answer and mark it as an estimate.
    const mid = w.options![1];
    const m = macros(w.entry!, mid.grams);
    working[index] = {
      ...w,
      quantity: mid.option.amount,
      unit: mid.option.unit,
      grams: Math.round(mid.grams),
      ...m,
      estimated: true,
    };
  });

  const ingredients: ExtractedIngredient[] = working.map((w) => {
    const out: ExtractedIngredient = {
      text: w.text,
      quantity: w.quantity === null ? null : Math.round(w.quantity * 1000) / 1000,
      unit: w.unit,
      item: w.item,
      grams: w.grams,
      kcal: w.kcal,
      protein: w.protein,
      carbs: w.carbs,
      fat: w.fat,
      vague: w.vague,
      unreadable: w.unreadable,
    };
    if (w.estimated) out.estimated = true;
    return out;
  });

  return {
    name: name || "New recipe",
    servings,
    servingsConfidence,
    ingredients,
    questions,
    ...(hints.notice ? { notice: hints.notice } : {}),
  };
}

function spread(w: Working): number {
  const o = w.options!;
  return o[o.length - 1].kcalDelta - o[0].kcalDelta;
}
