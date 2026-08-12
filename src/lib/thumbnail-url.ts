/**
 * Thumbnail URL helper for Supabase Storage images.
 *
 * Phase 04.1 D-08 asks for on-the-fly `?width=200&quality=70` transformations
 * on card thumbnails. That feature is Pro-plan only — the Free-plan
 * `/storage/v1/render/image/public/…` endpoint returns 400/404 (verified in
 * RESEARCH.md § Critical Blocker). Per CPO CRITICAL DECISION #1 (planner
 * locked): the project stays on Free plan. This helper therefore defaults to
 * serving originals safely and auto-upgrades if Pro is later activated —
 * ZERO code change required in the call sites.
 *
 * Strategy (module-scope state, in-memory, app-lifetime cache):
 *   1. First call with a Supabase Storage URL kicks off a HEAD request to a
 *      well-formed transform URL.
 *   2. While HEAD is in-flight, ALWAYS return the ORIGINAL URL — the helper
 *      is synchronous and MUST NOT block React render.
 *   3. HEAD resolves 200 OK → cache tier="available" → future calls return
 *      the transformed URL.
 *   4. HEAD resolves 4xx / network error → cache tier="unavailable" → future
 *      calls keep returning originals forever (no retry loop).
 *   5. Data URIs and non-Supabase URLs are pass-through and never trigger
 *      detection (defensive).
 */

type Tier = "unknown" | "detecting" | "available" | "unavailable";

let tier: Tier = "unknown";

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

/** True if `url` is a Supabase Storage `/object/public/…` URL. */
function isSupabaseStorageUrl(url: string): boolean {
  return typeof url === "string" && url.includes(OBJECT_PATH);
}

/** Rewrite `/object/public/…` → `/render/image/public/…` and append width+quality. */
function rewriteToTransform(
  url: string,
  width: number,
  quality: number,
): string {
  const rendered = url.replace(OBJECT_PATH, RENDER_PATH);
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=${width}&quality=${quality}`;
}

/**
 * Fire-and-forget HEAD probe to detect whether Supabase Storage image
 * transformations are available on this project's plan. Runs at most once
 * per app session (idempotent — subsequent calls short-circuit on `tier`).
 */
function detectTier(sampleUrl: string): void {
  if (tier !== "unknown") return;
  tier = "detecting";
  const probeUrl = rewriteToTransform(sampleUrl, 100, 70);
  // Use a fresh reference so tests that stubGlobal("fetch", …) intercept us.
  fetch(probeUrl, { method: "HEAD" })
    .then((res) => {
      tier = res.ok ? "available" : "unavailable";
    })
    .catch(() => {
      tier = "unavailable";
    });
}

/**
 * Return a thumbnail URL for a Supabase Storage image, or the original URL
 * unchanged if any of the following apply:
 *   - `url` is falsy (empty string, null, undefined) — returned as-is
 *   - `url` is a `data:` URI (legacy pre-backfill fallback)
 *   - `url` is not a Supabase Storage `/object/public/…` URL
 *   - Supabase image transformations are not available on this plan
 *     (detected once, cached for the app lifetime)
 *   - Detection is still in-flight after the first call
 *
 * Non-blocking: NEVER returns a Promise. NEVER waits on the tier-detect HEAD.
 *
 * @param url    The full HTTPS URL from `getPublicUrl()` OR a legacy `data:` URI
 * @param width  Target width in pixels (default 200). Retina displays should
 *               pass 2× the display size (e.g. 160 for a 80px display).
 * @param quality JPEG quality 1-100 (default 70). Only applied when transforms
 *               are confirmed available.
 */
export function getThumbnailUrl(
  url: string,
  width = 200,
  quality = 70,
): string {
  if (!url) return url;
  if (typeof url !== "string") return url;
  if (url.startsWith("data:")) return url; // legacy pass-through
  if (!isSupabaseStorageUrl(url)) return url; // non-Supabase pass-through

  if (tier === "unknown") {
    detectTier(url);
    return url; // never block first render
  }
  if (tier === "available") {
    return rewriteToTransform(url, width, quality);
  }
  // "detecting" or "unavailable" → serve the original safely.
  return url;
}

/**
 * Test-only helper — resets the module-scope tier cache so each test starts
 * from a clean `tier="unknown"` state. Not exported through any public
 * barrel; call sites in production code should never use it.
 */
export function resetThumbnailTierCacheForTests(): void {
  tier = "unknown";
}
