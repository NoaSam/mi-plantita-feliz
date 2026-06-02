# Phase 3: Calendar v0 — Research

**Researched:** 2026-05-17
**Domain:** React/Vite/Supabase mobile-first PWA — calendar/scheduling surface + DB column + optimistic UPDATE
**Confidence:** HIGH (codebase is fully scanned; all analogs verified via file:line refs)

## Summary

Phase 3 layers a new conditional "Regar" tab and `/regar` listing screen on top of mature plumbing already shipped in Phases 02.1 and 03.1. The reactive tab-visibility pattern, optimistic UPDATE+revert hook, CustomEvent invalidation, Sonner toast, sticker card visual idiom, AppLayout shell, and PostHog `track()` wrapper are all in place — Phase 3 is overwhelmingly **copy-the-pattern**, not **build-from-scratch**.

The only genuinely new building blocks are: (a) a `useHomePlants` query hook (sibling to `useWildPlantsWithCoords`), (b) a `useLogWatering` optimistic UPDATE hook (sibling to `useClassifyPlant`), (c) a pure-function `computeWateringStatus()` utility (testable in isolation), (d) the SQL migration that adds `last_watered_at`, and (e) the new screens/cards/picker. Everything else extends existing patterns.

**Primary recommendation:** Plan each sub-phase by analogy. For 3-01, copy the `wild_with_coords` conditional from `BottomTabBar.tsx:22-24` adapting to `home_count`. For 3-02, mirror `MapPage.tsx`'s redirect-on-empty + loading-gate pattern. For 3-03, mirror `useClassifyPlant.ts` for the optimistic mutation + CustomEvent dispatch and use Sonner's `action` prop (typed `{ label, onClick }`) for the Deshacer button. For 3-04, mirror `PlantMapSheet.tsx`'s shadcn `<Sheet side="bottom">` for the inline frequency picker. For 3-05, mirror `MapPage.tsx`'s `trackedOpen` flag for `calendar_opened`, and reuse the `e2e/map.spec.ts` structure for `e2e/regar.spec.ts`.

## Codebase analogs by sub-phase

### Sub-phase 3-01 (Nav restructure)

| Need | Analog | File:Line | Recommendation |
|------|--------|-----------|----------------|
| Conditional tab pattern in `BottomTabBar` | `wild_with_coords` tab insertion | `src/components/BottomTabBar.tsx:20-30` (the `useMemo` + `result.push` block) | **Copy the pattern.** Insert a `if (user && home_count >= 1) { result.push({ path: "/regar", label: "Regar", icon: Droplet }) }` block. Per D-01 the tab goes BETWEEN Home and Mapa, so put it before the existing `if (user && wild_with_coords >= 1)` block. Add `Droplet` to the lucide-react import line. |
| `home_count` source | `useContextCounts` already returns it | `src/hooks/use-context-counts.ts:5-10` (`ContextCounts.home: number`) | **Reuse as-is.** Hook is shipped, tested, reactive to both `mp:pending-classification-resolved` AND `mp:plant-context-updated` events (lines 122-132). Just destructure `home` from the call already on line 18 of `BottomTabBar.tsx`. |
| Listener dispatch on classify | `useClassifyPlant` dispatches `mp:plant-context-updated` | `src/hooks/use-classify-plant.ts:27-33, 47-53` | **Already wired.** When a user classifies a plant as `home`, `useContextCounts` re-fetches via the listener → `home_count` becomes ≥1 → tab appears without reload. Phase 3 needs zero changes here. |
| Move `/mis-plantas` route to `/ajustes/mis-plantas` (Opción A) | `App.tsx` Routes block | `src/App.tsx:53-67` | **Modify + add.** Two paths: keep `/mis-plantas` redirecting to `/ajustes/mis-plantas` (with `<Navigate to="/ajustes/mis-plantas" replace />`) so deep links from old links still work; register the new route `/ajustes/mis-plantas` with `<AppLayout><History /></AppLayout>`. The `<History />` component itself doesn't need changes — it reads filters from `useSearchParams`. |
| Add navigation item in Settings page | Existing `<Section>` wrapper + Button pattern | `src/pages/Settings.tsx:30-50` (Section helper), `156-164` (button-with-navigate idiom) | **Copy the pattern.** Add a new `<Section title="Mi colección" icon={BookOpen}>` (or similar) ABOVE "Cuenta" with a Button that `navigate("/ajustes/mis-plantas")`. Label per D-03: "Mis plantas (casa + descubrimientos)". |
| Toast for migration notice (D-04) | Sonner `toast.error(...)` already used | `src/components/PlantResultView.tsx:97, 113`, `src/pages/PlantDetail.tsx:15` | **Copy the pattern.** Use `toast.info(...)` or `toast(...)` with a long duration: `toast("📍 Hemos movido Mis plantas a Ajustes", { duration: 8000 })`. The Toaster is mounted globally in `src/App.tsx:49` (`<Toaster richColors closeButton position="top-center" />`). |
| localStorage flag once-per-device | `use-consent.ts` STORAGE_KEY pattern | `src/hooks/use-consent.ts:25, 34` | **Copy the pattern.** Key: `mp_seen_history_relocation_notice`. Read once on mount of `<App>` (or in a small dedicated component); if not set, fire toast + set flag. Place the trigger in a new tiny component `<HistoryRelocationNotice />` mounted next to `<PendingClassificationListener />` in `App.tsx:52`. |
| Settings navigation item position | Cuenta section first, then "Tus datos" | `src/pages/Settings.tsx:135-167` | **New section** between header and "Cuenta" so it's the first action. Or after "Cuenta" — UX call. The current Cuenta section shows "No has iniciado sesión" for anon (line 152-164), so the "Mis plantas" section should be auth-gated (`{user && <Section ...>}`). |

