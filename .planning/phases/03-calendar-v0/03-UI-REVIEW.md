# Phase 3 — UI Review (Calendar v0 / "¿Toca regar?")

**Audited:** 2026-05-22
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md for this phase; CONTEXT.md decisions D-01…D-17 used as informal contract)
**Screenshots:** Captured (dev server at `localhost:8080`, anon session — `/regar` redirects to `/` so card screenshots are code-only)
**Audited scope:** files modified across sub-phases 3-01 → 3-05

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Spanish copy verbatim per D-10/D-13/D-14/D-15/D-16; empathetic tone; error toasts give next-step ("Inténtalo de nuevo"). |
| 2. Visuals | 3/4 | Sticker idiom consistent; clear hierarchy. But `/regar` lacks a focal hero/illustration — list-only feels utilitarian vs. the warm onboarding seen on `/`. |
| 3. Color | 3/4 | Token discipline strong (no hex, no rgb). But the soft-warn pillar (D-15) is **token-only — never visually verifiable in this audit** because no logged-in screenshot was captured; plus `accent` and `destructive` tokens collide (`16 76% 61%`). |
| 4. Typography | 3/4 | Only 6 text sizes + 2 weights in Phase 3 files (within budget). But heading hierarchy is flat: `h1` `text-2xl` and `h2` `text-lg` only — no visual rank between page title and card titles compared to scale. |
| 5. Spacing | 4/4 | Tokenized spacing scale used cleanly; one arbitrary value `py-2.5` and two safe-area arbitraries (justified). Sticker rhythm (`p-4`/`gap-3`) is consistent. |
| 6. Experience Design | 2/4 | Strong state machine (loading + redirect + optimistic + undo + flash + error rollback). BUT a real **BLOCKER**: `CookieConsentBanner` and `BottomTabBar` share `z-50` and both `fixed bottom-0` — banner occludes the bottom nav on the first visit, exactly the moment the new "Regar" tab is meant to be discovered. Loading state is also a bare `<Leaf>` icon with no copy. |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **BLOCKER — Cookie banner occludes BottomTabBar (z-50 collision).** Visible in every captured anon screenshot: the consent banner sits at the bottom with `z-50` while `BottomTabBar` (`src/components/BottomTabBar.tsx:38`) also uses `z-50` and `fixed bottom-0 left-0 right-0`. CSS stacking order with identical z is DOM-order dependent; the banner currently wins and the nav is invisible until consent is dismissed. **User impact:** the Phase 3 "Regar" tab (the central deliverable of this phase) is unreachable on first visit. **Fix:** lower `CookieConsentBanner` to `z-40` AND add `mb-16 pb-safe` so the banner stacks ABOVE the tab bar but does not cover it. Verify on `375×812` viewport with mocked logged-in state.

2. **BLOCKER — `/regar` has no human-readable loading copy.** `src/pages/RegarPage.tsx:106-115` renders a bare animated Leaf icon during the combined auth+plants load. The only signal a screen-reader user gets is `aria-busy="true"` + `aria-label="Cargando tus plantas"`, which is correct for AT users but visual users on a slow mobile connection see a pulsing leaf with no text. **User impact:** perceived stall on first navigation to `/regar` (the funnel-critical tab). **Fix:** add a visible `<p className="font-body text-sm text-muted-foreground mt-3">Cargando tus plantas…</p>` underneath the Leaf, matching the empathetic tone established by the page header.

3. **WARNING — Lack of visual focal point on `/regar`.** Header is `font-display text-2xl` with subheader `text-base text-muted-foreground` — same hierarchy used on Settings and History. After auth + ≥1 home plant, the page is a vertical list of identical-looking sticker cards with no hero element, no progress indicator ("3 plantas, 1 toca regar hoy"), and no illustration. **User impact:** the only signal of urgency is the badge inside each card; users with many plants see a wall of stickers. **Fix:** add a status summary line under the subheader: `{overdue_count + urgent_count} toca regar · {normal_count} al día`. Tone consistent with D-15, derived from the same `computeStatus` already computed for `calendar_opened` tracking (RegarPage.tsx:75-86) — zero new dependencies.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Spanish-first, locked literal strings, consistent tone with CONTEXT.md decisions.

