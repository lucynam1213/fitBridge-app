// Nutrition API service.
//
// Strategy:
//  1. If VITE_NUTRITIONIX_APP_ID + VITE_NUTRITIONIX_APP_KEY are set, hit
//     Nutritionix /v2/search/instant + /v2/natural/nutrients (best Korean
//     food coverage of the free tiers). Returns calories, protein, carbs,
//     fat, transFat, sugar, sodium, serving size, photo.
//  2. Otherwise, search the in-app FOODS library + Korean catalog so the
//     prototype still works offline.
//
// IMPORTANT: we do NOT synthesize random macros for unknown queries. If a
// query has no real match, searchFoods() returns []. The UI surfaces that
// as a clear "no matches" state rather than letting the user save fake data.
//
// Errors from the network or API auth bubble up to the caller as Error
// objects so the UI can show a real error/retry state.

import { FOODS } from '../data/foods';

const APP_ID = import.meta.env.VITE_NUTRITIONIX_APP_ID || '';
const APP_KEY = import.meta.env.VITE_NUTRITIONIX_APP_KEY || '';

export const isNutritionApiConfigured = Boolean(APP_ID && APP_KEY);

// Korean + popular international foods for the offline fallback.
const KOREAN_FOODS = [
  { name: 'Bibimbap', servingSize: '1 bowl (450g)', calories: 560, protein: 18, carbs: 95, fat: 11, transFat: 0, sugar: 6, sodium: 1100 },
  { name: 'Kimchi Jjigae', servingSize: '1 bowl (350g)', calories: 280, protein: 16, carbs: 18, fat: 14, transFat: 0, sugar: 5, sodium: 1500 },
  { name: 'Bulgogi', servingSize: '1 serving (200g)', calories: 320, protein: 28, carbs: 14, fat: 16, transFat: 0.2, sugar: 9, sodium: 720 },
  { name: 'Japchae', servingSize: '1 cup (240g)', calories: 380, protein: 9, carbs: 56, fat: 13, transFat: 0, sugar: 8, sodium: 950 },
  { name: 'Tteokbokki', servingSize: '1 serving (250g)', calories: 410, protein: 8, carbs: 78, fat: 7, transFat: 0, sugar: 12, sodium: 1180 },
  { name: 'Samgyeopsal', servingSize: '4 oz (113g)', calories: 480, protein: 24, carbs: 0, fat: 42, transFat: 0.4, sugar: 0, sodium: 90 },
  { name: 'Kimbap', servingSize: '1 roll (200g)', calories: 320, protein: 9, carbs: 56, fat: 7, transFat: 0, sugar: 4, sodium: 720 },
  { name: 'Sundubu Jjigae', servingSize: '1 bowl (400g)', calories: 240, protein: 18, carbs: 12, fat: 14, transFat: 0, sugar: 4, sodium: 1300 },
  { name: 'Korean Fried Chicken', servingSize: '4 oz (113g)', calories: 350, protein: 22, carbs: 18, fat: 20, transFat: 0.5, sugar: 6, sodium: 850 },
  { name: 'Galbi', servingSize: '1 serving (200g)', calories: 420, protein: 30, carbs: 12, fat: 28, transFat: 0.3, sugar: 8, sodium: 880 },
  { name: 'Doenjang Jjigae', servingSize: '1 bowl (350g)', calories: 220, protein: 14, carbs: 16, fat: 10, transFat: 0, sugar: 4, sodium: 1400 },
  { name: 'Naengmyeon', servingSize: '1 bowl (500g)', calories: 480, protein: 18, carbs: 86, fat: 4, transFat: 0, sugar: 9, sodium: 1200 },
];

function round1(n) {
  if (n === null || n === undefined) return 0;
  return Math.round(n * 10) / 10;
}

