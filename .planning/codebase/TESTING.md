# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**Runner:**
- Vitest 4.1.0
- Config: `vitest.config.ts`
- Environment: jsdom (DOM testing in Node)

**Assertion Library:**
- Vitest built-in with compatible Jest assertions
- Testing Library for component/hook testing (`@testing-library/react` 16.0.0, `@testing-library/jest-dom` 6.6.0)

**Run Commands:**
```bash
npm run test              # Run all unit/integration tests once
npm run test:watch       # Watch mode for development
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright with UI runner
```

**Test Files Location:**
- Co-located with source: test file next to implementation
- Pattern: `[name].test.ts` or `[name].test.tsx`
- Examples: `src/services/auth.service.test.ts`, `src/hooks/use-plant-identifier.test.ts`

## Test File Organization

**Location:**
- Co-located pattern: test files sit alongside source files in same directory
- E2E tests in dedicated `e2e/` directory separate from unit tests

**Naming:**
- Unit tests: `[module].test.ts` (e.g., `auth.service.test.ts`, `anonymous-id.test.ts`)
- Component tests: `[Component].test.tsx` (e.g., `PhotoCapture.test.tsx`)
- Test discovery: Vitest automatically includes `src/**/*.{test,spec}.{ts,tsx}`

**Structure:**
```
src/
├── services/
│   ├── auth.service.ts
│   └── auth.service.test.ts
├── hooks/
│   ├── use-plant-identifier.ts
│   └── use-plant-identifier.test.ts
├── lib/
│   ├── anonymous-id.ts
│   └── anonymous-id.test.ts
└── test/
    ├── setup.ts              # Global test setup
    ├── example.test.ts       # Example test (minimal)
    └── consensus.test.ts     # Business logic tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("module.name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("specific function", () => {
    it("should do something", () => {
      expect(true).toBe(true);
    });

    it("should handle edge case", () => {
      // arrange, act, assert
    });
  });
});
```

**Patterns:**
- `describe()` blocks organize related tests by module or function
- Nested `describe()` blocks group tests by feature (e.g., "input validation" vs "state management")
- `it()` for individual test cases with descriptive names
- `beforeEach()` to reset state before each test (mocks, localStorage, etc.)
- `afterEach()` for cleanup if needed (e.g., `vi.restoreAllMocks()`)

## Mocking

**Framework:** Vitest's built-in `vi` module

**Patterns:**

```typescript
// Module-level mocking (before imports)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getSession: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

// Track mock with import
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

// Import mocked module after vi.mock declarations
import { supabase } from "@/integrations/supabase/client";

// Mock specific implementations
vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
  data: { user: mockUser, session: {} },
  error: null,
} as any);

// Clear mocks between tests
beforeEach(() => vi.clearAllMocks());
```

**What to Mock:**
- External service clients (Supabase auth, functions)
- Analytics tracking calls (`track()` function)
- Platform/browser APIs that don't work in jsdom (geolocation, localStorage with custom implementation)
- Third-party API calls

**What NOT to Mock:**
- Pure utility functions (string parsing, calculations)
- localStorage behavior (setup provides in-memory implementation in `src/test/setup.ts`)
- State management hooks (useState, useCallback) unless testing hook orchestration
- Internal modules within the same layer (prefer integration testing)

## Fixtures and Factories

**Test Data:**
```typescript
// Simple mock creation
function createMockFile(type: string, sizeBytes: number, name = "photo.jpg"): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

// Mock user object
const mockUser = { id: "user-1", email: "test@test.com" };

// Test data for consensus matching
const results = [
  { model: "claude" as const, success: true, scientificName: "epipremnum aureum" },
  { model: "gemini" as const, success: true, scientificName: "epipremnum aureum" },
  { model: "gpt4o" as const, success: true, scientificName: "epipremnum aureum" },
];
```

**Location:**
- Factories defined inside test files at top level
- No separate fixtures directory (small project, fixtures co-located)
- Mock constants at file top (e.g., `const STORAGE_KEY = "plantita_anon_id"`)

## Coverage

