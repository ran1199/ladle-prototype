// Quick corrections (F7): "More oil", "Less oil", "Halved the batch",
// "Swapped an ingredient", "Something else". Each option knows its calorie
// effect on the recipe (the pot) and on this plate, and how to update the
// saved recipe when the user chooses "Always". Ladle never changes a recipe
// without the user's confirmation.

import { formatAmount, kcalFor } from "./logic";
import type { Fix, FixKind, Ingredient, Recipe } from "./types";

export const FIX_KINDS: { kind: FixKind; label: string }[] = [
  { kind: "more-oil", label: "More oil" },
  { kind: "less-oil", label: "Less oil" },
  { kind: "halved", label: "Halved the batch" },
  { kind: "swapped", label: "Swapped an ingredient" },
  { kind: "other", label: "Something else" },
];

const OIL_TBSP = { kcal: 120, fat: 14 };

/** Swaps Ladle knows about: ingredient → lighter or different choice, with a kcal factor. */
const SWAPS: { from: string; to: string; factor: number }[] = [
  { from: "chicken thighs", to: "chicken breast", factor: 0.85 },
  { from: "honey", to: "no honey", factor: 0 },
  { from: "pork belly", to: "pork shoulder", factor: 0.5 },
  { from: "eggs", to: "egg whites", factor: 0.3 },
  { from: "cooked rice", to: "cauliflower rice", factor: 0.15 },
  { from: "ground turkey", to: "extra-lean ground turkey", factor: 0.8 },
  { from: "ghee", to: "olive oil", factor: 1.07 },
  { from: "Greek yogurt", to: "skyr", factor: 0.9 },
];

/** "Something else" examples shown as chips under the text box (calories for this plate). */
export const OTHER_PRESETS: { detail: string; label: string; kcal: number; note: string }[] = [
  { detail: "cheese", label: "Added cheese on top", kcal: 110, note: "about 30 g cheddar" },
  { detail: "fried-egg", label: "Added a fried egg", kcal: 90, note: "one large egg" },
  { detail: "extra-sauce", label: "Extra sauce", kcal: 40, note: "about 2 tbsp" },
  {
    detail: "skipped-topping",
    label: "Skipped the garnish",
    kcal: -15,
    note: "no sesame or scallions",
  },
];

export type FixOption = {
  kind: FixKind;
  detail: string;
  /** Chip text, e.g. "+1 tbsp · +120". */
  chip: string;
  /** Short label stored on the log, e.g. "More oil: +1 tbsp". */
  label: string;
  /** Calories added to this plate ("Just this time"). */
  plateDelta: number;
  /** Calories added to the whole recipe, if it applies to the pot. */
  potDelta: number | null;
  /** What "Always" changes, e.g. "oil 2 → 3 tbsp". Null if "Always" isn't possible. */
  alwaysNote: string | null;
};

function oilIngredient(recipe: Recipe): { index: number; ing: Ingredient } | null {
  const index = recipe.ingredients.findIndex(
    (i) => /oil/i.test(i.item) && !/sesame/i.test(i.item) && (i.unit === "tbsp" || i.vague),
  );
  return index >= 0 ? { index, ing: recipe.ingredients[index] } : null;
}

function signed(n: number) {
  return `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}`;
}

/** The plate's share of a change to the whole recipe. */
function share(recipe: Recipe, potDelta: number, portion: number) {
  return Math.round((potDelta * portion) / recipe.servings);
}

