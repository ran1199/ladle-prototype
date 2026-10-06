import { describe, expect, test } from "vitest";
import { isBarcode, labelFoodFrom } from "@/lib/barcode";

// Shaped like Open Food Facts API v2 answers (fields Ladle asks for).
const SPREAD = {
  code: "3017624010701",
  status: 1,
  product: {
    product_name: "Hazelnut spread",
    brands: "Brand A, Brand B",
    serving_size: "15 g",
    serving_quantity: 15,
    nutriments: {
      "energy-kcal_100g": 539,
      "energy-kcal_serving": 80.9,
      proteins_100g: 6.3,
      proteins_serving: 0.945,
      carbohydrates_100g: 57.5,
      carbohydrates_serving: 8.62,
      fat_100g: 30.9,
      fat_serving: 4.63,
    },
  },
};

describe("Open Food Facts labels", () => {
  test("uses the label's per-serving values", () => {
    expect(labelFoodFrom(SPREAD, "3017624010701")).toEqual({
      code: "3017624010701",
      name: "Hazelnut spread",
      brand: "Brand A",
      servingLabel: "1 serving (15 g)",
      kcal: 81,
      protein: 0.9,
      carbs: 8.6,
      fat: 4.6,
    });
  });

  test("works out a serving from per-100 g values and the serving size", () => {
    const json = {
      product: {
        product_name: "Oat crackers",
        serving_size: "30 g",
        serving_quantity: "30",
        nutriments: { "energy-kcal_100g": 420, proteins_100g: 10, carbohydrates_100g: 60, fat_100g: 15 },
      },
    };
    expect(labelFoodFrom(json, "12345678")).toMatchObject({ servingLabel: "1 serving (30 g)", kcal: 126, protein: 3, carbs: 18, fat: 4.5 });
  });

  test("falls back to 100 g, and to kJ when kcal is missing", () => {
    const json = { product: { product_name: "Juice", nutriments: { "energy-kj_100g": 188 } } };
    expect(labelFoodFrom(json, "12345678")).toMatchObject({ servingLabel: "100 g", kcal: 45 });
  });

  test("no calories on the label → null", () => {
    expect(labelFoodFrom({ product: { product_name: "Water", nutriments: {} } }, "12345678")).toBeNull();
    expect(labelFoodFrom({ status: 0 }, "12345678")).toBeNull();
  });

  test("barcode numbers", () => {
    expect(isBarcode("3017624010701")).toBe(true);
    expect(isBarcode("1234567")).toBe(false);
    expect(isBarcode("12345678abc")).toBe(false);
  });
});
