// Approximate values for a prototype. Not for medical or dietary use.
//
// A built-in nutrition table for Ladle's simulated AI: about 200 common
// ingredients across American, Chinese, Filipino, Korean, Indian, Japanese,
// Vietnamese, Mexican, Italian and Mediterranean cooking. Values are per 100 g
// and roughly follow USDA FoodData Central. Unit weights are grams per unit.

export type Category =
  | "oil" // cooking oils and pure fats
  | "fat" // butter, ghee, lard
  | "sugar" // sugars and syrups
  | "sauce" // sauces, pastes, condiments
  | "nut" // nuts and seeds
  | "cheese"
  | "dairy"
  | "protein"
  | "legume"
  | "grain"
  | "vegetable"
  | "fruit"
  | "herb"
  | "spice"
  | "liquid" // stocks, wine, vinegar
  | "negligible"; // salt, water, baking soda: never asked about, never "unreadable"

export type Unit =
  | "tbsp"
  | "tsp"
  | "cup"
  | "clove"
  | "head"
  | "piece"
  | "slice"
  | "can"
  | "stalk"
  | "bunch"
  | "handful"
  | "pinch"
  | "dash"
  | "sheet"
  | "block"
  | "pack"
  | "leaf"
  | "sprig"
  | "knob"
  | "stick"
  | "inch";

export type NutritionEntry = {
  name: string;
  aliases: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  category: Category;
  /** Grams per unit. Missing spoon and cup sizes fall back to `density` (g per ml). */
  unitWeights: Partial<Record<Unit, number>>;
  density?: number;
};

/** Categories whose vague amounts are worth a question (they change calories a lot). */
export const CALORIE_DENSE: Category[] = ["oil", "fat", "sugar", "sauce", "nut", "cheese"];

type Macros = [kcal: number, protein: number, carbs: number, fat: number];

function n(
  name: string,
  aliases: string[],
  [kcal, protein, carbs, fat]: Macros,
  category: Category,
  unitWeights: Partial<Record<Unit, number>> = {},
  density?: number,
): NutritionEntry {
  return { name, aliases, kcal, protein, carbs, fat, category, unitWeights, density };
}

const OIL = { tbsp: 13.6, tsp: 4.5, cup: 218 };

