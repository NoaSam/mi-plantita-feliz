import path from "path";
import { fileURLToPath } from "url";
import { test, expect, MOCK_PLANT } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGE_PATH = path.resolve(__dirname, "test-image.png");

// Disable all CSS animations and transitions for deterministic screenshots.
const DISABLE_ANIMATIONS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

async function freezeAnimations(page: import("@playwright/test").Page) {
  await page.addStyleTag({ content: DISABLE_ANIMATIONS });
  // Wait for any in-flight renders to settle
  await page.waitForTimeout(300);
}

// Shared threshold — allows small anti-aliasing differences across runs
const SCREENSHOT_OPTS = { maxDiffPixelRatio: 0.02 } as const;

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

test.describe("Visual regression", () => {
  test("home screen", async ({ page, asAnonymous }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("home.png", SCREENSHOT_OPTS);
  });

  test("auth screen (login tab)", async ({ page, asAnonymous }) => {
    await page.goto("/mis-plantas");
    await page.waitForLoadState("networkidle");
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("auth-login.png", SCREENSHOT_OPTS);
  });

  test("auth screen (register tab)", async ({ page, asAnonymous }) => {
    await page.goto("/mis-plantas");
    await page.getByRole("tab", { name: "Crear cuenta" }).click();
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("auth-register.png", SCREENSHOT_OPTS);
  });

  test("plant result", async ({ page, asAnonymous }) => {
    await page.goto("/");

    // Create test image if needed
    const fs = await import("fs");
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );
      fs.writeFileSync(TEST_IMAGE_PATH, png);
    }

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Dismiss location modal if it appears
    const decline = page.getByRole("button", { name: /no, gracias|no compartir|ahora no/i });
    if (await decline.isVisible({ timeout: 2000 }).catch(() => false)) {
      await decline.click();
    }

    // Wait for result to appear
    await expect(page.getByText(MOCK_PLANT.name)).toBeVisible({ timeout: 10000 });
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("plant-result.png", SCREENSHOT_OPTS);
  });

  test("history list", async ({ page, asAuthenticated }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("history-list.png", SCREENSHOT_OPTS);
  });

  test("history card expanded", async ({ page, asAuthenticated }) => {
    await page.goto("/mis-plantas");
    await expect(page.getByText("Monstera deliciosa")).toBeVisible({ timeout: 5000 });
    await page.getByText("Monstera deliciosa").click();
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("history-expanded.png", SCREENSHOT_OPTS);
  });

  test("history empty state", async ({ page, asAuthenticated }) => {
    await page.route("**/rest/v1/plant_searches*", (route) =>
      route.fulfill({ status: 200, json: [] }),
    );
    await page.goto("/mis-plantas");
    await expect(page.getByText("No hay plantas guardadas")).toBeVisible({ timeout: 5000 });
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("history-empty.png", SCREENSHOT_OPTS);
  });

  test("404 page", async ({ page, asAnonymous }) => {
    await page.goto("/pagina-inexistente");
    await freezeAnimations(page);

    await expect(page).toHaveScreenshot("404.png", SCREENSHOT_OPTS);
  });
});
