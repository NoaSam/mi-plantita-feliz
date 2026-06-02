import { test, expect, MOCK_HOME_PLANTS } from "./fixtures";

const SUPABASE_PLANT_SEARCHES =
  "https://sdxfxkqzgnonxfshbjfc.supabase.co/rest/v1/plant_searches*";

const FIXED_CLOCK = new Date("2026-05-17T12:00:00Z");

function mockPlantSearches(page: import("@playwright/test").Page) {
  return page.route("**/rest/v1/plant_searches*", (route) => {
    const m = route.request().method();
    if (m === "DELETE" || m === "PATCH") {
      return route.fulfill({ status: 200, json: [] });
    }
    return route.fulfill({
      status: 200,
      headers: {
        "content-range": `0-${MOCK_HOME_PLANTS.length - 1}/${MOCK_HOME_PLANTS.length}`,
      },
      json: MOCK_HOME_PLANTS,
    });
  });
}

test.describe("Calendar (/regar)", () => {
  test("happy path: tap Regar shows toast with Modificar frecuencia and resets countdown", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await mockPlantSearches(page);

    await page.goto("/regar");

    await expect(
      page.locator("article[data-watering-status]").first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "¿Toca regar?" }),
    ).toBeVisible();
    await expect(
      page.locator("[data-watering-focus]"),
    ).toContainText(/Hoy toca regar \d+ planta/);

    const cards = page.locator("article[data-watering-status]");
    await expect(cards).toHaveCount(MOCK_HOME_PLANTS.length);

    const firstCard = cards.first();
    await expect(firstCard).toHaveAttribute("data-watering-status", "overdue");

    await firstCard.getByRole("button", { name: /^Regar Ficus/ }).click();

    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast.getByText(/✓ Regada · Siguiente riego en/)).toBeVisible();
    await expect(
      toast.getByRole("button", { name: "Modificar frecuencia" }),
    ).toBeVisible();

    await expect(firstCard).toHaveAttribute(
      "data-watering-status",
      /normal|urgent/,
      { timeout: 5000 },
    );
  });

  test("toast 'Modificar frecuencia' opens the picker pre-filled with the plant interval", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await mockPlantSearches(page);

    await page.goto("/regar");
    const firstCard = page.locator("article[data-watering-status]").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    await firstCard.getByRole("button", { name: /^Regar Ficus/ }).click();

    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await toast.getByRole("button", { name: "Modificar frecuencia" }).click();

    const input = page.locator('input[type="number"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue("7");
  });

  test("tap on frequency text opens picker + save updates the card", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await mockPlantSearches(page);

    await page.goto("/regar");
    const firstCard = page.locator("article[data-watering-status]").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    await firstCard
      .getByRole("button", { name: /Frecuencia de riego: Cada 7 días/ })
      .click();

    await expect(page.getByText("Frecuencia de riego").first()).toBeVisible();
    const input = page.locator('input[type="number"]');
    await expect(input).toHaveValue("7");

    await input.fill("10");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(
      page.getByText(/Frecuencia actualizada · Cada 10 días/),
    ).toBeVisible({ timeout: 5000 });
    await expect(input).not.toBeVisible();
  });

  test("pending-first plant without IA recommendation: picker opens empty, single toast after save", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await mockPlantSearches(page);

    await page.goto("/regar");
    await expect(page.locator("article[data-watering-status]").first()).toBeVisible({
      timeout: 10000,
    });

    const begoniaCard = page.locator('article[aria-label="Planta: Begonia maculata"]');
    await expect(begoniaCard).toHaveAttribute("data-watering-status", "pending-first");

    await begoniaCard.getByRole("button", { name: /^Regar Begonia/ }).click();

    const input = page.locator('input[type="number"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue("");

    await input.fill("5");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(
      page.getByText(/✓ Regada · Siguiente riego en 5 días/),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/Frecuencia actualizada · Cada 5 días/),
    ).toHaveCount(0);
  });

  test("pending-first plant WITH IA recommendation: picker pre-filled, save unchanged just logs the watering", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await mockPlantSearches(page);

    await page.goto("/regar");
    await expect(page.locator("article[data-watering-status]").first()).toBeVisible({
      timeout: 10000,
    });

    const aloeCard = page.locator('article[aria-label="Planta: Aloe vera"]');
    await expect(aloeCard).toHaveAttribute("data-watering-status", "pending-first");

    await aloeCard.getByRole("button", { name: /^Regar Aloe/ }).click();

    const input = page.locator('input[type="number"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue("14");

    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(
      page.getByText(/✓ Regada · Siguiente riego en 14 días/),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/Frecuencia actualizada/),
    ).toHaveCount(0);
  });

  test("tap on card body navigates to /planta/:id", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
    await page.clock.setFixedTime(FIXED_CLOCK);
    await page.unroute(SUPABASE_PLANT_SEARCHES);
    await mockPlantSearches(page);

    await page.goto("/regar");
    const firstCard = page.locator("article[data-watering-status]").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    await firstCard.locator("img").click();

    await expect(page).toHaveURL(/\/planta\/home-003/, { timeout: 5000 });
  });

  test("redirects to / when user has zero home plants", async ({
    page,
    asAuthenticated: _asAuth,
  }) => {
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

    await expect(page).not.toHaveURL(/\/regar/, { timeout: 5000 });
    await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible({
      timeout: 5000,
    });
  });
});
