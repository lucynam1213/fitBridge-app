// Nutrition API service.
//
// Provider priority (configurable via env):
//   1. USDA FoodData Central — primary. Free, broad coverage of common
//      foods (banana, egg, chicken, rice, sweet potato), Korean/international
//      via the FNDDS dataset (kimchi, ramen, bibimbap-ish entries), and
//      branded grocery items.
//      https://fdc.nal.usda.gov/api-guide.html
//   2. Nutritionix — fallback when USDA returns 0 hits. Strong on branded
//      restaurant foods (McDonald's, In-N-Out, Starbucks, Chipotle).
//      https://developer.nutritionix.com/
//   3. Built-in local catalog — final fallback so the app stays usable
//      even with no API keys.
//
// IMPORTANT: we do NOT synthesize random macros for unknown queries. If
// nothing matches, searchFoods() returns []. The UI surfaces that as a
// clear "no matches" state rather than letting the user save fake data.
//
// Errors from the network or API auth bubble up to the caller as Error
// objects so the UI can render real error/retry copy.

import { FOODS } from '../data/foods';

// ---- Provider config ------------------------------------------------------
const USDA_KEY = import.meta.env.VITE_USDA_API_KEY || '';
const NUTRITIONIX_APP_ID = import.meta.env.VITE_NUTRITIONIX_APP_ID || '';
const NUTRITIONIX_APP_KEY = import.meta.env.VITE_NUTRITIONIX_APP_KEY || '';

export const isUsdaConfigured = Boolean(USDA_KEY);
export const isNutritionixConfigured = Boolean(NUTRITIONIX_APP_ID && NUTRITIONIX_APP_KEY);

// Backwards-compat: existing UI checks isNutritionApiConfigured to decide
// whether to show the "configure an API key" warning banner.
export const isNutritionApiConfigured = isUsdaConfigured || isNutritionixConfigured;

// One-time provider banner so the dev console shows which data source is
// in use on each load.
if (typeof window !== 'undefined' && !window.__fb_nutrition_banner) {
  window.__fb_nutrition_banner = true;
  if (isUsdaConfigured) {
    console.info('[nutrition-api] provider selected: USDA FoodData Central (primary)');
    if (isNutritionixConfigured) {
      console.info('[nutrition-api] secondary provider: Nutritionix (branded fallback)');
    }
  } else if (isNutritionixConfigured) {
    console.info('[nutrition-api] provider selected: Nutritionix (no USDA key — branded restaurant data only)');
  } else {
    console.warn(
      '[nutrition-api] provider selected: LOCAL only — set VITE_USDA_API_KEY in .env.local ' +
      '(get a free key at https://fdc.nal.usda.gov/api-key-signup.html). See AIRTABLE_SETUP.md.'
    );
  }
}

// ---- Korean + popular international foods (offline final fallback) --------
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
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 0;
  return Math.round(Number(n) * 10) / 10;
}

function capitalize(s) {
  if (!s) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- USDA FoodData Central (primary) --------------------------------------
//
// USDA "search" returns either Foundation/SR Legacy (per-100g nutrient values)
// or Branded (per-serving labelNutrients). The mapping below normalizes both
// shapes into FitBridge's nutrition record.

const USDA_NUTRIENT_IDS = {
  energy: 1008,    // Energy (kcal)
  protein: 1003,   // Protein (g)
  carbs: 1005,     // Carbohydrate, by difference (g)
  fat: 1004,       // Total lipid (fat) (g)
  transFat: 1257,  // Fatty acids, total trans (g)
  sugar: 2000,     // Sugars, total including NLEA (g)
  sugarAlt: 1063,  // Sugars, total (older) (g)
  sodium: 1093,    // Sodium, Na (mg)
};

function findUsdaNutrient(nutrients, id) {
  const n = (nutrients || []).find((x) => x.nutrientId === id);
  if (!n) return 0;
  return Number(n.value) || 0;
}

function extractUsdaMacros(food) {
  // Branded foods: labelNutrients has per-serving values directly.
  if (food.dataType === 'Branded' && food.labelNutrients) {
    const ln = food.labelNutrients;
    return {
      calories: Math.round(ln.calories?.value || 0),
      protein: round1(ln.protein?.value),
      carbs: round1(ln.carbohydrates?.value),
      fat: round1(ln.fat?.value),
      transFat: round1(ln.transFat?.value),
      sugar: round1(ln.sugars?.value),
      sodium: Math.round(ln.sodium?.value || 0),
    };
  }

  // Foundation / SR Legacy / Survey (FNDDS): foodNutrients are per 100g.
  // Scale to the natural serving size when USDA gives us one in grams.
  const nutrients = food.foodNutrients || [];
  const per100g = {
    calories: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.energy),
    protein: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.protein),
    carbs: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.carbs),
    fat: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.fat),
    transFat: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.transFat),
    sugar: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.sugar)
        || findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.sugarAlt),
    sodium: findUsdaNutrient(nutrients, USDA_NUTRIENT_IDS.sodium),
  };

  const unit = (food.servingSizeUnit || '').toLowerCase();
  const servingGrams = (unit === 'g' || unit === 'grm') ? Number(food.servingSize) : null;
  const scale = servingGrams && servingGrams > 0 ? servingGrams / 100 : 1;

  return {
    calories: Math.round(per100g.calories * scale),
    protein: round1(per100g.protein * scale),
    carbs: round1(per100g.carbs * scale),
    fat: round1(per100g.fat * scale),
    transFat: round1(per100g.transFat * scale),
    sugar: round1(per100g.sugar * scale),
    sodium: Math.round(per100g.sodium * scale),
  };
}