### Sub-phase 3-02 (List screen `/regar`, static)

| Need | Analog | File:Line | Recommendation |
|------|--------|-----------|----------------|
| Route registration | `/mapa` registration with `AppLayout fullBleed` | `src/App.tsx:58` | **Copy the pattern, drop `fullBleed`.** New: `<Route path="/regar" element={<AppLayout><RegarPage /></AppLayout>} />`. The list is finite vertical scroll, no map — normal constrained layout is correct. Tradeoff: cards inherit `max-w-md mx-auto pb-20 mb-safe`, consistent with `/mis-plantas`. |
| Page-shell + redirect-on-empty + loading-gate | `MapPage` | `src/pages/MapPage.tsx:35-76` | **Copy the pattern.** Use the same `authLoading || (!!user && plantsLoading)` guard idiom (lines 36-43); on `plants.length === 0` return `<Navigate to="/" replace />` (line 74-76); render full content otherwise. Title via `document.title` (line 47-49) → "¿Toca regar? · Mi Plantita Feliz". |
| Hook to fetch home plants | `useWildPlantsWithCoords` | `src/hooks/use-wild-plants-with-coords.ts:1-109` | **Copy verbatim, mutate filters.** New file `src/hooks/use-home-plants.ts`. Same mountedRef + useAuth + useCallback + early-return-anon shape. Filter: `.eq("context", "home")`. Select adds `watering_interval_days, last_watered_at` (the new column). Order: by `created_at desc` initially (raw rows); the COMPUTED status drives the actual UI sort in the page — see D-09 + ordering note below. |
| Card visual: foto + name + meta + chip | History row | `src/pages/History.tsx:163-222` (full card structure) | **Copy the layout idiom.** The History row has: bordered + `boxShadow: var(--shadow-press)` + `bg-secondary/50` + `rounded-2xl overflow-hidden` (line 168-169) + flex with photo `size-20 rounded-xl` (line 194-198) + info column. Adapt: replace ContextChip slot with the urgency badge "X d"; add a full-width button below per D-11 ("Opción B — botón ancho completo en parte inferior de la card"). |
| Sticker shadow idiom (visual identity) | `boxShadow: var(--shadow-press)` | `src/index.css:48` (token def: `--shadow-press: 4px 4px 0px 0px hsl(100 70% 10%)`) + `src/components/PlantResultView.tsx:147`, `src/pages/History.tsx:169` | **Reuse the token.** All Phase 3 cards use the same shadow. NEVER inline `4px 4px 0 0 hsl(...)` — use the token via `style={{ boxShadow: "var(--shadow-press)" }}`. |
| Urgency badge "X d" colors | Tailwind tokens `--primary`, `--accent`, `--secondary` | `src/index.css:25-50` | **Use tokens.** Per D-15, urgent/atrasada → amarillo cálido HSL ~38/80%/60%. The codebase does NOT have a `--soft-warn` token defined (verified via `grep --soft-warn src/index.css` → no match). Two options: (a) add the new token to `src/index.css` `:root {}` block (recommended, idiomatic), or (b) use existing `--accent` (HSL 16 76% 61% — coral) which is the closest existing warm tone. **Recommendation: add new token `--soft-warn: 38 80% 60%`** so the planner can use `bg-[hsl(var(--soft-warn))]`. Confirms with the design system. |
| Empty state for users with home plants but all `watering_interval_days = null` | None in codebase yet | — | **New — write from scratch.** Per D-14, all such plants render in "Pendiente primera vez" state. The PAGE itself is not empty — only the per-card state changes. So the empty state is only the `plants.length === 0` branch (handled by redirect-on-empty, no copy needed). Pendiente primera vez state is per-card, not per-page. |

### Sub-phase 3-03 (Countdown + Regar/Regada button)

