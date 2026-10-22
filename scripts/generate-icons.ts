/**
 * Single source of truth for the app icon across every surface.
 *
 * One leaf mark — the same path the Play Store icon uses — rendered into the
 * icon each platform expects:
 *
 *   assets/icon-only.png        1024  full-bleed, source for the legacy launcher icon
 *   assets/icon-foreground.png  1024  transparent, source for the adaptive icon
 *   assets/icon-background.png  1024  flat brand green
 *   public/favicon.ico            —   multi-size container: 16 / 32 / 48 / 64
 *   public/pwa-192.png           192  web app manifest
 *   public/pwa-512.png           512  web app manifest
 *   public/pwa-maskable-512.png  512  manifest, purpose "maskable"
 *   public/apple-touch-icon.png  180  iOS home screen
 *
 * Then runs @capacitor/assets to fan the source assets out across the Android
 * densities, and patches the adaptive icon XML it writes (see patchAdaptiveIcon).
 *
 * Usage:  npm run icons
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Brand colors — keep in sync with index.css and scripts/generate-store-assets.ts
const GREEN = "#2D5A27";
const CREAM = "#FDFCF8";

// The leaf. Same path as the Play Store icon, so every surface shows one mark.
const LEAF_PATH =
  "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75";

interface MarkOptions {
  size: number;
  /** Fraction of the canvas the leaf glyph spans. */
  scale: number;
  /** Flat background, or null for transparency. */
  background: string | null;
  /** Stroke width in the leaf's own 24-unit coordinate space. */
  stroke?: number;
}

function markSVG({ size, scale, background, stroke = 1.5 }: MarkOptions): Buffer {
  const glyph = size * scale;
  const offset = (size - glyph) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      (background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "") +
      (scale > 0
        ? `<svg x="${offset}" y="${offset}" width="${glyph}" height="${glyph}" viewBox="0 0 24 24">` +
          `<path d="${LEAF_PATH}" fill="none" stroke="${CREAM}" stroke-width="${stroke}" ` +
          `stroke-linecap="round" stroke-linejoin="round"/>` +
          `</svg>`
        : "") +
      `</svg>`,
  );
}

function render(opts: MarkOptions): Promise<Buffer> {
  return sharp(markSVG(opts)).png().toBuffer();
}

/**
 * Standalone PNGs drop the alpha channel when they have a background: iOS
 * composites a transparent apple-touch-icon onto black. The favicon entries
 * keep theirs, since PNG-inside-ICO is expected to carry alpha.
 */
function renderFlat(opts: MarkOptions): Promise<Buffer> {
  const pipe = sharp(markSVG(opts));
  return (opts.background ? pipe.flatten({ background: opts.background }) : pipe)
    .png()
    .toBuffer();
}

async function write(file: string, opts: MarkOptions): Promise<void> {
  const buf = await renderFlat(opts);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`  ${file}  ${opts.size}x${opts.size}  ${(buf.length / 1024).toFixed(1)} KB`);
}

/**
 * Pack PNGs into an .ico container.
 *
 * The previous favicon held a single 256px entry, so browsers downscaled an
 * oversized image for the 16px tab slot. Real small-size entries render sharp.
 */
function buildIco(images: { size: number; buf: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;

  for (const { size, buf } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
}

/**
 * @capacitor/assets always writes this XML with a 16.7% inset on BOTH layers.
 *
 * On the foreground that inset is correct — it is exactly Android's adaptive
 * icon safe zone (the inner 72dp of the 108dp canvas). On the background it is
 * a bug: the background layer has to cover the full canvas, because the
 * launcher mask crops right at the edge. Inset, it leaves the corners
 * transparent on whatever shape the launcher applies.
 *
 * The tool rewrites these files on every run, so this patch runs after it.
 */
function patchAdaptiveIcon(): void {
  const dir = path.resolve("android/app/src/main/res/mipmap-anydpi-v26");
  const patched = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;

  for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      console.warn(`  ! ${file} missing — did capacitor-assets run?`);
      continue;
    }
    fs.writeFileSync(file, patched);
    console.log(`  patched ${path.relative(process.cwd(), file)}`);
  }
}

async function main(): Promise<void> {
  console.log("Source assets for @capacitor/assets:");
  // Full-bleed. The launcher mask crops the corners, so the glyph stays modest.
  await write("assets/icon-only.png", { size: 1024, scale: 0.39, background: GREEN });
  // Transparent and larger: the 16.7% safe-zone inset shrinks it again to ~50%.
  await write("assets/icon-foreground.png", { size: 1024, scale: 0.75, background: null });
  await write("assets/icon-background.png", { size: 1024, scale: 0, background: GREEN });

  console.log("\nWeb icons:");
  await write("public/pwa-192.png", { size: 192, scale: 0.39, background: GREEN });
  await write("public/pwa-512.png", { size: 512, scale: 0.39, background: GREEN });
  // Maskable: Android crops to a circle, so the glyph stays inside the inner 80%.
  await write("public/pwa-maskable-512.png", { size: 512, scale: 0.33, background: GREEN });
  // iOS draws its own rounded mask and does not accept transparency.
  await write("public/apple-touch-icon.png", { size: 180, scale: 0.39, background: GREEN });

  console.log("\nFavicon:");
  const faviconSizes = [16, 32, 48, 64];
  const faviconImages = await Promise.all(
    faviconSizes.map(async (size) => ({
      size,
      // Thicker stroke and a larger glyph: at 16px a hairline disappears.
      buf: await render({ size, scale: 0.62, background: GREEN, stroke: 2.1 }),
    })),
  );
  const ico = buildIco(faviconImages);
  fs.writeFileSync("public/favicon.ico", ico);
  console.log(`  public/favicon.ico  ${faviconSizes.join("/")}  ${(ico.length / 1024).toFixed(1)} KB`);

  console.log("\nRunning @capacitor/assets...");
  execFileSync("npx", ["capacitor-assets", "generate", "--android"], { stdio: "inherit" });

  console.log("\nPatching adaptive icon XML:");
  patchAdaptiveIcon();

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
