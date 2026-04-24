import path from "path";
import { fileURLToPath } from "url";
import { test, expect, MOCK_PLANT } from "./fixtures";

// We need a small test image — create one inline as a 1x1 red PNG
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGE_PATH = path.resolve(__dirname, "test-image.png");

test.describe("Plant identification flow", () => {
  test.beforeAll(async () => {
    // Create a minimal valid PNG for file upload tests
    const fs = await import("fs");
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      // 1x1 red PNG (smallest valid PNG)
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );
      fs.writeFileSync(TEST_IMAGE_PATH, png);
    }
  });

  test("upload photo → loading → result → reset", async ({
    page,
    asAnonymous,
  }) => {
    await page.goto("/");

    // Upload a photo via the hidden file input
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Location consent modal may appear — dismiss it
    const declineButton = page.getByRole("button", { name: /no, gracias|no compartir|ahora no/i });
    if (await declineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await declineButton.click();
    }

    // Should show loading screen (use first() to avoid strict mode — loading text appears in multiple elements)
    await expect(page.getByText(/analizando|identificando/i).first()).toBeVisible({ timeout: 5000 });

    // Should show result
    const plantName = MOCK_PLANT.name;
    await expect(page.getByText(plantName)).toBeVisible({ timeout: 10000 });

    // Accordion sections should be visible
    await expect(page.getByText("Qué es")).toBeVisible();
    await expect(page.getByText("Cómo cuidarla")).toBeVisible();
    await expect(page.getByText("Qué le pasa")).toBeVisible();

    // Reset button
    await page.getByRole("button", { name: /volver a empezar/i }).click();

    // Should be back to home
    await expect(
      page.getByText("Hola, ¿qué planta quieres ver hoy?"),
    ).toBeVisible();
  });

  test("shows error when edge function fails", async ({
    page,
    asAnonymous,
  }) => {
    // Override the identify-plant mock to return an error (non-200 triggers error path)
    await page.route("**/functions/v1/identify-plant", (route) =>
      route.fulfill({
        status: 429,
        json: { error: "Demasiadas consultas. Espera unos minutos." },
      }),
    );

    await page.goto("/");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Dismiss location modal if it appears
    const declineButton = page.getByRole("button", { name: /no, gracias|no compartir|ahora no/i });
    if (await declineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await declineButton.click();
    }

    // Should show error message
    await expect(page.getByText(/demasiadas consultas/i)).toBeVisible({ timeout: 10000 });
  });
});