| Need | Analog | File:Line | Recommendation |
|------|--------|-----------|----------------|
| Migration shape | `20260517000000_add_watering_interval_days_to_plant_searches.sql` | `supabase/migrations/20260517000000_*.sql:1-8` | **Copy the pattern.** Same ALTER TABLE shape with `add column if not exists last_watered_at timestamptz`. NO GRANT needed (existing table; covered by "existing tables keep their grants" clause in `supabase/MIGRATION_CONVENTIONS.md:74-83`). RLS UPDATE policy already exists (`20260515000000_add_plant_searches_update_policy.sql`) and covers any column, so `last_watered_at` writes are protected automatically. See "Migration SQL exact shape" section below. |
| Optimistic UPDATE + revert pattern | `useClassifyPlant` | `src/hooks/use-classify-plant.ts:16-58` | **Copy the pattern.** New hook `src/hooks/use-log-watering.ts` with `log(plantSearchId, intervalDays)` and `revert(plantSearchId, previousLastWateredAt)` functions. Same shape: `useCallback` returning `{ ok: boolean }`, `console.error` on failure, `typeof window !== "undefined"` SSR guard, dispatch `new CustomEvent(...)`. Choose event name: see "Risks" below — recommend `mp:watering-logged`. |
| Reactive list refresh after watering | `useContextCounts` listener pattern | `src/hooks/use-context-counts.ts:122-132` | **Copy the pattern.** `useHomePlants` hook should listen to `mp:watering-logged` AND `mp:plant-context-updated` (the latter so a wild→home reclassification updates the list). Same `addEventListener`/`removeEventListener` shape. |
| Toast with "Deshacer" action button | Sonner's `action` prop | `node_modules/sonner/dist/index.d.ts:39-42` (`interface Action { label, onClick, actionButtonStyle? }`) — verified | **New usage of existing API.** Sonner natively supports `toast("text", { action: { label: "Deshacer", onClick: () => revert(...) }, duration: 4000 })`. The codebase has NOT used the action prop before — current uses are `toast.error(...)` only (3 call sites). The styling of the action button is already themed in `src/components/ui/sonner.tsx:18` via `actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground"` — no custom Toaster wrapper needed. |
| Optimistic local state | `PlantResultView` setPendingAction/optimistic + revert | `src/components/PlantResultView.tsx:85-121` | **Copy the pattern.** State in the page/card: `setOptimisticLastWatered` (or row-local). On tap: (1) set optimistic state immediately → recompute X = 0 → flash card → fire `toast(..., { action: { label: "Deshacer", onClick: handleUndo } })`. On undo OR on 4s expiry the UPDATE persists. Per D-12 step 5, the researcher can choose when DB persistence happens — recommend persisting IMMEDIATELY on tap (matches `useClassifyPlant`'s synchronous UPDATE), and on Deshacer call `revert()` which does a second UPDATE rolling back to the previous timestamp. Simpler than deferred persistence; consistent with existing pattern. |
| Flash green animation 1s | Tailwind `animate-pulse` + custom | `src/index.css` has NO custom keyframes block (verified), `tailwind.config.ts:91-99` defines only `pulse-slow` (2s ease-in-out infinite) | **Use Tailwind built-in `animate-pulse` (3s infinite by default) but constrain duration.** Simplest: `transition-colors` + temporarily switch the card's background class to `bg-primary/15` via React state, then back after 1s. Alternative: add a new keyframe `flash-success` to `tailwind.config.ts` (~6 lines) — cleaner, recommended. Pattern reference: `pulse-slow` block at `tailwind.config.ts:91-99`. |
| Countdown calculation (pure function) | None — new | — | **New — write from scratch.** File: `src/lib/watering-status.ts`. Pure function `computeWateringStatus({ lastWateredAt, intervalDays, now = new Date() }) → { status: 'normal' \| 'urgent' \| 'overdue' \| 'pending-first', daysRemaining: number \| null }`. Trivially unit-testable. Test file: `src/lib/watering-status.test.ts`. Use `Math.floor((targetTime - now) / 86_400_000)` for day count. |

### Sub-phase 3-04 (First-time + frequency editing)

| Need | Analog | File:Line | Recommendation |
|------|--------|-----------|----------------|
| Bottom sheet for frequency picker | `PlantMapSheet` | `src/components/PlantMapSheet.tsx:82-134` | **Copy the pattern.** Same `<Sheet open={open} onOpenChange>` + `<SheetContent side="bottom" className="rounded-t-2xl ... max-h-[75dvh] ... pb-[max(1.5rem,env(safe-area-inset-bottom))]" />`. Adapt content: a number input + Guardar/Cancelar buttons. The Sheet primitive is in `src/components/ui/sheet.tsx:1-114`. |
| Numeric input clamped 1-60 | `History` search input | `src/pages/History.tsx:123-129` (input styled with rounded-2xl, focus ring) | **Copy the styling.** New: `<input type="number" min="1" max="60" />`. Add `onBlur` or `onChange` validation to clamp via `Math.min(60, Math.max(1, value))`. Same Tailwind classes: `bg-secondary border-2 border-foreground rounded-2xl ...`. |
| Button primary/secondary in sheet | `PlantMapSheet` SheetFooter | `src/components/PlantMapSheet.tsx:114-131` | **Copy the pattern.** `<Button variant="hero">Guardar</Button>` + `<Button variant="outline">Cancelar</Button>` stacked vertically with `flex-col gap-2`. |
| Pendiente primera vez branching (single button, two flows) | None — new pattern | — | **New — but composed from existing pieces.** Per D-14: if `watering_interval_days IS NULL` → tap on "Regar" opens the picker first (re-using the same Sheet from D-13), Guardar runs UPDATE for interval, THEN runs the optimistic `log()` call. If interval is already set → tap goes directly to the log flow. Implementation: page-level state machine `'idle' | 'picking-frequency' | 'logging'`, gated by the row's nullness. No new components — composes the Sheet from D-13 + the hook from D-12. |
| Edit frequency from card (D-13) | Tap-to-open-sheet idiom | `src/pages/MapPage.tsx:104-112` (Marker `eventHandlers.click → setSelectedPin`) | **Copy the pattern.** Tap on the "Cada N días" text → setter opens the sheet with the row's current value pre-filled. The sheet's "Guardar" calls a new `useEditWateringInterval` hook (sibling of `useClassifyPlant`, same shape — synchronous Supabase UPDATE + dispatch CustomEvent + return `{ok}`). |

### Sub-phase 3-05 (Tracking + microcopy + tests)

| Need | Analog | File:Line | Recommendation |
|------|--------|-----------|----------------|
| `track()` wrapper | `@/lib/track` | `src/lib/track.ts:56-59` | **Reuse as-is.** Signature: `track(event: string, properties?: Record<string, unknown>)`. No-op when consent denied (line 57). |
| Fire-once-per-mount event (calendar_opened) | `map_opened` with `trackedOpen` flag | `src/pages/MapPage.tsx:45, 51-55` | **Copy the pattern.** Local `const [trackedOpen, setTrackedOpen] = useState(false)` + `useEffect` that fires `track("calendar_opened", { home_count: plants.length, overdue_count, pending_first_time_count })` once `isLoading=false && !trackedOpen`. |
| Pre-action tracking idiom | `LocationConsentModal` "track-then-callback" + multiple call sites | `src/components/PlantMapSheet.tsx:67-74` (track BEFORE navigate), `src/components/ClassificationMorph.tsx:42-50` (track BEFORE onCommit) | **Copy the pattern.** For `watering_logged`: fire `track(..., { plant_search_id, days_remaining_before, interval_days, was_first_time })` BEFORE the UPDATE call. For `watering_undone`: fire BEFORE the revert. For `watering_frequency_edited`: fire BEFORE the UPDATE in the picker's Guardar handler. For `calendar_card_navigated_to_detail`: fire BEFORE `navigate(/planta/...)`. |
| Update docs/posthog-events.md | Phase 03.1 section | `docs/posthog-events.md:155-203` | **Copy the structure.** Add new `## Phase 3 — Calendar v0` section with the same shape: status note, event table (event/props/file/trigger), `### Detalle de propiedades` for each event, and an optional funnel diagram. |
| Hook unit tests | `use-context-counts.test.ts` and `use-wild-plants-with-coords.test.ts` | `src/hooks/use-context-counts.test.ts` (470 lines incl. mock helper), `src/hooks/use-wild-plants-with-coords.test.ts` | **Copy the pattern.** Sibling `*.test.ts` (not in `__tests__/`). Use the same `makeChain` thenable Supabase mock + `vi.mock("@/hooks/use-auth")`. Each new hook (`use-home-plants`, `use-log-watering`, `use-edit-watering-interval`) gets a sibling test file. |
| Pure-function test | `src/lib/anonymous-id.test.ts`, `src/hooks/use-plant-identifier.test.ts` | Both exist with vitest + happy-dom | **Copy the pattern.** New `src/lib/watering-status.test.ts` — pure function tests are trivial (`describe + it.each` covering: normal X>0, urgent X=0, overdue X<0, pending-first when `lastWateredAt=null`, pending-first when `intervalDays=null`, edge cases at midnight, timezone-agnostic via UTC ms math). |
| Playwright E2E | `e2e/map.spec.ts` happy path | `e2e/map.spec.ts:20-72` | **Copy the structure.** New `e2e/regar.spec.ts`. Mock Supabase routes with `MOCK_HOME_PLANTS` (add to `e2e/fixtures.ts` with `context: "home"` + `watering_interval_days: 5` + `last_watered_at: ...`). Test: navigate `/regar` → see card → tap Regar button → toast appears with "Deshacer" → counter resets. Use `page.route("**/rest/v1/plant_searches*", ...)` to mock both SELECT and UPDATE. |
| Mock data shape for E2E | `MOCK_WILD_WITH_COORDS` | `e2e/fixtures.ts:39-60+` | **Copy the pattern.** Add `MOCK_HOME_PLANTS` fixture with 2-3 home rows; vary `watering_interval_days` and `last_watered_at` to cover normal/urgent/overdue/pending states. |

## Technical risks & assumptions to surface

These are facts the planner needs to be aware of that CONTEXT.md does not capture:

1. **`@tanstack/react-query` is in `package.json:60` but NOT used anywhere in `src/`.** All hooks use the manual `useState + useEffect + useCallback + mountedRef` pattern. The project committed to this pattern via PATTERNS.md S3 and uses it consistently across `use-unclassified-count`, `use-context-counts`, `use-wild-plants-with-coords`, `use-plant-history`, `use-plant-by-id`. **The planner MUST NOT introduce react-query for the new hooks** — it would diverge from the established pattern. Verified: `grep -rn "useQuery\|QueryClient\|tanstack" src/` returns zero matches.

2. **Two CustomEvent channels coexist (deliberately).** `mp:pending-classification-resolved` is fired ONLY by `AuthContext` in the anon→auth claim flow (`App.tsx:31-44` listens and navigates). `mp:plant-context-updated` is fired by `useClassifyPlant` (lines 27-33, 47-53) for normal UI-driven classify/revert. Both are listened to by `useContextCounts` (lines 122-132) and `History.tsx` (lines 53-61). **Recommendation for Phase 3:** define a new event `mp:watering-logged` for the watering-logged dispatch from `useLogWatering`, and a new event `mp:watering-interval-edited` (or reuse `mp:plant-context-updated` if simpler — but it would over-trigger `useContextCounts` re-fetches). The new `useHomePlants` hook subscribes to both `mp:plant-context-updated` (catches home/wild reclassifications) AND `mp:watering-logged` (catches log events). Pure naming — no architectural risk.

3. **`usePlantHistory` discards `watering_interval_days` in its row mapping.** `src/hooks/use-plant-history.ts:43-55` maps DB rows to `PlantResult` but the mapping omits `watering_interval_days` (and after Phase 3 will also omit `last_watered_at`). The DB SELECT is `select("*")` (line 32), so both columns ARE returned — they're just stripped during mapping. **Impact for Phase 3:** the new `useHomePlants` hook needs its own row mapping that retains both fields. `PlantResult` type at `src/hooks/use-plant-identifier.ts:8-19` already has `watering_interval_days: number | null`, but not `last_watered_at`. **Plan adds `last_watered_at` to `PlantResult`** (optional, nullable) so type cohesion is maintained — or define a new type `HomePlant` in the hook file. The new hook returns the new type; `usePlantHistory` can stay untouched (the History page doesn't need watering fields).