function formatUsdaServing(food) {
  if (food.householdServingFullText) {
    if (food.servingSize && food.servingSizeUnit) {
      return `${food.householdServingFullText} (${food.servingSize}${food.servingSizeUnit})`;
    }
    return food.householdServingFullText;
  }
  if (food.servingSize) {
    return `${food.servingSize} ${food.servingSizeUnit || 'g'}`;
  }
  return '100 g';
}

function cleanUsdaName(food) {
  let desc = food.description || '';
  // Many USDA descriptions are SHOUTY ("BANANA, RAW") — title-case for UI.
  desc = capitalize(desc.toLowerCase());
  if (food.dataType === 'Branded' && food.brandOwner && !desc.toLowerCase().includes(food.brandOwner.toLowerCase())) {
    return `${capitalize(food.brandOwner.toLowerCase())} — ${desc}`;
  }
  return desc;
}

function usdaFoodToResult(food) {
  const macros = extractUsdaMacros(food);
  return {
    fdcId: food.fdcId,
    name: cleanUsdaName(food),
    brandName: food.brandOwner || food.brandName || null,
    servingSize: formatUsdaServing(food),
    photo: null, // USDA doesn't return product photos
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    transFat: macros.transFat,
    sugar: macros.sugar,
    sodium: macros.sodium,
    dataType: food.dataType, // Foundation | SR Legacy | Survey (FNDDS) | Branded
    source: 'usda',
    apiProvider: 'USDA FoodData Central',
  };
}

// USDA returns results in relevance order, but Foundation/SR Legacy entries
// have richer macros than Branded knock-offs — sort whole-food sources first
// so "banana" resolves to "Banana, raw" before some branded banana chips.
const USDA_DATATYPE_PRIORITY = {
  'Foundation': 0,
  'SR Legacy': 1,
  'Survey (FNDDS)': 2,
  'Branded': 3,
};

function sortUsdaResults(results) {
  return [...results].sort((a, b) => {
    const pa = USDA_DATATYPE_PRIORITY[a.dataType] ?? 9;
    const pb = USDA_DATATYPE_PRIORITY[b.dataType] ?? 9;
    return pa - pb;
  });
}

async function searchUsda(query) {
  console.info('[nutrition-api] USDA search query', { query });
  // We deliberately don't pass a `dataType` filter here — the multi-value
  // form (`Foundation,SR Legacy,Survey (FNDDS),Branded`) gets URL-encoded
  // with `+` for spaces, and USDA returns 400 on some queries when that
  // parameter is present. Skipping the filter returns the same superset
  // of records and our client-side priority sort handles ordering.
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', '20');
  url.searchParams.set('api_key', USDA_KEY);

  let res;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    console.error('[nutrition-api] USDA network error', err);
    const e = new Error('Network error. Check your connection and try again.');
    e.code = 'NETWORK';
    throw e;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[nutrition-api] USDA search ${res.status}`, text);
    if (res.status === 401 || res.status === 403) {
      const e = new Error('USDA API key was rejected. Check VITE_USDA_API_KEY.');
      e.code = 'AUTH';
      throw e;
    }
    if (res.status === 429) {
      const e = new Error('USDA API rate limit exceeded. Try again in a few minutes.');
      e.code = 'RATE_LIMIT';
      throw e;
    }
    const e = new Error('USDA nutrition lookup failed. Please try again.');
    e.code = 'API';
    throw e;
  }
  const data = await res.json();
  const foods = data.foods || [];
  console.info('[nutrition-api] USDA result count', { query, count: foods.length });
  const mapped = foods.map(usdaFoodToResult).filter((r) => r.calories > 0);
  return sortUsdaResults(mapped);
}

// /food/{fdcId} returns a fuller record — used only when search-stage data
// is sparse. For most queries `searchUsda` already includes everything we
// need so this is rarely invoked.
async function fetchUsdaDetail(fdcId) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(fdcId)}?api_key=${encodeURIComponent(USDA_KEY)}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error('[nutrition-api] USDA detail network error', err);
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[nutrition-api] USDA detail ${res.status}`, text);
    return null;
  }
  const food = await res.json();
  return usdaFoodToResult(food);
}