/** The options for one kind of fix. `baseKcal` is this plate's calories before fixes. */
export function fixOptions(
  kind: FixKind,
  recipe: Recipe | null,
  portion: number,
  baseKcal: number,
): FixOption[] {
  if (kind === "other") {
    return OTHER_PRESETS.map((p) => ({
      kind,
      detail: p.detail,
      chip: `${p.label} · ${signed(p.kcal)}`,
      label: p.label,
      plateDelta: p.kcal,
      potDelta: recipe ? p.kcal * recipe.servings : null,
      alwaysNote: recipe ? `${p.label.toLowerCase()} every time` : null,
    }));
  }
  if (!recipe) return [];

  if (kind === "more-oil" || kind === "less-oil") {
    const oil = oilIngredient(recipe);
    const current = oil?.ing.quantity ?? 0;
    const amounts = kind === "more-oil" ? [1, 2] : [1];
    return amounts
      .filter((n) => kind === "more-oil" || current >= n)
      .map((n) => {
        const potDelta = (kind === "more-oil" ? 1 : -1) * n * OIL_TBSP.kcal;
        const next = kind === "more-oil" ? current + n : current - n;
        return {
          kind,
          detail: `${kind === "more-oil" ? "+" : "-"}${n} tbsp`,
          chip: `${kind === "more-oil" ? "+" : "−"}${n} tbsp · ${signed(potDelta)}`,
          label: `${kind === "more-oil" ? "More" : "Less"} oil: ${kind === "more-oil" ? "+" : "−"}${n} tbsp`,
          plateDelta: share(recipe, potDelta, portion),
          potDelta,
          alwaysNote: oil
            ? `oil ${formatAmount(current)} → ${formatAmount(next)} tbsp`
            : `add ${n} tbsp oil`,
        };
      });
  }

  if (kind === "halved") {
    const total = recipe.ingredients.reduce((s, i) => s + i.kcal, 0);
    return [
      {
        kind,
        detail: "half",
        chip: `Half the recipe · ${signed(-baseKcal / 2)}`,
        label: "Halved the batch",
        plateDelta: -Math.round(baseKcal / 2),
        potDelta: -Math.round(total / 2),
        alwaysNote: `save as a half batch (${Math.round(total)} → ${Math.round(total / 2)} kcal)`,
      },
    ];
  }

  // Swapped an ingredient
  return recipe.ingredients.flatMap((ing) => {
    const swap = SWAPS.find((s) => ing.item.toLowerCase().includes(s.from.toLowerCase()));
    if (!swap || ing.kcal === 0) return [];
    const potDelta = Math.round(ing.kcal * (swap.factor - 1));
    return [
      {
        kind,
        detail: `${swap.from}>${swap.to}`,
        chip: `${ing.item} → ${swap.to} · ${signed(potDelta)}`,
        label: `Swapped ${ing.item} for ${swap.to}`,
        plateDelta: share(recipe, potDelta, portion),
        potDelta,
        alwaysNote: `${ing.item} → ${swap.to}`,
      },
    ];
  });
}

const CUSTOM = "custom:";

/**
 * A "Something else" fix described in the user's own words, e.g. "added 30g cheddar".
 * Stored as "custom:<kcal per serving>:<summary>" so it can be rebuilt later.
 */
export function customOption(
  recipe: Recipe | null,
  portion: number,
  kcalPerServing: number,
  summary: string,
): FixOption {
  const perServing = Math.round(kcalPerServing);
  const plateDelta = Math.round(perServing * portion);
  return {
    kind: "other",
    detail: `${CUSTOM}${perServing}:${summary}`,
    chip: `${summary} · ${signed(plateDelta)}`,
    label: summary,
    plateDelta,
    potDelta: recipe ? perServing * recipe.servings : null,
    alwaysNote: recipe ? `${summary.charAt(0).toLowerCase()}${summary.slice(1)} every time` : null,
  };
}

function parseCustom(detail: string): { kcalPerServing: number; summary: string } | null {
  if (!detail.startsWith(CUSTOM)) return null;
  const rest = detail.slice(CUSTOM.length);
  const colon = rest.indexOf(":");
  const kcal = Number(rest.slice(0, colon));
  return colon > 0 && Number.isFinite(kcal) ? { kcalPerServing: kcal, summary: rest.slice(colon + 1) } : null;
}

/** Rebuilds an option from a stored fix (for suggestions and "Update recipe"). */
export function optionFor(recipe: Recipe, kind: FixKind, detail: string): FixOption | null {
  const custom = kind === "other" ? parseCustom(detail) : null;
  if (custom) return customOption(recipe, 1, custom.kcalPerServing, custom.summary);
  const base = kcalFor(recipe, 1);
  return fixOptions(kind, recipe, 1, base).find((o) => o.detail === detail) ?? null;
}