4. **Sonner `action` prop is fully supported but UNUSED in the codebase.** Verified at `node_modules/sonner/dist/index.d.ts:39-42`: `interface Action { label, onClick, actionButtonStyle? }`. The toast `actionButton` is already styled in `src/components/ui/sonner.tsx:18` (`group-[.toast]:bg-primary group-[.toast]:text-primary-foreground`). **No custom Toaster wrapper is needed.** Calling `toast("✓ Regada · Siguiente riego en N días", { action: { label: "Deshacer", onClick: handleUndo }, duration: 4000 })` will Just Work. Test that the action button styling matches D-15 (suave, no rojo intenso) at integration time; if the primary color is too strong, override via the `classNames` prop on the global `<Toaster />` in `src/App.tsx:49`.

5. **No `--soft-warn` token exists in `src/index.css`.** Verified via grep. Existing warm-yellow-adjacent token is `--accent: 16 76% 61%` (coral). D-15 specifies "amarillo cálido HSL ~38, 80%, 60%" — different hue. **Recommendation:** add `--soft-warn: 38 80% 60%` to `:root { ... }` in `src/index.css` (after the `--accent` block, lines 27-28). Use as `bg-[hsl(var(--soft-warn))]` or define a Tailwind utility. Cleanest path for the planner is to extend the Tailwind config's `extend.colors.softWarn` so `bg-soft-warn` works, but inline `hsl(var(--soft-warn))` also works without config changes. Verified `tailwind.config.ts:91-99` already has the keyframes block, so adding colors is mechanical.

