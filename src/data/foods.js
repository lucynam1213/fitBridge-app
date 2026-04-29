// Canonical food library used by the meal search. Macros are per single
// "serving" (described in `serving`). The AddMealEntry screen multiplies
// calories/protein/carbs/fat by the chosen servings count when a user logs.
// `meals` lists meal types this food commonly belongs to, so the UI can
// nudge contextually-appropriate suggestions.

export const FOODS = [
  // Breakfast
  { id: 'f_oatmeal', name: 'Oatmeal', serving: '1 cup cooked', calories: 150, protein: 5, carbs: 27, fat: 3, meals: ['Breakfast'] },
  { id: 'f_whey', name: 'Whey Protein Shake', serving: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 2, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_banana', name: 'Banana', serving: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_eggs', name: 'Eggs (scrambled)', serving: '2 large', calories: 180, protein: 12, carbs: 2, fat: 14, meals: ['Breakfast'] },
  { id: 'f_bagel', name: 'Bagel (plain)', serving: '1 bagel', calories: 280, protein: 10, carbs: 56, fat: 2, meals: ['Breakfast'] },
  { id: 'f_yogurt', name: 'Greek Yogurt', serving: '1 cup', calories: 150, protein: 20, carbs: 9, fat: 4, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_granola', name: 'Granola', serving: '¼ cup', calories: 140, protein: 3, carbs: 22, fat: 5, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_berries', name: 'Mixed Berries', serving: '½ cup', calories: 40, protein: 1, carbs: 10, fat: 0, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_pbtoast', name: 'Peanut Butter Toast', serving: '1 slice', calories: 220, protein: 8, carbs: 22, fat: 12, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_avotoast', name: 'Avocado Toast', serving: '1 slice', calories: 260, protein: 6, carbs: 24, fat: 16, meals: ['Breakfast'] },

  // Lunch / Dinner proteins
  { id: 'f_chicken', name: 'Grilled Chicken Breast', serving: '6 oz', calories: 280, protein: 52, carbs: 0, fat: 6, meals: ['Lunch', 'Dinner'] },
  { id: 'f_salmon', name: 'Salmon Fillet', serving: '5 oz', calories: 300, protein: 34, carbs: 0, fat: 18, meals: ['Dinner'] },
  { id: 'f_beef', name: 'Lean Ground Beef', serving: '4 oz', calories: 240, protein: 28, carbs: 0, fat: 14, meals: ['Lunch', 'Dinner'] },
  { id: 'f_tofu', name: 'Tofu (firm)', serving: '½ cup', calories: 180, protein: 22, carbs: 4, fat: 10, meals: ['Lunch', 'Dinner'] },
  { id: 'f_turkey', name: 'Turkey Slices', serving: '3 oz', calories: 90, protein: 18, carbs: 1, fat: 2, meals: ['Lunch', 'Snacks'] },
  { id: 'f_shrimp', name: 'Shrimp (grilled)', serving: '4 oz', calories: 120, protein: 24, carbs: 0, fat: 2, meals: ['Lunch', 'Dinner'] },
  { id: 'f_tuna', name: 'Tuna Salad', serving: '½ cup', calories: 190, protein: 16, carbs: 3, fat: 12, meals: ['Lunch'] },

  // Carbs / grains / sides
  { id: 'f_brownrice', name: 'Brown Rice', serving: '1 cup cooked', calories: 215, protein: 5, carbs: 45, fat: 2, meals: ['Lunch', 'Dinner'] },
  { id: 'f_quinoa', name: 'Quinoa', serving: '1 cup cooked', calories: 220, protein: 8, carbs: 39, fat: 4, meals: ['Lunch', 'Dinner'] },
  { id: 'f_sweetpotato', name: 'Sweet Potato', serving: '1 medium', calories: 115, protein: 2, carbs: 27, fat: 0, meals: ['Lunch', 'Dinner'] },
  { id: 'f_pasta', name: 'Whole Wheat Pasta', serving: '1 cup cooked', calories: 180, protein: 8, carbs: 37, fat: 2, meals: ['Lunch', 'Dinner'] },
  { id: 'f_bread', name: 'Whole Grain Bread', serving: '1 slice', calories: 80, protein: 4, carbs: 15, fat: 1, meals: ['Breakfast', 'Lunch'] },

  // Vegetables
  { id: 'f_broccoli', name: 'Steamed Broccoli', serving: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 1, meals: ['Lunch', 'Dinner'] },
  { id: 'f_asparagus', name: 'Asparagus', serving: '1 cup', calories: 30, protein: 3, carbs: 6, fat: 0, meals: ['Dinner'] },
  { id: 'f_spinach', name: 'Spinach (cooked)', serving: '1 cup', calories: 40, protein: 5, carbs: 7, fat: 0, meals: ['Lunch', 'Dinner'] },
  { id: 'f_mixedgreens', name: 'Mixed Greens Salad', serving: '2 cups', calories: 30, protein: 2, carbs: 5, fat: 0, meals: ['Lunch', 'Dinner'] },

  // Snacks
  { id: 'f_almonds', name: 'Almonds', serving: '¼ cup', calories: 210, protein: 8, carbs: 7, fat: 18, meals: ['Snacks'] },
  { id: 'f_apple', name: 'Apple', serving: '1 medium', calories: 95, protein: 0, carbs: 25, fat: 0, meals: ['Snacks'] },
  { id: 'f_proteinbar', name: 'Protein Bar', serving: '1 bar', calories: 220, protein: 20, carbs: 22, fat: 8, meals: ['Snacks'] },
  { id: 'f_cheese', name: 'Cheddar Cheese', serving: '1 oz', calories: 115, protein: 7, carbs: 1, fat: 9, meals: ['Snacks'] },
  { id: 'f_hummus', name: 'Hummus + Carrots', serving: '¼ cup + carrots', calories: 180, protein: 6, carbs: 18, fat: 10, meals: ['Snacks', 'Lunch'] },
  { id: 'f_darkchoc', name: 'Dark Chocolate (1 oz)', serving: '1 oz', calories: 170, protein: 2, carbs: 13, fat: 12, meals: ['Snacks'] },
  { id: 'f_ricecake', name: 'Rice Cakes (2)', serving: '2 cakes', calories: 70, protein: 2, carbs: 15, fat: 0, meals: ['Snacks'] },

  // Toppings / small items
  { id: 'f_oliveoil', name: 'Olive Oil', serving: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14, meals: ['Lunch', 'Dinner'] },
  { id: 'f_feta', name: 'Feta Cheese', serving: '¼ cup', calories: 95, protein: 5, carbs: 1, fat: 7, meals: ['Lunch', 'Dinner'] },
  { id: 'f_honey', name: 'Honey', serving: '1 tbsp', calories: 65, protein: 0, carbs: 17, fat: 0, meals: ['Breakfast', 'Snacks'] },
  { id: 'f_pb', name: 'Peanut Butter', serving: '1 tbsp', calories: 95, protein: 4, carbs: 3, fat: 8, meals: ['Breakfast', 'Snacks'] },
];