**Evidence — copy contract met verbatim:**
- D-10 button labels: `"Regada"` / `"Regar"` state-dependent (`PlantWateringCard.tsx:115, 121, 127, 134`).
- D-13 picker save toast: `Frecuencia actualizada · Cada N días` (`RegarPage.tsx:165`).
- D-14 pending-first status: `"Pendiente primera vez · Toca regar para empezar"` (`PlantWateringCard.tsx:131`).
- D-15 empathetic copy: `"Toca regar hoy"`, `"Lleva N días esperándote"`, `"Próximo riego en X días"` (`PlantWateringCard.tsx:112, 118, 124`).
- D-16 frequency without attribution: `"Cada N días"` / `"Sin frecuencia"` (`PlantWateringCard.tsx:101`).
- Toast aviso D-04: `"📍 Hemos movido Mis plantas a Ajustes"` (`HistoryRelocationNotice.tsx:28`).

**Evidence — error states have next-step guidance:**
- `"No se pudo guardar el riego. Inténtalo de nuevo."` (`PlantWateringCard.tsx:178`).
- `"No se pudo guardar la frecuencia. Inténtalo de nuevo."` (`RegarPage.tsx:161`).
- `"La frecuencia se guardó, pero no se pudo registrar el riego. Inténtalo de nuevo."` (`RegarPage.tsx:176-178`).
- `"No se pudo deshacer el riego. Refresca para sincronizar."` (`PlantWateringCard.tsx:205-207`).

**Microcopy verification (per 03-05 SUMMARY.md):** grep matrix passed — no `bg-destructive`/`text-destructive` in card (D-15), no `según IA`/`tú decidiste`/`IA dijo`/`inicial IA` strings (D-16). The auditor independently re-ran the grep across the 8 Phase 3 files and confirms zero violations.

**No generic English strings** found in Phase 3 files. The only `Save`/`Cancel` matches were JS identifiers (`onSave`, `handleSaveConfig`) in other files, not user-facing copy.

**No findings against this pillar.** This is the strongest pillar in Phase 3.

---

### Pillar 2: Visuals (3/4)

The sticker visual language (border-2 + box-shadow `var(--shadow-press)` + rounded-2xl) is applied uniformly. Icon-only buttons have aria-labels. Touch targets are correctly sized.

**Strengths:**
- All five tab bar buttons use `aria-label` (`BottomTabBar.tsx:48`) with active state via `aria-current="page"`.
- Card sticker idiom is consistent: `border-2 border-foreground rounded-2xl bg-card` + `boxShadow: "var(--shadow-press)"`.
- Photo `size-16` (64×64) + `rounded-xl border-2` (`PlantWateringCard.tsx:257`).
- `Leaf` icon with `animate-pulse-slow` for loading is consistent with other pages.

**Warnings:**
- **No focal point on `/regar`.** The page is header + vertical list. No hero, no progress summary ("X plantas, Y tocan regar"), no illustration. Compared to `/` which has a clear focal hero (Leaf icon + huge `font-display text-3xl` headline), `/regar` feels utilitarian. The screenshot for anon users can't verify this directly because the route redirects, but the JSX (`RegarPage.tsx:200-224`) is straightforwardly header → `<ul>` of cards.
- **Visual hierarchy between card states relies entirely on the badge.** The card body stays identical for `normal`, `urgent`, `overdue`, and `pending-first`; only the badge color (`bg-soft-warn-bg` vs `bg-muted`) and a one-line status text differ. A user scrolling a list of 10+ cards will not visually scan "what needs attention" — they must read the badge or status line on every card. This is a deliberate tone choice (D-15: no alarmism) but it sacrifices scannability.
- **Badge typography is small.** `text-sm font-bold` (`PlantWateringCard.tsx:281-282`) gives `14px` — readable but not assertive. For the urgency signal of the entire calendar, `text-base` or `text-lg` would be defensible.

**Score 3/4** — visual language is correct, but the screen lacks an organizing hero and inter-card hierarchy depends on a single small badge.

---

### Pillar 3: Color (3/4)

Token discipline is excellent — zero hardcoded hex or `rgb()` calls in any Phase 3 file (grep returned empty). Soft-warn token is correctly wired to Tailwind config and CSS variables.