6. **No custom CSS keyframes block in `src/index.css`.** Verified. Only `.plant-map-pin` rules and a `.leaflet-control-attribution` margin override exist (lines 76-112). For the 1s flash-green animation on D-12, the cleanest path is to add a new keyframe to `tailwind.config.ts` (the file at lines 91-99 already shows the `pulse-slow` pattern — copy it for a `flash-success`). Simplest fallback: use Framer Motion's `animate` with `backgroundColor` keyframes inline in the component (already in deps; same idiom as `ClassificationMorph.tsx:100-103`).

7. **`@/components/ui/sonner.tsx` is what's mounted globally — NOT `@/components/ui/toaster.tsx`.** `src/App.tsx:4` imports `import { Toaster } from "@/components/ui/sonner"` and mounts at line 49 with `richColors closeButton position="top-center"`. Any new toast call MUST use `import { toast } from "sonner"` (or re-export the same in `@/components/ui/sonner.tsx:27` — the file re-exports `toast`). The legacy `use-toast.ts` (Radix toast) still exists in `src/hooks/` but is not the active system.

8. **Anonymous users have ZERO home plants by RLS.** `useClassifyPlant` UPDATE is gated by RLS policy `20260515000000_add_plant_searches_update_policy.sql:9-12` (`auth.uid() = user_id`); anonymous searches set `user_id = null`. The Phase 02.1 wall flow (`AnonClassificationWall`) gates classification on login. **Implication for Phase 3:** the new `/regar` route does NOT need a separate `<RequireAuth>` wrapper — the redirect-on-empty branch (when `home_count === 0`) already covers anon users (they always have 0 home plants). However, for safety and faster failure (no Supabase round trip), the planner CAN wrap `<RegarPage>` in `<RequireAuth>` like `<History>` is at `src/pages/History.tsx:102`. **Recommendation:** add `<RequireAuth>` for consistency with `/mis-plantas` and to avoid the redirect flash. Minimal code, defensive.