/** "Always": the recipe with the change applied, plus its change-history line. */
export function applyToRecipe(recipe: Recipe, option: FixOption): Recipe {
  const at = new Date().toISOString();
  let ingredients = recipe.ingredients;

  if (option.kind === "more-oil" || option.kind === "less-oil") {
    const n = Number(option.detail.replace(/[^\d.]/g, "")) * (option.kind === "more-oil" ? 1 : -1);
    const oil = oilIngredient(recipe);
    if (oil) {
      const quantity = Math.max(0, (oil.ing.quantity ?? 0) + n);
      const base = oil.ing.text.replace(/\s*\([^)]*\)\s*$/, "");
      const startsWithAmount = /^[\d¼½¾]/.test(oil.ing.text);
      ingredients = recipe.ingredients.map((i, idx) =>
        idx === oil.index
          ? {
              ...i,
              quantity,
              unit: "tbsp",
              text: startsWithAmount
                ? `${formatAmount(quantity)} tbsp ${i.item}`
                : `${base} (${formatAmount(quantity)} tbsp)`,
              kcal: Math.max(0, i.kcal + n * OIL_TBSP.kcal),
              fat: Math.max(0, i.fat + n * OIL_TBSP.fat),
              estimated: false,
            }
          : i,
      );
    } else if (n > 0) {
      ingredients = [
        ...recipe.ingredients,
        {
          text: `${n} tbsp neutral oil`,
          quantity: n,
          unit: "tbsp",
          item: "neutral oil",
          kcal: n * OIL_TBSP.kcal,
          protein: 0,
          carbs: 0,
          fat: n * OIL_TBSP.fat,
        },
      ];
    }
  } else if (option.kind === "halved") {
    ingredients = recipe.ingredients.map((i) => ({
      ...i,
      quantity: i.quantity === null ? null : i.quantity / 2,
      text: `½ × ${i.text}`,
      kcal: Math.round(i.kcal / 2),
      protein: Math.round(i.protein / 2),
      carbs: Math.round(i.carbs / 2),
      fat: Math.round(i.fat / 2),
    }));
  } else if (option.kind === "swapped") {
    const [from, to] = option.detail.split(">");
    const swap = SWAPS.find((s) => s.from === from);
    ingredients = recipe.ingredients.map((i) =>
      swap && i.item.toLowerCase().includes(from.toLowerCase())
        ? {
            ...i,
            item: to,
            text: i.text.replace(new RegExp(from, "i"), to),
            kcal: Math.round(i.kcal * swap.factor),
            protein: Math.round(i.protein * swap.factor),
            carbs: Math.round(i.carbs * swap.factor),
            fat: Math.round(i.fat * swap.factor),
          }
        : i,
    );
  } else if (option.kind === "other" && option.potDelta !== null) {
    ingredients = [
      ...recipe.ingredients,
      {
        text: option.label.replace(/^Added /, ""),
        quantity: null,
        unit: "",
        item: option.label.toLowerCase(),
        kcal: option.potDelta,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ];
  }

  return {
    ...recipe,
    ingredients,
    history: [...recipe.history, { at, summary: option.alwaysNote ?? option.label }],
  };
}

export type Suggestion = { kind: FixKind; detail: string; text: string };

const SUGGESTION_TEXT: Record<FixKind, (detail: string, recipe: Recipe) => string> = {
  "more-oil": (_, recipe) =>
    /brush/i.test(oilIngredient(recipe)?.ing.text ?? "")
      ? "You usually brush on more oil. Update your recipe?"
      : "You usually add more oil to this. Update your recipe?",
  "less-oil": () => "You usually use less oil in this. Update your recipe?",
  halved: () => "You usually cook a half batch of this. Update your recipe?",
  swapped: (d) => `You usually use ${d.split(">")[1]} in this. Update your recipe?`,
  other: (d) => {
    const custom = parseCustom(d);
    if (custom) return `You’ve made this change before: “${custom.summary}”. Update your recipe?`;
    return `You usually ${(OTHER_PRESETS.find((p) => p.detail === d)?.label ?? "change this").toLowerCase()}. Update your recipe?`;
  },
};

/**
 * The learning rule: the same "Just this time" fix made twice on a recipe
 * (since it was last saved with "Always" or dismissed) → suggest updating it.
 */
export function pendingSuggestion(recipe: Recipe, fixes: Fix[]): Suggestion | null {
  const key = recipe.key ?? recipe.id;
  const counts = new Map<string, number>();
  const mine = fixes.filter((f) => f.recipeKey === key).sort((a, b) => a.at.localeCompare(b.at));
  for (const f of mine) {
    const id = `${f.kind}|${f.detail}`;
    counts.set(id, f.scope === "once" ? (counts.get(id) ?? 0) + 1 : 0);
  }
  for (const [id, n] of counts) {
    if (n >= 2) {
      const [kind, detail] = id.split("|") as [FixKind, string];
      return { kind, detail, text: SUGGESTION_TEXT[kind](detail, recipe) };
    }
  }
  return null;
}
