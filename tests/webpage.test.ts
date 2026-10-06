import { describe, expect, test } from "vitest";
import { checkFetchUrl, decodeEntities, isPrivateAddress, parseRecipePage } from "@/lib/mock-ai/webpage";
import { extractFromText } from "@/lib/mock-ai/extract";

const JSONLD_PAGE = `<!doctype html><html><head><title>Best Lemon Pasta | Some Blog</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":"Lemon pasta"},
 {"@type":"Recipe","name":"Lemon Ricotta Pasta","recipeYield":["4","4 servings"],
  "recipeIngredient":["12 oz spaghetti","1 cup ricotta","2 tbsp olive oil","1 lemon, zested &amp; juiced","&frac12; cup grated parmesan","Salt to taste"],
  "recipeInstructions":[{"@type":"HowToStep","text":"Boil the pasta."}]}]}</script>
</head><body><main><ul><li>Not used</li></ul></main></body></html>`;

const LIST_PAGE = `<html><head><meta property="og:title" content="Grandma&#39;s Banana Bread"></head><body>
<nav><ul><li>Home</li><li>Recipes</li><li>About</li></ul></nav>
<article><h1>Grandma's Banana Bread</h1><p>The best loaf.</p>
<ul><li>3 ripe bananas</li><li>1/3 cup melted butter</li><li>3/4 cup sugar</li><li>1 egg</li><li>1 1/2 cups flour</li><li>1 tsp baking soda</li></ul>
<ol><li>Preheat the oven to 350°F and grease a loaf pan with a little butter.</li></ol>
</article><footer><ul><li>Privacy</li></ul></footer></body></html>`;

describe("recipe web pages", () => {
  test("reads schema.org Recipe data first", () => {
    const page = parseRecipePage(JSONLD_PAGE)!;
    expect(page.method).toBe("jsonld");
    expect(page.name).toBe("Lemon Ricotta Pasta");
    expect(page.yieldText).toBe("4 servings");
    expect(page.ingredients).toContain("1 lemon, zested & juiced");
    expect(page.ingredients).toContain("½ cup grated parmesan");

    const r = extractFromText(page.ingredients.join("\n"), {
      name: page.name,
      yieldText: page.yieldText,
      ingredientsOnly: true,
    });
    expect(r.servings).toBe(4);
    expect(r.ingredients).toHaveLength(6);
    expect(r.ingredients.every((i) => !i.unreadable)).toBe(true);
  });

  test("falls back to list items in the main content", () => {
    const page = parseRecipePage(LIST_PAGE)!;
    expect(page.method).toBe("list");
    expect(page.name).toBe("Grandma's Banana Bread");
    expect(page.ingredients).toEqual([
      "3 ripe bananas",
      "1/3 cup melted butter",
      "3/4 cup sugar",
      "1 egg",
      "1 1/2 cups flour",
      "1 tsp baking soda",
    ]);
  });

  test("no ingredients on the page", () => {
    expect(parseRecipePage("<html><body><p>Hello</p></body></html>")).toBeNull();
  });

  test("entities", () => {
    expect(decodeEntities("Mac &amp; cheese &#8211; &frac14; cup &#x2019;")).toBe("Mac & cheese – ¼ cup ’");
  });
});

describe("the server route only opens public https pages", () => {
  test.each([
    "http://example.com/recipe",
    "https://localhost/recipe",
    "https://127.0.0.1/",
    "https://10.0.0.5/",
    "https://192.168.1.1/",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/",
    "https://user:pass@example.com/",
    "https://example.com:8443/",
    "https://intranet/",
    "file:///etc/passwd",
    "not a url",
  ])("blocks %s", (url) => {
    expect(checkFetchUrl(url)).toBeNull();
  });

  test("allows a normal recipe site", () => {
    expect(checkFetchUrl("https://www.example.com/recipes/adobo")?.hostname).toBe("www.example.com");
  });

  test.each([
    ["10.1.2.3", true],
    ["172.20.0.1", true],
    ["100.64.0.1", true],
    ["0.0.0.0", true],
    ["::ffff:127.0.0.1", true],
    ["fd12:3456::1", true],
    ["fe80::1", true],
    ["93.184.216.34", false],
    ["2606:4700::6810:85e5", false],
  ])("private address %s → %s", (address, blocked) => {
    expect(isPrivateAddress(address)).toBe(blocked);
  });
});
