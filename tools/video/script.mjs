// The demo video's script: each scene's time window, narration (the subtitle
// text, exactly as written), and optional caption. Times are in seconds.
//
// Scene windows: the original script's windows, except where the narration at
// 150 words a minute (plus pauses) doesn't fit. See WINDOWS_NOTE.

export const WINDOWS_NOTE =
  "Windows fit Ran's recorded voiceover (tools/video/voice/alignment.json), 4:06 in all. Scene 6 says \"pot\" (Ran's OK): with the batch from scene 5 active, the app shows \"¼ of the pot\".";

export const SCENES = [
  {
    n: 1,
    name: "Introduction",
    seconds: 37, // script: 30
    narration:
      "Calorie apps aren't built for home cooks. Photo trackers like Cal AI can't see the oil in your pan. Database apps like MyFitnessPal make you type in every ingredient. Across nearly 200 reviews and forum posts, home cooks said the same thing: logging their own food took longer than cooking it, so they quit. Ladle is built around one idea: the recipe knows the ingredients; the photo only measures your share.",
  },
  {
    n: 2,
    name: "Meet Maya",
    seconds: 21, // script: 15
    narration:
      "Meet Maya, a home cook who has quit tracking twice. Today she has 870 calories left, and every number shows how sure Ladle is. In this prototype, the AI is simulated, so we can test the experience first.",
  },
  {
    n: 3,
    name: "An afternoon latte",
    seconds: 22, // script: 20
    narration:
      "That afternoon, she grabs a matcha latte. For food she didn't cook, Ladle has barcode scanning, search, and restaurant estimates. She searches, taps, and it's logged: about 240 calories, marked as a good estimate.",
    caption: { text: "Barcode · Search · Restaurant", at: "barcode scanning" },
  },
  {
    n: 4,
    name: "Import a recipe",
    seconds: 40,
    narration:
      "Tonight, she found an air-fryer garlic chicken video. She pastes the link, and Ladle reads the recipe from the caption: every ingredient, with its calories. But one line just says \"olive oil for brushing.\" A photo would never catch that, so Ladle asks how much she brushed on, and each choice shows what it adds. Maya picks two tablespoons: 533 calories a serving. She saves it once, and never types it again.",
    caption: { text: "Ladle asks about calories a photo can't see", at: "olive oil for brushing" },
  },
  {
    n: 5,
    name: "Cook as a batch",
    seconds: 15,
    narration:
      "She cooks the full batch, four servings, and tells Ladle with one tap. The leftovers go straight to her Pantry, so tomorrow's lunch is one tap away.",
  },
  {
    n: 6,
    name: "Snap your plate",
    seconds: 35, // script: 40
    narration:
      "Dinner's ready, so Maya snaps her plate. Ladle recognizes the dish, and because it already knows the recipe, the photo only has to answer one question: how much did she take? The pot shows her share: one of four servings, one chicken leg with vegetables. If she took more, she slides it. One tap logs about 530 calories, and her photo becomes the recipe's picture.",
    caption: { text: "The photo measures her share", at: "The pot shows her share" },
  },
  {
    n: 7,
    name: "Fix and learn",
    seconds: 38, // script: 40
    narration:
      "Of course, real cooking doesn't follow the recipe. Maya brushed on extra oil, like she always does. She taps \"Today was different,\" picks \"More oil,\" and sees exactly what changes: 120 more for the whole pan, 30 more on her plate. She chooses \"Just this time.\" But Ladle notices it's the second time, and asks: \"You usually brush on more oil. Update your recipe?\" One tap, and Ladle remembers.",
    caption: { text: "Fixes stick", at: "Ladle notices" },
  },
  {
    n: 8,
    name: "Tomorrow's lunch",
    seconds: 15, // script: 20
    narration:
      "The next day, lunch is already waiting. Her Pantry shows three of four servings left, and logging one is a single tap. No photo, no typing.",
  },
  {
    n: 9,
    name: "Close",
    seconds: 23, // script: 20
    narration:
      "That's Ladle. Teach it a recipe once, snap your plate, and correct it when real life gets in the way. Every meal Maya repeats gets faster, and every number tells her how much to trust it. Ladle: the recipe knows; the photo measures.",
  },
];

/** Each scene's start time in the full video. */
export function sceneStarts() {
  let t = 0;
  return SCENES.map((s) => {
    const start = t;
    t += s.seconds;
    return start;
  });
}
