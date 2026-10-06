// Looks up a barcode in Open Food Facts (free, no key). Only digits are
// accepted, and only Open Food Facts is ever contacted. Nothing is stored.

import { isBarcode, labelFoodFrom } from "@/lib/barcode";

const FIELDS = [
  "product_name",
  "generic_name",
  "brands",
  "serving_size",
  "serving_quantity",
  "nutriments",
].join(",");

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  if (!isBarcode(code)) {
    return Response.json({ error: "A barcode is 8 to 14 digits." }, { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, {
      headers: {
        // Open Food Facts asks apps to say who they are.
        "user-agent": "LadlePrototype/0.1 (https://ladle-prototype.vercel.app)",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "Ladle couldn’t reach the product database. Try again, or search instead." },
      { status: 502 },
    );
  }
  if (res.status === 404) return Response.json({ found: false });
  if (!res.ok) {
    return Response.json(
      { error: "The product database didn’t answer. Try again, or search instead." },
      { status: 502 },
    );
  }
  const json = await res.json().catch(() => null);
  if (!json || json.status === 0) return Response.json({ found: false });
  const food = labelFoodFrom(json, code);
  return Response.json(food ? { found: true, food } : { found: false, noNutrition: true });
}
