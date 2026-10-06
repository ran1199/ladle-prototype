// The mock engine: Ladle's simulated AI for everything that isn't a bundled
// demo input. It runs in the browser (only recipe web pages are fetched
// through Ladle's server) and follows the same LadleAI interface a real AI
// engine would.

import { AIError, type LadleAI } from "../ai/types";
import type { ExtractedRecipe } from "../ai/schemas";
import { estimateCorrectionMock } from "./correction";
import { extractFromText } from "./extract";
import { analyzePlateMock, hashBytes } from "./plate";
import { restaurantEstimate } from "./restaurant";
import { searchFoods } from "./search";
import type { PageRecipe } from "./webpage";

/** Below this Tesseract confidence (0–100), Ladle asks the user to check the text. */
const OCR_MIN_CONFIDENCE = 60;

export const LIST_NOTICE = "I found these ingredients. Check that nothing’s missing.";

async function fetchRecipePage(url: string, signal?: AbortSignal): Promise<PageRecipe> {
  let res: Response;
  try {
    res = await fetch("/api/fetch-recipe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new AIError("Ladle couldn’t reach that page. Check your connection, or paste the ingredients.");
  }
  const data = (await res.json().catch(() => null)) as (PageRecipe & { error?: string }) | null;
  if (!res.ok || !data || data.error) {
    throw new AIError(data?.error ?? "Ladle couldn’t open that page. Paste the ingredients instead.");
  }
  return data;
}

/** Fixes letters text recognition often mixes up in amounts: "1 1b" → "1 lb", "8 0z" → "8 oz". */
export function fixOcrText(text: string): string {
  return text
    .replace(/(\d)\s*(?:1b|Ib|lb)(s?)\b/g, "$1 lb$2")
    .replace(/(\d)\s*[0O]z\b/g, "$1 oz")
    .replace(/(\d)\s*Tbsp\b/g, "$1 tbsp")
    .replace(/[|]/g, "l");
}

/** A result for a photo Ladle couldn't read well: the review screen shows the photo and an editable box. */
function unsure(readText: string, partial?: ExtractedRecipe): ExtractedRecipe {
  return {
    name: partial?.name ?? "New recipe",
    servings: partial?.servings ?? 2,
    servingsConfidence: partial?.servingsConfidence ?? "unknown",
    ingredients: partial?.ingredients ?? [],
    questions: partial?.questions ?? [],
    lowConfidence: true,
    readText,
  };
}

export const mockEngine: LadleAI = {
  async extractRecipe(input, options) {
    if (input.kind === "text") {
      if (input.sourceUrl && !input.text.trim()) {
        const page = await fetchRecipePage(input.sourceUrl, options?.signal);
        return extractFromText(page.ingredients.join("\n"), {
          name: page.name,
          yieldText: page.yieldText,
          ingredientsOnly: true,
          notice: page.method === "list" ? LIST_NOTICE : undefined,
        });
      }
      return extractFromText(input.text);
    }

    const { readRecipePhoto } = await import("./ocr");
    const ocr = await readRecipePhoto(input.file, options?.onProgress, options?.signal);
    const text = fixOcrText(ocr.text);
    const { confidence } = ocr;
    let result: ExtractedRecipe | null = null;
    try {
      result = extractFromText(text);
    } catch {
      result = null;
    }
    const readable = result?.ingredients.filter((i) => !i.unreadable).length ?? 0;
    if (!result || confidence < OCR_MIN_CONFIDENCE || readable < 2) return unsure(text.trim(), result ?? undefined);
    return { ...result, readText: text.trim() };
  },

  async analyzePlate({ photo, recipes, context }) {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    return analyzePlateMock(recipes, context, hashBytes(bytes));
  },

  async estimateCorrection(input) {
    return estimateCorrectionMock(input);
  },

  async searchFood(query) {
    return searchFoods(query);
  },

  async estimateRestaurantPlate({ dishType }) {
    const estimate = restaurantEstimate(dishType);
    if (!estimate) throw new AIError("Pick a kind of dish, or search for the food instead.");
    return estimate;
  },
};
