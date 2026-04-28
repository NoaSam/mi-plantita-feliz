/**
 * Generate Google Play Store assets using Playwright.
 *
 * Produces:
 * - store-assets/icon-512.png        (512x512 app icon)
 * - store-assets/feature-graphic.png  (1024x500 feature graphic)
 * - store-assets/screenshot-*.png     (1080x1920 marketing screenshots)
 *
 * Usage:  npx tsx scripts/generate-store-assets.ts
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const OUT = path.resolve("store-assets");
fs.mkdirSync(OUT, { recursive: true });

// Brand colors (from index.css / tailwind config)
const GREEN = "#2D5A27";
const GREEN_LIGHT = "#3D7A34";
const BG = "#FDFCF8";
const FG = "#1A2E0A";

// ---------------------------------------------------------------------------
// 1. App Icon (512x512)
// ---------------------------------------------------------------------------

const ICON_HTML = `
<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 512px; height: 512px;
    background: ${GREEN};
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .icon {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .leaf {
    width: 200px; height: 200px;
    fill: none; stroke: ${BG}; stroke-width: 1.5;
  }
</style></head>
<body>
  <div class="icon">
    <svg class="leaf" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
</body></html>`;

// ---------------------------------------------------------------------------
// 2. Feature Graphic (1024x500)
// ---------------------------------------------------------------------------

const FEATURE_HTML = `
<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Outfit:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1024px; height: 500px;
    background: linear-gradient(135deg, ${GREEN} 0%, ${GREEN_LIGHT} 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif;
    color: ${BG};
    overflow: hidden;
    position: relative;
  }
  .content {
    display: flex; flex-direction: column; align-items: center; gap: 20px;
    z-index: 1;
  }
  .leaf { width: 80px; height: 80px; fill: none; stroke: ${BG}; stroke-width: 1.5; opacity: 0.9; }
  h1 { font-family: 'Fraunces', serif; font-size: 56px; font-weight: 700; letter-spacing: -0.02em; }
  p { font-size: 24px; opacity: 0.9; font-weight: 400; }
  .bg-leaf {
    position: absolute; opacity: 0.08;
    fill: none; stroke: ${BG}; stroke-width: 0.8;
  }
  .bg1 { width: 300px; height: 300px; top: -60px; right: -40px; transform: rotate(30deg); }
  .bg2 { width: 250px; height: 250px; bottom: -50px; left: -30px; transform: rotate(-20deg); }
</style></head>
<body>
  <svg class="bg-leaf bg1" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <svg class="bg-leaf bg2" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <div class="content">
    <svg class="leaf" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <h1>Mi Jardín</h1>
    <p>Identifica plantas con una foto</p>
  </div>
</body></html>`;

// ---------------------------------------------------------------------------
// 3. Screenshot frame template
// ---------------------------------------------------------------------------

function screenshotFrameHTML(
  headline: string,
  appScreenshotBase64: string,
): string {
  return `
<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Outfit:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1920px;
    background: ${GREEN};
    display: flex; flex-direction: column; align-items: center;
    font-family: 'Outfit', sans-serif;
    overflow: hidden;
  }
  .headline {
    padding: 80px 60px 40px;
    text-align: center;
    color: ${BG};
    font-family: 'Fraunces', serif;
    font-size: 52px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .phone-frame {
    flex: 1;
    width: 100%;
    display: flex; justify-content: center; align-items: flex-start;
    padding: 0 60px;
  }
  .phone {
    width: 380px;
    height: 780px;
    border-radius: 36px;
    overflow: hidden;
    border: 4px solid rgba(255,255,255,0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    background: ${BG};
  }
  .phone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
</style></head>
<body>
  <div class="headline">${headline}</div>
  <div class="phone-frame">
    <div class="phone">
      <img src="data:image/png;base64,${appScreenshotBase64}" />
    </div>
  </div>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Supabase mock helpers (same as e2e fixtures)
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://sdxfxkqzgnonxfshbjfc.supabase.co";

const MOCK_USER = { id: "user-e2e-001", email: "test@plantita.dev", aud: "authenticated", role: "authenticated" };
const MOCK_SESSION = { access_token: "e2e-access-token", refresh_token: "e2e-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: MOCK_USER };
const MOCK_PLANT = {
  plant_search_id: "plant-001",
  name: "Monstera deliciosa (Monstera deliciosa)",
  description: "La **Monstera deliciosa** es una planta tropical originaria de los bosques de América Central.",
  care: "**Riego**: Cada 7-10 días. **Luz**: Indirecta brillante. **Temperatura**: 18-27°C.",
  diagnosis: "La planta se ve **saludable**. No se detectan signos de enfermedad.",
  model: "claude",
  created_at: new Date().toISOString(),
  models: [{ model: "claude", consensus_group: "correct" }, { model: "gemini", consensus_group: "correct" }, { model: "gpt4o", consensus_group: "correct" }],
};
const MOCK_HISTORY = [
  { id: "plant-001", name: "Monstera deliciosa", description: "Planta tropical.", care: "Riego semanal.", diagnosis: "Saludable.", image_url: "data:image/jpeg;base64,/9j/mock", created_at: "2026-04-10T10:00:00Z", user_id: MOCK_USER.id },
  { id: "plant-002", name: "Pothos dorado", description: "Planta colgante.", care: "Riego cada 10 días.", diagnosis: "Hojas amarillas.", image_url: "data:image/jpeg;base64,/9j/mock2", created_at: "2026-03-15T14:30:00Z", user_id: MOCK_USER.id },
  { id: "plant-003", name: "Ficus elastica", description: "Árbol de interior.", care: "Luz brillante.", diagnosis: "Buen estado.", image_url: "data:image/jpeg;base64,/9j/mock3", created_at: "2026-01-20T09:00:00Z", user_id: MOCK_USER.id },
];

import type { Page } from "@playwright/test";

async function setupMocks(page: Page, authenticated: boolean) {
  // Dismiss cookie consent
  await page.addInitScript(() => {
    localStorage.setItem("plantita_consent", JSON.stringify({ analytics: false, sessionRecording: false }));
  });
  // Block analytics
  await page.route("**/*posthog*/**", (route) => route.abort());
  await page.route("**/us.i.posthog.com/**", (route) => route.abort());

  if (authenticated) {
    await page.route(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, (r) => r.fulfill({ status: 200, json: MOCK_SESSION }));
    await page.route(`${SUPABASE_URL}/auth/v1/user`, (r) => r.fulfill({ status: 200, json: MOCK_USER }));
    await page.route(`${SUPABASE_URL}/auth/v1/signup`, (r) => r.fulfill({ status: 200, json: MOCK_SESSION }));
    await page.route(`${SUPABASE_URL}/rest/v1/plant_searches*`, (r) => {
      if (r.request().method() === "DELETE") return r.fulfill({ status: 200, json: [] });
      return r.fulfill({ status: 200, json: MOCK_HISTORY });
    });
    await page.route(`${SUPABASE_URL}/rest/v1/rpc/claim_anonymous_searches`, (r) => r.fulfill({ status: 200, json: null }));
    await page.addInitScript((session) => {
      localStorage.setItem("sb-sdxfxkqzgnonxfshbjfc-auth-token", JSON.stringify(session));
    }, MOCK_SESSION);
  } else {
    await page.route(`${SUPABASE_URL}/auth/v1/token*`, (r) => r.fulfill({ status: 400, json: { error: "invalid_grant" } }));
    await page.route(`${SUPABASE_URL}/auth/v1/user`, (r) => r.fulfill({ status: 401, json: { error: "not_authenticated" } }));
  }
  await page.route(`${SUPABASE_URL}/functions/v1/identify-plant`, (r) => r.fulfill({ status: 200, json: MOCK_PLANT }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const browser = await chromium.launch();

  // ---- Icon ----
  console.log("Generating icon...");
  const iconCtx = await browser.newContext({ viewport: { width: 512, height: 512 } });
  const iconPage = await iconCtx.newPage();
  await iconPage.setContent(ICON_HTML, { waitUntil: "networkidle" });
  await iconPage.screenshot({ path: path.join(OUT, "icon-512.png") });
  await iconCtx.close();

  // ---- Feature Graphic ----
  console.log("Generating feature graphic...");
  const fgCtx = await browser.newContext({ viewport: { width: 1024, height: 500 } });
  const fgPage = await fgCtx.newPage();
  await fgPage.setContent(FEATURE_HTML, { waitUntil: "networkidle" });
  await fgPage.screenshot({ path: path.join(OUT, "feature-graphic.png") });
  await fgCtx.close();

  // ---- App Screenshots (Pixel 7 viewport: 412x915, scale to 1080x1920 via deviceScaleFactor) ----
  const screenshotDefs = [
    { name: "01-home", url: "/", authenticated: false, headline: "Identifica cualquier planta con una foto" },
    { name: "02-result", url: "/", authenticated: false, headline: "Cuidados personalizados para cada planta", action: "identify" },
    { name: "03-history", url: "/mis-plantas", authenticated: true, headline: "Tu colección de plantas guardada" },
    { name: "04-login", url: "/mis-plantas", authenticated: false, headline: "Crea tu cuenta en segundos" },
  ];

  // Create a test image for identification
  const testImagePath = path.resolve("e2e/test-image.png");
  if (!fs.existsSync(testImagePath)) {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
    fs.writeFileSync(testImagePath, png);
  }

  for (const def of screenshotDefs) {
    console.log(`Capturing ${def.name}...`);

    // Raw app screenshot at Pixel 7 resolution
    const appCtx = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
    });
    const appPage = await appCtx.newPage();
    await setupMocks(appPage, def.authenticated);
    await appPage.goto(`http://localhost:8080${def.url}`, { waitUntil: "networkidle" });

    if (def.action === "identify") {
      const fileInput = appPage.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      // Dismiss location modal if present
      const decline = appPage.getByRole("button", { name: /no, gracias|no compartir|ahora no/i });
      if (await decline.isVisible({ timeout: 2000 }).catch(() => false)) {
        await decline.click();
      }
      await appPage.getByText(MOCK_PLANT.name).waitFor({ timeout: 10000 });
    }

    // Wait for content
    await appPage.waitForTimeout(500);

    const rawScreenshot = await appPage.screenshot({ type: "png" });
    const base64 = rawScreenshot.toString("base64");
    await appCtx.close();

    // Render marketing frame with embedded screenshot
    const frameCtx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const framePage = await frameCtx.newPage();
    await framePage.setContent(screenshotFrameHTML(def.headline, base64), { waitUntil: "networkidle" });
    await framePage.waitForTimeout(300);
    await framePage.screenshot({ path: path.join(OUT, `screenshot-${def.name}.png`) });
    await frameCtx.close();
  }

  await browser.close();
  console.log(`\nDone! Assets saved to ${OUT}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