**Evidence:**
- `--soft-warn: 38 80% 60%` and `--soft-warn-bg: 48 85% 92%` in `src/index.css:33-34`.
- `softWarn` and `softWarnBg` exposed in `tailwind.config.ts:60-61`.
- `PlantWateringCard.tsx` uses `bg-soft-warn-bg` (line 281) and `bg-muted` (line 282) conditionally per status — clean.
- Primary used 4 times across the 4 Phase 3 component files (within reasonable budget — appears on the main CTA button + active tab indicator).

**Warnings:**
- **`--accent` and `--destructive` collide** at the token level. `src/index.css:28` declares `--accent: 16 76% 61%` and the schema shows `--destructive: 16 76% 61%` as well. This means accent surfaces are visually indistinguishable from destructive surfaces. While Phase 3 itself avoids `bg-destructive` (per D-15), the underlying system is fragile — a future contributor using `bg-destructive` for an error state will produce something that looks identical to the accent. **Fix:** shift `--destructive` to a clearly distinct hue (e.g., `0 65% 50%`) and document it as the only legitimate red token.
- **Soft-warn applied but never visually verified.** Both `--soft-warn` and `--soft-warn-bg` exist, and the JSX uses `bg-soft-warn-bg`, but no captured screenshot shows a card in `urgent` or `overdue` state. The chosen yellow `HSL 38 80% 60%` (saturated mustard) needs contrast verification against `--foreground` for the badge text — code reads `border-2 border-foreground` + `text-foreground`, which is a safe combination but should be physically validated once live data exists.
- **Soft-warn-bg conflates two distinct states.** Both `urgent` (X=0) and `overdue` (X<0) render the same yellow badge (`PlantWateringCard.tsx:117-128`). The user cannot visually distinguish "today" from "5 days late" except by reading the negative number. Defensible per D-15 ("no alarmism" — same color for both) but flag-worthy because the only differentiation is `badgeText` (e.g., `0 d` vs `-5 d`) — fragile under scanning.

**Score 3/4** — token discipline is clean, but the underlying palette has a collision and the new yellow is unverified in situ.

---

### Pillar 4: Typography (3/4)

Phase 3 introduces a moderate type ramp: 6 distinct text sizes and 2 weight families used (`font-display` + `font-body` with `font-bold` / `font-semibold` modifiers). Across the whole `src/` tree, the app uses 8 sizes (`text-xs` through `text-4xl`) — over budget per the abstract pillar (>4) but within a normal SaaS range.

**Phase 3 size distribution (5 files):**
- `text-sm` ×5
- `text-xs` ×4
- `text-base` ×4
- `text-2xl` ×2 (page heading + picker numeric input)
- `text-xl` ×1 (picker title)
- `text-lg` ×1 (card name)

**Weight distribution:**
- `font-body` ×9
- `font-display` ×8
- `font-bold` ×6
- `font-semibold` ×5

**Warnings:**
- **Flat heading hierarchy.** `RegarPage.tsx:203` (`h1` `font-display text-2xl font-bold`) and `PlantWateringCard.tsx:260` (`h2` `font-display text-lg font-semibold`) — only ~12px size delta. The h1 should be visually 1.5–2× the card title to anchor the screen. Compare with `/` (root index) where the headline is `text-3xl` per code in other pages — `/regar` underweights its hero.
- **Numeric badge uses the same `text-sm` as the helper text.** `PlantWateringCard.tsx:281-282` — for a UI element whose entire purpose is to communicate countdown urgency, the badge is the same size as the frequency edit affordance below it. Promote badge to `text-base font-display`.
- **Picker numeric input is `text-2xl font-bold` and centered** (`WateringFrequencyPicker.tsx:136`) — excellent affordance, no fix needed. Good example of typography choice supporting interaction.

**Score 3/4** — within budget, no rogue arbitrary sizes (`text-[...]`), but heading hierarchy under-delivers the visual focal point that pillar 2 also flagged.

---

### Pillar 5: Spacing (4/4)

Tokenized scale used consistently across Phase 3. Almost no arbitrary values.

**Distribution:**
- `gap-3` ×3, `gap-1` ×3, `gap-2` ×2, `gap-0.5` (BottomTabBar tabs) ×1
- `p-4` ×1 (card), `p-6` ×1 (picker), `p-0` ×2 (sheet header reset)
- `px-6`, `py-8`, `pb-24` (page container) — consistent with History.tsx and Settings.tsx
- `px-4 py-2.5` (button), `px-2 py-1` (badge)
- `pb-safe` (BottomTabBar) handles iOS home indicator

