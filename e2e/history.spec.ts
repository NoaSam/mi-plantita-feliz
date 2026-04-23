import { test, expect, MOCK_HISTORY_ITEMS } from "./fixtures";

test.describe("Plant history", () => {
  test("shows plant history list for authenticated user", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/mis-plantas");

    // Wait for history to load
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Pothos dorado")).toBeVisible();
    await expect(page.getByText("Ficus elastica")).toBeVisible();
  });

  test("search filters plants by name", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });

    // Type in search
    await page.getByPlaceholder("Buscar planta...").fill("Pothos");

    // Should only show Pothos
    await expect(page.getByText("Pothos dorado")).toBeVisible();
    await expect(page.getByText("Monstera deliciosa")).not.toBeVisible();
    await expect(page.getByText("Ficus elastica")).not.toBeVisible();
  });

  test("month filter shows only matching plants", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });

    // Select March (Monstera is April, Pothos is March, Ficus is January)
    await page.locator("select").selectOption("3"); // Marzo

    await expect(page.getByText("Pothos dorado")).toBeVisible();
    await expect(page.getByText("Monstera deliciosa")).not.toBeVisible();
    await expect(page.getByText("Ficus elastica")).not.toBeVisible();
  });

  test("card expands to show full details", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });

    // Click on the first card to expand
    await page.getByText("Monstera deliciosa").click();

    // Should show expanded content
    await expect(page.getByText("Qué es")).toBeVisible();
    await expect(page.getByText("Cuidados")).toBeVisible();
    await expect(page.getByText("Diagnóstico")).toBeVisible();
  });

  test("empty state shows message", async ({
    page,
    asAuthenticated,
  }) => {
    // Override history mock to return empty
    await page.route("**/rest/v1/plant_searches*", (route) =>
      route.fulfill({ status: 200, json: [] }),
    );

    await page.goto("/mis-plantas");

    await expect(
      page.getByText("No hay plantas guardadas"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("edit mode allows selecting and deleting plants", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });

    // Enter edit mode
    await page.getByText("Editar").click();

    // Select the first plant by clicking its card
    await page.getByText("Monstera deliciosa").click();

    // Delete bar should appear
    await expect(page.getByRole("button", { name: /borrar 1 planta/i })).toBeVisible();

    // Click delete
    await page.getByRole("button", { name: /borrar 1 planta/i }).click();

    // Confirmation dialog should appear
    await expect(page.getByText("¿Borrar esta planta?")).toBeVisible();
    await expect(
      page.getByText("no se puede deshacer"),
    ).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: "Sí, borrar" }).click();

    // Should exit edit mode (Editar button visible again)
    await expect(page.getByText("Editar")).toBeVisible({ timeout: 3000 });
  });

  test("search with no results shows empty message", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder("Buscar planta...").fill("Cactus inexistente");

    await expect(page.getByText("No hay plantas guardadas")).toBeVisible();
  });
});
