/**
 * Backfill legacy base64 data URIs in plant_searches.image_url → Supabase
 * Storage HTTPS URLs.
 *
 * One-off migration script (per D-05 in 04.1-CONTEXT.md). CPO runs this
 * MANUALLY, from a local shell, with a service_role key in ./.env. Do NOT
 * wire this into deploys — see D-05.
 *
 * ─── BACKUP RUNBOOK (per D-04, MANDATORY before running) ─────────────
 *
 *   Option A (recommended, requires Supabase CLI):
 *     supabase db dump --local=false --data-only --schema=public \
 *       -f backup-plant_searches-$(date +%Y%m%d).sql
 *
 *   Option B (Supabase Dashboard SQL Editor — no CLI required):
 *     SELECT id, image_url
 *     FROM plant_searches
 *     WHERE image_url LIKE 'data:%';
 *     → Export result as CSV before running this script.
 *
 * ─── IDEMPOTENCY ─────────────────────────────────────────────────────
 *
 *   Rows that already begin with 'https://' are skipped (per D-04). Safe
 *   to re-run any number of times; the second pass reports 0 migrated +
 *   N skipped.
 *
 * ─── ROLLBACK / FAILURE SEMANTICS ────────────────────────────────────
 *
 *   The script NEVER nulls image_url. It first uploads the decoded blob
 *   to Storage, then UPDATEs the row. If the upload fails, the original
 *   data: URI stays intact. If the UPDATE fails after a successful
 *   upload, the row still points to the original data: URI (blob is
 *   orphaned but harmless — you can identify orphans by the
 *   `*-backfill-*` segment in the object key).
 *
 *   Re-running the script is the recommended recovery path.
 *
 * ─── HOW TO RUN (CPO workflow) ───────────────────────────────────────
 *
 *   1. Ensure SUPABASE_SERVICE_ROLE_KEY is in ./.env
 *      (Supabase Dashboard → Settings → API → 'service_role' secret key)
 *   2. Take a DB backup (see BACKUP RUNBOOK above).
 *   3. npm run backfill:images
 *   4. Verify:
 *        SELECT COUNT(*) FROM plant_searches
 *        WHERE image_url LIKE 'data:%';
 *      → should return 0.
 *   5. Remove or comment the SUPABASE_SERVICE_ROLE_KEY line from ./.env
 *      once done — you don't need it for normal dev.
 *
 * See .planning/phases/04.1-mobile-load-time-optimization/04.1-01-PLAN.md
 * for the full plan and threat model.
 */

// ─── PURE HELPERS (also unit-tested from backfill-image-urls.test.ts) ───

/**
 * Parse a `data:{mediaType};base64,{payload}` URI.
 *
 * Returns null for HTTPS URLs, empty strings, or any string that is not
 * a base64-encoded data URI. Never throws.
 */
export function parseDataUri(
  url: string
): { mediaType: string; base64Data: string } | null {
  if (!url) return null;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64Data: match[2] };
}

/**
 * True if the row still holds a legacy base64 data URI. Idempotency guard —
 * per D-04, rows that are already HTTPS (or empty) MUST be left untouched.
 */
export function isLegacyRow(row: { image_url: string }): boolean {
  return typeof row.image_url === "string" && row.image_url.startsWith("data:");
}

/**
 * Compose the Storage path for a backfilled blob. Uses the same
 * `{user_id}/{ts}-{rand}.{ext}` convention as the existing upload path in
 * `supabase/functions/identify-plant/index.ts`, but interpolates a
 * `-backfill-` segment so CPO can grep the bucket to distinguish legacy
 * backfills from real user uploads.
 */
