import { test as base, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_USER = {
  id: "user-e2e-001",
  email: "test@plantita.dev",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
};

export const MOCK_SESSION = {
  access_token: "e2e-access-token",
  refresh_token: "e2e-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
};

export const MOCK_PLANT = {
  plant_search_id: "plant-001",
  name: "Monstera deliciosa (Monstera deliciosa)",
  description: "La **Monstera deliciosa** es una planta tropical originaria de los bosques de América Central.",
  care: "**Riego**: Cada 7-10 días. **Luz**: Indirecta brillante. **Temperatura**: 18-27°C.",
  diagnosis: "La planta se ve **saludable**. No se detectan signos de enfermedad.",
  model: "claude",
  created_at: new Date().toISOString(),
  models: [
    { model: "claude", consensus_group: "correct" },
    { model: "gemini", consensus_group: "correct" },
    { model: "gpt4o", consensus_group: "correct" },
  ],
};

export const MOCK_HISTORY_ITEMS = [
  {
    id: "plant-001",
    name: "Monstera deliciosa",
    description: "Planta tropical de hojas grandes.",
    care: "Riego semanal, luz indirecta.",
    diagnosis: "Saludable, sin problemas detectados.",
    image_url: "data:image/jpeg;base64,/9j/mock",
    created_at: "2026-04-10T10:00:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "plant-002",
    name: "Pothos dorado",
    description: "Planta colgante muy resistente.",
    care: "Riego cada 10 días.",
    diagnosis: "Hojas amarillas en la base — posible exceso de riego.",
    image_url: "data:image/jpeg;base64,/9j/mock2",
    created_at: "2026-03-15T14:30:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "plant-003",
    name: "Ficus elastica",
    description: "Árbol de interior de hojas brillantes.",
    care: "Luz brillante, riego moderado.",
    diagnosis: "Buen estado general.",
    image_url: "data:image/jpeg;base64,/9j/mock3",
    created_at: "2026-01-20T09:00:00Z",
    user_id: MOCK_USER.id,
  },
];

// ---------------------------------------------------------------------------
// Phase 03.1 — Wild plants with coords (for /mapa tests)
// ---------------------------------------------------------------------------

export const MOCK_WILD_WITH_COORDS = [
  {
    id: "wild-001",
    name: "Salvia rosmarinus (Rosmarinus officinalis)",
    description: "Romero silvestre encontrado en zona forestal.",
    care: "Riego escaso, luz directa, suelo seco.",
    diagnosis: "Buen estado.",
    image_url: "data:image/jpeg;base64,/9j/wild001",
    context: "wild" as const,
    lat: 40.4168,
    lng: -3.7038,
    created_at: "2026-05-10T10:00:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "wild-002",
    name: "Lavandula angustifolia (Lavandula angustifolia)",
    description: "Lavanda descubierta en Lisboa.",
    care: "Sol pleno, riego moderado.",
    diagnosis: "Buen estado.",
    image_url: "data:image/jpeg;base64,/9j/wild002",
    context: "wild" as const,
    lat: 38.7223,
    lng: -9.1393,
    created_at: "2026-04-20T14:30:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "wild-003",
    name: "Olea europaea (Olea europaea)",
    description: "Olivo joven en parque urbano.",
    care: "Sol directo, poco riego.",
    diagnosis: "Buen estado.",
    image_url: "data:image/jpeg;base64,/9j/wild003",
    context: "wild" as const,
    lat: 41.3851,
    lng: 2.1734,
    created_at: "2026-03-15T09:00:00Z",
    user_id: MOCK_USER.id,
  },
];

// ---------------------------------------------------------------------------
// Phase 3 — Home plants (for /regar tests)
// ---------------------------------------------------------------------------

// Fixed anchor to keep status assertions deterministic (no midnight drift).
// E2E specs pair this with `page.clock.install({ time: FIXED_TEST_NOW })`.
const FIXED_TEST_NOW = new Date("2026-05-17T12:00:00Z").getTime();

function isoDaysAgo(days: number): string {
  return new Date(FIXED_TEST_NOW - days * 86_400_000).toISOString();
}

export const MOCK_HOME_PLANTS = [
  {
    id: "home-001",
    name: "Monstera deliciosa (Monstera deliciosa)",
    description: "Planta tropical de hojas grandes.",
    care: "Riego semanal, luz indirecta.",
    diagnosis: "Saludable.",
    image_url: "data:image/jpeg;base64,/9j/home001",
    context: "home" as const,
    watering_interval_days: 7,
    last_watered_at: isoDaysAgo(3), // X = 4 → "normal"
    created_at: "2026-05-10T10:00:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "home-002",
    name: "Pothos dorado (Epipremnum aureum)",
    description: "Planta colgante muy resistente.",
    care: "Riego cada 10 días.",
    diagnosis: "Hojas amarillas en la base.",
    image_url: "data:image/jpeg;base64,/9j/home002",
    context: "home" as const,
    watering_interval_days: 10,
    last_watered_at: isoDaysAgo(10), // X = 0 → "urgent"
    created_at: "2026-04-15T10:00:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "home-003",
    name: "Ficus elastica (Ficus elastica)",
    description: "Árbol de interior de hojas brillantes.",
    care: "Luz brillante, riego moderado.",
    diagnosis: "Buen estado.",
    image_url: "data:image/jpeg;base64,/9j/home003",
    context: "home" as const,
    watering_interval_days: 7,
    last_watered_at: isoDaysAgo(12), // X = -5 → "overdue"
    created_at: "2026-03-20T10:00:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "home-004",
    name: "Begonia maculata",
    description: "Begonia con motas blancas.",
    care: "Luz filtrada, ambiente húmedo.",
    diagnosis: "Buen estado.",
    image_url: "data:image/jpeg;base64,/9j/home004",
    context: "home" as const,
    watering_interval_days: null, // IA didn't determine → pending-first, picker opens empty
    last_watered_at: null,
    created_at: "2026-05-15T10:00:00Z",
    user_id: MOCK_USER.id,
  },
  {
    id: "home-005",
    name: "Aloe vera",
    description: "Suculenta resistente.",
    care: "Riego escaso, sol directo.",
    diagnosis: "Buen estado.",
    image_url: "data:image/jpeg;base64,/9j/home005",
    context: "home" as const,
    watering_interval_days: 14, // IA recommended → pending-first, picker prefilled with 14
    last_watered_at: null,
    created_at: "2026-05-16T10:00:00Z",
    user_id: MOCK_USER.id,
  },
];

// ---------------------------------------------------------------------------
// Supabase URL detection
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://sdxfxkqzgnonxfshbjfc.supabase.co";

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

/** Mock all Supabase auth endpoints to return "no session" (anonymous user). */
async function mockSupabaseAnonymous(page: Page) {
  // Auth session check
  await page.route(`${SUPABASE_URL}/auth/v1/token*`, (route) =>
    route.fulfill({ status: 400, json: { error: "invalid_grant" } }),
  );

  // getSession / getUser
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) =>
    route.fulfill({ status: 401, json: { error: "not_authenticated" } }),
  );

  // onAuthStateChange will try to recover session from storage — we let it
  // fail naturally by not mocking the token refresh endpoint specifically.
}

