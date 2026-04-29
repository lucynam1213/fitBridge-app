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

Seven tables. Field names are case-sensitive. The service sends `typecast: true`,
so single-select option labels are added on the fly when missing.

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