// Simple substring match. Returns up to `limit` foods, prioritizing those
// that match the active meal type.
export function searchFoods(query, mealType, limit = 8) {
  const q = (query || '').trim().toLowerCase();
  const scored = FOODS.map((f) => {
    let score = 0;
    if (q) {
      if (f.name.toLowerCase().startsWith(q)) score += 3;
      else if (f.name.toLowerCase().includes(q)) score += 2;
      else return null;
    }
    if (mealType && f.meals.includes(mealType)) score += 1;
    return { food: f, score };
  }).filter(Boolean);
  scored.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));
  return scored.slice(0, limit).map((s) => s.food);
}

// Popular suggestions for a meal type when the search box is empty.
export function suggestionsFor(mealType, limit = 6) {
  return FOODS.filter((f) => f.meals.includes(mealType)).slice(0, limit);
}

// Build the stored "items" string array from a list of selections so the
// existing NutritionLog/Trainer rendering keeps working unchanged.
export function itemsFromSelections(selections) {
  return selections.map((s) => {
    const qty = s.servings === 1 ? '' : `${s.servings}× `;
    return `${qty}${s.food.name} (${s.food.serving})`;
  });
}

// Sum macros across selections, respecting servings.
export function totalsFromSelections(selections) {
  return selections.reduce((t, s) => {
    const n = s.servings || 1;
    t.calories += s.food.calories * n;
    t.protein += s.food.protein * n;
    t.carbs += s.food.carbs * n;
    t.fat += s.food.fat * n;
    return t;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
