# Deferred Items — Phase 04.1

## Discovered during Plan 04.1-03 execution (2026-08-12)

### Pre-existing lint errors (out of scope)

`npm run lint` reports 17 `@typescript-eslint/no-explicit-any` errors + 13 warnings across the codebase. All errors are in files untouched by this phase:

- `src/lib/platform.test.ts` — 4 errors (Phase 1 legacy, commit `acb8b7f`)
- `src/services/auth.service.test.ts` — 8 errors (Phase 1/2 legacy)
- Other files — 5 errors (miscellaneous pre-existing)

**Verified pre-existing** via `git log --oneline --all -- <file>`. Both files are original from Phase 1 (2026-04 era).

**Not fixed here** per SCOPE BOUNDARY rule: fixing pre-existing warnings in unrelated files is out of scope for perf plan.

**Recommendation:** Address in a dedicated `chore: lint cleanup` phase, or as part of a broader test refactor.
