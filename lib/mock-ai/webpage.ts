// Reads the ingredient list out of a recipe web page's HTML.
// Most recipe sites include a hidden, standard description of the recipe
// (schema.org "Recipe" in JSON-LD) with the name, yield and ingredient lines;
// Ladle uses that first. Without it, Ladle takes list items from the page's
// main content that look like ingredients, and asks the user to check them.

import { isStep } from "./extract";
import { matchIngredient } from "./match";
import { hasLeadingAmount } from "./quantity";

export type PageRecipe = {
  name: string;
  yieldText?: string;
  ingredients: string[];
  /** "jsonld" = the page's own recipe data; "list" = Ladle's best guess from the page. */
  method: "jsonld" | "list";
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  frac13: "⅓",
  frac23: "⅔",
  frac18: "⅛",
  deg: "°",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  eacute: "é",
  egrave: "è",
  ntilde: "ñ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function isRecipeType(type: unknown): boolean {
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

/** Finds a schema.org Recipe object anywhere inside parsed JSON-LD (arrays, @graph, nesting). */
function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  if (isRecipeType(obj["@type"])) return obj;
  for (const value of Object.values(obj)) {
    const found = findRecipe(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function yieldFrom(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return decodeEntities(value);
  if (Array.isArray(value)) {
    const strings = value.filter((v) => typeof v === "string" || typeof v === "number").map(String);
    return strings.find((s) => /[a-z]/i.test(s)) ?? strings[0];
  }
  return undefined;
}

function fromJsonLd(html: string): PageRecipe | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;
    const raw = recipe.recipeIngredient ?? recipe.ingredients;
    const ingredients = (Array.isArray(raw) ? raw : [])
      .filter((i): i is string => typeof i === "string")
      .map((i) => stripTags(i))
      .filter(Boolean);
    if (ingredients.length === 0) continue;
    return {
      name: typeof recipe.name === "string" ? stripTags(recipe.name) : "",
      yieldText: yieldFrom(recipe.recipeYield),
      ingredients,
      method: "jsonld",
    };
  }
  return null;
}

function pageTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (og) return decodeEntities(og[1]).trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]).split(/\s[|–—-]\s/)[0] : "";
}

function fromList(html: string): PageRecipe | null {
  let body = html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  const main = body.match(/<(main|article)\b[\s\S]*?<\/\1>/i);
  if (main) body = main[0];
  const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length > 1 && t.length < 120 && t.split(" ").length <= 14)
    .filter((t) => (hasLeadingAmount(t) || matchIngredient(t) !== null) && !isStep(t));
  const unique = [...new Set(items)];
  if (unique.length < 2) return null;
  return { name: pageTitle(html), ingredients: unique.slice(0, 40), method: "list" };
}

/** The recipe on a page, or null if Ladle can't find an ingredient list. */
export function parseRecipePage(html: string): PageRecipe | null {
  const jsonld = fromJsonLd(html);
  if (jsonld) return { ...jsonld, name: jsonld.name || pageTitle(html) };
  return fromList(html);
}

// ---------- Address safety (used by the server route) ----------

/** True for addresses on private, local or reserved networks, which Ladle's server must never fetch. */
export function isPrivateAddress(address: string): boolean {
  const a = address.toLowerCase();
  if (a.includes(":")) {
    // IPv4-mapped IPv6 ("::ffff:10.0.0.1")
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      a === "::" ||
      a === "::1" ||
      /^f[cd][0-9a-f]{2}:/.test(a) || // fc00::/7 unique local
      /^fe[89ab][0-9a-f]:/.test(a) || // fe80::/10 link-local
      a.startsWith("::ffff:") ||
      a.startsWith("64:ff9b:") ||
      a.startsWith("2001:db8:")
    );
  }
  const parts = a.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [p0, p1] = parts;
  return (
    p0 === 0 ||
    p0 === 10 ||
    p0 === 127 ||
    (p0 === 100 && p1 >= 64 && p1 <= 127) ||
    (p0 === 169 && p1 === 254) ||
    (p0 === 172 && p1 >= 16 && p1 <= 31) ||
    (p0 === 192 && p1 === 168) ||
    (p0 === 192 && p1 === 0) ||
    (p0 === 198 && (p1 === 18 || p1 === 19)) ||
    p0 >= 224
  );
}

/** Checks a URL's form before any lookup: https only, no credentials, no local names. */
export function checkFetchUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return null;
  }
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isPrivateAddress(host)) return null;
  }
  if (!host.includes(".")) return null;
  return url;
}
