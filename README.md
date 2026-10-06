# Ladle

**A calorie tracker for home cooks.** A UX case study prototype by Ran Guo.

> The recipe knows the ingredients; the photo only measures your share.

**Live prototype:** https://ladle-prototype.vercel.app (works on a phone or a laptop; no sign-up)

This is a prototype for research, not medical or nutrition advice.

## What Ladle is

Most calorie trackers make home cooks re-enter the same meals again and again.
Ladle flips that: you import a recipe once (from a link, a caption or a photo of
a recipe card), Ladle works out its ingredients and calories, and after cooking
you snap your plate. Ladle suggests which recipe it is and how much of it is on
your plate. Repeat meals take one tap, leftovers from a big pot count down, and
every number shows how sure Ladle is: **Rough estimate**, **Good estimate**,
**Your recipe ✓** or **From the label**.

You start as Maya, a home cook with six saved recipes and two meals logged today.

## Screenshots

| Today | Import a recipe | Plate photo | Quick fix |
| --- | --- | --- | --- |
| ![Today: 870 kcal left, today's meals and a leftovers nudge](docs/screenshots/today.png) | ![Review screen with the question "How much oil did you use for frying?"](docs/screenshots/import-review.png) | ![Plate photo result: Looks like garlic chicken stir-fry, about 1 serving](docs/screenshots/plate-result.jpg) | ![Today was different? More oil, with Just this time or Always](docs/screenshots/quick-fix.png) |

| Recipe card | Pantry | Add other food | On a laptop |
| --- | --- | --- | --- |
| ![Recipe card with totals, servings and ingredients](docs/screenshots/recipe-card.png) | ![Pantry with batches counting down](docs/screenshots/pantry.png) | ![Add other food: barcode, search or restaurant dish](docs/screenshots/add-food.png) | ![The app in a phone frame beside the "Try these" panel](docs/screenshots/desktop.png) |

## Try these

These are the five usability-test tasks, also listed beside the phone on a laptop.

1. You found a garlic chicken stir-fry video and want to cook it tonight. Add it
   to Ladle (use the demo link in the side panel or under Recipes → Add recipe).
2. You just cooked the stir-fry. Log what's on your plate (Camera → Use sample photo).
3. You used extra oil again, like you always do. Fix today's log.
4. It's Thursday and you're having your usual adobo. Log it.
5. Add your grandmother's braised pork from her recipe card (Add recipe → Photo → Use example card).

You can also bring your own recipes, links and photos.

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

Packaged food isn't simulated: a barcode is looked up in the free
[Open Food Facts](https://world.openfoodfacts.org) database, and label data
always beats an estimate.

The bundled demo examples (the demo video link, its caption, Grandma's recipe
card and the sample plate photo) always give the same scripted answers, so
usability-test tasks behave identically for every participant.

All of this sits behind one interface (`lib/ai/types.ts`), so a real AI can be
added later without changing the screens. This version has no real AI, so there
are no access codes or API keys to manage.

## Privacy

Ladle runs in your browser and your data stays on this device. Recipe links are
fetched by Ladle's server to read the ingredients, and barcode lookups go to Open
Food Facts. Nothing is stored on a server. Plate photos are deleted once the meal
is logged. **Me → Export my data** saves everything as a file, and **Delete all
data** removes it.

## Resetting the demo

- **Me → Reset demo** brings back Maya's starting data (the beside-the-phone
  panel on a laptop has the same button).
- **Me → Delete all data** empties Ladle completely.

### Test controls (for usability sessions)

On the **Me** tab, press and hold the version line ("Ladle prototype · v1.0").
Hidden controls open:

- **Reset to test start:** Maya's starting data, and the timer back to zero. Use
  it between participants.
- **Show task timer:** a small stopwatch to start, pause and reset.
- **Show the next test task:** which of T1–T5 the participant hasn't done yet.
- **Simulate an AI error on the next request**, **Hide the Prototype pill**, and
  **Make batches 5 days older** (to see "Still have it?").

## Running it on your own computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev      # then open http://localhost:3000
npm test         # automatic checks for the simulated AI and the app's rules
npm run lint     # code style checks
npm run build    # the production build Vercel runs
```

Before `dev` and `build`, a small script copies the text-recognition files from
the installed packages into `public/tesseract` (they aren't stored in GitHub).

## Deploying

The live site is on [Vercel](https://vercel.com), connected to this GitHub
repository:

- Every push to `main` updates the public site automatically.
- Every other branch gets its own preview link, used to review a change before
  it goes public.
- No settings are required. One optional setting: `CASE_STUDY_URL` (Vercel →
  Project → Settings → Environment Variables) adds "Read the case study" links.
  Redeploy after changing it.

## Quality

- Works on phones from 375 px wide and on laptops (the app sits in a phone
  frame beside an info panel). Light and dark themes follow the device setting.
- Built to WCAG 2.2 AA: readable contrast, labels for screen readers, visible
  keyboard focus, and reduced motion when the device asks for it.
- Lighthouse on mobile (local build): Performance 91–96, Accessibility 100,
  Best Practices 100.
- Security headers include a Content Security Policy. The two server routes
  (recipe pages and barcodes) accept only checked input and never reach private
  network addresses.

## Built with

Next.js, React, TypeScript and Tailwind CSS. Fonts: Fraunces and Inter. Zod checks
every AI answer, Vitest runs the tests, and Tesseract.js reads recipe photos.
The sample plate photo is Ran's own. The recipe card and illustrations were made
for this project.
