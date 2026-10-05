// Fixed text used in several places (side panel, welcome sheet, Me tab).
// Edit wording here and it changes everywhere.

export const REPO_URL = "https://github.com/ran1199/ladle-prototype";

export const DEMO_LINK = "https://www.tiktok.com/@homecook/video/demo-garlic-chicken";

export const SUMMARY =
  "Ladle helps home cooks track calories without re-entering the meals they cook again and again. " +
  "Import a recipe once, and Ladle knows the ingredients. After cooking, snap your plate and Ladle " +
  "estimates your share. Repeat meals take one tap, and each number shows how confident Ladle is.";

export const DISCLAIMER = "This is a prototype for research, not medical or nutrition advice.";

export const PRIVACY =
  "In Demo mode nothing leaves your browser. In Live AI mode, photos and recipe text are sent to " +
  "Anthropic’s API for analysis and are not stored by Ladle.";

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
