// The mock reader for "Something else": a correction in the user's own words,
// e.g. "added 30g cheddar", "extra tbsp butter", "no rice", "double the sauce".
// Returns the calorie change for this plate and a short summary.

import type { CorrectionEstimate } from "../ai/schemas";
import type { Ingredient, Recipe } from "../types";
import { matchIngredient } from "./match";
import type { NutritionEntry } from "./nutrition";
import { gramsFor, parseAmount, type AnyUnit } from "./quantity";

type Direction = "add" | "remove" | "less" | "half" | "double";

const DIRECTIONS: [RegExp, Direction][] = [
  [/^(?:no|without|skipped|skip|left out|leave out|didn'?t (?:add|use|have)|did not (?:add|use|have)|removed|omitted|omit|minus|hold the|cut out)\b/i, "remove"],
  [/^(?:half|halved|half as much|half the amount of)\b/i, "half"],
  [/^(?:double|doubled|twice(?: as much)?|2x)\b/i, "double"],
  [/^(?:less|fewer|a bit less|lighter on|light on)\b/i, "less"],
  [/^(?:add|added|adding|extra|more|plus|with|topped (?:it )?with|also|some|a lot of|lots of|put|threw in|used|had)\b/i, "add"],
];

/** One typical amount of an ingredient, for "more garlic" or "added cheese". */
function typical(entry: NutritionEntry): { quantity: number; unit: AnyUnit; text: string } {
  const w = entry.unitWeights as Partial<Record<string, number>>;
  switch (entry.category) {
    case "oil":
    case "fat":
    case "sugar":
    case "sauce":
    case "nut":
      return { quantity: 1, unit: "tbsp", text: "1 tbsp" };
    case "cheese":
      return { quantity: 30, unit: "g", text: "30 g" };
    case "spice":
    case "herb":
    case "negligible":
      return { quantity: 1, unit: "tsp", text: "1 tsp" };
    case "protein":
      if (w.piece && w.piece <= 120) return { quantity: 1, unit: "", text: "1" };
      return { quantity: 100, unit: "g", text: "100 g" };
    case "grain":
      return entry.name.startsWith("cooked") || entry.name.includes("bread") || entry.name.includes("tortilla") || entry.name === "naan" || entry.name === "pita" || entry.name === "burger bun"
        ? w.piece
          ? { quantity: 1, unit: "", text: "1" }
          : { quantity: 1, unit: "cup", text: "1 cup" }
        : { quantity: 50, unit: "g", text: "50 g" };
    case "vegetable":
    case "fruit":
      if (w.clove) return { quantity: 1, unit: "clove", text: "1 clove" };
      return w.cup ? { quantity: 0.5, unit: "cup", text: "½ cup" } : { quantity: 1, unit: "", text: "1" };
    default:
      return { quantity: 0.25, unit: "cup", text: "¼ cup" };
  }
}

const FRACTIONS: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };

/** 0.5 → "½", 1.5 → "1½", 2 → "2". */
function amountText(n: number): string {
  const whole = Math.floor(n);
  const frac = FRACTIONS[String(Math.round((n - whole) * 100) / 100)];
  if (frac) return whole ? `${whole}${frac}` : frac;
  return String(Math.round(n * 100) / 100);
}

function kcalOf(entry: NutritionEntry, grams: number) {
  return (entry.kcal * grams) / 100;
}

/** The recipe line an entry refers to, if the recipe has it. */
function inRecipe(recipe: Recipe | null, entry: NutritionEntry | null, words: string): Ingredient | null {
  if (!recipe) return null;
  for (const ing of entry ? recipe.ingredients : []) {
    const m = matchIngredient(ing.item) ?? matchIngredient(ing.text);
    if (m?.entry === entry) return ing;
  }
  // "the sauce": any sauce line in the recipe.
  if (/\bsauce\b/i.test(words)) {
    const sauce = recipe.ingredients.find((i) => /sauce/i.test(i.item));
    if (sauce) return sauce;
  }
  return null;
}

type Part = { kcal: number; summary: string };

function readPart(
  text: string,
  direction: Direction,
  recipe: Recipe | null,
  portion: number,
): Part | null {
  const words = text.replace(/^(?:the|some|my|of)\s+/i, "").replace(/\s+(?:on top|on it|today|this time|in it)$/i, "").trim();
  if (!words) return null;

  let amount = parseAmount(words);
  // "extra tbsp butter" → 1 tbsp butter
  if (amount.quantity === null) {
    const withOne = parseAmount(`1 ${words}`);
    if (withOne.unit !== "") amount = withOne;
  }
  const match = matchIngredient(amount.rest);
  const share = recipe ? portion / recipe.servings : 1;
  const recipeLine = inRecipe(recipe, match?.entry ?? null, words);

  if (direction === "double" || direction === "half" || direction === "remove" || direction === "less") {
    if (recipeLine && amount.quantity === null) {
      const factor = { double: 1, half: -0.5, remove: -1, less: -0.3 }[direction];
      const label = recipeLine.item;
      const summary = {
        double: `Double the ${label}`,
        half: `Half the ${label}`,
        remove: `No ${label}`,
        less: `Less ${label}`,
      }[direction];
      return { kcal: recipeLine.kcal * factor * share, summary };
    }
  }
  if (!match) return null;

  const { entry } = match;
  const amt =
    amount.quantity !== null
      ? { quantity: amount.quantity, unit: amount.unit, text: `${amountText(amount.quantity)}${amount.unit ? ` ${amount.unit}` : ""}` }
      : typical(entry);
  const grams = gramsFor(amt.quantity, amt.unit, entry, amount.perUnitGrams) ?? 0;
  const kcal = kcalOf(entry, grams);
  const label = match.label.toLowerCase();
  const sign = direction === "add" || direction === "double" ? 1 : direction === "less" || direction === "half" ? -0.5 : -1;
  const article = amt.unit === "" && amt.quantity === 1;
  const shown = article ? (/^[aeiou]/.test(label) ? "an" : "a") : amt.text;
  const about = amount.quantity === null && !article ? "about " : "";
  const summary =
    sign > 0
      ? `Added ${about}${shown} ${label}`
      : direction === "remove"
        ? `No ${label} (${about}${shown})`
        : `Less ${label}`;
  return { kcal: kcal * sign, summary };
}

/** Estimates a free-text correction. Unrecognised text → recognized: false. */
export function estimateCorrectionMock(input: {
  recipe: Recipe | null;
  text: string;
  portion?: number;
}): CorrectionEstimate {
  const portion = input.portion ?? 1;
  const text = input.text.trim().replace(/[.!]+$/, "");
  // "added cheese and a fried egg" → two parts; each keeps the last direction word.
  const pieces = text.split(/\s*(?:,|;|\band\b|\bplus\b|&|\+)\s*/i).filter(Boolean).slice(0, 4);
  let direction: Direction = "add";
  const parts: Part[] = [];
  for (const piece of pieces) {
    let rest = piece.replace(/^(?:i|we)\s+/i, "");
    for (const [re, dir] of DIRECTIONS) {
      const m = rest.match(re);
      if (m) {
        direction = dir;
        rest = rest.slice(m[0].length).trim();
        break;
      }
    }
    const part = readPart(rest, direction, input.recipe, portion);
    if (part) parts.push(part);
  }

  if (parts.length === 0) {
    return {
      kcalDelta: 0,
      summary: "I couldn’t work that out. Enter the calories yourself?",
      recognized: false,
    };
  }
  const kcalDelta = Math.round(parts.reduce((s, p) => s + p.kcal, 0));
  return { kcalDelta, summary: parts.map((p) => p.summary).join("; "), recognized: true };
}