**Requirements:** No coverage target enforced in configuration

**View Coverage:**
```bash
npm run test -- --coverage    # Run tests with coverage report (if configured)
```

**Current State:** Coverage tracking available but not required for CI/CD

## Test Types

**Unit Tests:**
- Scope: Individual functions, hooks, services
- Location: `src/**/*.test.ts`
- Approach: Test inputs/outputs in isolation with mocked dependencies
- Examples:
  - `auth.service.test.ts` — test signIn/signUp error handling and translations
  - `anonymous-id.test.ts` — test UUID generation, persistence, cache behavior
  - `consensus.test.ts` — test botanical name matching logic

**Integration Tests:**
- Scope: Hook orchestration with mocked external services
- Location: `src/**/*.test.ts` (same pattern as unit tests)
- Approach: Test hook state transitions and side effects
- Example: `use-plant-identifier.test.ts` tests image validation, error propagation, analytics tracking together

**E2E Tests:**
- Framework: Playwright 1.57.0
- Config: `playwright.config.ts`
- Scope: Full app workflows on real browser engines
- Devices: Mobile Chrome (Pixel 7), Mobile Safari (iPhone 14)
- Test files: `e2e/*.spec.ts` (e.g., `e2e/auth.spec.ts`, `e2e/identify.spec.ts`)
- Approach: Test user flows end-to-end (login → identify plant → view history)

## Common Patterns

**Async Testing:**
```typescript
import { renderHook, act } from "@testing-library/react";

describe("usePlantIdentifier", () => {
  it("handles async identify call", async () => {
    const { result } = renderHook(() => usePlantIdentifier());

    await act(async () => {
      await result.current.identify(mockFile);
    });

    expect(result.current.result).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
```

**Error Testing:**
```typescript
it("translates 'Invalid login credentials' to Spanish", async () => {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "Invalid login credentials" },
  } as any);

  const result = await signIn("test@test.com", "wrong");

  expect(result.error).toBe("Email o contraseña incorrectos");
  expect(result.user).toBeNull();
});
```

**Component Testing:**
```typescript
describe("PhotoCapture", () => {
  it("renders a single file input on iOS", () => {
    mockIsIOS.mockReturnValue(true);
    const { container } = render(<PhotoCapture onCapture={noop} isLoading={false} />);
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
  });
});
```

## Test Setup

**Global Setup:**
File: `src/test/setup.ts`

Initializes:
- `@testing-library/jest-dom` matchers
- Custom localStorage implementation (in-memory Map to avoid Node 20+ globalThis.localStorage conflict)
- window.matchMedia mock for media query tests

```typescript
import "@testing-library/jest-dom";

// In-memory localStorage implementation
(() => {
  const store = new Map<string, string>();
  const storage: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, writable: true });
})();

// window.matchMedia mock for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, /* handlers */ }),
});
```

## Testing Conventions

**Test Naming:**
- Descriptive one-liners: "returns user on success", "translates Spanish error messages"
- Avoid "should" prefix in practice (some use, some don't — inconsistent)
- Action-first: "returns", "throws", "renders" (not "test that" or "verifies")

**Assertion Style:**
- Vitest/Jest assertions: `expect(x).toBe(y)`, `expect(x).toEqual(y)`
- Nullability: `expect(x).toBeNull()`, `expect(x).not.toBeNull()`
- Truth: `expect(x).toBe(true)`, `expect(x).toBe(false)` (not `.toBeTruthy()`)
- Arrays: `expect(arr).toHaveLength(n)`, `expect(arr).toEqual([...])`
- Functions called: `expect(fn).toHaveBeenCalledWith(...)`

**State Assertions (Hooks):**
```typescript
const { result } = renderHook(() => usePlantIdentifier());

// Check initial state
expect(result.current.isLoading).toBe(false);
expect(result.current.result).toBeNull();
expect(result.current.error).toBeNull();

// After state change
await act(async () => { await result.current.identify(file); });
expect(result.current.result).not.toBeNull();
```

---

*Testing analysis: 2026-04-22*
