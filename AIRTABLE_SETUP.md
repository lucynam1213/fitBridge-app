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
- `[nutrition-api] provider selected: Nutritionix` if Nutritionix keys are set, OR
- `[nutrition-api] provider selected: LOCAL only — set VITE_NUTRITIONIX_APP_ID …`

And on each search:
- `[nutrition-api] search query { query: '…', provider: 'nutritionix' }`
- `[nutrition-api] response count { common: N, branded: M }`

## 7. Nutrition API (Nutritionix) — branded + restaurant + common food search

The food search **only returns generic foods** without a Nutritionix key.
Branded and restaurant items (McDonald's Big Mac, In-N-Out cheeseburger,
Starbucks latte, Chipotle bowl, Costco chicken bake, Trader Joe's salads,
Chobani yogurt, etc.) come exclusively from Nutritionix, so the key is
required for any of those queries to work.

1. Sign up at https://developer.nutritionix.com/ (free dev tier).
2. From the dashboard, copy the **Application ID** and **Application Key**.
3. Paste into `.env.local` (and into Netlify → Site settings → Environment variables for production):

```
VITE_NUTRITIONIX_APP_ID=...
VITE_NUTRITIONIX_APP_KEY=...
```

4. Restart `npm run dev` (Vite reads env at boot only).

### What the app does with the key

- `searchFoods(query)` calls `/v2/search/instant` and merges the
  `common` + `branded` lists. Branded results show as
  `"<Brand> — <Item>"` (e.g. "Mcdonald's — Big Mac").
- Picking a common result triggers `/v2/natural/nutrients` for full
  macros incl. trans fat, sugar, sodium, serving weight in grams.
- Picking a branded result triggers `/v2/search/item?nix_item_id=…`
  which is the authoritative single-record endpoint.
- All three return the standard FitBridge nutrition shape that gets
  saved to Airtable's `Meals` table (calories, protein, carbs, fat,
  transFat, sugar, sodium, servingSize, etc.).

### Image recognition (photo scan)

Nutritionix doesn't ship vision. Free vision APIs that handle plated
food well (Clarifai Food, LogMeal, Foodvisor) are paid-tier. So the
photo flow uses the **confirm-food-name MVP pattern**:

1. User takes/uploads a meal photo.
2. App shows preview and offers a few candidate dish names.
3. User taps a candidate or types the dish name themselves.
4. The chosen name is resolved against Nutritionix for real macros.
5. User confirms and saves to Airtable.

This is honest about what we know (we have the photo for the trainer to
review later, but we don't pretend to have auto-identified the dish).
