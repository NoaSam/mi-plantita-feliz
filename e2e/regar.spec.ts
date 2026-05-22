import { test, expect, MOCK_HOME_PLANTS } from "./fixtures";

const SUPABASE_PLANT_SEARCHES =
  "https://sdxfxkqzgnonxfshbjfc.supabase.co/rest/v1/plant_searches*";

/**
 * Phase 3 — Calendar v0 E2E tests
 *
 * Cubre Success Criterion #11 (Playwright happy path: navegar /regar, ver
 * cards, tap Regar → toast con Deshacer → contador reset visual) y el caso
 * defensivo del redirect-on-empty.
 *
 * Las llamadas REST a plant_searches se mockean por test para evitar
 * dependencia del Supabase real. La clock se fija a 2026-05-17T12:00:00Z
 * (mismo anchor que usa MOCK_HOME_PLANTS) para que los status sean
 * deterministas y no flippeen por límites de día.
 */

const FIXED_CLOCK = new Date("2026-05-17T12:00:00Z");

test.describe("Calendar (/regar)", () => {
  // ───────────────────────────────────────────────────────────────────
  // Happy path: ver cards ordenadas, tap Regar, toast con Deshacer, counter reset
  // ───────────────────────────────────────────────────────────────────
  test("happy path: navigate /regar, see cards, tap Regar, toast con Deshacer, counter reset", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    // setFixedTime keeps Date.now() deterministic without pausing timers
    // (install() pauses setTimeout/requestAnimationFrame, which stalls
    // React's flush of the optimistic update + flash + toast).
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await page.route("**/rest/v1/plant_searches*", (route) => {
      const method = route.request().method();
      if (method === "DELETE") {
        return route.fulfill({ status: 200, json: [] });
      }
      // PATCH = UPDATE (Supabase REST). Respond 200 + empty array.
      if (method === "PATCH") {
        return route.fulfill({ status: 200, json: [] });
      }
      // GET = SELECT.
      return route.fulfill({
        status: 200,
        headers: {
          "content-range": `0-${MOCK_HOME_PLANTS.length - 1}/${MOCK_HOME_PLANTS.length}`,
        },
        json: MOCK_HOME_PLANTS,
      });
    });

    await page.goto("/regar");

    await expect(
      page.locator("article[data-watering-status]").first(),
    ).toBeVisible({ timeout: 10000 });

    // Header copy verbatim.
    await expect(
      page.getByRole("heading", { name: "¿Toca regar?" }),
    ).toBeVisible();
    await expect(page.getByText("Tus plantas casa")).toBeVisible();

    // D-09 sort: overdue first (home-003 Ficus elastica), then urgent
    // (home-002 Pothos), then normal (home-001 Monstera), then pending-first
    // (home-004 Begonia).
    const cards = page.locator("article[data-watering-status]");
    await expect(cards).toHaveCount(MOCK_HOME_PLANTS.length);

    const firstCard = cards.first();
    await expect(firstCard).toHaveAttribute("data-watering-status", "overdue");

    const regarButton = firstCard.getByRole("button", { name: /^Regar Ficus/ });
    await regarButton.click();

    // Toast con Deshacer aparece.
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast.getByText(/✓ Regada · Siguiente riego en/)).toBeVisible();
    await expect(toast.getByRole("button", { name: "Deshacer" })).toBeVisible();

    // Counter reset visual: la card debió cambiar de "overdue" a "normal".
    await expect(firstCard).toHaveAttribute(
      "data-watering-status",
      /normal|urgent/,
      { timeout: 5000 },
    );
  });

  // ───────────────────────────────────────────────────────────────────
  // Defensive: redirect a / cuando user no tiene plantas casa
  // ───────────────────────────────────────────────────────────────────
  test("redirects to / when user has zero home plants", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    // setFixedTime keeps Date.now() deterministic without pausing timers
    // (install() pauses setTimeout/requestAnimationFrame, which stalls
    // React's flush of the optimistic update + flash + toast).
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await page.route("**/rest/v1/plant_searches*", (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-range": "0-0/0" },
        json: [],
      }),
    );

    await page.goto("/regar");

    // Should silently redirect to /.
    await expect(page).not.toHaveURL(/\/regar/, { timeout: 5000 });
    // Inicio tab visible en el BottomTabBar (confirma que estamos en home).
    await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible({
      timeout: 5000,
    });
  });
});
