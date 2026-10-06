// Fixed text used in several places (side panel, About, Me tab).
// Edit wording here and it changes everywhere.

export const REPO_URL = "https://github.com/ran1199/ladle-prototype";

export const DEMO_LINK = "https://www.tiktok.com/@homecook/video/demo-garlic-chicken";

export const SUMMARY =
  "Ladle helps home cooks track calories without re-entering the meals they cook again and again. " +
  "Import a recipe once, and Ladle knows the ingredients. After cooking, snap your plate and Ladle " +
  "estimates your share. Repeat meals take one tap, and each number shows how confident Ladle is.";

export const DISCLAIMER = "This is a prototype for research, not medical or nutrition advice.";

export const PRIVACY =
  "Ladle runs in your browser and your data stays on this device. Recipe links are fetched by " +
  "Ladle’s server to read the ingredients, and barcode lookups go to Open Food Facts. Nothing is " +
  "stored on a server.";

/** What the "Prototype" pill explains. */
export const PROTOTYPE_NOTE =
  "Ladle’s AI is simulated by a script in this prototype. It reads your recipe text and uses your " +
  "history to suggest matches. A real AI would be added in a future version.";

/** How the simulated AI works, in plain words (Me tab and side panel). */
export const HOW_AI_WORKS: string[] = [
  "Recipes: Ladle reads each ingredient line, works out the amount, and looks it up in a built-in table of about 200 common ingredients (approximate USDA values). Vague amounts that matter, like “oil for frying”, become a question.",
  "Recipe photos: text recognition runs on your device, then the same reader takes over. If it can’t read the photo well, you can fix the text.",
  "Plate photos: Ladle can’t see food. It suggests the recipe you most likely made, from what you cooked or opened recently and what you usually eat at this time. The photo only measures your share.",
  "Restaurant meals and snacks use typical values, so they’re always rough estimates.",
];

/** The five usability-test tasks, written as friendly prompts for visitors. */
export const TRY_THESE: { id: string; prompt: string; showDemoLink?: boolean }[] = [
  {
    id: "T1",
    prompt:
      "You found a garlic chicken stir-fry video and want to cook it tonight. Add it to Ladle.",
    showDemoLink: true,
  },
  { id: "T2", prompt: "You just cooked the stir-fry. Log what’s on your plate." },
  { id: "T3", prompt: "You used extra oil again, like you always do. Fix today’s log." },
  { id: "T4", prompt: "It’s Thursday and you’re having your usual adobo. Log it." },
  { id: "T5", prompt: "Add your grandmother’s braised pork from her recipe card." },
];
