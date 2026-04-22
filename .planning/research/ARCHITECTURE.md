# Architecture Research: Native Android + Watering Calendar

**Researched:** 2026-04-22
**Confidence:** HIGH (based on codebase analysis)

## 1. How Capacitor Integrates with Existing Vite App

Integration is entirely at the build/tooling layer — minimal React code changes.

**Source code changes:**
- Add `base: "./"` in `vite.config.ts` for Capacitor builds (loads via `file://`)
- Conditionally disable service worker when `Capacitor.isNativePlatform()`

**Generated files:**
- `capacitor.config.ts` → points to `webDir: "dist"`
- `android/` directory → Android Studio project

**Camera and geolocation already work via HTML APIs — no Capacitor plugins needed for existing features.**

## 2. Watering Schedule Data Structure (Supabase)

New `user_plants` table — separate from `plant_searches` (read-only history):

```sql
CREATE TABLE user_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  plant_search_id UUID REFERENCES plant_searches(id),
  nickname TEXT,
  watering_interval_days INTEGER,       -- AI-suggested, user-editable
  last_watered_at DATE,
  next_watering_date DATE,              -- computed: last_watered + interval
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for daily "Hoy toca regar" query
CREATE INDEX idx_user_plants_watering
  ON user_plants(user_id, next_watering_date);
```

**Key decisions:**
- `watering_interval_days` as integer (not cron) — simple, user-understandable
- `next_watering_date` stored as `date` (not computed at query time) — enables simple `WHERE next_watering_date <= CURRENT_DATE`
- `last_watered_at` as `date` (not timestamp) — time-of-day irrelevant
- Authenticated-only — anonymous users cannot use calendar (localStorage too fragile)

**Daily query:**
```sql
SELECT * FROM user_plants
WHERE user_id = $1 AND next_watering_date <= CURRENT_DATE
ORDER BY next_watering_date ASC;
```

## 3. New Components Architecture

```
src/
├── hooks/
│   └── useUserPlants.ts          # CRUD for user_plants table
├── pages/
│   └── WateringCalendar.tsx      # "Hoy toca regar" page
├── components/
│   ├── WateringTodaySection.tsx   # List of plants due today
│   ├── PlantCard.tsx             # Card in watering list
│   ├── AddToCalendarButton.tsx   # CTA on PlantResultView
│   └── AddToCalendarModal.tsx    # Set nickname + confirm frequency
└── lib/
    └── parse-watering-frequency.ts  # Pure function: care text → integer days
```

## 4. Data Flow

```
Identification → PlantResultView
  ↓ User taps "Añadir a mi jardín"
AddToCalendarModal
  ↓ Saves to user_plants (nickname, frequency, photo)
user_plants table
  ↓ Queried by useUserPlants hook
WateringCalendar page
  ↓ "Regué hoy" → updates last_watered_at + next_watering_date
user_plants table (updated)
```

## 5. Build Order (dependency chain)

```
Supabase migration → TypeScript types → useUserPlants hook
  → AddToCalendarModal → PlantResultView integration
  → WateringCalendar page → WateringTodaySection + PlantCard
```

## 6. Roadmap Implications

| Phase | Nature | React Code Changes |
|-------|--------|-------------------|
| Capacitor | Infrastructure only | `vite.config.ts` + service worker conditional |
| Watering Calendar | Full-stack feature | New table, hook, pages, components |
| Prompt Optimization | Backend only | Edge function prompt changes |
| Onboarding | Frontend only | New components, no data layer |

---
*Architecture research: 2026-04-22*
