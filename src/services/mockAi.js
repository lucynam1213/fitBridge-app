// Photo identification helper.
//
// Real product would POST the image to a vision model (Gemini / Claude
// Vision / Google Cloud Vision). The MVP doesn't have a vision API key,
// so we DELIBERATELY don't fabricate a single confident answer with random
// macros. Instead we surface a short list of candidate food names and ask
// the user to confirm (or type their own). The chosen name is then resolved
// against the real nutrition API (Nutritionix) for actual macros.
//
// This avoids the prototype-y feeling of "any photo gets bibimbap with
// random calories saved into the meal log".

const COMMON_FOODS = [
  'Bibimbap',
  'Kimchi Jjigae',
  'Bulgogi',
  'Tteokbokki',
  'Korean Fried Chicken',
  'Kimbap',
  'Grilled Chicken Breast',
  'Salmon Fillet',
  'Brown Rice',
  'Oatmeal',
  'Greek Yogurt',
  'Avocado Toast',
  'Salad',
  'Pasta',
  'Burger',
  'Pizza',
  'Sushi',
];

// Returns candidate food names so the user can confirm/identify the dish.
// Confidence is intentionally absent — we don't pretend to know.
export async function analyzeMealPhoto(file) {
  await new Promise((r) => setTimeout(r, 600));
  const seedSrc = file ? `${file.name || 'photo'}_${file.size || 0}` : `rand_${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < seedSrc.length; i++) hash = (hash * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const start = hash % COMMON_FOODS.length;
  const suggestions = [
    COMMON_FOODS[start],
    COMMON_FOODS[(start + 5) % COMMON_FOODS.length],
    COMMON_FOODS[(start + 9) % COMMON_FOODS.length],
  ];
  return {
    suggestions,
    fileName: file?.name || 'photo.jpg',
    analyzedAt: new Date().toISOString(),
  };
}

export default { analyzeMealPhoto };