/** Mock Supabase auth to return an authenticated session. */
async function mockSupabaseAuthenticated(page: Page) {
  // Sign in with password
  await page.route(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    (route) =>
      route.fulfill({
        status: 200,
        json: MOCK_SESSION,
      }),
  );

  // Get user
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) =>
    route.fulfill({ status: 200, json: MOCK_USER }),
  );

  // Sign up
  await page.route(`${SUPABASE_URL}/auth/v1/signup`, (route) =>
    route.fulfill({
      status: 200,
      json: { ...MOCK_SESSION, user: { ...MOCK_USER, email_confirmed_at: null } },
    }),
  );
}

/** Mock the identify-plant edge function. */
async function mockIdentifyPlant(page: Page) {
  await page.route(
    `${SUPABASE_URL}/functions/v1/identify-plant`,
    (route) =>
      route.fulfill({
        status: 200,
        json: MOCK_PLANT,
      }),
  );
}

/** Mock the plant_searches table (history). */
async function mockPlantHistory(page: Page, items = MOCK_HISTORY_ITEMS) {
  await page.route(
    `${SUPABASE_URL}/rest/v1/plant_searches*`,
    (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({ status: 200, json: [] });
      }
      return route.fulfill({ status: 200, json: items });
    },
  );
}

/** Mock claim_anonymous_searches RPC. */
async function mockClaimSearches(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/claim_anonymous_searches`, (route) =>
    route.fulfill({ status: 200, json: null }),
  );
}

/** Dismiss the cookie consent banner by pre-setting consent in localStorage. */
async function dismissCookieConsent(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "plantita_consent",
      JSON.stringify({ analytics: false, sessionRecording: false }),
    );
  });
}

/** Block PostHog and other analytics. */
async function blockAnalytics(page: Page) {
  await page.route("**/*posthog*/**", (route) => route.abort());
  await page.route("**/us.i.posthog.com/**", (route) => route.abort());
}

// ---------------------------------------------------------------------------
// Custom test fixture
// ---------------------------------------------------------------------------

type Fixtures = {
  /** Set up mocks for an anonymous (not logged in) user. */
  asAnonymous: void;
  /** Set up mocks for an authenticated user with history. */
  asAuthenticated: void;
};

export const test = base.extend<Fixtures>({
  asAnonymous: [
    async ({ page }, use) => {
      await dismissCookieConsent(page);
      await blockAnalytics(page);
      await mockSupabaseAnonymous(page);
      await mockIdentifyPlant(page);
      await use();
    },
    { auto: false },
  ],

  asAuthenticated: [
    async ({ page }, use) => {
      await dismissCookieConsent(page);
      await blockAnalytics(page);
      await mockSupabaseAuthenticated(page);
      await mockIdentifyPlant(page);
      await mockPlantHistory(page);
      await mockClaimSearches(page);

      // Pre-set auth session in localStorage so AuthContext picks it up
      await page.addInitScript((session) => {
        const storageKey = `sb-sdxfxkqzgnonxfshbjfc-auth-token`;
        localStorage.setItem(storageKey, JSON.stringify(session));
      }, MOCK_SESSION);

      await use();
    },
    { auto: false },
  ],
});

export { expect } from "@playwright/test";
