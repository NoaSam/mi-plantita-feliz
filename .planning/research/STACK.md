# Stack Research: PlantID Native Android + Watering Calendar

**Researched:** 2026-04-22
**Confidence:** MEDIUM (based on codebase analysis + training data)

## Key Findings

### 1. Capacitor is the right choice (already validated in docs/native-roadmap.md)

| Option | Verdict | Reason |
|--------|---------|--------|
| Capacitor | **USE** | Wraps existing React build 100%, TypeScript native, plugin ecosystem |
| TWA | Skip | Cannot schedule local notifications, no splash/status bar control |
| React Native | Skip | Full rewrite, violates stack constraints |

### 2. Required Packages (minimal set)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar
npm install -D capacitor-assets
```

Do NOT install `@capacitor/push-notifications` or `@capacitor/local-notifications` — push is out of scope.

### 3. Critical Capacitor Config

```typescript
// capacitor.config.ts
server: {
  androidScheme: 'https'  // Without this, Supabase Auth cookies break
}
```

### 4. Watering Calendar Needs NO New Libraries

Already installed and sufficient:
- `date-fns` — date calculations, `startOfDay()`, interval math
- `@supabase/supabase-js` — DB queries for watering schedule
- `react-day-picker` — if calendar view needed (not required for daily list)
- `react-hook-form` + `zod` — frequency edit forms

### 5. Watering Frequency Extraction

The `care` field from AI is unstructured Markdown. Recommendation: add `watering_interval_days: number` as a structured field in the AI prompt JSON schema. Don't parse free text.

### 6. Build Pipeline

Two build targets needed:
- `npm run build` — PWA with service worker (Vercel)
- `npm run build:android` — No service worker, relative paths (Capacitor)

Use `VITE_CAPACITOR=true` build flag to conditionally disable service worker registration.

### What NOT to Use

| Library | Why Skip |
|---------|----------|
| `@capacitor/push-notifications` | Out of scope — daily list first |
| `@capacitor/local-notifications` | Defer to post-milestone |
| `@ionic/react` | Unnecessary — already have shadcn/ui |
| Any weather API | Over-engineering — manual seasonal hints enough |
| New calendar library | `react-day-picker` already installed |

---
*Stack research: 2026-04-22*
