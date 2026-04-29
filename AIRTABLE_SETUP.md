# Airtable setup checklist

> **If Airtable was working before and isn't now**: it's almost certainly the
> token. Open the dev console — you'll see `[airtable] GET /Meals ... 401
> Invalid authentication token`. Re-issue a Personal Access Token, paste it
> into `.env.local`, and restart `npm run dev`. (Vite only reads env at boot.)

## 1. Create / find the base
- https://airtable.com → "Add a base" → "Start from scratch" if you don't have one.

## 2. Issue a fresh Personal Access Token
- https://airtable.com/create/tokens → **Create new token**
- Scopes: `data.records:read` + `data.records:write`
- Access: select the base
- Copy the `pat...` token — paste into `.env.local` as `VITE_AIRTABLE_API_KEY`

## 3. Find the base id
- https://airtable.com/api → click your base → URL contains `app...`
- Paste into `.env.local` as `VITE_AIRTABLE_BASE_ID`

## 4. `.env.local` (in `fitbridge-app/`)
```
VITE_AIRTABLE_API_KEY=pat...
VITE_AIRTABLE_BASE_ID=app...
VITE_NUTRITIONIX_APP_ID=...      # optional
VITE_NUTRITIONIX_APP_KEY=...     # optional
```
**Restart `npm run dev` after editing.** Vite only reads env at boot.

## 5. Tables and fields

Eight tables. Field names are case-sensitive. The service sends `typecast: true`,
so single-select option labels are added on the fly when missing.

### Users (REQUIRED — drives auth and trainer-side client lookups)
The app calls `ensureUserRecord(user)` on every login/signup so the Users
table is the source of truth for "who exists". Without this table, real
signed-up accounts can't be re-authenticated from a fresh device.

**MVP auth caveat:** the `password` field is currently *not* persisted to
this table — real signups stay logged in via `localStorage`, but a new
device cannot log them back in until you add a `password` column and wire
it through `ensureUserRecord`. Demo seed accounts (Alex, Coach Mike) work
either way because their credentials are hard-coded in `mockData.js`.

| Field | Type |
|---|---|
| userId | Single line text |
| name | Single line text |
| email | Single line text |
| role | Single select: client, trainer |
| avatar | Single line text |
| goal | Long text (optional) |
| bio | Long text (optional) |
| streak | Number (optional) |
| totalWorkouts | Number (optional) |
| createdAt | Date with time |
| updatedAt | Date with time |

### Meals
| Field | Type |
|---|---|
| userId | Single line text |
| date | Date (ISO) |
| type | Single select: Breakfast, Lunch, Dinner, Snacks |
| foodName | Single line text |
| calories | Number |
| protein | Number |
| carbs | Number |
| fat | Number |
| transFat | Number |
| sugar | Number |
| sodium | Number |
| servingSize | Single line text |
| items | Long text |
| source | Single select: search, photo_scan, manual_edit |
| visibleToTrainer | Checkbox |
| loggedAt | Date with time |

### MealScans
| Field | Type |
|---|---|
| userId | Single line text |
| label | Single line text |
| items | Long text |
| calories | Number |
| protein | Number |
| carbs | Number |
| fat | Number |
| transFat | Number |
| confidence | Number (0–1) |
| mealType | Single select: Breakfast, Lunch, Dinner, Snacks |
| fileName | Single line text |
| analyzedAt | Date with time |
| visibleToTrainer | Checkbox |

### BodyMetrics
| Field | Type |
|---|---|
| userId | Single line text |
| date | Date |
| weight | Number |
| bodyFat | Number |
| bmi | Number |

### WorkoutLogs
| Field | Type |
|---|---|
| userId | Single line text |
| trainerId | Single line text |
| workoutId | Single line text |
| title | Single line text |
| date | Date |
| locationType | Single select: gym, home |
| source | Single select: trainer_logged, self_logged, video_completed |
| exercises | Long text (JSON) |
| duration | Number |
| calories | Number |
| status | Single select: completed, skipped |
| notes | Long text |
| visibleToClient | Checkbox |
| loggedAt | Date with time |

### TrainerClientLink
| Field | Type |
|---|---|
| trainerId | Single line text |
| userId | Single line text |
| linkedAt | Date with time |
| status | Single select: active, paused |

### TrainerNotes
| Field | Type |
|---|---|
| trainerId | Single line text |
| userId | Single line text |
| relatedType | Single select: meal_scan, workout, general |
| relatedRecordId | Single line text |
| note | Long text |
| createdAt | Date with time |

### Messages (NEW — required for trainer ↔ client chat)
One row = one chat message. The app builds `threadId` deterministically as
`<clientId>__<trainerId>` so both sides query the same conversation regardless
of who wrote first.

| Field | Type |
|---|---|
| threadId | Single line text |
| clientId | Single line text |
| trainerId | Single line text |
| senderId | Single line text |
| receiverId | Single line text |
| senderRole | Single select: client, trainer |
| receiverRole | Single select: client, trainer |
| message | Long text |
| createdAt | Date with time (ISO) |
| readAt | Date with time (ISO) — optional, set when the recipient opens the message |

## 6. Smoke test
Open the dev console:
- ✅ `[airtable] connected to base appXXX` → working
- ❌ `[airtable] running in LOCAL mode` → env vars missing
- ❌ `[airtable] GET /Meals ... 401 Invalid authentication token` → bad token
- ❌ `[airtable] POST /Meals -> 422 ...` → field/table name typo (Airtable is case-sensitive); `typecast: true` handles option labels but not unknown fields

You should also see, on first load:
- `[nutrition-api] provider selected: USDA FoodData Central (primary)` if a USDA key is set, OR
- `[nutrition-api] secondary provider: Nutritionix (branded fallback)` if a Nutritionix key is *also* set, OR
- `[nutrition-api] provider selected: LOCAL only — set VITE_USDA_API_KEY …` when neither is set.

And on each search:
- `[nutrition-api] USDA search query { query: '…' }`
- `[nutrition-api] USDA result count { count: N }`
- `[nutrition-api] USDA selected food { … }` (when the user picks a result)

## 7. Nutrition API — USDA FoodData Central (primary) + Nutritionix (fallback)

Without a nutrition API key, search **only returns generic foods from a
small built-in catalog**. Real food coverage requires a key.

### Provider priority

1. **USDA FoodData Central** (primary, free). Excellent for whole foods
   (banana, egg, chicken, rice, sweet potato), Korean / international
   foods via the FNDDS dataset (kimchi, ramen, bibimbap-ish entries),
   and a large branded grocery catalog. Covers ~99% of test queries.
2. **Nutritionix** (optional fallback, free dev tier). Used only when
   USDA returns 0 hits — primarily helpful for branded restaurant items
   like "In-N-Out", "Chipotle bowl", "Starbucks Frappuccino".
3. **Built-in local catalog** (final fallback). Tiny, ships with the app.

### USDA setup (recommended)

1. Sign up at https://fdc.nal.usda.gov/api-key-signup.html (free).
2. Copy the API key.
3. Paste into `.env.local` (and into Netlify → Site settings → Environment variables for production):

```
VITE_USDA_API_KEY=...
```

4. Restart `npm run dev` (Vite reads env at boot only).

### Optional: Nutritionix fallback for restaurant chains

USDA's restaurant coverage is solid but not perfect — chains like
In-N-Out and Chipotle bowls are spotty. For full restaurant coverage,
add Nutritionix on top:

1. Sign up at https://developer.nutritionix.com/.
2. Copy the **Application ID** and **Application Key**.
3. Add to env:

```
VITE_NUTRITIONIX_APP_ID=...
VITE_NUTRITIONIX_APP_KEY=...
```

When both are set, USDA is queried first; only when USDA returns zero
results does the app fall through to Nutritionix.

### What the app does

- `searchFoods(query)` hits `/fdc/v1/foods/search` with
  `dataType=Foundation,SR Legacy,Survey (FNDDS),Branded`. Whole-food
  records are sorted ahead of branded ones so "banana" picks "Banana,
  raw" rather than a branded banana chip.
- Per-100g nutrients (Foundation / SR Legacy / Survey) are scaled to the
  USDA-supplied serving weight. Branded foods use `labelNutrients` directly.
- Mapping to FitBridge fields: `foodName`, `calories`, `protein`,
  `carbs`, `fat`, `transFat` (when available), `sugar`, `sodium`,
  `servingSize`, `source: "usda"`, `apiProvider: "USDA FoodData Central"`.
- Saves go through the existing Airtable `Meals` writer — no schema
  changes needed.

### Image recognition (photo scan)

USDA and Nutritionix both ship without vision models. Free vision APIs
that handle plated food (Clarifai Food, LogMeal, Foodvisor) are paid
tier. So the photo flow uses the **confirm-food-name MVP pattern**:

1. User takes/uploads a meal photo.
2. App shows preview and offers a few candidate dish names.
3. User taps a candidate or types the dish name themselves.
4. The chosen name is resolved against USDA (then Nutritionix, then
   local) for real macros via `lookupFoodByName(name)`.
5. User confirms and saves to Airtable.

This keeps the photo around for trainer review without pretending we
auto-identified the dish.
