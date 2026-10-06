// Reads the amount at the start (or end) of an ingredient line:
// "1½ cups", "2-3 tbsp", "600g", "a pinch", "1 (400 g) can", "chicken thighs 600g".
// Then turns an amount into grams for a given ingredient.

import type { Category, NutritionEntry, Unit } from "./nutrition";

export type MassUnit = "g" | "kg" | "oz" | "lb";
export type VolumeUnit = "ml" | "l" | "fl oz";
/** "" means a plain count ("4 eggs"). */
export type AnyUnit = MassUnit | VolumeUnit | Unit | "";

export type ParsedAmount = {
  quantity: number | null;
  unit: AnyUnit;
  /** The line without its amount, e.g. "boneless skinless chicken thighs". */
  rest: string;
  /** Grams in one unit, when the line says so: "1 (400 g) can", "2 x 200g packs". */
  perUnitGrams?: number;
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};
const FRAC = "[¼½¾⅓⅔⅕⅛⅜⅝⅞]";

/** One number: "1 1/2", "1½", "1/2", "1.5", ".5", "2", "½". */
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*${FRAC}|\\d+\\/\\d+|\\d*\\.\\d+|\\d+|${FRAC})`;
/** A number or a range ("2-3", "2 to 3", "2 or 3"), taken as its midpoint. */
const AMOUNT = `${NUM}(?:\\s*(?:-|–|—|to|or)\\s*${NUM})?`;

const NUMBER_WORDS: [RegExp, number][] = [
  [/^(?:a\s+)?couple(?:\s+of)?\b/i, 2],
  [/^(?:a\s+)?few\b/i, 3],
  [/^(?:a\s+|one\s+)?half(?:\s+an?)?\b/i, 0.5],
  [/^(?:a\s+|one\s+)?quarter(?:\s+of)?(?:\s+an?)?\b/i, 0.25],
  [/^(?:a\s+)?dozen\b/i, 12],
  [/^(?:a|an|one)\b/i, 1],
  [/^two\b/i, 2],
  [/^three\b/i, 3],
  [/^four\b/i, 4],
  [/^five\b/i, 5],
  [/^six\b/i, 6],
  [/^seven\b/i, 7],
  [/^eight\b/i, 8],
  [/^nine\b/i, 9],
  [/^ten\b/i, 10],
  [/^eleven\b/i, 11],
  [/^twelve\b/i, 12],
];

/** Unit words → the unit Ladle uses. Matched case-insensitively, longest first. */
const UNIT_WORDS: [string, AnyUnit][] = [
  ["tablespoons?|tbsps?|tbs|tbl|tblsp", "tbsp"],
  ["teaspoons?|tsps?", "tsp"],
  ["cups?", "cup"],
  ["kilograms?|kilos?|kgs?", "kg"],
  ["grams?|grammes?|gr|gms?|g", "g"],
  ["millilit(?:er|re)s?|mls?", "ml"],
  ["lit(?:er|re)s?|l", "l"],
  ["fl\\.?\\s?oz|fluid\\s+ounces?", "fl oz"],
  ["ounces?|oz", "oz"],
  ["pounds?|lbs?", "lb"],
  ["cloves?", "clove"],
  ["heads?|bulbs?", "head"],
  ["pieces?|pcs?|chunks?", "piece"],
  ["slices?|rashers?|strips?", "slice"],
  ["cans?|tins?|jars?", "can"],
  ["stalks?|ribs?|stems?", "stalk"],
  ["bunch(?:es)?|bundles?", "bunch"],
  ["handfuls?", "handful"],
  ["pinch(?:es)?", "pinch"],
  ["dash(?:es)?|splash(?:es)?", "dash"],
  ["sheets?", "sheet"],
  ["blocks?|cakes?", "block"],
  ["packs?|packets?|packages?|pkgs?|bags?|boxes", "pack"],
  ["leaf|leaves", "leaf"],
  ["sprigs?", "sprig"],
  ["knobs?|thumbs?", "knob"],
  ["sticks?", "stick"],
  ["inch(?:es)?|in\\.|cm", "inch"],
];

const MASS_GRAMS: Record<MassUnit, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
const VOLUME_ML: Partial<Record<AnyUnit, number>> = {
  ml: 1,
  l: 1000,
  "fl oz": 29.57,
  tbsp: 15,
  tsp: 5,
  cup: 240,
};

/** Grams per count unit when the ingredient doesn't say. */
const DEFAULT_COUNT_GRAMS: Partial<Record<AnyUnit, number>> = {
  pinch: 0.4,
  dash: 0.6,
  handful: 30,
  bunch: 100,
  can: 400,
  slice: 25,
  stalk: 40,
  sheet: 3,
  sprig: 1,
  leaf: 1,
  knob: 10,
  head: 300,
  block: 400,
  pack: 100,
  piece: 100,
  clove: 3,
  stick: 113,
  inch: 5,
};

/** Grams per ml when an ingredient has no spoon or cup weight. */
const DENSITY: Record<Category, number> = {
  oil: 0.91,
  fat: 0.95,
  sugar: 0.85,
  sauce: 1.1,
  liquid: 1,
  dairy: 1.03,
  nut: 0.6,
  cheese: 0.45,
  grain: 0.6,
  legume: 0.75,
  vegetable: 0.55,
  fruit: 0.6,
  herb: 0.25,
  spice: 0.5,
  protein: 0.9,
  negligible: 1,
};

/** "1 1/2" → 1.5, "½" → 0.5, "2-3" → 2.5. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/⁄/g, "/");
  const range = t.match(new RegExp(`^(${NUM})\\s*(?:-|–|—|to|or)\\s*(${NUM})$`));
  if (range) {
    const a = parseNumber(range[1]);
    const b = parseNumber(range[2]);
    return a !== null && b !== null ? (a + b) / 2 : null;
  }
  let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(new RegExp(`^(\\d+)\\s*(${FRAC})$`));
  if (m) return Number(m[1]) + UNICODE_FRACTIONS[m[2]];
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  if (UNICODE_FRACTIONS[t] !== undefined) return UNICODE_FRACTIONS[t];
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Reads a unit at the start of `text`. "T" is a tablespoon and "t" a teaspoon. */
function readUnit(text: string): { unit: AnyUnit; length: number } | null {
  const exact = text.match(/^(Tb|T)(?![A-Za-z])\.?/);
  if (exact) return { unit: "tbsp", length: exact[0].length };
  const tsp = text.match(/^t(?![A-Za-z])\.?/);
  if (tsp) return { unit: "tsp", length: tsp[0].length };
  if (text.startsWith('"')) return { unit: "inch", length: 1 };
  for (const [pattern, unit] of UNIT_WORDS) {
    const m = text.match(new RegExp(`^(?:${pattern})(?![A-Za-z])\\.?`, "i"));
    if (m) return { unit, length: m[0].length };
  }
  return null;
}

function massGrams(quantity: number, unit: AnyUnit): number | null {
  return unit in MASS_GRAMS ? quantity * MASS_GRAMS[unit as MassUnit] : null;
}

/** Takes "(400 g)" or "(14-ounce)" out of the text and returns its weight in grams. */
function takeParenWeight(text: string): { text: string; grams?: number } {
  const re = new RegExp(`\\(\\s*(${AMOUNT})\\s*-?\\s*([A-Za-z.]+)\\s*\\)`);
  const m = text.match(re);
  if (!m) return { text };
  const n = parseNumber(m[1]);
  const unit = readUnit(m[2]);
  if (n === null || !unit) return { text };
  const grams =
    massGrams(n, unit.unit) ?? (VOLUME_ML[unit.unit] ? n * VOLUME_ML[unit.unit]! : undefined);
  if (grams === undefined) return { text };
  return { text: (text.slice(0, m.index) + text.slice(m.index! + m[0].length)).trim(), grams };
}

/** Reads "number [x number unit] [(weight)] [unit] [of]" from the start of `text`. */
function readLeading(text: string): ParsedAmount | null {
  let quantity: number | null = null;
  let rest = text;

  const num = rest.match(new RegExp(`^(${AMOUNT})`));
  if (num) {
    quantity = parseNumber(num[1]);
    rest = rest.slice(num[0].length);
  } else {
    for (const [re, value] of NUMBER_WORDS) {
      const m = rest.match(re);
      if (m) {
        quantity = value;
        rest = rest.slice(m[0].length);
        break;
      }
    }
  }
  if (quantity === null) return null;
  rest = rest.trimStart();

  let perUnitGrams: number | undefined;
  // "2 x 400g cans"
  const times = rest.match(new RegExp(`^[x×]\\s*(${AMOUNT})\\s*`, "i"));
  if (times) {
    const inner = parseNumber(times[1]);
    const unit = readUnit(rest.slice(times[0].length));
    if (inner !== null && unit && massGrams(inner, unit.unit) !== null) {
      perUnitGrams = massGrams(inner, unit.unit)!;
      rest = rest.slice(times[0].length + unit.length).trimStart();
    }
  }
  const paren = takeParenWeight(rest);
  if (paren.grams !== undefined && paren.text !== rest && rest.trimStart().startsWith("(")) {
    perUnitGrams = paren.grams;
    rest = paren.text;
  }

  let unit: AnyUnit = "";
  const u = readUnit(rest);
  if (u) {
    unit = u.unit;
    rest = rest.slice(u.length).trimStart();
  }
  // "1 can (400 g) chickpeas"
  if (perUnitGrams === undefined && rest.startsWith("(")) {
    const p = takeParenWeight(rest);
    if (p.grams !== undefined) {
      perUnitGrams = p.grams;
      rest = p.text;
    }
  }
  rest = rest.replace(/^of\s+/i, "").replace(/^[-–,:]\s*/, "").trim();
  return { quantity, unit, rest, perUnitGrams };
}

/**
 * Splits an ingredient line into amount and the rest.
 * Leading amounts first ("2 tbsp soy sauce"), then trailing ones ("Garlic - 6 cloves").
 */
export function parseAmount(line: string): ParsedAmount {
  const text = line.replace(/⁄/g, "/").trim();
  const leading = readLeading(text);
  // "a little oil", "some honey": the article isn't an amount.
  if (leading && !/^(?:a|an)\s+(?:little|bit|splash|drizzle|glug|generous|good|few drops)/i.test(text)) {
    return leading;
  }

  const trailing = text.match(
    new RegExp(`^(.*?[A-Za-z].*?)[\\s,:\\-–x×(]+(${AMOUNT})\\s*([A-Za-z."]+)?\\)?\\.?$`),
  );
  if (trailing) {
    const quantity = parseNumber(trailing[2]);
    const unit = trailing[3] ? readUnit(trailing[3]) : null;
    if (quantity !== null && (!trailing[3] || (unit && unit.length >= trailing[3].replace(/\.$/, "").length))) {
      return { quantity, unit: unit?.unit ?? "", rest: trailing[1].trim() };
    }
  }
  return { quantity: null, unit: "", rest: text };
}

/** True if a line starts with an amount (number, fraction or number word). */
export function hasLeadingAmount(line: string): boolean {
  return new RegExp(`^(?:${AMOUNT})`).test(line.trim());
}

/** Grams for an amount of an ingredient, or null if there's no amount. */
export function gramsFor(
  quantity: number | null,
  unit: AnyUnit,
  entry: NutritionEntry,
  perUnitGrams?: number,
): number | null {
  if (quantity === null) return null;
  const mass = massGrams(quantity, unit);
  if (mass !== null) return mass;
  if (perUnitGrams !== undefined) return quantity * perUnitGrams;
  const weights = entry.unitWeights as Partial<Record<AnyUnit, number>>;
  if (unit === "") {
    // "1 bay leaf", "3 cardamom pods": spices and herbs weigh about a gram each.
    const small = entry.category === "spice" || entry.category === "herb" || entry.category === "negligible";
    return quantity * (weights.piece ?? (small ? 1 : DEFAULT_COUNT_GRAMS.piece!));
  }
  if (weights[unit] !== undefined) return quantity * weights[unit]!;
  const ml = VOLUME_ML[unit];
  if (ml !== undefined) {
    // Spoon and cup sizes from the table first (tbsp → cup), then density.
    if (unit === "tbsp" && weights.cup) return quantity * (weights.cup / 16);
    if (unit === "tsp" && weights.tbsp) return quantity * (weights.tbsp / 3);
    if (unit === "tsp" && weights.cup) return quantity * (weights.cup / 48);
    if (unit === "cup" && weights.tbsp) return quantity * weights.tbsp * 16;
    return quantity * ml * (entry.density ?? DENSITY[entry.category]);
  }
  return quantity * (DEFAULT_COUNT_GRAMS[unit] ?? DEFAULT_COUNT_GRAMS.piece!);
}

/** Grams in one of a spoon/cup unit for an ingredient (for vague-amount options). */
export function unitGrams(unit: "tsp" | "tbsp" | "cup", entry: NutritionEntry): number {
  return gramsFor(1, unit, entry)!;
}
