// Approximate values for a prototype. Not for medical or dietary use.
//
// Ready-to-eat foods for "Search food" and restaurant estimates: snacks,
// drinks, fruit, coffee-shop items and common restaurant dishes, each with a
// typical serving. Values roughly follow USDA FoodData Central and typical
// chain-restaurant nutrition pages.

export type Food = {
  name: string;
  servingLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Other words people search with. */
  aliases: string[];
};

type Macros = [kcal: number, protein: number, carbs: number, fat: number];

function f(name: string, servingLabel: string, [kcal, protein, carbs, fat]: Macros, aliases: string[] = []): Food {
  return { name, servingLabel, kcal, protein, carbs, fat, aliases };
}

export const FOODS: Food[] = [
  // ---------- Fruit ----------
  f("Apple", "1 medium (180 g)", [95, 0, 25, 0], ["apples"]),
  f("Banana", "1 medium (118 g)", [105, 1, 27, 0], ["bananas"]),
  f("Orange", "1 medium (130 g)", [62, 1, 15, 0], ["oranges", "mandarin", "clementine"]),
  f("Grapes", "1 cup (150 g)", [104, 1, 27, 0], ["grape"]),
  f("Strawberries", "1 cup (150 g)", [48, 1, 12, 0], ["strawberry"]),
  f("Blueberries", "1 cup (148 g)", [84, 1, 21, 0], ["blueberry", "berries"]),
  f("Mango", "1 cup sliced (165 g)", [99, 1, 25, 1], ["mangoes"]),
  f("Watermelon", "2 cups diced (300 g)", [90, 2, 23, 0], ["melon"]),
  f("Pear", "1 medium (178 g)", [101, 1, 27, 0], ["pears"]),
  f("Avocado", "½ medium (100 g)", [160, 2, 9, 15], ["avocados"]),

  // ---------- Snacks ----------
  f("Potato chips", "1 small bag (28 g)", [150, 2, 15, 10], ["crisps", "chips", "lays"]),
  f("Tortilla chips", "1 oz (28 g, about 10 chips)", [140, 2, 18, 7], ["nachos chips", "corn chips"]),
  f("Popcorn", "3 cups popped", [93, 3, 19, 1], ["air popped popcorn"]),
  f("Microwave popcorn, butter", "1 bag (about 9 cups)", [400, 6, 46, 24], ["butter popcorn"]),
  f("Pretzels", "1 oz (28 g)", [108, 3, 23, 1], ["pretzel"]),
  f("Mixed nuts", "¼ cup (30 g)", [180, 5, 7, 16], ["nuts", "trail mix"]),
  f("Almonds", "¼ cup (35 g)", [207, 8, 7, 18], ["almond"]),
  f("Peanut butter", "2 tbsp (32 g)", [190, 7, 7, 16], ["pb"]),
  f("Granola bar", "1 bar (40 g)", [190, 3, 29, 7], ["cereal bar", "nature valley"]),
  f("Protein bar", "1 bar (60 g)", [220, 20, 23, 8], ["quest bar", "clif builders"]),
  f("Rice crackers", "1 serving (30 g)", [120, 2, 25, 1], ["senbei", "rice cracker"]),
  f("Seaweed snack", "1 pack (5 g)", [25, 1, 1, 2], ["nori snack", "gim snack"]),
  f("Dark chocolate", "2 squares (20 g)", [120, 2, 9, 9], ["chocolate"]),
  f("Milk chocolate bar", "1 bar (43 g)", [230, 3, 26, 13], ["chocolate bar", "hershey", "cadbury"]),
  f("Chocolate chip cookie", "1 large (40 g)", [200, 2, 26, 10], ["cookie", "cookies"]),
  f("Oreo cookies", "3 cookies (34 g)", [160, 1, 25, 7], ["oreos", "oreo"]),
  f("Hummus with carrots", "¼ cup hummus + 1 cup carrots", [170, 5, 19, 9], ["hummus"]),
  f("Cheese stick", "1 stick (28 g)", [80, 7, 1, 6], ["string cheese", "mozzarella stick"]),
  f("Greek yogurt cup", "1 cup (170 g), plain", [100, 17, 6, 1], ["greek yogurt", "yogurt", "yoghurt"]),
  f("Fruit yogurt cup", "1 cup (150 g)", [140, 5, 23, 3], ["flavored yogurt"]),
  f("Hard-boiled egg", "1 large", [78, 6, 1, 5], ["boiled egg", "egg"]),
  f("Onigiri", "1 rice ball", [180, 4, 37, 1], ["rice ball", "samgak kimbap"]),
  f("Ice cream", "1 scoop (½ cup)", [140, 2, 16, 7], ["gelato", "icecream"]),
  f("Mochi ice cream", "1 piece", [100, 1, 17, 3], ["mochi"]),
  f("Doughnut, glazed", "1 doughnut", [260, 3, 31, 14], ["donut", "doughnut"]),
  f("Instant noodles", "1 pack, cooked", [380, 8, 52, 14], ["ramen pack", "cup noodles", "shin ramyun", "pancit canton pack"]),

  // ---------- Drinks ----------
  f("Coffee, black", "1 cup (240 ml)", [2, 0, 0, 0], ["black coffee", "americano", "drip coffee", "espresso"]),
  f("Latte", "Grande (16 oz), 2% milk", [190, 13, 19, 7], ["cafe latte", "caffe latte"]),
  f("Oat milk latte", "Grande (16 oz)", [220, 3, 27, 11], ["oat latte"]),
  f("Cappuccino", "Grande (16 oz), 2% milk", [140, 9, 14, 5], ["flat white"]),
  f("Iced caramel macchiato", "Grande (16 oz)", [250, 10, 37, 7], ["caramel macchiato"]),
  f("Mocha", "Grande (16 oz), with whipped cream", [370, 13, 43, 15], ["cafe mocha"]),
  f("Frappuccino", "Grande (16 oz), with whipped cream", [380, 5, 54, 16], ["frappe", "blended coffee"]),
  f("Matcha latte", "Grande (16 oz), 2% milk", [240, 12, 34, 7], ["green tea latte"]),
  f("Chai latte", "Grande (16 oz), 2% milk", [240, 8, 45, 5], ["chai"]),
  f("Bubble tea", "Large (500 ml), milk tea with pearls", [450, 3, 85, 10], ["boba", "milk tea", "pearl milk tea", "boba tea"]),
  f("Cola", "1 can (355 ml)", [140, 0, 39, 0], ["coke", "pepsi", "soda", "soft drink"]),
  f("Diet cola", "1 can (355 ml)", [0, 0, 0, 0], ["diet coke", "coke zero", "pepsi max"]),
  f("Orange juice", "1 cup (240 ml)", [112, 2, 26, 0], ["oj", "juice"]),
  f("Smoothie", "Medium (16 oz), fruit", [270, 3, 64, 1], ["fruit smoothie"]),
  f("Beer", "1 bottle (355 ml)", [153, 2, 13, 0], ["lager", "ale"]),
  f("Wine", "1 glass (150 ml)", [125, 0, 4, 0], ["red wine", "white wine", "glass of wine"]),
  f("Soju", "1 bottle (360 ml)", [540, 0, 0, 0], ["korean soju"]),
  f("Sports drink", "1 bottle (591 ml)", [140, 0, 36, 0], ["gatorade", "powerade"]),
  f("Energy drink", "1 can (250 ml)", [110, 0, 28, 0], ["red bull", "monster"]),
  f("Hot chocolate", "1 cup (240 ml)", [190, 8, 27, 6], ["cocoa", "hot cocoa"]),
  f("Protein shake", "1 scoop whey with water", [120, 24, 3, 1], ["whey", "protein powder"]),
  f("Milk", "1 cup (240 ml), whole", [150, 8, 12, 8], ["glass of milk"]),

  // ---------- Coffee shop and bakery ----------
  f("Croissant", "1 croissant", [270, 5, 31, 14], ["butter croissant"]),
  f("Chocolate croissant", "1 pastry", [340, 6, 38, 18], ["pain au chocolat"]),
  f("Blueberry muffin", "1 muffin", [380, 5, 54, 16], ["muffin"]),
  f("Banana bread", "1 slice", [330, 5, 50, 13], ["banana loaf"]),
  f("Bagel with cream cheese", "1 bagel + 2 tbsp", [390, 13, 58, 11], ["bagel"]),
  f("Cinnamon roll", "1 roll", [420, 6, 58, 18], ["cinnamon bun"]),
  f("Egg sandwich", "1 breakfast sandwich", [450, 20, 39, 23], ["breakfast sandwich", "egg mcmuffin"]),
  f("Avocado toast", "1 slice", [260, 6, 26, 15], []),
  f("Pandesal", "2 rolls", [240, 7, 44, 3], ["pan de sal"]),
  f("Pineapple bun", "1 bun", [350, 6, 52, 13], ["bolo bao"]),
  f("Egg tart", "1 tart", [200, 4, 22, 11], ["dan tat", "pastel de nata"]),
  f("Cheesecake", "1 slice", [400, 7, 32, 28], []),
  f("Chocolate cake", "1 slice", [420, 5, 55, 21], ["cake"]),

  // ---------- Breakfast ----------
  f("Oatmeal", "1 cup cooked, plain", [160, 6, 27, 3], ["porridge", "oats"]),
  f("Cereal with milk", "1 cup + ½ cup 2% milk", [200, 7, 32, 4], ["cereal", "cornflakes"]),
  f("Pancakes", "3 pancakes with syrup", [520, 10, 90, 14], ["pancake", "hotcakes"]),
  f("Waffle", "1 waffle with syrup", [380, 7, 55, 14], ["waffles"]),
  f("Scrambled eggs", "2 eggs", [200, 13, 2, 15], ["eggs"]),
  f("Silog plate", "Rice, egg and longganisa", [700, 25, 80, 30], ["longsilog", "tapsilog", "silog"]),
  f("Congee", "1 bowl", [220, 8, 40, 3], ["jook", "lugaw", "rice porridge", "arroz caldo"]),

  // ---------- Restaurant and takeaway dishes ----------
  f("Cheeseburger", "1 burger", [600, 30, 40, 35], ["burger", "hamburger"]),
  f("Double cheeseburger", "1 burger", [850, 48, 42, 52], ["double burger"]),
  f("French fries", "Medium portion", [380, 4, 48, 18], ["fries", "chips"]),
  f("Pizza slice, cheese", "1 large slice", [285, 12, 36, 10], ["pizza", "cheese pizza"]),
  f("Pizza slice, pepperoni", "1 large slice", [310, 13, 35, 13], ["pepperoni pizza"]),
  f("Spaghetti bolognese", "1 restaurant plate", [750, 32, 90, 26], ["bolognese", "spaghetti"]),
  f("Fettuccine alfredo", "1 restaurant plate", [1100, 30, 95, 65], ["alfredo"]),
  f("Tonkotsu ramen", "1 bowl", [800, 30, 80, 38], ["ramen"]),
  f("Shoyu ramen", "1 bowl", [550, 25, 75, 15], ["ramen bowl"]),
  f("Pho bo", "1 large bowl", [550, 32, 70, 12], ["pho", "beef pho"]),
  f("Chicken curry with rice", "1 plate", [800, 35, 95, 28], ["curry", "curry rice"]),
  f("Butter chicken with naan", "1 plate", [900, 40, 70, 48], ["butter chicken", "chicken makhani"]),
  f("Chicken tikka masala with rice", "1 plate", [850, 40, 85, 36], ["tikka masala"]),
  f("Japanese curry with rice", "1 plate", [750, 20, 110, 24], ["katsu curry", "kare raisu"]),
  f("Fried rice", "1 takeaway box", [700, 20, 95, 25], ["chicken fried rice", "yangzhou fried rice"]),
  f("Chow mein", "1 takeaway box", [650, 25, 80, 25], ["lo mein", "stir fried noodles"]),
  f("Pad thai", "1 plate", [700, 25, 85, 28], ["phad thai"]),
  f("Chicken stir-fry with rice", "1 plate", [650, 32, 80, 20], ["stir fry", "stir-fry"]),
  f("General Tso's chicken", "1 takeaway box", [1000, 45, 100, 45], ["orange chicken", "sweet and sour chicken"]),
  f("California roll", "8 pieces", [260, 9, 38, 7], ["sushi", "sushi roll"]),
  f("Salmon nigiri", "2 pieces", [140, 8, 20, 3], ["nigiri"]),
  f("Spicy tuna roll", "8 pieces", [300, 12, 40, 10], ["tuna roll"]),
  f("Chicken burrito", "1 burrito", [1000, 50, 110, 35], ["burrito"]),
  f("Burrito bowl", "1 bowl", [700, 40, 70, 25], ["chipotle bowl"]),
  f("Tacos", "2 tacos", [400, 20, 32, 20], ["taco"]),
  f("Quesadilla", "1 quesadilla", [700, 35, 50, 40], []),
  f("Caesar salad with chicken", "1 large salad", [550, 38, 18, 36], ["caesar salad", "salad"]),
  f("Garden salad", "1 side salad with dressing", [180, 3, 12, 14], ["side salad", "green salad"]),
  f("Poke bowl", "1 regular bowl", [650, 35, 80, 18], ["poke"]),
  f("Turkey sandwich", "1 sandwich", [450, 28, 45, 16], ["sandwich", "sub", "deli sandwich"]),
  f("Banh mi", "1 sandwich", [550, 25, 65, 20], ["banh mi sandwich"]),
  f("Fried chicken", "2 pieces", [600, 40, 20, 38], ["kfc", "chicken"]),
  f("Chicken nuggets", "10 pieces", [440, 23, 26, 27], ["nuggets", "mcnuggets"]),
  f("Korean fried chicken", "½ chicken", [1100, 70, 50, 65], ["yangnyeom chicken", "kfc korean"]),
  f("Chickenjoy", "1 piece with rice", [650, 30, 60, 30], ["jollibee", "chicken joy"]),
  f("Dumplings", "6 dumplings", [400, 18, 42, 17], ["gyoza", "potstickers", "jiaozi", "mandu"]),
  f("Xiao long bao", "6 dumplings", [360, 16, 36, 16], ["soup dumplings"]),
  f("Bibimbap", "1 bowl", [650, 25, 90, 20], ["dolsot bibimbap"]),
  f("Kimbap", "1 roll", [450, 15, 75, 10], ["gimbap"]),
  f("Tteokbokki", "1 serving", [500, 10, 100, 6], ["ddeokbokki", "rice cakes"]),
  f("Adobo with rice", "1 plate", [700, 35, 60, 35], ["chicken adobo", "pork adobo"]),
  f("Hot dog", "1 hot dog in bun", [290, 11, 24, 17], ["hotdog"]),
  f("Mac and cheese", "1 cup", [400, 15, 45, 18], ["macaroni and cheese"]),
  f("Falafel wrap", "1 wrap", [600, 18, 70, 28], ["falafel"]),
  f("Chicken shawarma wrap", "1 wrap", [650, 38, 55, 30], ["shawarma", "doner", "gyro", "kebab"]),
  f("Fish and chips", "1 portion", [950, 40, 90, 48], ["fish & chips"]),
  f("Grilled salmon with vegetables", "1 plate", [550, 40, 15, 35], ["salmon plate"]),
  f("Steak with fries", "1 plate (8 oz steak)", [1000, 60, 50, 60], ["steak frites"]),
  f("Chicken caesar wrap", "1 wrap", [600, 35, 45, 30], ["wrap"]),
  f("Lasagna", "1 restaurant portion", [650, 35, 50, 32], ["lasagne"]),
];
