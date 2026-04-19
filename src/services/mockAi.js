// Mock AI photo→meal analyzer.
// Pretends to call a vision model and returns a deterministic-ish nutrition guess
// based on the image filename / size so the demo feels alive.

const RECIPES = [
  {
    label: 'Grilled chicken bowl',
    items: ['Grilled Chicken Breast (6oz)', 'Brown Rice (1 cup)', 'Steamed Broccoli', 'Olive Oil Drizzle'],
    calories: 620, protein: 48, carbs: 65, fat: 16, mealType: 'Lunch',
  },
  {
    label: 'Salmon & sweet potato',
    items: ['Salmon Fillet (5oz)', 'Roasted Sweet Potato', 'Asparagus', 'Lemon'],
    calories: 710, protein: 44, carbs: 58, fat: 28, mealType: 'Dinner',
  },
  {
    label: 'Protein oatmeal',
    items: ['Oatmeal (1 cup)', 'Whey Protein Scoop', 'Banana', 'Almond Butter (1 tbsp)'],
    calories: 540, protein: 38, carbs: 62, fat: 14, mealType: 'Breakfast',
  },
  {
    label: 'Greek salad with chicken',
    items: ['Mixed Greens', 'Grilled Chicken', 'Feta Cheese', 'Olives', 'Tomato', 'Cucumber'],
    calories: 480, protein: 36, carbs: 18, fat: 28, mealType: 'Lunch',
  },
  {
    label: 'Yogurt & berries',
    items: ['Greek Yogurt (1 cup)', 'Mixed Berries', 'Granola (¼ cup)', 'Honey'],
    calories: 320, protein: 22, carbs: 42, fat: 6, mealType: 'Snacks',
  },
];

// Deterministic pick based on a string seed (so the same image gives the same result).
function pickRecipe(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return RECIPES[hash % RECIPES.length];
}

export function analyzeMealPhoto(file) {
  return new Promise((resolve) => {
    const seed = file ? `${file.name || 'photo'}_${file.size || 0}` : `rand_${Math.random()}`;
    const recipe = pickRecipe(seed);
    // Simulate a 1.2s "vision API" call.
    setTimeout(() => {
      resolve({
        ...recipe,
        confidence: 0.82 + (seed.length % 13) / 100, // ~0.82–0.94
        analyzedAt: new Date().toISOString(),
      });
    }, 1200);
  });
}