**Arbitrary values — 3 instances, all justified:**
- `active:translate-x-[2px] active:translate-y-[2px]` (button press effect, `PlantWateringCard.tsx:292`) — sticker pixel-perfect interaction.
- `max-h-[75dvh]` (picker, `WateringFrequencyPicker.tsx:103`) — dynamic viewport height, no Tailwind primitive.
- `pb-[max(1.5rem,env(safe-area-inset-bottom))]` (picker safe area, line 103) — iOS PWA standalone home indicator.

**Mobile rhythm verified:** `pb-24` page container = 96px, leaves room for `BottomTabBar` (`h-16` = 64px + safe-area). No collisions with the nav (assuming the cookie banner z-fix in Priority #1 is applied).

**No findings against this pillar beyond the noted "arbitrary values" being correctly motivated.**

---

### Pillar 6: Experience Design (2/4)

**This is the weakest pillar.** The state machine itself is sophisticated — optimistic UI, 4s undo, flash success, error rollback, two-step pending-first flow — but the page is broken on first-visit composition.

**Strengths (real engineering depth):**
- **Loading state** with combined gate: `authLoading || (!!user && plantsLoading)` (`RegarPage.tsx:67`). Prevents the redirect-before-fetch race noted in `useHomePlants.ts:65-67`.
- **Empty state redirect** (`RegarPage.tsx:118-120`): defensive deep-link handling — if `home_count === 0`, redirect to `/` silently rather than show an empty page (matches MapPage pattern).
- **Optimistic update** with rollback on DB failure (`PlantWateringCard.tsx:174-180`).
- **Double-tap guard** during the 1s flash window (`PlantWateringCard.tsx:140-141`) — VERIFICATION ajuste #2 from sub-phase 3-03.
- **Sonner toast with `Deshacer` action** + 4s duration (`PlantWateringCard.tsx:194-215`) — exactly per D-12.
- **Two-step pending-first flow** (D-14 case 2): picker → editInterval → logWatering chained with proper error pathing for "first succeeded, second failed" (`RegarPage.tsx:170-184`).
- **Picker accessibility:** auto-focus on open (line 64), `aria-describedby` linking helper + error, `role="alert"` on validation error, `min-h-11` (44px) touch targets, `inputMode="numeric"` for mobile numpad.
- **5 PostHog events** wired with `track-before-side-effect` discipline (calendar_opened, watering_logged, watering_undone, watering_frequency_edited, calendar_card_navigated_to_detail).
- **E2E coverage** present (`e2e/regar.spec.ts`) for happy path and empty redirect.

**Blockers / Warnings:**

- **BLOCKER — z-index collision between `CookieConsentBanner` and `BottomTabBar`.** Both `src/components/CookieConsentBanner.tsx:42` and `src/components/BottomTabBar.tsx:38` declare `fixed bottom-0 left-0 right-0 z-50`. DOM-order tie-breaking means the banner currently covers the nav. Visible in `mobile-root.png`, `mobile-ajustes.png`, `mobile-misplantas.png` — the bottom tab strip is fully occluded by the consent card. For Phase 3 specifically this hides the **new "Regar" tab** until consent is resolved. **Fix:** demote banner to `z-40` and inset its bottom by `mb-16 + pb-safe` so the nav remains visible.

- **WARNING — Loading state has no text.** `RegarPage.tsx:107-115` renders only a Leaf icon for sighted users (AT users get `aria-label`). When the page is the funnel-critical "Regar" tab, the perceived stall is undesirable. **Fix:** add a visible "Cargando tus plantas…" string under the icon.

- **WARNING — `BookOpen` import unused in BottomTabBar.tsx:3.** Documented as intentional in `03-01-SUMMARY.md` (D-03 removed the "Mis plantas" tab); `tsconfig` has `noUnusedLocals: false` so it compiles. But it's dead code in a hot file. ESLint will flag in CI. **Fix:** remove the import (15 seconds of work; the Settings page imports its own `BookOpen` separately so there's no cross-file dependency).