export function buildFileName(userId: string, ext: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${ts}-backfill-${rand}.${ext}`;
}

/**
 * Map a MIME media type to the file extension we use in Storage.
 * Falls back to `"jpg"` for unknown types — legacy rows in production
 * are jpeg or png only, so the fallback is defensive rather than expected.
 */
export function extForMediaType(mediaType: string): "jpg" | "png" | "webp" {
  switch (mediaType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

// ─── RUNTIME BODY (only runs when invoked directly via tsx / node) ───
//
// Everything below the isEntryPoint() check is skipped when this module
// is imported for tests — that keeps the test run from side-effect-loading
// .env or hitting the network.

/**
 * True when this file is the process entry point (i.e. `tsx scripts/...`).
 * False when imported by another module (e.g. the vitest test file).
 * Works for ESM (import.meta.url) — matches the pattern recommended by
 * Node docs for module main detection.
 */
function isEntryPoint(): boolean {
  if (!process.argv[1]) return false;
  // Handle both POSIX paths and file:// URLs consistently.
  const entry = process.argv[1];
  // import.meta.url is a file:// URL; normalize to a filesystem path suffix.
  const modulePath = new URL(import.meta.url).pathname;
  return entry === modulePath || entry.endsWith("backfill-image-urls.ts");
}

if (isEntryPoint()) {
  // Dynamic imports so tests never pay this cost.
  const [{ default: dotenv }, { createClient }] = await Promise.all([
    import("dotenv"),
    import("@supabase/supabase-js"),
  ]);
  dotenv.config();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("");
    console.error("Missing required env vars.");
    console.error("");
    console.error(
      "  VITE_SUPABASE_URL:         " + (SUPABASE_URL ? "OK" : "MISSING")
    );
    console.error(
      "  SUPABASE_SERVICE_ROLE_KEY: " + (SERVICE_KEY ? "OK" : "MISSING")
    );
    console.error("");
    console.error("Fix: add both to your local .env file.");
    console.error(
      "  SUPABASE_SERVICE_ROLE_KEY: Supabase Dashboard → Settings → API → copy the 'service_role' (secret) key"
    );
    console.error(
      "  VITE_SUPABASE_URL:         Supabase Dashboard → Settings → API → 'Project URL'"
    );
    console.error("");
    process.exit(1);
  }

  // Constants — tuned for a single-laptop run against production.
  const BATCH_SIZE = 10; // parallel uploads per batch (safe for anon connection pool)
  const PAGE_SIZE = 50; // rows fetched per SELECT iteration
  const BUCKET = "plant-images";
  const STARTUP_DELAY_MS = 5000; // "are you sure?" pause so CPO can Ctrl-C if wrong project

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Module-scope counters — read by processRow + reported by main.
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  type Row = { id: string; user_id: string; image_url: string };

  async function processRow(row: Row): Promise<void> {
    // Idempotency guard — skip anything already migrated to HTTPS.
    if (!isLegacyRow(row)) {
      skipped++;
      return;
    }

    const parsed = parseDataUri(row.image_url);
    if (!parsed) {
      console.error(`[${row.id}] malformed data URI — skipping`);
      failed++;
      return;
    }

    const { mediaType, base64Data } = parsed;
    const ext = extForMediaType(mediaType);
    const fileName = buildFileName(row.user_id, ext);

    // Buffer.from handles arbitrary base64 payloads without atob's UCS-2 quirks.
    const buffer = Buffer.from(base64Data, "base64");
    const bytes = new Uint8Array(buffer);

    // 1. UPLOAD FIRST — never mutate the row before Storage confirms.
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, bytes, {
        contentType: mediaType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error(`[${row.id}] upload failed:`, uploadError.message);
      failed++;
      return; // image_url stays as the original data: URI
    }

    // 2. Compose the public URL (Storage bucket 'plant-images' is public).
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 3. UPDATE the row — only after the upload succeeded.
    const { error: updateError } = await supabase
      .from("plant_searches")
      .update({ image_url: publicUrl })
      .eq("id", row.id);

    if (updateError) {
      console.error(
        `[${row.id}] update failed (blob uploaded but row not linked):`,
        updateError.message
      );
      failed++;
      return; // orphan blob is inert; row still has intact data: URI
    }

    processed++;
    console.log(
      `[${processed + skipped + failed}/?] Uploaded row ${row.id} → ${publicUrl}`
    );
  }

  async function main(): Promise<void> {
    console.log("=== Backfill: base64 → Storage HTTPS ===");
    console.log("Target: " + SUPABASE_URL);
    console.log("Bucket: " + BUCKET);
    console.log("");
    console.log(
      "BACKUP first (see header comment for runbook). Ctrl-C now if you haven't."
    );
    console.log("Starting in 5 seconds…");
    console.log("");
    await new Promise((r) => setTimeout(r, STARTUP_DELAY_MS));

    let offset = 0;
    let page = 0;
    while (true) {
      const { data: rows, error } = await supabase
        .from("plant_searches")
        .select("id, user_id, image_url")
        .like("image_url", "data:%")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Fetch failed:", error);
        process.exit(1);
      }
      if (!rows || rows.length === 0) break;

      page++;
      console.log(`--- Page ${page}: ${rows.length} rows ---`);

      // Batched parallel uploads inside the page.
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE) as Row[];
        await Promise.all(batch.map(processRow));
      }

      // Advance the window. Note: because processed rows no longer match
      // the LIKE filter after UPDATE, offset stays at 0 in principle — but
      // keeping the offset advance provides a safety net if a page yields
      // rows that we (intentionally) skip (already-HTTPS should be zero
      // here since the filter excludes them, but we're defensive).
      offset += PAGE_SIZE;
    }

    console.log("");
    console.log(
      `=== Done: ${processed} migrated · ${skipped} skipped (already-HTTPS) · ${failed} failed ===`
    );
    if (failed > 0) {
      console.log(
        "Re-run 'npm run backfill:images' to retry failed rows (script is idempotent)."
      );
      process.exit(1);
    }
  }

  await main().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
}
