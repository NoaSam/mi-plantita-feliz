/**
 * Backfill legacy base64 data URIs in plant_searches.image_url → Supabase
 * Storage HTTPS URLs.
 *
 * ⚠️  This file currently contains ONLY the pure helper exports.
 *     The runtime body (main(), processRow(), Supabase client) lands in Task 2
 *     per plan 04.1-01.
 *
 * See .planning/phases/04.1-mobile-load-time-optimization/04.1-01-PLAN.md
 * for the full runbook (backup, env vars, idempotency guarantees, rollback).
 */

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