export const NUTRITION: NutritionEntry[] = [
  // ---------- Oils and fats ----------
  n("neutral oil", ["oil", "vegetable oil", "canola oil", "cooking oil", "sunflower oil", "corn oil", "peanut oil", "groundnut oil", "avocado oil", "grapeseed oil", "frying oil", "rapeseed oil"], [884, 0, 0, 100], "oil", OIL),
  n("olive oil", ["extra virgin olive oil", "evoo", "light olive oil"], [884, 0, 0, 100], "oil", OIL),
  n("sesame oil", ["toasted sesame oil", "dark sesame oil"], [884, 0, 0, 100], "oil", OIL),
  n("coconut oil", ["virgin coconut oil"], [892, 0, 0, 99], "oil", OIL),
  n("chili oil", ["chilli oil", "chili crisp", "chilli crisp", "lao gan ma", "rayu"], [700, 2, 8, 72], "oil", { tbsp: 13, tsp: 4.3 }),
  n("butter", ["unsalted butter", "salted butter", "mantikilya"], [717, 0.9, 0.1, 81], "fat", { tbsp: 14, tsp: 4.7, cup: 227, stick: 113, knob: 10, slice: 10 }),
  n("ghee", ["clarified butter", "desi ghee"], [900, 0, 0, 100], "fat", { tbsp: 13, tsp: 4.3, cup: 205 }),
  n("lard", ["pork fat", "shortening", "vegetable shortening"], [902, 0, 0, 100], "fat", { tbsp: 12.8, tsp: 4.3, cup: 205 }),
  n("margarine", [], [713, 0.2, 0.7, 80], "fat", { tbsp: 14, tsp: 4.7, cup: 227 }),

  // ---------- Sugars and syrups ----------
  n("sugar", ["white sugar", "granulated sugar", "caster sugar", "superfine sugar", "cane sugar", "asukal"], [387, 0, 100, 0], "sugar", { tbsp: 12.5, tsp: 4.2, cup: 200, piece: 4 }),
  n("brown sugar", ["light brown sugar", "dark brown sugar", "muscovado sugar", "demerara sugar"], [380, 0.1, 98, 0], "sugar", { tbsp: 13.8, tsp: 4.6, cup: 220 }),
  n("rock sugar", ["yellow rock sugar", "rock candy sugar", "bing tang"], [387, 0, 100, 0], "sugar", { tbsp: 12, piece: 10 }),
  n("palm sugar", ["coconut sugar", "jaggery", "gur", "panela", "piloncillo"], [375, 0.5, 94, 0.3], "sugar", { tbsp: 12, tsp: 4, piece: 15 }),
  n("powdered sugar", ["icing sugar", "confectioners sugar", "confectioners' sugar"], [389, 0, 100, 0], "sugar", { tbsp: 8, tsp: 2.7, cup: 120 }),
  n("honey", ["raw honey", "pulot"], [304, 0.3, 82, 0], "sugar", { tbsp: 21, tsp: 7, cup: 340 }),
  n("maple syrup", ["pure maple syrup"], [260, 0, 67, 0.1], "sugar", { tbsp: 20, tsp: 6.7, cup: 315 }),
  n("agave syrup", ["agave nectar", "agave"], [310, 0.1, 76, 0.5], "sugar", { tbsp: 21, tsp: 7 }),
  n("golden syrup", ["corn syrup", "light corn syrup", "rice syrup", "molasses", "treacle"], [310, 0, 80, 0], "sugar", { tbsp: 20, tsp: 6.7 }),
  n("mirin", ["sweet rice wine", "hon mirin", "aji mirin"], [240, 0.2, 43, 0], "sugar", { tbsp: 17, tsp: 5.7, cup: 270 }),

  // ---------- Sauces, pastes and condiments ----------
  n("soy sauce", ["light soy sauce", "shoyu", "tamari", "toyo", "low sodium soy sauce", "ganjang", "nuoc tuong"], [53, 8, 4.9, 0.6], "sauce", { tbsp: 16, tsp: 5.3, cup: 255 }),
  n("dark soy sauce", ["thick soy sauce", "kecap manis", "sweet soy sauce"], [80, 3.6, 14, 0], "sauce", { tbsp: 18, tsp: 6 }),
  n("oyster sauce", ["vegetarian oyster sauce", "mushroom oyster sauce"], [51, 1.4, 11, 0.3], "sauce", { tbsp: 18, tsp: 6 }),
  n("fish sauce", ["patis", "nam pla", "nuoc mam", "anchovy sauce"], [35, 5, 3.6, 0], "sauce", { tbsp: 18, tsp: 6 }),
  n("hoisin sauce", ["hoisin"], [220, 3.3, 44, 3.4], "sauce", { tbsp: 16, tsp: 5.3 }),
  n("gochujang", ["korean chili paste", "korean red pepper paste", "red pepper paste", "kochujang"], [206, 4.8, 41, 2], "sauce", { tbsp: 17, tsp: 5.7 }),
  n("miso", ["white miso", "red miso", "doenjang", "soybean paste", "fermented soybean paste"], [199, 12, 26, 6], "sauce", { tbsp: 17, tsp: 5.7 }),
  n("doubanjiang", ["chili bean paste", "broad bean paste", "toban djan"], [180, 8, 22, 6], "sauce", { tbsp: 18, tsp: 6 }),
  n("ketchup", ["tomato ketchup", "catsup", "banana ketchup"], [101, 1, 27, 0.1], "sauce", { tbsp: 17, tsp: 5.7, cup: 240 }),
  n("mayonnaise", ["mayo", "kewpie", "kewpie mayo", "japanese mayo"], [680, 1, 0.6, 75], "sauce", { tbsp: 14, tsp: 4.6, cup: 220 }),
  n("sriracha", ["chili garlic sauce", "sambal oelek", "sambal"], [93, 1.9, 19, 0.9], "sauce", { tbsp: 17, tsp: 5.7 }),
  n("hot sauce", ["tabasco", "louisiana hot sauce", "pepper sauce", "buffalo sauce"], [11, 0.5, 1.8, 0.4], "sauce", { tbsp: 15, tsp: 5 }),
  n("sweet chili sauce", ["thai sweet chili sauce", "sweet chilli sauce"], [225, 0.5, 55, 0.3], "sauce", { tbsp: 19, tsp: 6.3 }),
  n("teriyaki sauce", ["teriyaki"], [89, 5.9, 15.6, 0], "sauce", { tbsp: 18, tsp: 6 }),
  n("worcestershire sauce", ["worcestershire"], [78, 0, 19, 0], "sauce", { tbsp: 17, tsp: 5.7 }),
  n("barbecue sauce", ["bbq sauce"], [172, 0.8, 41, 0.6], "sauce", { tbsp: 17, tsp: 5.7, cup: 280 }),
  n("mustard", ["dijon mustard", "yellow mustard", "whole grain mustard", "wholegrain mustard"], [66, 4, 6, 4], "sauce", { tbsp: 15, tsp: 5 }),
  n("peanut butter", ["smooth peanut butter", "crunchy peanut butter"], [588, 25, 20, 50], "sauce", { tbsp: 16, tsp: 5.3, cup: 258 }),
  n("tahini", ["sesame paste", "chinese sesame paste"], [595, 17, 21, 54], "sauce", { tbsp: 15, tsp: 5 }),
  n("pesto", ["basil pesto", "pesto sauce"], [420, 5, 6, 42], "sauce", { tbsp: 16, tsp: 5.3 }),
  n("curry paste", ["red curry paste", "green curry paste", "yellow curry paste", "massaman curry paste"], [120, 2, 15, 5], "sauce", { tbsp: 16, tsp: 5.3 }),
  n("salsa", ["pico de gallo", "salsa verde", "tomato salsa"], [36, 1.5, 7, 0.2], "sauce", { tbsp: 16, cup: 260 }),
  n("tomato paste", ["tomato concentrate"], [82, 4.3, 19, 0.5], "sauce", { tbsp: 16, tsp: 5.3, can: 170 }),
  n("tomato sauce", ["passata", "crushed tomatoes", "canned tomatoes", "diced tomatoes", "chopped tomatoes", "tomato puree", "marinara", "marinara sauce", "pasta sauce", "tinned tomatoes"], [32, 1.6, 7.3, 0.3], "vegetable", { cup: 245, can: 400, tbsp: 15 }),
  n("coconut milk", ["full fat coconut milk", "gata", "canned coconut milk"], [230, 2.3, 6, 24], "sauce", { cup: 240, can: 400, tbsp: 15 }),
  n("light coconut milk", ["lite coconut milk", "reduced fat coconut milk"], [62, 0.6, 2, 5.8], "sauce", { cup: 240, can: 400, tbsp: 15 }),
  n("coconut cream", ["kakang gata", "cream of coconut"], [330, 3.6, 6.7, 35], "sauce", { cup: 240, can: 400, tbsp: 15 }),
  n("sweetened condensed milk", ["condensed milk"], [321, 7.9, 54, 8.7], "sugar", { tbsp: 20, can: 397, cup: 306 }),
  n("chili sauce", ["chilli sauce", "chili paste"], [100, 2, 20, 1], "sauce", { tbsp: 16, tsp: 5.3 }),

  // ---------- Liquids ----------
  n("vinegar", ["rice vinegar", "white vinegar", "cane vinegar", "apple cider vinegar", "black vinegar", "chinkiang vinegar", "coconut vinegar", "suka", "red wine vinegar", "white wine vinegar", "sherry vinegar", "distilled vinegar"], [18, 0, 0.04, 0], "liquid", { tbsp: 15, tsp: 5, cup: 240 }),
  n("balsamic vinegar", ["balsamic", "balsamic glaze"], [88, 0.5, 17, 0], "liquid", { tbsp: 16, tsp: 5.3 }),
  n("shaoxing wine", ["shaoxing", "cooking wine", "chinese cooking wine", "rice wine", "huangjiu", "hua tiao wine", "shao hsing wine", "michiu", "mi jiu"], [134, 1.6, 3, 0], "liquid", { tbsp: 15, tsp: 5, cup: 240 }),
  n("sake", ["cooking sake", "ryorishu", "soju"], [134, 0.5, 5, 0], "liquid", { tbsp: 15, cup: 240 }),
  n("white wine", ["dry white wine"], [82, 0.1, 2.6, 0], "liquid", { tbsp: 15, cup: 240 }),
  n("red wine", ["dry red wine"], [85, 0.1, 2.6, 0], "liquid", { tbsp: 15, cup: 240 }),
  n("beer", ["lager", "ale"], [43, 0.5, 3.6, 0], "liquid", { cup: 240, can: 355 }),
  n("stock", ["broth", "chicken stock", "chicken broth", "beef stock", "beef broth", "vegetable stock", "vegetable broth", "bone broth", "dashi", "low sodium chicken broth", "low-sodium chicken broth", "bouillon"], [6, 0.6, 0.4, 0.2], "liquid", { cup: 240, tbsp: 15, can: 400 }),
  n("lemon juice", ["lime juice", "calamansi juice", "kalamansi juice", "fresh lemon juice", "fresh lime juice"], [22, 0.4, 6.9, 0.2], "liquid", { tbsp: 15, tsp: 5, cup: 240 }),
  n("orange juice", ["oj"], [45, 0.7, 10, 0.2], "liquid", { tbsp: 15, cup: 248 }),
  n("water", ["hot water", "cold water", "warm water", "boiling water", "ice water", "ice", "tubig"], [0, 0, 0, 0], "negligible", { cup: 240, tbsp: 15, tsp: 5 }),

  // ---------- Grains, starches and breads ----------
  n("rice", ["white rice", "jasmine rice", "basmati rice", "uncooked rice", "raw rice", "long grain rice", "short grain rice", "short-grain rice", "sushi rice", "kanin", "bigas", "dry rice"], [365, 7.1, 80, 0.7], "grain", { cup: 185 }),
  n("cooked rice", ["steamed rice", "cooked white rice", "leftover rice", "day old rice", "day-old rice", "cooked jasmine rice", "cooked short-grain rice", "cooked short grain rice", "cold rice"], [130, 2.7, 28, 0.3], "grain", { cup: 158 }),
  n("brown rice", ["uncooked brown rice"], [370, 7.9, 77, 2.9], "grain", { cup: 190 }),
  n("cooked brown rice", [], [112, 2.3, 24, 0.8], "grain", { cup: 195 }),
  n("glutinous rice", ["sticky rice", "sweet rice", "malagkit", "mochi rice"], [370, 6.8, 81, 0.6], "grain", { cup: 200 }),
  n("egg noodles", ["noodles", "dried noodles", "ramen noodles", "lo mein noodles", "chow mein noodles", "wheat noodles", "instant noodles", "pancit canton", "miki", "mami noodles"], [384, 14, 71, 4.4], "grain", { pack: 85, cup: 38 }),
  n("rice noodles", ["rice vermicelli", "vermicelli", "pho noodles", "bihon", "pancit bihon", "rice sticks", "flat rice noodles", "bun"], [364, 6, 80, 0.6], "grain", { pack: 200, cup: 50 }),
  n("glass noodles", ["sweet potato noodles", "dangmyeon", "japchae noodles", "mung bean noodles", "sotanghon", "cellophane noodles"], [351, 0.2, 86, 0.1], "grain", { pack: 100 }),
  n("udon", ["udon noodles", "fresh udon"], [105, 2.6, 21, 0.4], "grain", { pack: 200 }),
  n("soba", ["soba noodles", "buckwheat noodles"], [336, 14, 75, 0.7], "grain", { pack: 90 }),
  n("pasta", ["spaghetti", "penne", "rigatoni", "fusilli", "linguine", "fettuccine", "macaroni", "dried pasta", "farfalle", "orzo", "tagliatelle", "bucatini", "conchiglie", "ziti", "lasagna sheets", "lasagne sheets"], [371, 13, 75, 1.5], "grain", { cup: 100, pack: 500 }),
  n("cooked pasta", ["cooked spaghetti"], [158, 5.8, 31, 0.9], "grain", { cup: 140 }),
  n("bread", ["white bread", "whole wheat bread", "wholemeal bread", "sandwich bread", "sourdough", "toast", "baguette", "pandesal", "loaf"], [265, 9, 49, 3.2], "grain", { slice: 30, piece: 30 }),
  n("burger bun", ["bun", "hamburger bun", "brioche bun", "hot dog bun", "roll", "bread roll"], [279, 9.6, 49, 4.3], "grain", { piece: 50 }),
  n("pita", ["pita bread", "pitta"], [275, 9.1, 56, 1.2], "grain", { piece: 60 }),
  n("naan", ["naan bread"], [290, 9.6, 50, 5.7], "grain", { piece: 90 }),
  n("flour tortilla", ["tortilla", "tortillas", "wrap", "flour tortillas", "burrito tortilla"], [310, 8, 50, 8], "grain", { piece: 45 }),
  n("corn tortilla", ["corn tortillas", "taco shells"], [218, 5.7, 45, 2.9], "grain", { piece: 26 }),
  n("oats", ["rolled oats", "oatmeal", "porridge oats", "quick oats", "old fashioned oats", "steel cut oats"], [379, 13, 68, 6.5], "grain", { cup: 80, tbsp: 5 }),
  n("flour", ["all purpose flour", "all-purpose flour", "plain flour", "wheat flour", "bread flour", "self raising flour", "self-rising flour", "cake flour", "harina", "maida", "atta", "whole wheat flour"], [364, 10, 76, 1], "grain", { cup: 125, tbsp: 8, tsp: 2.6 }),
  n("rice flour", ["glutinous rice flour", "mochiko", "sweet rice flour"], [366, 6, 80, 1.4], "grain", { cup: 158, tbsp: 10 }),
  n("cornstarch", ["cornflour", "corn starch", "potato starch", "tapioca starch", "tapioca flour", "arrowroot", "katakuriko"], [381, 0.3, 91, 0.1], "grain", { tbsp: 8, tsp: 2.7, cup: 128 }),
  n("breadcrumbs", ["panko", "bread crumbs", "panko breadcrumbs"], [395, 13, 72, 5.3], "grain", { cup: 108, tbsp: 7 }),
  n("quinoa", ["uncooked quinoa"], [368, 14, 64, 6], "grain", { cup: 170 }),
  n("couscous", ["uncooked couscous"], [376, 13, 77, 0.6], "grain", { cup: 173 }),
  n("cornmeal", ["polenta", "masa harina", "corn flour"], [370, 8, 79, 1.8], "grain", { cup: 157, tbsp: 10 }),
  n("dumpling wrappers", ["dumpling wrapper", "wonton wrappers", "wonton wrapper", "gyoza wrappers", "gyoza wrapper", "spring roll wrappers", "lumpia wrappers", "lumpia wrapper", "mandu wrappers", "dumpling skins"], [291, 9.8, 58, 1.5], "grain", { piece: 8 }),
  n("rice paper", ["rice paper wrappers", "banh trang", "spring roll rice paper"], [334, 6, 79, 0.6], "grain", { piece: 9, sheet: 9 }),
  n("rice cakes", ["tteok", "tteokbokki rice cakes", "korean rice cakes", "garaetteok"], [230, 4, 50, 0.5], "grain", { cup: 150 }),

  // ---------- Proteins ----------
  n("chicken thigh", ["chicken thighs", "boneless chicken thigh", "chicken thigh fillet", "chicken thigh fillets", "dark meat chicken", "chicken thigh meat", "boneless skinless chicken thigh"], [120, 19.7, 0, 4.1], "protein", { piece: 110 }),
  n("chicken breast", ["chicken breasts", "boneless skinless chicken breast", "chicken fillet", "chicken fillets", "chicken tenders", "chicken tenderloins", "white meat chicken"], [120, 22.5, 0, 2.6], "protein", { piece: 175 }),
  n("chicken", ["whole chicken", "chicken pieces", "bone-in chicken", "chicken legs", "chicken leg quarters", "manok", "dak"], [215, 18.6, 0, 15], "protein", { piece: 250 }),
  n("chicken drumsticks", ["chicken drumstick", "drumsticks", "drumstick"], [161, 18, 0, 9.2], "protein", { piece: 110 }),
  n("chicken wings", ["chicken wing", "wings", "wingettes"], [191, 17.5, 0, 12.9], "protein", { piece: 35 }),
  n("ground chicken", ["minced chicken", "chicken mince"], [143, 17, 0, 8], "protein", {}),
  n("ground turkey", ["minced turkey", "turkey mince", "lean ground turkey"], [150, 18.7, 0, 8.3], "protein", {}),
  n("turkey breast", ["sliced turkey", "deli turkey"], [114, 23.7, 0.1, 1.5], "protein", { slice: 28 }),
  n("pork belly", ["samgyeopsal", "liempo", "pork side", "streaky pork", "skin-on pork belly"], [518, 9.3, 0, 53], "protein", { slice: 40 }),
  n("pork shoulder", ["pork butt", "boston butt", "kasim", "pork collar", "moksal", "pork shoulder butt"], [190, 17.5, 0, 13], "protein", {}),
  n("pork loin", ["pork chop", "pork chops", "pork tenderloin", "lean pork", "pork steak"], [143, 21, 0, 6], "protein", { piece: 150 }),
  n("ground pork", ["minced pork", "pork mince", "giniling na baboy"], [263, 17, 0, 21], "protein", {}),
  n("pork ribs", ["spare ribs", "spareribs", "baby back ribs", "pork spare ribs"], [277, 15.5, 0, 23.4], "protein", { piece: 90 }),
  n("bacon", ["streaky bacon", "bacon rashers", "bacon strips"], [458, 12, 1.3, 45], "protein", { slice: 28, piece: 28 }),
  n("ham", ["cooked ham", "deli ham", "hamon"], [145, 21, 1.5, 6], "protein", { slice: 28 }),
  n("sausage", ["pork sausage", "italian sausage", "sausages", "bratwurst", "longganisa", "hot dog", "frankfurter"], [301, 14, 2, 27], "protein", { piece: 75 }),
  n("chinese sausage", ["lap cheong", "lap chong", "lap cheung"], [450, 20, 15, 35], "protein", { piece: 30 }),
  n("chorizo", ["spanish chorizo", "mexican chorizo"], [455, 24, 2, 38], "protein", { piece: 60 }),
  n("spam", ["luncheon meat"], [315, 13, 4, 27], "protein", { can: 340, slice: 56 }),
  n("beef", ["stewing beef", "beef chuck", "chuck roast", "beef stew meat", "beef brisket", "brisket", "beef shank", "beef short ribs", "short ribs", "galbi", "bulgogi beef", "baka"], [220, 18, 0, 16], "protein", {}),
  n("beef steak", ["steak", "sirloin", "ribeye", "rib eye", "flank steak", "skirt steak", "beef sirloin", "beef tenderloin", "flat iron steak", "sliced beef"], [200, 20, 0, 13], "protein", { piece: 225 }),
  n("ground beef", ["minced beef", "beef mince", "hamburger meat", "lean ground beef", "giniling na baka"], [254, 17, 0, 20], "protein", {}),
  n("lamb", ["lamb shoulder", "lamb leg", "leg of lamb", "mutton", "goat", "lamb chops"], [250, 17, 0, 20], "protein", { piece: 100 }),
  n("ground lamb", ["minced lamb", "lamb mince"], [282, 16.6, 0, 23.4], "protein", {}),
  n("shrimp", ["shrimps", "prawns", "prawn", "hipon", "tiger prawns", "king prawns", "saeu"], [85, 20, 0.9, 0.5], "protein", { piece: 12, cup: 145 }),
  n("salmon", ["salmon fillet", "salmon fillets", "smoked salmon"], [208, 20, 0, 13], "protein", { piece: 170 }),
  n("white fish", ["cod", "tilapia", "basa", "halibut", "fish fillet", "fish fillets", "haddock", "pollock", "snapper", "sea bass", "fish", "lapu-lapu", "tanigue"], [82, 18, 0, 0.7], "protein", { piece: 150 }),
  n("milkfish", ["bangus"], [190, 20, 0, 12], "protein", { piece: 300 }),
  n("tuna", ["canned tuna", "tuna in water", "tinned tuna", "tuna steak"], [116, 26, 0, 0.8], "protein", { can: 120 }),
  n("squid", ["calamari", "pusit", "ojingeo"], [92, 15.6, 3, 1.4], "protein", {}),
  n("mussels", ["clams", "tahong", "halaan", "scallops"], [86, 12, 3.7, 2.2], "protein", { cup: 150 }),
  n("crab", ["crab meat", "crabmeat", "alimango", "imitation crab", "kani", "crab sticks"], [87, 18, 0, 1.1], "protein", { cup: 135, piece: 17 }),
  n("firm tofu", ["tofu", "extra firm tofu", "bean curd", "tokwa", "dubu", "fried tofu", "tau kwa"], [144, 17, 2.8, 8.7], "protein", { block: 400, cup: 250, piece: 100 }),
  n("silken tofu", ["soft tofu", "sundubu", "tofu pudding", "taho"], [55, 4.8, 2.9, 2.7], "protein", { block: 340, cup: 250 }),
  n("tempeh", [], [192, 20, 7.6, 11], "protein", { block: 225, cup: 166 }),
  n("eggs", ["egg", "large egg", "large eggs", "whole eggs", "itlog", "gyeran", "medium eggs", "free range eggs"], [143, 12.6, 0.7, 9.5], "protein", { piece: 50 }),
  n("egg whites", ["egg white"], [52, 11, 0.7, 0.2], "protein", { piece: 33, cup: 243 }),
  n("egg yolks", ["egg yolk", "yolks"], [322, 16, 3.6, 27], "protein", { piece: 17 }),
  n("paneer", ["cottage cheese paneer", "indian cottage cheese"], [321, 21, 3.6, 25], "protein", { cup: 130, piece: 25, block: 200 }),
  n("seitan", ["wheat gluten"], [370, 75, 14, 1.9], "protein", {}),

  // ---------- Legumes ----------
  n("lentils", ["red lentils", "masoor dal", "yellow lentils", "toor dal", "moong dal", "split peas", "dal", "dhal", "green lentils", "brown lentils", "chana dal", "urad dal", "dried lentils"], [358, 24, 63, 2.2], "legume", { cup: 192 }),
  n("cooked lentils", ["canned lentils"], [116, 9, 20, 0.4], "legume", { cup: 198, can: 240 }),
  n("chickpeas", ["garbanzo beans", "chana", "kabuli chana", "canned chickpeas", "cooked chickpeas", "garbanzos"], [139, 7.4, 22.5, 2.6], "legume", { cup: 164, can: 240 }),
  n("dried chickpeas", ["dry chickpeas"], [378, 20, 63, 6], "legume", { cup: 200 }),
  n("black beans", ["canned black beans", "cooked black beans", "frijoles negros"], [132, 8.9, 23.7, 0.5], "legume", { cup: 172, can: 240 }),
  n("kidney beans", ["red kidney beans", "rajma", "canned kidney beans"], [127, 8.7, 22.8, 0.5], "legume", { cup: 177, can: 265 }),
  n("pinto beans", ["canned pinto beans", "beans"], [143, 9, 26, 0.7], "legume", { cup: 171, can: 240 }),
  n("refried beans", ["frijoles refritos"], [91, 5.3, 15, 1.2], "legume", { cup: 250, can: 450 }),
  n("edamame", ["soybeans", "shelled edamame"], [121, 12, 9, 5.2], "legume", { cup: 155 }),
  n("mung beans", ["munggo", "green gram", "moong"], [347, 24, 63, 1.2], "legume", { cup: 207 }),

  // ---------- Dairy and cheese ----------
  n("milk", ["whole milk", "full cream milk", "full fat milk", "gatas", "dairy milk"], [61, 3.2, 4.8, 3.3], "dairy", { cup: 244, tbsp: 15, tsp: 5 }),
  n("skim milk", ["low fat milk", "low-fat milk", "2% milk", "semi skimmed milk", "nonfat milk"], [42, 3.4, 5, 1], "dairy", { cup: 245, tbsp: 15 }),
  n("almond milk", ["unsweetened almond milk"], [16, 0.6, 0.3, 1.2], "dairy", { cup: 240, tbsp: 15 }),
  n("oat milk", ["oatly"], [48, 1, 7, 1.5], "dairy", { cup: 240, tbsp: 15 }),
  n("soy milk", ["soya milk"], [54, 3.3, 6, 1.8], "dairy", { cup: 243, tbsp: 15 }),
  n("evaporated milk", ["evap"], [134, 6.8, 10, 7.6], "dairy", { cup: 252, can: 354, tbsp: 16 }),
  n("yogurt", ["plain yogurt", "natural yogurt", "dahi", "curd", "yoghurt", "plain yoghurt"], [61, 3.5, 4.7, 3.3], "dairy", { cup: 245, tbsp: 15 }),
  n("greek yogurt", ["plain greek yogurt", "greek yoghurt", "skyr", "strained yogurt", "labneh"], [75, 10, 3.9, 2], "dairy", { cup: 245, tbsp: 15 }),
  n("cream", ["heavy cream", "whipping cream", "double cream", "thickened cream", "heavy whipping cream", "all purpose cream", "all-purpose cream", "single cream", "light cream"], [340, 2.8, 2.7, 36], "dairy", { cup: 238, tbsp: 15, tsp: 5 }),
  n("sour cream", ["creme fraiche", "crema", "mexican crema"], [198, 2.4, 4.6, 19], "dairy", { cup: 230, tbsp: 12 }),
  n("cream cheese", ["philadelphia", "soft cheese"], [350, 6, 4, 34], "cheese", { tbsp: 14.5, cup: 232 }),
  n("cheddar", ["cheddar cheese", "cheese", "shredded cheese", "grated cheese", "sharp cheddar", "american cheese", "monterey jack", "colby", "queso", "jack cheese", "cheese slices"], [403, 25, 1.3, 33], "cheese", { cup: 113, slice: 21, tbsp: 7 }),
  n("parmesan", ["parmigiano", "parmigiano reggiano", "parmesan cheese", "grated parmesan", "pecorino", "pecorino romano", "grana padano"], [431, 38, 4, 29], "cheese", { tbsp: 5, cup: 100, tsp: 1.7 }),
  n("mozzarella", ["mozzarella cheese", "fresh mozzarella", "shredded mozzarella", "burrata", "bocconcini"], [300, 22, 2.2, 22], "cheese", { cup: 113, piece: 125, slice: 28 }),
  n("feta", ["feta cheese", "queso fresco", "cotija", "halloumi"], [264, 14, 4, 21], "cheese", { cup: 150, tbsp: 9 }),
  n("ricotta", ["ricotta cheese", "cottage cheese"], [174, 11, 3, 13], "cheese", { cup: 246, tbsp: 15 }),

  // ---------- Vegetables ----------
  n("onion", ["yellow onion", "white onion", "brown onion", "sibuyas", "onions", "yangpa", "pyaz", "medium onion", "large onion"], [40, 1.1, 9.3, 0.1], "vegetable", { piece: 110, cup: 160 }),
  n("red onion", ["red onions", "purple onion"], [40, 1.1, 9.3, 0.1], "vegetable", { piece: 110, cup: 160 }),
  n("shallot", ["shallots", "sibuyas tagalog", "eschalot"], [72, 2.5, 17, 0.1], "vegetable", { piece: 25, tbsp: 10 }),
  n("green onion", ["scallion", "scallions", "spring onion", "spring onions", "green onions", "dahon ng sibuyas", "pa", "daepa", "salad onion"], [32, 1.8, 7.3, 0.2], "vegetable", { piece: 15, stalk: 15, cup: 100, tbsp: 6, bunch: 100 }),
  n("garlic", ["garlic cloves", "garlic clove", "bawang", "lahsun", "mul", "fresh garlic", "minced garlic"], [149, 6.4, 33, 0.5], "vegetable", { clove: 3, head: 30, tbsp: 8.5, tsp: 2.8, piece: 3 }),
  n("ginger", ["fresh ginger", "luya", "ginger root", "grated ginger", "adrak", "saenggang"], [80, 1.8, 18, 0.8], "vegetable", { tbsp: 6, tsp: 2, piece: 15, knob: 15, inch: 10, slice: 3 }),
  n("chili", ["red chili", "green chili", "chilli", "chillies", "chilies", "bird's eye chili", "birds eye chili", "chili pepper", "jalapeno", "jalapeño", "serrano", "thai chili", "siling labuyo", "siling haba", "habanero", "fresh chili", "gochu", "hari mirch"], [40, 1.9, 8.8, 0.4], "vegetable", { piece: 15, tbsp: 9 }),
  n("chipotle in adobo", ["chipotle peppers in adobo", "chipotles in adobo", "chipotle peppers", "chipotle chiles", "chipotle chilies", "chipotle", "chipotles", "adobo sauce"], [60, 1.5, 9, 2], "sauce", { piece: 15, tbsp: 15, tsp: 5, can: 200 }),
  n("bell pepper", ["red bell pepper", "green bell pepper", "yellow bell pepper", "capsicum", "red pepper", "green pepper", "sweet pepper", "bell peppers", "red capsicum"], [26, 1, 6, 0.3], "vegetable", { piece: 120, cup: 150 }),
  n("tomato", ["tomatoes", "roma tomato", "roma tomatoes", "kamatis", "fresh tomatoes", "vine tomatoes", "plum tomatoes", "tamatar", "large tomatoes", "medium tomatoes"], [18, 0.9, 3.9, 0.2], "vegetable", { piece: 123, cup: 180 }),
  n("cherry tomatoes", ["grape tomatoes", "cherry tomato"], [18, 0.9, 3.9, 0.2], "vegetable", { piece: 17, cup: 150 }),
  n("potato", ["potatoes", "russet potato", "yukon gold", "waxy potatoes", "baby potatoes", "patatas", "aloo", "gamja"], [77, 2, 17, 0.1], "vegetable", { piece: 213, cup: 150 }),
  n("sweet potato", ["sweet potatoes", "kamote", "yam", "goguma"], [86, 1.6, 20, 0.1], "vegetable", { piece: 130, cup: 133 }),
  n("carrot", ["carrots", "karot", "danggeun", "gajar"], [41, 0.9, 9.6, 0.2], "vegetable", { piece: 61, cup: 128 }),
  n("celery", ["celery stalk", "celery stalks", "celery ribs", "kintsay"], [16, 0.7, 3, 0.2], "vegetable", { stalk: 40, piece: 40, cup: 101 }),
  n("broccoli", ["broccoli florets", "broccolini", "chinese broccoli", "gai lan", "kai lan"], [34, 2.8, 6.6, 0.4], "vegetable", { cup: 91, head: 225, piece: 225 }),
  n("cauliflower", ["cauliflower florets", "gobi", "cauliflower rice"], [25, 1.9, 5, 0.3], "vegetable", { cup: 107, head: 575 }),
  n("cabbage", ["napa cabbage", "chinese cabbage", "wombok", "repolyo", "green cabbage", "red cabbage", "baechu", "savoy cabbage"], [25, 1.3, 5.8, 0.1], "vegetable", { cup: 89, head: 900, leaf: 25 }),
  n("bok choy", ["pak choi", "pechay", "baby bok choy", "pok choi", "bok choi", "choy sum", "yu choy"], [13, 1.5, 2.2, 0.2], "vegetable", { piece: 100, head: 100, cup: 70, bunch: 300 }),
  n("spinach", ["baby spinach", "palak", "sigumchi", "fresh spinach"], [23, 2.9, 3.6, 0.4], "vegetable", { cup: 30, bunch: 340, handful: 30 }),
  n("water spinach", ["kangkong", "morning glory", "ong choy", "rau muong"], [19, 2.6, 3.1, 0.2], "vegetable", { bunch: 250, cup: 56 }),
  n("kale", ["lacinato kale", "cavolo nero", "curly kale"], [35, 2.9, 4.4, 1.5], "vegetable", { cup: 21, bunch: 200, handful: 30 }),
  n("lettuce", ["romaine", "iceberg lettuce", "salad leaves", "mixed greens", "salad greens", "little gem", "butter lettuce", "arugula", "rocket"], [15, 1.4, 2.9, 0.2], "vegetable", { cup: 36, leaf: 10, head: 600, handful: 20 }),
  n("cucumber", ["cucumbers", "pipino", "english cucumber", "persian cucumber", "oi", "kheera"], [15, 0.7, 3.6, 0.1], "vegetable", { piece: 300, cup: 120 }),
  n("zucchini", ["courgette", "courgettes", "zucchinis", "hobak", "summer squash"], [17, 1.2, 3.1, 0.3], "vegetable", { piece: 200, cup: 124 }),
  n("eggplant", ["aubergine", "talong", "brinjal", "baingan", "chinese eggplant", "japanese eggplant", "gaji"], [25, 1, 5.9, 0.2], "vegetable", { piece: 300, cup: 82 }),
  n("mushrooms", ["mushroom", "button mushrooms", "white mushrooms", "cremini", "champignon", "oyster mushrooms", "king oyster mushrooms", "enoki", "portobello", "kabute"], [22, 3.1, 3.3, 0.3], "vegetable", { cup: 70, piece: 18 }),
  n("shiitake", ["shiitake mushrooms", "dried shiitake", "dried mushrooms", "pyogo"], [34, 2.2, 6.8, 0.5], "vegetable", { piece: 19, cup: 145 }),
  n("corn", ["corn kernels", "sweet corn", "mais", "frozen corn", "canned corn", "corn on the cob"], [86, 3.3, 19, 1.4], "vegetable", { cup: 145, piece: 90, can: 340 }),
  n("peas", ["green peas", "frozen peas", "garden peas", "matar", "gisantes"], [81, 5.4, 14, 0.4], "vegetable", { cup: 145 }),
  n("green beans", ["string beans", "sitaw", "long beans", "french beans", "haricots verts", "yardlong beans", "baguio beans"], [31, 1.8, 7, 0.2], "vegetable", { cup: 110, handful: 50 }),
  n("snow peas", ["snap peas", "sugar snap peas", "mangetout", "chicharo", "sugar snaps"], [42, 2.8, 7.6, 0.2], "vegetable", { cup: 63, handful: 40 }),
  n("bean sprouts", ["mung bean sprouts", "toge", "sukju", "soybean sprouts", "kongnamul"], [30, 3, 5.9, 0.2], "vegetable", { cup: 104, handful: 40 }),
  n("radish", ["daikon", "labanos", "mooli", "korean radish", "mu", "white radish", "radishes"], [18, 0.6, 4.1, 0.1], "vegetable", { cup: 116, piece: 340 }),
  n("okra", ["lady finger", "lady's finger", "bhindi", "okra pods"], [33, 1.9, 7.5, 0.2], "vegetable", { piece: 12, cup: 100 }),
  n("asparagus", ["asparagus spears"], [20, 2.2, 3.9, 0.1], "vegetable", { piece: 16, bunch: 450, cup: 134 }),
  n("pumpkin", ["squash", "kalabasa", "butternut squash", "kabocha", "kabocha squash", "danhobak"], [40, 1, 10, 0.1], "vegetable", { cup: 140 }),
  n("leek", ["leeks"], [61, 1.5, 14, 0.3], "vegetable", { piece: 89, cup: 89 }),
  n("kimchi", ["cabbage kimchi", "napa cabbage kimchi", "baechu kimchi"], [15, 1.1, 2.4, 0.5], "vegetable", { cup: 150, tbsp: 10 }),
  n("taro", ["gabi", "taro root", "eddo"], [112, 1.5, 26, 0.2], "vegetable", { piece: 100, cup: 104 }),
  n("lemongrass", ["tanglad", "lemon grass", "sereh"], [99, 1.8, 25, 0.5], "vegetable", { stalk: 20, piece: 20 }),
  n("sinigang mix", ["sinigang sa sampalok mix", "tamarind soup base", "sinigang powder", "tamarind powder mix"], [340, 4, 75, 3], "sauce", { pack: 40, tbsp: 10 }),
  n("tamarind", ["tamarind paste", "tamarind pulp", "sampalok", "imli"], [239, 2.8, 62, 0.6], "sauce", { tbsp: 15, piece: 10 }),
  n("seaweed", ["nori", "laver", "gim", "kim", "roasted seaweed", "wakame", "kombu", "dried seaweed"], [35, 5.8, 5.1, 0.3], "vegetable", { sheet: 3, piece: 3 }),
  n("avocado", ["avocados", "abokado"], [160, 2, 8.5, 14.7], "fruit", { piece: 150, cup: 150 }),

  // ---------- Herbs ----------
  n("cilantro", ["coriander leaves", "fresh coriander", "kinchay", "coriander", "dhania", "chopped cilantro", "rau mui"], [23, 2.1, 3.7, 0.5], "herb", { tbsp: 1, cup: 16, handful: 10, bunch: 60, sprig: 1 }),
  n("parsley", ["flat leaf parsley", "italian parsley", "curly parsley"], [36, 3, 6.3, 0.8], "herb", { tbsp: 3.8, cup: 60, handful: 10, bunch: 60, sprig: 1 }),
  n("basil", ["thai basil", "fresh basil", "holy basil", "basil leaves", "rau que"], [23, 3.2, 2.7, 0.6], "herb", { cup: 24, handful: 10, leaf: 0.5, sprig: 2, bunch: 60 }),
  n("mint", ["mint leaves", "fresh mint", "pudina", "rau thom"], [70, 3.8, 15, 0.9], "herb", { tbsp: 1.6, handful: 10, sprig: 1, cup: 25 }),
  n("dill", ["fresh dill"], [43, 3.5, 7, 1.1], "herb", { tbsp: 1, sprig: 1, handful: 10 }),
  n("curry leaves", ["kari patta", "curry leaf"], [108, 6, 18, 1], "herb", { sprig: 1, leaf: 0.1, handful: 5 }),
  n("perilla leaves", ["perilla", "kkaennip", "shiso", "shiso leaves"], [37, 3.9, 7, 0.1], "herb", { leaf: 2, handful: 10 }),

  // ---------- Fruit ----------
  n("banana", ["bananas", "saging", "ripe banana"], [89, 1.1, 23, 0.3], "fruit", { piece: 118, cup: 150 }),
  n("plantain", ["saba", "saba banana", "cooking banana", "platano"], [122, 1.3, 32, 0.4], "fruit", { piece: 180 }),
  n("apple", ["apples", "mansanas", "green apple"], [52, 0.3, 14, 0.2], "fruit", { piece: 182, cup: 125 }),
  n("blueberries", ["blueberry", "berries", "mixed berries", "frozen berries"], [57, 0.7, 14, 0.3], "fruit", { cup: 148, handful: 40 }),
  n("strawberries", ["strawberry"], [32, 0.7, 7.7, 0.3], "fruit", { cup: 152, piece: 12 }),
  n("mango", ["mangoes", "mangga", "ripe mango", "green mango"], [60, 0.8, 15, 0.4], "fruit", { piece: 200, cup: 165 }),
  n("pineapple", ["pineapple chunks", "pinya", "canned pineapple"], [50, 0.5, 13, 0.1], "fruit", { cup: 165, can: 560, slice: 85 }),
  n("orange", ["oranges", "dalandan", "mandarin", "tangerine"], [47, 0.9, 12, 0.1], "fruit", { piece: 131 }),
  n("lemon", ["lemons", "lime", "limes", "calamansi", "kalamansi", "dayap", "lemon zest", "lime zest"], [29, 1.1, 9.3, 0.3], "fruit", { piece: 70, tbsp: 6, tsp: 2 }),
  n("raisins", ["sultanas", "currants", "pasas"], [299, 3.1, 79, 0.5], "fruit", { tbsp: 9, cup: 145, handful: 30 }),
  n("dates", ["medjool dates", "dried dates"], [282, 2.5, 75, 0.4], "fruit", { piece: 12, cup: 147 }),
  n("desiccated coconut", ["shredded coconut", "coconut flakes", "grated coconut", "niyog", "dried coconut"], [660, 6.9, 24, 64], "nut", { tbsp: 5, cup: 80 }),

  // ---------- Nuts and seeds ----------
  n("peanuts", ["roasted peanuts", "mani", "groundnuts", "crushed peanuts", "peanut"], [585, 24, 21, 50], "nut", { cup: 146, tbsp: 9, handful: 30 }),
  n("almonds", ["almond", "sliced almonds", "flaked almonds", "slivered almonds", "almond flour", "ground almonds"], [579, 21, 22, 50], "nut", { cup: 143, tbsp: 9, handful: 28 }),
  n("cashews", ["cashew", "cashew nuts", "kasoy", "kaju"], [553, 18, 30, 44], "nut", { cup: 137, tbsp: 9, handful: 28 }),
  n("walnuts", ["walnut", "walnut halves"], [654, 15, 14, 65], "nut", { cup: 117, tbsp: 7.5, handful: 28 }),
  n("pine nuts", ["pignoli", "pinenuts"], [673, 14, 13, 68], "nut", { tbsp: 9, cup: 135 }),
  n("pistachios", ["pistachio"], [560, 20, 28, 45], "nut", { tbsp: 8, cup: 123, handful: 28 }),
  n("sesame seeds", ["toasted sesame seeds", "white sesame seeds", "black sesame seeds", "linga", "til"], [573, 18, 23, 50], "nut", { tbsp: 9, tsp: 3 }),
  n("chia seeds", ["chia"], [486, 17, 42, 31], "nut", { tbsp: 12, tsp: 4 }),
  n("flaxseed", ["flax seeds", "ground flaxseed", "linseed"], [534, 18, 29, 42], "nut", { tbsp: 10, tsp: 3.3 }),
  n("pumpkin seeds", ["pepitas"], [559, 30, 11, 49], "nut", { tbsp: 8.5, cup: 129, handful: 28 }),

  // ---------- Spices, seasonings and baking ----------
  n("salt", ["sea salt", "kosher salt", "fine salt", "table salt", "rock salt", "asin", "flaky salt", "salt to taste"], [0, 0, 0, 0], "negligible", { tsp: 6, tbsp: 18, pinch: 0.4, dash: 0.6 }),
  n("black pepper", ["pepper", "ground black pepper", "peppercorns", "black peppercorns", "white pepper", "ground pepper", "freshly ground black pepper", "paminta", "cracked black pepper"], [251, 10, 64, 3.3], "spice", { tsp: 2.3, tbsp: 6.9, pinch: 0.1, dash: 0.1 }),
  n("cumin", ["ground cumin", "cumin seeds", "jeera", "cumin powder"], [375, 18, 44, 22], "spice", { tsp: 2.1, tbsp: 6 }),
  n("coriander seeds", ["ground coriander", "coriander powder", "dhaniya powder"], [298, 12, 55, 18], "spice", { tsp: 1.8, tbsp: 5 }),
  n("turmeric", ["ground turmeric", "haldi", "turmeric powder", "luyang dilaw"], [312, 9.7, 67, 3.3], "spice", { tsp: 3, tbsp: 9 }),
  n("chili powder", ["chilli powder", "red chili powder", "kashmiri chili powder", "cayenne", "cayenne pepper", "ancho chili powder", "chipotle powder"], [282, 13.5, 50, 14], "spice", { tsp: 2.7, tbsp: 8 }),
  n("paprika", ["smoked paprika", "sweet paprika", "pimenton"], [282, 14, 54, 13], "spice", { tsp: 2.3, tbsp: 6.9 }),
  n("garam masala", [], [379, 15, 45, 15], "spice", { tsp: 2, tbsp: 6 }),
  n("curry powder", ["madras curry powder", "japanese curry powder"], [325, 14, 58, 14], "spice", { tsp: 2, tbsp: 6.3 }),
  n("curry roux", ["japanese curry roux", "golden curry", "curry blocks"], [512, 6, 45, 34], "sauce", { piece: 20, block: 100 }),
  n("cinnamon", ["ground cinnamon", "cinnamon stick", "cinnamon sticks", "dalchini"], [247, 4, 81, 1.2], "spice", { tsp: 2.6, piece: 3, stick: 3 }),
  n("star anise", ["star anise pods", "whole star anise"], [337, 18, 50, 16], "spice", { piece: 0.5 }),
  n("cloves", ["whole cloves", "ground cloves", "laung"], [274, 6, 66, 13], "spice", { tsp: 2.1, piece: 0.1 }),
  n("cardamom", ["cardamom pods", "green cardamom", "elaichi", "ground cardamom"], [311, 11, 68, 6.7], "spice", { tsp: 2, piece: 0.2 }),
  n("bay leaves", ["bay leaf", "laurel", "dahon ng laurel", "tej patta"], [313, 7.6, 75, 8.4], "negligible", { piece: 0.2, leaf: 0.2 }),
  n("five spice", ["chinese five spice", "five spice powder", "5 spice"], [345, 10, 70, 8], "spice", { tsp: 2, tbsp: 6 }),
  n("dried herbs", ["oregano", "dried oregano", "italian seasoning", "thyme", "dried thyme", "rosemary", "dried rosemary", "herbes de provence", "mixed herbs", "fresh thyme", "fresh rosemary", "sage"], [265, 9, 69, 4.3], "spice", { tsp: 1, tbsp: 3, sprig: 1, pinch: 0.2 }),
  n("chili flakes", ["red pepper flakes", "crushed red pepper", "gochugaru", "korean chili flakes", "korean red pepper flakes", "chilli flakes", "pepper flakes"], [318, 12, 57, 17], "spice", { tsp: 1.8, tbsp: 5.4 }),
  n("garlic powder", ["granulated garlic"], [331, 17, 73, 0.7], "spice", { tsp: 3.1, tbsp: 9.3 }),
  n("onion powder", ["granulated onion"], [341, 10, 79, 1], "spice", { tsp: 2.4, tbsp: 7 }),
  n("msg", ["monosodium glutamate", "ajinomoto", "vetsin", "chicken powder", "chicken bouillon powder", "bouillon cube", "stock cube", "dashida", "hondashi"], [200, 10, 30, 3], "spice", { tsp: 3, tbsp: 9, piece: 10 }),
  n("baking powder", ["baking soda", "bicarbonate of soda", "bicarb", "cream of tartar"], [53, 0, 28, 0], "negligible", { tsp: 4.6, tbsp: 13.8 }),
  n("yeast", ["instant yeast", "active dry yeast", "dry yeast"], [325, 40, 41, 7.6], "spice", { tsp: 3, tbsp: 9, pack: 7 }),
  n("vanilla extract", ["vanilla", "vanilla essence", "vanilla bean paste"], [288, 0.1, 12.7, 0.1], "spice", { tsp: 4.2, tbsp: 13 }),
  n("cocoa powder", ["cocoa", "unsweetened cocoa powder", "cacao powder"], [228, 20, 58, 14], "sugar", { tbsp: 5.4, tsp: 1.8, cup: 86 }),
  n("dark chocolate", ["chocolate", "chocolate chips", "semi-sweet chocolate", "semisweet chocolate", "milk chocolate", "chocolate chunks"], [546, 4.9, 61, 31], "sugar", { cup: 168, tbsp: 10, piece: 10 }),
  n("gelatin", ["gelatine", "agar agar", "agar"], [335, 86, 0, 0.1], "negligible", { tsp: 3, tbsp: 7, pack: 7 }),
];