- **WARNING — `/mis-plantas` redirect chain works but is silent.** Captured screenshot shows that hitting `/mis-plantas` directly lands on the login page (because RequireAuth gates `/ajustes/mis-plantas`). The intended D-04 toast ("Hemos movido Mis plantas a Ajustes") DOES appear in the capture — so the chain works end-to-end. But the user experience for a bookmarked direct hit while logged out is: visible redirect flash → login form with "Mis plantas" header → no follow-through to the actual list. This is correct behavior on paper, but worth noting that the toast fires on EVERY page mount (not only on `/mis-plantas` → `/ajustes/mis-plantas`) — first homepage visit also fires it, which is what the screenshot captures. The localStorage flag means this is once-per-device, so the impact is bounded.

- **WARNING — `/regar` for "I have 0 home plants" users is invisible by design.** Both the BottomTabBar conditional (`user && home >= 1`) AND the RegarPage empty-redirect cause anyone without home plants to see nothing. There is no onboarding tooltip explaining "clasifica una planta como casa para ver el calendario". For users who have plants but classified them all as wild, there is no signpost. **Fix (defer to v1+):** add a one-shot tooltip on `/ajustes` "Mi colección" section: "Clasifica una planta como casa para activar el calendario de riego".

- **WARNING — Confirmation for destructive actions: not applicable but worth noting.** The `Regar` log itself is reversible via the 4s Sonner undo, which is excellent. But the **frequency edit** has no undo. Tapping "Cada 7 días", changing to 60, hitting Guardar — committed instantly with only a 3s toast (no Deshacer). Per D-07 the previous value is lost (no shadow column for IA initial). For low-stakes plant care this is defensible, but a future iteration should consider an undo here too, especially because the trade-off was acknowledged in the plan.

**Score 2/4** — the engineering is excellent but the visible composition has a blocker (z-index) and the loading state lacks copy. If the cookie banner fix lands and the loading text is added, this pillar moves to a clean 3/4.

---

## Registry Safety

Registry audit: 0 third-party blocks checked.

`components.json` exists at the project root (shadcn initialized), but no UI-SPEC.md for Phase 3 was provided, and no Registry Safety table identifies third-party blocks for this phase. Sub-phase 3-04 uses shadcn's official `<Sheet>` primitive (`src/components/ui/sheet.tsx`) which is already in the codebase from prior phases — no new third-party blocks were installed. No flags.

---

## Files Audited

**Phase 3 components / pages / hooks / lib:**
- `src/components/PlantWateringCard.tsx` (300 LOC)
- `src/components/WateringFrequencyPicker.tsx` (174 LOC)
- `src/components/HistoryRelocationNotice.tsx` (37 LOC)
- `src/components/BottomTabBar.tsx` (66 LOC, Phase 3 modified)
- `src/pages/RegarPage.tsx` (237 LOC)
- `src/hooks/use-home-plants.ts` (145 LOC)
- `src/hooks/use-log-watering.ts` (98 LOC)
- `src/hooks/use-edit-watering-interval.ts` (74 LOC)
- `src/lib/watering-countdown.ts` (57 LOC)

**Design system (Phase 3 modifications):**
- `src/index.css` (`--soft-warn`, `--soft-warn-bg` tokens)
- `tailwind.config.ts` (`softWarn`, `softWarnBg` colors + `flash-success` keyframe + animation)

**Adjacent files inspected for cross-impact:**
- `src/components/CookieConsentBanner.tsx` (z-index collision with BottomTabBar)
- `src/App.tsx` (route registrations + `<HistoryRelocationNotice />` mount point)

**Screenshots captured:**
- `.planning/ui-reviews/03-20260522-105429/desktop-root.png` (1440×900)
- `.planning/ui-reviews/03-20260522-105429/mobile-root.png` (375×812)
- `.planning/ui-reviews/03-20260522-105429/mobile-regar.png` (375×812 — redirects to `/` for anon)
- `.planning/ui-reviews/03-20260522-105429/mobile-ajustes.png` (375×812 — anon shows login CTA)
- `.planning/ui-reviews/03-20260522-105429/mobile-misplantas.png` (375×812 — redirect to login chain)
- `.planning/ui-reviews/03-20260522-105429/mobile-misplantas-redirect.png` (375×812)
- `.planning/ui-reviews/03-20260522-105429/tablet-root.png` (768×1024)

**Limitation:** No screenshots of the populated `/regar` list, the picker open, or the toast undo action were captured because the dev server is in anon state and no test fixtures are wired into the live dev DB. Findings related to the picker visual, card urgent/overdue colors, and the populated list rely on code-level inspection.
