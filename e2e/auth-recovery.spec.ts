import { test, expect } from "./fixtures";

const SUPABASE_RECOVER =
  "https://sdxfxkqzgnonxfshbjfc.supabase.co/auth/v1/recover*";

test.describe("Password recovery", () => {
  test("login form exposes 'no recuerdas tu contraseña' link → /auth/recuperar", async ({
    page,
    asAnonymous: _,
  }) => {
    await page.goto("/ajustes/mis-plantas");
    await expect(
      page.getByRole("link", { name: /no recuerdas tu contraseña/i }),
    ).toBeVisible({ timeout: 5000 });

    await page
      .getByRole("link", { name: /no recuerdas tu contraseña/i })
      .click();
    await expect(page).toHaveURL("/auth/recuperar");
    await expect(
      page.getByRole("heading", { name: /no recuerdas tu contraseña/i }),
    ).toBeVisible();
  });

  test("submit email at /auth/recuperar → confirmation screen with email visible", async ({
    page,
    asAnonymous: _,
  }) => {
    await page.route(SUPABASE_RECOVER, (route) =>
      route.fulfill({ status: 200, json: {} }),
    );

    await page.goto("/auth/recuperar");
    await page.getByLabel("Email").fill("usuario@example.com");
    await page
      .getByRole("button", { name: /enviar enlace/i })
      .click();

    await expect(
      page.getByRole("heading", { name: /revisa tu email/i }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("usuario@example.com")).toBeVisible();
  });

  test("/auth/reset without a recovery session → expired link state", async ({
    page,
    asAnonymous: _,
  }) => {
    await page.goto("/auth/reset");
    await expect(
      page.getByRole("heading", { name: /enlace expirado/i }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("link", { name: /pedir un enlace nuevo/i }),
    ).toBeVisible();
  });
});