9. **The `BottomTabBar` is already 4-tabs-capable.** Visually at lines 32-58 it uses `justify-around` inside `max-w-md mx-auto h-16`. 4 tabs render fine on a 360-375px phone. Adding "Regar" makes 4 (Inicio + Regar + Mapa + Mis plantas + Ajustes = 5 tabs MAX when user has both home AND wild-with-coords AND is logged in). 5 tabs at 4rem cell width on a 360px phone = 72px per tab — slightly tight but acceptable; icon-only buttons are 44px target. **No layout refactor needed.** Worth visual-testing on a 360px Android viewport during 3-01.

10. **Existing `/mis-plantas` route is referenced from multiple call sites that need updating.** Search-and-replace candidates:
    - `src/components/UnclassifiedSection.tsx:44` (`navigate("/mis-plantas?context=unclassified")`)
    - `src/App.tsx:59, 60` (`/login`/`/signup` redirect to `/mis-plantas`)
    - `src/components/BottomTabBar.tsx:25` (the Mis plantas tab path)
    - `e2e/history.spec.ts` (E2E references `/mis-plantas` likely — verify)
    
    **Decision required by planner (or escalate to user):** when moving to `/ajustes/mis-plantas`, should ALL these references update, or should `/mis-plantas` remain as a redirect for backwards compat? **Recommendation:** keep `/mis-plantas` as a `<Navigate to="/ajustes/mis-plantas" replace />` in `App.tsx` so external bookmarks (and the migration toast notice from D-04) still land correctly. Update the BottomTabBar tab path to `/ajustes/mis-plantas` (so `aria-current` highlighting works). Update the `useNavigate("/mis-plantas?...")` calls to the new path. The login/signup redirects should target `/` (home) not the moved screen.

11. **Test environment uses `vitest + jsdom/happy-dom`.** Verified `package.json:14` runs `vitest run`. The existing hook tests (`use-context-counts.test.ts`, `use-wild-plants-with-coords.test.ts`) use `@testing-library/react` `renderHook + waitFor + act`. Phase 3 unit tests follow the same setup. No new test infra.

12. **`watering_interval_days` already has CHECK constraint 1-60.** `supabase/migrations/20260517000000_*.sql:7-8`: `check (watering_interval_days is null or (watering_interval_days >= 1 and watering_interval_days <= 60))`. The picker in D-13 must enforce the same bounds in the UI; trying to write 0 or 61 will be rejected by the DB with a constraint violation. Client validation is belt-and-suspenders.

13. **Date arithmetic timezone caveat for countdown.** D-08's formula uses `now()`. Native JS `Date` math is millisecond-based and timezone-agnostic at the math level (UTC ms diff). However "Lleva 2 días esperándote" needs DAY arithmetic — not hour arithmetic. **Recommendation:** compute X using floor of day differences: `Math.floor((target.getTime() - now.getTime()) / 86_400_000)`. This means a plant watered at 23:00 yesterday with interval=1 day → target=23:00 today → at 00:00 today X = 0 (toca regar hoy). Acceptable per D-08's "X=0 → Toca regar hoy". Surface this in the pure function's test cases. Spain is in CET/CEST; users won't notice the millisecond math because the displayed text is "days".

## Open questions for planner

1. **Migration filename timestamp.** Convention from existing migrations is `YYYYMMDDHHMMSS_name.sql`. Phase 02.1's was `20260515000000`, Phase 2's was `20260517000000`. Phase 3's migration should be dated AFTER both — e.g., `20260518000000_add_last_watered_at_to_plant_searches.sql` (or whenever the migration is actually written). Researcher cannot pre-date; planner should generate at execution time.

2. **Wave / sub-phase ordering of the migration.** The migration is in sub-phase 3-03 per CONTEXT.md. But sub-phase 3-02 (list screen) reads `last_watered_at` to compute X. **Resolution:** sub-phase 3-02 can render the list WITHOUT computing X (per CONTEXT.md: "cards con badge 'X d' estático (sin lógica reset todavía)") — the column doesn't need to exist yet for 3-02. Plan 3-02 selects only `watering_interval_days` (already exists). Plan 3-03 adds the migration THEN extends the hook to also select `last_watered_at`. Sequential, no waste.

3. **Should the `/regar` route be auth-gated with `<RequireAuth>`?** See risk #8. Recommendation: yes, for consistency with `/mis-plantas`. Confirm with planner / proceed.

4. **`/mis-plantas` backwards compat redirect.** See risk #10. Recommendation: keep as redirect to `/ajustes/mis-plantas`. Confirm.

5. **Color token approach for D-15 "amarillo cálido".** See risk #5. Recommendation: add `--soft-warn: 38 80% 60%` token to `src/index.css` `:root {}` block; optionally extend Tailwind `extend.colors.softWarn`. Confirm.

6. **Flash green animation implementation.** See risk #6. Recommendation: add a Tailwind keyframe `flash-success` (cleaner) or use Framer Motion inline (zero config). Either works.

7. **CustomEvent name for watering-logged.** See risk #2. Recommendation: `mp:watering-logged` (and possibly `mp:watering-interval-edited` if needed separately). Confirm naming.

