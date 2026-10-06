// Finds which nutrition-table ingredient a line is about.
// Order: an exact phrase in the line (longest wins, so "sesame oil" beats
// "oil"), then a phrase whose words all appear somewhere in the line, then a
// near spelling ("brocoli" → broccoli).

import { NUTRITION, type NutritionEntry } from "./nutrition";

/** "Tomatoes" → "tomato", "leaves" → "leaf", "dishes" → "dish". */
export function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ves")) return `${word.slice(0, -3)}f`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(?:s|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !/(?:ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Lowercase words without accents or punctuation, each made singular. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(singular);
}

type Phrase = { words: string[]; key: string; entry: NutritionEntry };

const PHRASES: Phrase[] = [];
const BY_KEY = new Map<string, Phrase>();
for (const entry of NUTRITION) {
  for (const text of [entry.name, ...entry.aliases]) {
    const words = tokens(text);
    const key = words.join(" ");
    if (!key || BY_KEY.has(key)) continue; // the first ingredient to claim a phrase keeps it
    const phrase = { words, key, entry };
    PHRASES.push(phrase);
    BY_KEY.set(key, phrase);
  }
}
const LONGEST = Math.max(...PHRASES.map((p) => p.words.length));

const sortedKey = (words: string[]) => [...words].sort().join(" ");
const BY_SORTED = new Map<string, Phrase>();
for (const p of PHRASES) if (!BY_SORTED.has(sortedKey(p.words))) BY_SORTED.set(sortedKey(p.words), p);

export type Match = {
  entry: NutritionEntry;
  how: "exact" | "tokens" | "fuzzy";
  /** The words that matched, as written in the line where possible (e.g. "chicken thighs"). */
  label: string;
};

/** Words that describe preparation, not the ingredient; ignored by the fuzzy step. */
const FILLER = new Set(
  "a an and or of the to for into in on with fresh chopped minced diced sliced grated finely roughly thinly large medium small cut peeled crushed optional about plus divided packed cold warm hot cooked raw whole dried ground boneless skinless piece pieces lightly beaten room temperature taste needed".split(
    " ",
  ),
);

/** Dice similarity of two words' letter pairs (1 = identical). */
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const pa = pairs(a);
  const pb = pairs(b);
  let overlap = 0;
  for (const [k, n] of pa) overlap += Math.min(n, pb.get(k) ?? 0);
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

/** The original words of `text` that produced tokens [start, end). */
function originalSlice(text: string, start: number, end: number): string {
  const words = text.match(/[A-Za-zÀ-ÿ0-9’']+/g) ?? [];
  // tokens() can split one original word in two (e.g. "stir-fry"); fall back to the phrase.
  return words.length === tokens(text).length ? words.slice(start, end).join(" ") : "";
}

/** The best nutrition entry for some ingredient text, or null if nothing fits. */
export function matchIngredient(text: string): Match | null {
  const words = tokens(text);
  if (words.length === 0) return null;

  // 1. Exact phrase, longest first (then the earliest in the line).
  let exact: Match | null = null;
  let exactLength = 0;
  for (let len = Math.min(LONGEST, words.length); len >= 1 && !exact; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const phrase = BY_KEY.get(words.slice(start, start + len).join(" "));
      if (phrase) {
        const label = originalSlice(text, start, start + len) || phrase.entry.name;
        exact = {
          entry: phrase.entry,
          how: "exact",
          label: label === label.toUpperCase() ? label.toLowerCase() : label,
        };
        exactLength = len;
        break;
      }
    }
  }
  // A longer phrase written in another order right next to each other
  // ("vinegar (balsamic)", "thighs chicken") beats a shorter exact one.
  for (let len = Math.min(LONGEST, words.length); len > Math.max(1, exactLength); len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const phrase = BY_SORTED.get(sortedKey(words.slice(start, start + len)));
      if (phrase) return { entry: phrase.entry, how: "tokens", label: phrase.entry.name };
    }
  }
  if (exact) return exact;

  // 2. Every word of a phrase appears somewhere in the line ("chicken, boneless thigh").
  const set = new Set(words);
  let best: Phrase | null = null;
  for (const p of PHRASES) {
    if (p.words.length < 2 || !p.words.every((w) => set.has(w))) continue;
    const longer =
      !best ||
      p.words.length > best.words.length ||
      (p.words.length === best.words.length && p.key.length > best.key.length);
    if (longer) best = p;
  }
  if (best) return { entry: best.entry, how: "tokens", label: best.entry.name };

  // 3. Near spelling: compare the line's meaningful words with each phrase.
  const content = words.filter((w) => !FILLER.has(w) && !/^\d/.test(w));
  let fuzzy = null as { phrase: Phrase; score: number } | null;
  for (let len = Math.min(3, content.length); len >= 1; len--) {
    for (let start = 0; start + len <= content.length; start++) {
      const candidate = content.slice(start, start + len).join(" ");
      if (candidate.replace(/ /g, "").length < 4) continue;
      for (const p of PHRASES) {
        if (p.words.length !== len || p.key.replace(/ /g, "").length < 4) continue;
        const score = dice(candidate, p.key);
        if (score >= 0.8 && (!fuzzy || score > fuzzy.score)) fuzzy = { phrase: p, score };
      }
    }
    if (fuzzy) break;
  }
  return fuzzy ? { entry: fuzzy.phrase.entry, how: "fuzzy", label: fuzzy.phrase.entry.name } : null;
}

/** Looks up an entry by its exact name (for tests and corrections). */
export function entryNamed(name: string): NutritionEntry | undefined {
  return NUTRITION.find((e) => e.name === name);
}

/** Ingredients whose name or other names start with (or contain) the search, for "Pick a food". */
export function searchIngredients(query: string, limit = 6): NutritionEntry[] {
  const q = tokens(query).join(" ");
  if (!q) return [];
  const scored: { entry: NutritionEntry; score: number }[] = [];
  for (const entry of NUTRITION) {
    let score = 0;
    for (const text of [entry.name, ...entry.aliases]) {
      const t = tokens(text).join(" ");
      const s = t === q ? 3 : t.startsWith(q) ? 2 : t.includes(q) ? 1 : 0;
      score = Math.max(score, s + (text === entry.name && s > 0 ? 0.5 : 0));
    }
    if (score > 0) scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length)
    .slice(0, limit)
    .map((s) => s.entry);
}
