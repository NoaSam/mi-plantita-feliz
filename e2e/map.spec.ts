import { test, expect, MOCK_WILD_WITH_COORDS } from "./fixtures";

const SUPABASE_PLANT_SEARCHES = "https://sdxfxkqzgnonxfshbjfc.supabase.co/rest/v1/plant_searches*";

/**
 * Phase 03.1 — Plant Map v0 E2E tests
 *
 * Cubre SPEC-AC9 happy path: /mapa → pins → tap → sheet → "Ver detalle" →
 * /planta/:id. Adicionalmente: AC1 (tab not visible sin wild),
 * AC12 (tile failure resilience).
 *
 * Las requests a tile.openstreetmap.org se bloquean en todos los tests
 * (page.route abort) para que sean offline-safe y deterministas.
 */

test.describe("Plant map (/mapa)", () => {
  // ───────────────────────────────────────────────────────────────────
  // SPEC-AC9 happy path: /mapa → pin → sheet → "Ver detalle" → /planta/:id
  // ───────────────────────────────────────────────────────────────────
  test("happy path: navigate /mapa, see pins, tap pin, open sheet, navigate to detail", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await page.route("**/rest/v1/plant_searches*", (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({ status: 200, json: [] });
      }
      return route.fulfill({
        status: 200,
        headers: {
          "content-range": `0-${MOCK_WILD_WITH_COORDS.length - 1}/${MOCK_WILD_WITH_COORDS.length}`,
        },
        json: MOCK_WILD_WITH_COORDS,
      });
    });

    // Block OSM tile requests so the test is offline-safe + deterministic.
    await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());

    // AC4: navigate directly to /mapa loads MapPage (not NotFound).
    await page.goto("/mapa");

    // AC5: exactly N markers rendered in the DOM. Bumped timeout: webkit needs
    // a beat for the addInitScript localStorage + auth subscription to settle.
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(
      MOCK_WILD_WITH_COORDS.length,
    );

    // AC11: OSM attribution link visible.
    await expect(page.locator(".leaflet-control-attribution")).toBeVisible();
    await expect(
      page.locator(".leaflet-control-attribution a[href*='openstreetmap.org/copyright']"),
    ).toBeVisible();

    // AC7: tap first pin → sheet opens.
    await page.locator(".leaflet-marker-icon").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // First pin (sorted desc by created_at) → wild-001 "Salvia rosmarinus".
    await expect(dialog.getByText("Salvia rosmarinus")).toBeVisible();
    await expect(dialog.getByText("Rosmarinus officinalis")).toBeVisible();
    await expect(dialog.getByText(/Identificada el .* de .* de 2026/)).toBeVisible();

    // AC8: tap "Ver detalle" → URL changes to /planta/wild-001.
    await dialog.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page).toHaveURL(/\/planta\/wild-001/, { timeout: 5000 });
  });

  // ───────────────────────────────────────────────────────────────────
  // SPEC-AC1: tab "Mapa" NOT visible when user has zero wild-with-coords.
  // ───────────────────────────────────────────────────────────────────
  test("tab Mapa NOT visible when user has no wild-with-coords", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await page.route("**/rest/v1/plant_searches*", (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-range": "0-0/0" },
        json: [],
      }),
    );

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole("button", { name: "Mapa" })).toHaveCount(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // SPEC-AC12: if OSM tiles fail to load, MapPage does not crash.
  // ───────────────────────────────────────────────────────────────────
  test("MapPage survives OSM tile failures (pins still visible on gray)", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await page.route("**/rest/v1/plant_searches*", (route) =>
      route.fulfill({
        status: 200,
        headers: {
          "content-range": `0-${MOCK_WILD_WITH_COORDS.length - 1}/${MOCK_WILD_WITH_COORDS.length}`,
        },
        json: MOCK_WILD_WITH_COORDS,
      }),
    );
    // Block ALL tile requests with 503 (simulates CDN down).
    await page.route("**/tile.openstreetmap.org/**", (route) =>
      route.fulfill({ status: 503, body: "" }),
    );

    await page.goto("/mapa");

    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(
      MOCK_WILD_WITH_COORDS.length,
    );
    // No toast on tile failure (SPEC Constraints).
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  });
});
