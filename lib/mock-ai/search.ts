// Food search over Ladle's built-in list of ready-to-eat foods (lib/mock-ai/foods.ts).
// Whole-name matches first, then names that start with the search, then foods
// whose words include every searched word, then near spellings.

import type { FoodResult } from "../ai/schemas";
import { FOODS, type Food } from "./foods";
import { tokens } from "./match";

const MAX_RESULTS = 8;

function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) pairs.set(a.slice(i, i + 2), (pairs.get(a.slice(i, i + 2)) ?? 0) + 1);
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const k = b.slice(i, i + 2);
    const n = pairs.get(k) ?? 0;
    if (n > 0) {
      overlap++;
      pairs.set(k, n - 1);
    }
  }
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

function score(food: Food, query: string[], joined: string): number {
  let best = 0;
  for (const text of [food.name, ...food.aliases]) {
    const words = tokens(text);
    const name = words.join(" ");
    let s = 0;
    if (name === joined) s = 100;
    else if (name.startsWith(joined)) s = 80;
    else if (query.every((q) => words.some((w) => w === q))) s = 65;
    else if (query.every((q) => words.some((w) => w.startsWith(q)))) s = 50;
    else {
      const fuzzy = Math.max(...words.map((w) => Math.max(...query.map((q) => (q.length >= 4 ? dice(q, w) : 0)))));
      if (fuzzy >= 0.75) s = 30 * fuzzy;
    }
    // The food's own name counts slightly more than its other names.
    if (s > 0 && text === food.name) s += 2;
    best = Math.max(best, s);
  }
  return best;
}

export function searchFoods(query: string): FoodResult[] {
  const q = tokens(query);
  if (q.length === 0) return [];
  const joined = q.join(" ");
  return FOODS.map((food) => ({ food, s: score(food, q, joined) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.food.name.localeCompare(b.food.name))
    .slice(0, MAX_RESULTS)
    .map(({ food: { name, servingLabel, kcal, protein, carbs, fat } }) => ({
      name,
      servingLabel,
      kcal,
      protein,
      carbs,
      fat,
    }));
}
