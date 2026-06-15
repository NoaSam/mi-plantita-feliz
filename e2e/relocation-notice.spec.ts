import { test, expect } from "./fixtures";

const TOAST_TEXT = /Hemos movido Mis plantas a Ajustes/;

test.describe("HistoryRelocationNotice — route-scoped toast", () => {
  test("visiting / directly does NOT show the relocation toast", async ({
    page,
    asAnonymous: _,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(TOAST_TEXT)).toHaveCount(0);
  });

  test("visiting /regar directly does NOT show the relocation toast", async ({
    page,
    asAuthenticated: _,
  }) => {
    await page.goto("/regar");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(TOAST_TEXT)).toHaveCount(0);
  });

  test("visiting /mis-plantas DOES show the toast and redirect to /ajustes/mis-plantas", async ({
    page,
    asAuthenticated: _,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page).toHaveURL("/ajustes/mis-plantas");
    await expect(page.getByText(TOAST_TEXT)).toBeVisible({ timeout: 5000 });
  });

  test("second visit to /mis-plantas: redirect happens, toast does NOT repeat", async ({
    page,
    asAuthenticated: _,
  }) => {
    await page.goto("/mis-plantas");
    await expect(page).toHaveURL("/ajustes/mis-plantas");
    await expect(page.getByText(TOAST_TEXT)).toBeVisible({ timeout: 5000 });

    // Navigate away then back — flag persists in localStorage so toast must not re-fire.
    await page.goto("/");
    await page.goto("/mis-plantas");
    await expect(page).toHaveURL("/ajustes/mis-plantas");
    await page.waitForTimeout(1000);
    await expect(page.getByText(TOAST_TEXT)).toHaveCount(0);
  });
});
