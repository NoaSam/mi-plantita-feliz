import { test, expect } from "./fixtures";

test.describe("Smoke tests", () => {
  test("home page loads with title and photo button", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/");

    await expect(
      page.getByText("Hola, ¿qué planta quieres ver hoy?"),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: /hacer foto/i })).toBeVisible();
  });

  test("bottom tabs navigate between pages", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/");

    // Should see 2 tabs when anonymous
    const tabs = page.locator("nav button");
    await expect(tabs).toHaveCount(2);

    // Navigate to Mis plantas
    await page.getByRole("button", { name: "Mis plantas" }).click();
    await expect(page).toHaveURL("/mis-plantas");

    // Navigate back to Inicio
    await page.getByRole("button", { name: "Inicio" }).click();
    await expect(page).toHaveURL("/");
  });

  test("/login redirects to /mis-plantas", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/mis-plantas");
  });

  test("legal pages are accessible without login", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/privacidad");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).toContainText(/privacidad/i);

    await page.goto("/terminos");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).toContainText(/términos|condiciones/i);
  });

  test("authenticated user can navigate to settings", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ajustes" }).click();
    await expect(page).toHaveURL("/ajustes");
  });

  test("404 page shows for unknown routes", async ({ page, asAnonymous }) => {
    await page.goto("/ruta-que-no-existe");
    await expect(page.getByText(/no encontrada|not found/i)).toBeVisible();
  });
});
