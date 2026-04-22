# Pitfalls: Native Android + Watering Calendar

**Researched:** 2026-04-22
**Confidence:** HIGH (Capacitor), MEDIUM (calendar/onboarding)

## Critical Pitfalls

### 1. Base64 images crash Capacitor WebView on Android
**Problem:** `plant_searches` stores full base64 images. Android WebView has ~150MB RAM limit. History with 10+ plants → OOM → crash.
**Fix:** Migrate images to Supabase Storage before Capacitor ships. Store only public URL.
**Phase:** Before/during Capacitor phase.

### 2. Service worker conflicts with Capacitor native bridge
**Problem:** `vite-plugin-pwa` SW intercepts `capacitor://localhost` requests. Breaks camera and native plugins silently.
**Fix:** Disable SW in Capacitor build (`VITE_CAPACITOR=true`). Two build targets: `build` (PWA) and `build:android`.
**Phase:** Capacitor phase — first thing.

### 3. Play Store permission rationale missing
**Problem:** Camera permission without rationale string → Play Store rejection or users deny with no recovery.
**Fix:** Add rationale to `strings.xml`. Pre-check screen. Handle denial with settings deep-link.
**Phase:** Capacitor phase — before submission.

### 4. AI watering interval assumed globally correct
**Problem:** "Regar cada 7 días" ignores season/climate/pot. Users stop trusting within 2 weeks.
**Fix:** Treat as editable suggestion. "Regué hoy" resets from today, not scheduled date. Log `watered_at` timestamps.
**Phase:** Calendar — design before DB schema.

### 5. Schema on plant_searches instead of separate table
**Problem:** Adding watering to search history breaks with duplicate plants, aggregation, renaming.
**Fix:** Separate `user_plants` table. Keep `plant_searches` read-only.
**Phase:** Calendar — before any migration.

### 6. Onboarding blocks core value
**Problem:** Mandatory carousel + signup wall before camera. Users abandon before seeing value.
**Fix:** First screen = camera. Signup deferred to after first ID. Existing anonymous flow IS the onboarding.
**Phase:** Onboarding — resolve before wireframes.

## Moderate Pitfalls

### 7. Vite `base` path breaks Capacitor
**Fix:** `base: './'` in Capacitor build config.

### 8. Supabase Auth session isolated in WebView
**Fix:** Communicate "inicia sesión" on first launch. Pre-fill email hint.

### 9. Timezone off-by-one in "Hoy toca regar"
**Fix:** Compare dates on client with `date-fns startOfDay()`, not on Supabase UTC server.

### 10. AI interval format unpredictable
**Fix:** Add `watering_interval_days: number` to prompt schema. Don't parse free text.

### 11. Onboarding state lost on reinstall
**Fix:** Derive from account `created_at`. Use `@capacitor/preferences` for anonymous users.

### 12. Camera permission at launch → permanent denial
**Fix:** Request on user gesture only (tap camera button). Gallery fallback if denied.

## Phase Warnings Summary

| Phase | Top Risk | Mitigation |
|-------|----------|------------|
| Capacitor | Base64 OOM + SW conflict | Migrate images, disable SW |
| Calendar | Wrong schema + unparseable intervals | `user_plants` table + structured prompt field |
| Prompts | Coupled with calendar | Coordinate: prompt changes before calendar |
| Onboarding | Blocking core value | Camera first, signup after first ID |

---
*Pitfalls audit: 2026-04-22*