// ---- Nutritionix (fallback) -----------------------------------------------
async function searchNutritionix(query) {
  let res;
  try {
    res = await fetch('https://trackapi.nutritionix.com/v2/search/instant', {
      method: 'POST',
      headers: {
        'x-app-id': NUTRITIONIX_APP_ID,
        'x-app-key': NUTRITIONIX_APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
  } catch (err) {
    console.error('[nutrition-api] Nutritionix network error', err);
    return [];
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[nutrition-api] Nutritionix search ${res.status}`, text);
    return [];
  }
  const data = await res.json();
  const common = (data.common || []).slice(0, 5).map((c) => ({
    name: capitalize(c.food_name),
    servingSize: `${c.serving_qty || 1} ${c.serving_unit || 'serving'}`,
    photo: c.photo?.thumb,
    nutritionixQuery: c.food_name,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    source: 'nutritionix',
    apiProvider: 'Nutritionix',
  }));
  const branded = (data.branded || []).slice(0, 8).map((b) => ({
    name: `${b.brand_name} — ${b.food_name}`,
    brandName: b.brand_name,
    servingSize: `${b.serving_qty || 1} ${b.serving_unit || 'serving'}`,
    photo: b.photo?.thumb,
    nutritionixItemId: b.nix_item_id,
    calories: Math.round(b.nf_calories || 0),
    protein: round1(b.nf_protein),
    carbs: round1(b.nf_total_carbohydrate),
    fat: round1(b.nf_total_fat),
    source: 'nutritionix-branded',
    apiProvider: 'Nutritionix',
  }));
  return [...branded, ...common];
}

async function fetchNutritionixCommonDetail(item) {
  let res;
  try {
    res = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
      method: 'POST',
      headers: {
        'x-app-id': NUTRITIONIX_APP_ID,
        'x-app-key': NUTRITIONIX_APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: item.nutritionixQuery }),
    });
  } catch (err) {
    console.error('[nutrition-api] Nutritionix detail network error', err);
    return null;
  }
  if (!res.ok) return null;
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
    apiProvider: 'Nutritionix',
  };
}

async function fetchNutritionixBrandedDetail(item) {
  let res;
  try {
    res = await fetch(
      `https://trackapi.nutritionix.com/v2/search/item?nix_item_id=${encodeURIComponent(item.nutritionixItemId)}`,
      { headers: { 'x-app-id': NUTRITIONIX_APP_ID, 'x-app-key': NUTRITIONIX_APP_KEY } }
    );
  } catch (err) {
    console.error('[nutrition-api] Nutritionix branded detail network error', err);
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json();
  const f = (data.foods || [])[0];
  if (!f) return null;
  return {
    name: capitalize(f.food_name),
    brandName: f.brand_name,
    servingSize: `${f.serving_qty} ${f.serving_unit} (${Math.round(f.serving_weight_grams || 0)}g)`,
    calories: Math.round(f.nf_calories || 0),
    protein: round1(f.nf_protein),
    carbs: round1(f.nf_total_carbohydrate),
    fat: round1(f.nf_total_fat),
    transFat: round1(f.nf_trans_fatty_acid) || 0,
    sugar: round1(f.nf_sugars),
    sodium: Math.round(f.nf_sodium || 0),
    photo: f.photo?.thumb,
    source: 'nutritionix-branded',
    apiProvider: 'Nutritionix',
  };
}

// ---- Local catalog (final fallback) ---------------------------------------
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
    apiProvider: 'Local catalog',
  };
}

function searchLocal(query) {
  if (!query?.trim()) return [];
  const q = query.toLowerCase();
  const local = FOODS.filter((f) => f.name.toLowerCase().includes(q)).map(fromLocalFood);
  const korean = KOREAN_FOODS
    .filter((f) => f.name.toLowerCase().includes(q))
    .map((f) => ({ ...f, source: 'local-korean', apiProvider: 'Local catalog' }));
  return [...local, ...korean];
}

// ---- Public API -----------------------------------------------------------

// Search foods. Returns [] when nothing matches — the UI surfaces that as
// a clear "no results" empty state. NEVER fabricates macros.
export async function searchFoods(query) {
  if (!query?.trim()) return [];

  // Provider 1: USDA (primary).
  if (isUsdaConfigured) {
    try {
      const results = await searchUsda(query);
      if (results.length > 0) return results;
      // 0 hits → fall through to Nutritionix for branded restaurant items.
    } catch (err) {
      // For auth/rate-limit errors we want the user to see it, not silently
      // fall back. Other errors (transient network) can fall through.
      if (err.code === 'AUTH' || err.code === 'RATE_LIMIT') throw err;
      console.warn('[nutrition-api] USDA threw, trying Nutritionix fallback', err);
    }
  }

  // Provider 2: Nutritionix (fallback).
  if (isNutritionixConfigured) {
    const nx = await searchNutritionix(query);
    if (nx.length > 0) return nx;
  }

  // Provider 3: built-in catalog (final fallback).
  return searchLocal(query);
}

// Resolve full macros for a search result. USDA results already carry full
// macros from search; we only do an extra fetch for Nutritionix common-food
// records that need /natural/nutrients to fill in.
export async function getFoodDetails(item) {
  if (!item) return null;
  console.info('[nutrition-api] USDA selected food', item);

  // USDA: data is already complete from search. Optionally fall back to
  // /food/{fdcId} if we somehow have a USDA hit with no calories.
  if (item.source === 'usda') {
    if (item.calories > 0) {
      return {
        name: item.name,
        brandName: item.brandName,
        servingSize: item.servingSize,
        calories: item.calories,
        protein: item.protein ?? 0,
        carbs: item.carbs ?? 0,
        fat: item.fat ?? 0,
        transFat: item.transFat ?? 0,
        sugar: item.sugar ?? 0,
        sodium: item.sodium ?? 0,
        photo: item.photo,
        source: 'usda',
        apiProvider: 'USDA FoodData Central',
      };
    }
    if (item.fdcId && isUsdaConfigured) {
      const detail = await fetchUsdaDetail(item.fdcId);
      if (detail) return detail;
    }
    return null;
  }

  // Nutritionix branded — single-record lookup by nix_item_id.
  if (item.nutritionixItemId && isNutritionixConfigured) {
    const detail = await fetchNutritionixBrandedDetail(item);
    if (detail) return detail;
  }

  // Nutritionix common — needs /natural/nutrients.
  if (item.nutritionixQuery && isNutritionixConfigured) {
    const detail = await fetchNutritionixCommonDetail(item);
    if (detail) return detail;
  }

  // Local catalog hit (already has macros).
  if (typeof item.calories === 'number') {
    return {
      name: item.name,
      brandName: item.brandName,
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
      apiProvider: item.apiProvider || 'Local catalog',
    };
  }

  return null;
}

// Used by PhotoScan after the user types/picks a dish name. Returns the
// best single match's full macros, or null.
export async function lookupFoodByName(name) {
  const n = (name || '').trim();
  if (!n) return null;
  const results = await searchFoods(n);
  if (!results.length) return null;
  // Pick the most relevant — USDA results are already sorted with whole-foods
  // first, and Nutritionix results are pre-sorted with branded first. We pick
  // the first result that already has calories filled in (avoids picking a
  // Nutritionix common stub that needs a follow-up call).
  const pick = results.find((r) => r.calories) || results[0];
  return getFoodDetails(pick);
}

export const QUICK_QUERIES = [
  'Banana',
  'Egg',
  'Grilled Chicken',
  'Brown Rice',
  'Bibimbap',
  'Kimchi',
  'Salmon',
  'Greek Yogurt',
];

export default {
  isUsdaConfigured,
  isNutritionixConfigured,
  isNutritionApiConfigured,
  searchFoods,
  getFoodDetails,
  lookupFoodByName,
  QUICK_QUERIES,
};
