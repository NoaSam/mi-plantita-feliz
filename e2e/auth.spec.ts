import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("shows auth forms when visiting /mis-plantas unauthenticated", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/mis-plantas");

    // Should show auth UI inline, not redirect
    await expect(page.getByRole("heading", { name: "Mis plantas" })).toBeVisible();
    await expect(
      page.getByText(/inicia sesión/i),
    ).toBeVisible();

    // Should have login/register tabs
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Crear cuenta" })).toBeVisible();
  });

  test("login with valid credentials navigates to history", async ({
    page,
    asAnonymous,
  }) => {
    // Override the token mock from asAnonymous to allow login
    await page.route("**/auth/v1/token?grant_type=password", (route) =>
      route.fulfill({
        status: 200,
        json: {
          access_token: "e2e-access-token",
          refresh_token: "e2e-refresh-token",
          token_type: "bearer",
          expires_in: 3600,
          user: {
            id: "user-e2e-001",
            email: "test@plantita.dev",
            aud: "authenticated",
            role: "authenticated",
          },
        },
      }),
    );

    // Mock history endpoint for after login
    await page.route("**/rest/v1/plant_searches*", (route) =>
      route.fulfill({ status: 200, json: [] }),
    );

    // Mock claim RPC
    await page.route("**/rest/v1/rpc/claim_anonymous_searches", (route) =>
      route.fulfill({ status: 200, json: null }),
    );

    // Mock user endpoint for after login
    await page.route("**/auth/v1/user", (route) =>
      route.fulfill({
        status: 200,
        json: { id: "user-e2e-001", email: "test@plantita.dev", aud: "authenticated", role: "authenticated" },
      }),
    );

    await page.goto("/mis-plantas");

    // Fill login form
    await page.getByLabel("Email").fill("test@plantita.dev");
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Should show the history page content (the heading stays "Mis Plantas")
    await expect(page.getByRole("heading", { name: "Mis Plantas" })).toBeVisible({ timeout: 5000 });
  });

  test("login with wrong credentials shows Spanish error", async ({
    page,
    asAnonymous,
  }) => {
    // Override auth mock to return invalid credentials
    await page.route("**/auth/v1/token*", (route) =>
      route.fulfill({
        status: 400,
        json: {
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        },
      }),
    );

    await page.goto("/mis-plantas");

    await page.getByLabel("Email").fill("wrong@email.com");
    await page.getByLabel("Contraseña").fill("wrongpass");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Should show translated error
    await expect(
      page.getByText("Email o contraseña incorrectos"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("register form validates matching passwords", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/mis-plantas");

    // Switch to register tab
    await page.getByRole("tab", { name: "Crear cuenta" }).click();

    // Fill with mismatched passwords
    await page.getByLabel("Email").fill("new@plantita.dev");
    await page.locator("#register-password").fill("password123");
    await page.getByLabel("Repetir contraseña").fill("different456");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // Should show validation error
    await expect(
      page.getByText("Las contraseñas no coinciden"),
    ).toBeVisible({ timeout: 3000 });
  });

  test("successful registration shows email confirmation message", async ({
    page,
    asAnonymous,
  }) => {
    // Mock signup endpoint with a realistic GoTrue response
    await page.route("**/auth/v1/signup**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-user",
          aud: "authenticated",
          role: "authenticated",
          email: "new@plantita.dev",
          phone: "",
          confirmation_sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          identities: [],
        }),
      }),
    );

    await page.goto("/mis-plantas");
    await page.getByRole("tab", { name: "Crear cuenta" }).click();

    await page.getByLabel("Email").fill("new@plantita.dev");
    // Use exact match to avoid matching "Repetir contraseña" label
    await page.locator("#register-password").fill("password123");
    await page.getByLabel("Repetir contraseña").fill("password123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // Should show email confirmation screen
    await expect(page.getByText("Revisa tu email")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("new@plantita.dev")).toBeVisible();
  });

  test("authenticated user sees 3 tabs", async ({
    page,
    asAuthenticated,
  }) => {
    await page.goto("/");

    const tabs = page.locator("nav button");
    await expect(tabs).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
  });
});
