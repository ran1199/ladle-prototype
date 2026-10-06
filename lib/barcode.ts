// Packaged food from its barcode, via the free Open Food Facts database
// (https://world.openfoodfacts.org). The server route asks Open Food Facts;
// this file turns its answer into what Ladle shows: name, serving, calories.
// Label data always beats an estimate.

export type LabelFood = {
  code: string;
  name: string;
  brand: string | null;
  /** e.g. "1 serving (30 g)" or "100 g" when the label has no serving size. */
  servingLabel: string;
  /** Per serving (or per 100 g). */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** 8 to 14 digits: EAN-8, UPC-A, EAN-13, GTIN-14. */
export function isBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

type Nutriments = Record<string, number | string | undefined>;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** kcal from a nutriments block, using kJ if kcal is missing. */
function kcalFrom(n: Nutriments, suffix: "_serving" | "_100g"): number | null {
  const kcal = num(n[`energy-kcal${suffix}`]);
  if (kcal !== null) return kcal;
  const kj = num(n[`energy-kj${suffix}`]) ?? num(n[`energy${suffix}`]);
  return kj !== null ? kj / 4.184 : null;
}

/** Ladle's food from an Open Food Facts v2 product response, or null if it has no calories. */
export function labelFoodFrom(json: unknown, code: string): LabelFood | null {
  const product = (json as { product?: Record<string, unknown> } | null)?.product;
  if (!product) return null;
  const n = (product.nutriments ?? {}) as Nutriments;
  const name = String(product.product_name || product.generic_name || "").trim();
  const brand = String(product.brands ?? "").split(",")[0].trim() || null;
  const servingSize = String(product.serving_size ?? "").trim();
  const servingGrams = num(product.serving_quantity);

  const round = (v: number | null) => Math.round((v ?? 0) * 10) / 10;
  const perServing = kcalFrom(n, "_serving");
  const per100 = kcalFrom(n, "_100g");

  let kcal: number;
  let protein: number;
  let carbs: number;
  let fat: number;
  let servingLabel: string;
  if (perServing !== null) {
    kcal = perServing;
    protein = round(num(n.proteins_serving));
    carbs = round(num(n.carbohydrates_serving));
    fat = round(num(n.fat_serving));
    servingLabel = servingSize ? `1 serving (${servingSize})` : "1 serving";
  } else if (per100 !== null && servingGrams) {
    const f = servingGrams / 100;
    kcal = per100 * f;
    protein = round((num(n.proteins_100g) ?? 0) * f);
    carbs = round((num(n.carbohydrates_100g) ?? 0) * f);
    fat = round((num(n.fat_100g) ?? 0) * f);
    servingLabel = `1 serving (${servingSize || `${servingGrams} g`})`;
  } else if (per100 !== null) {
    kcal = per100;
    protein = round(num(n.proteins_100g));
    carbs = round(num(n.carbohydrates_100g));
    fat = round(num(n.fat_100g));
    servingLabel = "100 g";
  } else {
    return null;
  }

  return {
    code,
    name: name || "Packaged food",
    brand,
    servingLabel,
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
  };
}