function capitalize(s) {
  if (!s) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function fromLocalFood(f) {
  return {
    name: f.name,
    servingSize: f.serving,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    transFat: 0,
    sugar: 0,
    sodium: 0,
    photo: null,
    source: 'local',
  };
}

// Searches the curated offline dataset only. Returns [] when nothing matches —
// no synthetic "Oogabooga = 200 kcal" fallback so the user can never save fake
// nutrition data.
function searchLocal(query) {
  if (!query?.trim()) return [];
  const q = query.toLowerCase();
  const local = FOODS.filter((f) => f.name.toLowerCase().includes(q)).map(fromLocalFood);
  const korean = KOREAN_FOODS
    .filter((f) => f.name.toLowerCase().includes(q))
    .map((f) => ({ ...f, source: 'korean' }));
  return [...local, ...korean];
}

// Public — hits Nutritionix when configured; otherwise the offline dataset.
// Throws on real errors (network / auth / 5xx) so the UI can surface a retry.
export async function searchFoods(query) {
  if (!query?.trim()) return [];

  if (isNutritionApiConfigured) {
    let res;
    try {
      res = await fetch('https://trackapi.nutritionix.com/v2/search/instant', {
        method: 'POST',
        headers: {
          'x-app-id': APP_ID,
          'x-app-key': APP_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
    } catch (err) {
      console.error('[nutritionApi] network error', err);
      const e = new Error('Network error. Check your connection and try again.');
      e.code = 'NETWORK';
      throw e;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[nutritionApi] search ${res.status}`, text);
      if (res.status === 401 || res.status === 403) {
        const e = new Error('Nutrition API key was rejected. Please check your VITE_NUTRITIONIX_APP_ID / APP_KEY.');
        e.code = 'AUTH';
        throw e;
      }
      const e = new Error('Nutrition lookup failed. Please try again.');
      e.code = 'API';
      throw e;
    }
    const data = await res.json();
    const common = (data.common || []).slice(0, 8).map((c) => ({
      name: capitalize(c.food_name),
      servingSize: `${c.serving_qty || 1} ${c.serving_unit || 'serving'}`,
      photo: c.photo?.thumb,
      nutritionixQuery: c.food_name,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      source: 'nutritionix',
    }));
    const branded = (data.branded || []).slice(0, 5).map((b) => ({
      name: `${b.brand_name} — ${b.food_name}`,
      servingSize: `${b.serving_qty || 1} ${b.serving_unit || 'serving'}`,
      photo: b.photo?.thumb,
      nutritionixQuery: b.food_name,
      calories: Math.round(b.nf_calories || 0),
      protein: round1(b.nf_protein),
      carbs: round1(b.nf_total_carbohydrate),
      fat: round1(b.nf_total_fat),
      source: 'nutritionix',
    }));
    return [...common, ...branded];
  }

  return searchLocal(query);
}

// Resolve full macros for a search result. Returns null if nothing can be
// resolved (caller treats this as "not found" — never fakes values).
export async function getFoodDetails(item) {
  if (!item) return null;

  // Common foods need a /natural/nutrients call to fill macros.
  if (isNutritionApiConfigured && item.nutritionixQuery && (item.calories === null || item.calories === undefined)) {
    let res;
    try {
      res = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        method: 'POST',
        headers: {
          'x-app-id': APP_ID,
          'x-app-key': APP_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: item.nutritionixQuery }),
      });
    } catch (err) {
      console.error('[nutritionApi] details network error', err);
      const e = new Error('Network error fetching nutrition details.');
      e.code = 'NETWORK';
      throw e;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[nutritionApi] details ${res.status}`, text);
      const e = new Error('Could not fetch nutrition details. Please try again.');
      e.code = 'API';
      throw e;
    }
    const data = await res.json();
    const f = (data.foods || [])[0];
    if (!f) return null;
    return {
      name: capitalize(f.food_name),
      servingSize: `${f.serving_qty} ${f.serving_unit} (${Math.round(f.serving_weight_grams || 0)}g)`,
      calories: Math.round(f.nf_calories || 0),
      protein: round1(f.nf_protein),
      carbs: round1(f.nf_total_carbohydrate),
      fat: round1(f.nf_total_fat),
      transFat: round1(f.nf_trans_fatty_acid) || 0,
      sugar: round1(f.nf_sugars),
      sodium: Math.round(f.nf_sodium || 0),
      photo: f.photo?.thumb,
      source: 'nutritionix',
    };
  }

  // Already-resolved local / branded result. Only return if we actually have
  // calorie data — never invent values.
  if (typeof item.calories === 'number') {
    return {
      name: item.name,
      servingSize: item.servingSize || '1 serving',
      calories: item.calories,
      protein: item.protein ?? 0,
      carbs: item.carbs ?? 0,
      fat: item.fat ?? 0,
      transFat: item.transFat ?? 0,
      sugar: item.sugar ?? 0,
      sodium: item.sodium ?? 0,
      photo: item.photo,
      source: item.source || 'local',
    };
  }

  return null;
}

// Convenience wrapper — used by PhotoScan after the user types/picks the food
// name from the photo. Returns full macros for the first reasonable result,
// or null if nothing matches.
export async function lookupFoodByName(name) {
  const n = (name || '').trim();
  if (!n) return null;
  const results = await searchFoods(n);
  if (!results.length) return null;
  // Prefer a generic (common / local) result so "salmon" beats "Brand X
  // salmon burger" with confusing macros.
  const generic = results.find((r) => r.nutritionixQuery && (r.calories === null || r.calories === undefined))
    || results.find((r) => r.source === 'local' || r.source === 'korean')
    || results[0];
  return getFoodDetails(generic);
}

export const QUICK_QUERIES = [
  'Bibimbap',
  'Kimchi Jjigae',
  'Bulgogi',
  'Korean Fried Chicken',
  'Grilled Chicken',
  'Salmon',
  'Greek Yogurt',
  'Oatmeal',
];

export default {
  isNutritionApiConfigured,
  searchFoods,
  getFoodDetails,
  lookupFoodByName,
  QUICK_QUERIES,
};