8. **Settings page section placement.** Above "Cuenta" (first) or after "Cuenta"? UX call. The "Mis plantas" item is auth-gated; "Cuenta" has the login CTA for anon — placing "Mis plantas" first would mean the entire section is hidden for anon, which is fine. **Recommendation:** after "Cuenta" (so anonymous users see login first, then can scroll to other features).

## Migration SQL exact shape

Following the convention in `supabase/MIGRATION_CONVENTIONS.md:53-55` ("alter, índices, datos — sin cambios. El nuevo default solo afecta a CREATE TABLE"), this migration needs only the ALTER. No GRANT block. Existing RLS UPDATE policy from `20260515000000_add_plant_searches_update_policy.sql:9-12` covers the new column automatically (PostgreSQL row-level security operates at row granularity, not column granularity, so any column the user owns is writable).

**File:** `supabase/migrations/<YYYYMMDDHHMMSS>_add_last_watered_at_to_plant_searches.sql` — timestamp generated at execution time.

**Content (verbatim — copy as-is at execute time):**

```sql
-- Add last_watered_at to plant_searches: last time the user logged a watering
-- via Phase 3 Calendar v0. Nullable: rows existing before Phase 3 (and any
-- newly-created row) have no logged watering until the user taps Regada/Regar.
-- Countdown formula uses (last_watered_at + watering_interval_days days) - now().
-- RLS UPDATE policy from 20260515000000_add_plant_searches_update_policy.sql
-- already gates writes by auth.uid() = user_id; no per-column policy needed.
-- See: .planning/phases/03-calendar-v0/03-CONTEXT.md D-06
alter table plant_searches
  add column if not exists last_watered_at timestamptz;
```

**Verification step (post-migration):**

```sql
-- Confirm the column exists and is nullable
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'plant_searches'
  and column_name = 'last_watered_at';
-- Expected: ('last_watered_at', 'timestamp with time zone', 'YES')
```

**Type regeneration:** after `supabase db push` (or local `supabase migration up`), regenerate `src/integrations/supabase/types.ts` (typically `supabase gen types typescript`). The new `last_watered_at: string | null` field appears in `plant_searches.Row/Insert/Update`. Verified the existing types file at `src/integrations/supabase/types.ts:104-152` already has the same shape for `watering_interval_days` — same pattern applies.

## File list (per sub-phase)

### Sub-phase 3-01 (Nav restructure)
**Modify:**
- `src/components/BottomTabBar.tsx` — add `Droplet` icon import; destructure `home` from `useContextCounts()`; insert `if (user && home >= 1) result.push({ path: "/regar", label: "Regar", icon: Droplet })` BEFORE the existing wild_with_coords block (D-01 order)
- `src/App.tsx` — register `<Route path="/ajustes/mis-plantas" element={<AppLayout><History /></AppLayout>} />`; change existing `/mis-plantas` route to `<Route path="/mis-plantas" element={<Navigate to="/ajustes/mis-plantas" replace />} />`; ensure login/signup redirects target `/` not `/mis-plantas`
- `src/pages/Settings.tsx` — add new `<Section title="Mi colección" icon={BookOpen}>` (auth-gated) with a Button that navigates to `/ajustes/mis-plantas`
- `src/components/UnclassifiedSection.tsx:44` — update `navigate("/mis-plantas?context=unclassified")` → `navigate("/ajustes/mis-plantas?context=unclassified")`

**Create:**
- `src/components/HistoryRelocationNotice.tsx` (new, ~25 LOC) — tiny component that reads localStorage flag `mp_seen_history_relocation_notice`, fires `toast("📍 Hemos movido Mis plantas a Ajustes", { duration: 8000 })` once, sets flag; mounted in `App.tsx` next to `<PendingClassificationListener />`

**Tests:** none new (no UI tests per CLAUDE.md).

