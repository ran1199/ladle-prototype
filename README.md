# Ladle

Ladle: a calorie tracker for home cooks. A UX case study prototype by Ran Guo.

The recipe knows the ingredients; the photo only measures your share.

**Live prototype:** https://ladle-prototype.vercel.app

This is a prototype for research, not medical or nutrition advice.

## The AI in this prototype is simulated

Ladle doesn't call a real AI. A script that runs in your browser plays that part,
so the prototype is free, needs no API key and works for every visitor. It is
built to behave the way a real assistant would, and it is honest about its limits:
a **Prototype** pill on every screen explains this.

- **Recipes (link, pasted text, photo).** Ladle reads each ingredient line, works
  out the amount and unit (fractions, ranges, "T" for tablespoon and "t" for
  teaspoon), and looks the ingredient up in a built-in table of about 200 common
  ingredients from ten cuisines (approximate USDA FoodData Central values).
  Vague amounts that change the calories a lot ("oil for frying", "a drizzle of
  olive oil") become up to three questions. Lines it can't match are kept and
  marked "Check this line".
- **Recipe websites.** Ladle's server fetches the page (public `https://` pages
  only, 8 seconds, 2 MB) and reads the recipe data most sites include
  (schema.org Recipe). Without it, Ladle takes the page's list items and asks you
  to check them. Video links ask for the caption instead.
- **Recipe photos.** Text recognition ([Tesseract.js](https://github.com/naptha/tesseract.js))
  runs on your device. If it can't read the photo well, you can fix the text.
- **Plate photos.** Ladle can't see food. It suggests the recipe you most likely
  made, using what you cooked or opened recently, what you usually eat on this
  day and at this time, and a light colour hint from the photo. The photo only
  measures your share. The same photo and history always give the same answer.
- **Corrections, snacks and restaurant meals.** "Added 30g cheddar" or "no rice"
  is worked out from the same table. Food search covers about 120 snacks, drinks
  and dishes. Restaurant meals use a typical range for the kind of dish and are
  always marked as rough estimates.

The bundled demo examples (the demo video link, its caption, Grandma's recipe
card and the sample plate photo) always give the same scripted answers, so
usability-test tasks behave identically for every participant.

All of this sits behind one interface (`lib/ai/types.ts`), so a real AI can be
added later without changing the screens.

## Privacy

Ladle runs in your browser and your data stays on this device. Recipe links are
fetched by Ladle's server to read the ingredients, and barcode lookups go to Open
Food Facts. Nothing is stored on a server.

## Running it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests for the simulated AI
npm run build    # production build
```

## Test controls

On the **Me** tab, press and hold the version line ("Ladle prototype · v0.2") to
open hidden controls for usability sessions: simulate an AI error on the next
request, and hide the Prototype pill. **Reset demo** on the same tab restores the
starting data.
