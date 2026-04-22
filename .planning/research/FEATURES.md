# Feature Landscape: Plant Care App with Watering Calendar

**Researched:** 2026-04-22
**Confidence:** MEDIUM (based on competitor analysis from training data)

## Table Stakes (must-have)

| Feature | Why Expected | Complexity |
|---------|-------------|------------|
| Plant collection ("Mis plantas") | Users track owned plants, not just search history | Med |
| "Añadir a mi jardín" CTA | Bridges identification → collection. Without it, no retention loop | Low |
| Per-plant watering frequency | User sets/adjusts how often to water. Auto-populated from AI | Low-Med |
| Daily list ("Hoy toca regar") | Daily retention hook. Core reason to reopen the app | Med |
| Mark as watered (one-tap) | Resets countdown. Without it the calendar is read-only and useless | Low |
| Last watered date visible | Removes anxiety ("¿cuándo regué la última vez?") | Low |
| Plant nickname | "Mi Monstera del salón" — personal ownership | Low |

## Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| AI-extracted watering frequency (auto) | Competitors require manual input. This app already has the data | Low |
| Watering history log | Shows last 5 events. Users feel they're doing well | Med |
| Seasonal hint | "En verano riégala más" — contextual, rule-based | Low |
| Offline watering calendar | Mark as watered without connectivity | Med |
| Google Play distribution | Organic discoverability — PWA has no app store channel | High |

## Anti-Features (do NOT build)

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Push notifications | FCM setup complexity, high permission rejection rate. Ship daily list first |
| Social features | Doubles scope, requires moderation. These are private gardeners |
| Gamification (streaks, badges) | Fun to design, expensive to balance. Defer |
| Weather integration | Weather API cost, location permissions complexity |
| Complex per-plant notifications | Over-engineering before validating basic loop |
| Multiple rooms/locations | Niche power-user value |

## Onboarding Patterns (from competitor analysis)

**What works:**
1. **Scan-first, ask second** — Show camera immediately. This app already does this correctly
2. **3-screen swipeable intro (skip-able):**
   - "Saca una foto a cualquier planta"
   - "Te decimos qué es y cómo cuidarla"
   - "Añádela a tu jardín y nunca olvides regarla"
3. **Deferred permissions** — Camera permission on first tap, not during onboarding
4. **Contextual first-time hints** — Post-identification tooltip: "¿La tienes en casa? Añádela a tu jardín"

**What does NOT work:**
- Email wall before showing value
- Long permission screens
- Mandatory tutorials blocking the main action

## Feature Dependencies

```
Plant entity (Mis Plantas)
  └── Add to jardín CTA (PlantResultView)
  └── Watering frequency (stored on plant entity)
        └── Daily watering list
              └── Mark as watered
                    └── Watering history log (defer)

Onboarding → independent, but should introduce "add to jardín" CTA

Android native (Capacitor) → independent infrastructure
```

## Biggest Differentiator

AI already extracts watering frequency — auto-populating it requires no new AI call, just parsing the existing `care` field. Every competitor makes users enter this manually.

---
*Features research: 2026-04-22*