### Sub-phase 3-02 (List screen static)
**Create:**
- `src/hooks/use-home-plants.ts` (new, ~100 LOC) — copy of `useWildPlantsWithCoords` shape with filter `context = 'home'`; selects `id, name, image_url, created_at, description, watering_interval_days` (no `last_watered_at` yet — added in 3-03); listens to `mp:plant-context-updated` for reactivity
- `src/hooks/use-home-plants.test.ts` (new, ~120 LOC) — same `makeChain` thenable Supabase mock pattern as `use-context-counts.test.ts`
- `src/pages/RegarPage.tsx` (new, ~120 LOC) — orchestrates `useHomePlants` + redirect-on-empty (per D-08 success criterion #8) + renders cards via `WateringCard` component
- `src/components/WateringCard.tsx` (new, ~100 LOC) — sticker card with foto + nombre + "Cada N días" text + badge "X d" + full-width button at bottom (D-11); static badge in 3-02 (X computed later in 3-03)

**Modify:**
- `src/App.tsx` — register `<Route path="/regar" element={<AppLayout><RequireAuth><RegarPage /></RequireAuth></AppLayout>} />`
- `src/index.css` — add `--soft-warn: 38 80% 60%;` to `:root {}` block (per D-15 + risk #5)
- `tailwind.config.ts` (optional) — extend `colors.softWarn` so `bg-soft-warn` utility works

**Tests:** hook unit test only.

### Sub-phase 3-03 (Countdown + Regar button + migration)
**Create (DB):**
- `supabase/migrations/<YYYYMMDDHHMMSS>_add_last_watered_at_to_plant_searches.sql` — see "Migration SQL exact shape" above

**Create (code):**
- `src/lib/watering-status.ts` (new, ~40 LOC) — pure `computeWateringStatus({ lastWateredAt, intervalDays, now })` returning `{ status, daysRemaining }`
- `src/lib/watering-status.test.ts` (new, ~80 LOC) — pure function tests covering all 4 status branches + edge cases (midnight, null inputs, timezone)
- `src/hooks/use-log-watering.ts` (new, ~50 LOC) — copy of `useClassifyPlant` shape; functions `log(plantSearchId)` and `revert(plantSearchId, previousLastWateredAt)`; dispatches `new CustomEvent("mp:watering-logged", { detail: { plant_search_id } })`
- `src/hooks/use-log-watering.test.ts` (new, ~100 LOC) — same Supabase mock chain pattern

**Modify:**
- `src/integrations/supabase/types.ts` — auto-regenerate after `supabase db push`; adds `last_watered_at: string | null` to `plant_searches.Row/Insert/Update`
- `src/hooks/use-home-plants.ts` — extend SELECT to include `last_watered_at`; extend returned row type with `lastWateredAt: string | null`; listen also to `mp:watering-logged` event
- `src/components/WateringCard.tsx` — wire `computeWateringStatus` for badge color/text; wire `useLogWatering` for button onClick; add Sonner toast with `action: { label: "Deshacer", onClick: revert }` per D-12 step 3; add flash-green visual feedback
- `tailwind.config.ts` (optional) — add `flash-success` keyframe per risk #6

**Tests:** 3 unit tests (pure function + hook + hook).

### Sub-phase 3-04 (First-time + frequency editing)
**Create:**
- `src/components/FrequencyPickerSheet.tsx` (new, ~80 LOC) — shadcn `<Sheet side="bottom">` wrapping a number input + Guardar/Cancelar
- `src/hooks/use-edit-watering-interval.ts` (new, ~45 LOC) — sibling of `useLogWatering`; UPDATE `watering_interval_days`; dispatch `mp:watering-interval-edited` (or reuse `mp:watering-logged`)
- `src/hooks/use-edit-watering-interval.test.ts` (new, ~90 LOC)

**Modify:**
- `src/components/WateringCard.tsx` — tap on "Cada N días" text opens FrequencyPickerSheet; add pendiente-first-time branching logic in button onClick (D-14): if `intervalDays === null` open picker first, then on Guardar trigger `log()`

**Tests:** 1 hook unit test.

### Sub-phase 3-05 (Tracking + microcopy + tests + E2E)
**Create:**
- `e2e/regar.spec.ts` (new, ~120 LOC) — happy path: navigate `/regar` → see card → tap Regar → toast appears with Deshacer → counter resets; copy structure from `e2e/map.spec.ts`

**Modify:**
- `e2e/fixtures.ts` — add `MOCK_HOME_PLANTS` array (3-5 plants with varied `watering_interval_days` and `last_watered_at` values covering normal/urgent/overdue/pending states)
- `src/pages/RegarPage.tsx` — add `calendar_opened` track call with `trackedOpen` flag (copy from `MapPage.tsx:45,51-55`)
- `src/components/WateringCard.tsx` — add 4 track calls: `watering_logged` (before `log()`), `watering_undone` (before `revert()`), `watering_frequency_edited` (before `edit()`), `calendar_card_navigated_to_detail` (before `navigate("/planta/...")`)
- `docs/posthog-events.md` — add `## Phase 3 — Calendar v0` section with the 5 new events documented per the same shape as `## Phase 03.1` (lines 155-203)

**Tests:** E2E + microcopy verification in `WateringCard.tsx` (D-15/D-16: no "(según IA)" / "(tú decidiste)" attribution; urgent text "Toca regar hoy"; overdue text "Lleva N días esperándote"; header "Tus plantas casa").

---

## Confidence breakdown

| Area | Level | Reason |
|------|-------|--------|
| Codebase analogs | HIGH | All file:line refs verified; patterns are mature and consistent |
| Migration SQL shape | HIGH | Matches Phase 2 + Phase 02.1 conventions exactly; verified `MIGRATION_CONVENTIONS.md` clause for existing tables |
| Sonner `action` API | HIGH | Verified in `node_modules/sonner/dist/index.d.ts:39-42` directly |
| Hook patterns (mountedRef + useAuth + Supabase) | HIGH | 5 existing hooks in `src/hooks/` confirm pattern |
| react-query absence | HIGH | grep verified zero usage |
| Color/animation tokens | MEDIUM | Recommended approach (add `--soft-warn`) is conventional but not pre-locked by CONTEXT — minor risk planner picks differently |
| Frequency picker UX in Sheet | MEDIUM | `PlantMapSheet` is the closest analog (bottom sheet with stacked buttons), but the picker has different content (number input vs read-only). Pattern is sound; details emerge in execute |
| Open questions | MEDIUM | 8 items flagged for planner; none are blockers but planner should decide before generating PLAN.md |

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (codebase stable; only risk is third-party deps churn — unlikely in 30 days)
