/**
 * Supabase keepalive — Vercel Cron
 *
 * Supabase Free tier pauses a project after 7 consecutive days of inactivity.
 * This endpoint pings the REST API so the "days inactive" counter never gets
 * there. Scheduled daily from the `crons` block in vercel.json.
 *
 * Replaces the GitHub Actions schedule, which GitHub auto-disables after
 * 60 days without repo activity (public repos). Vercel Cron has no such rule.
 * `.github/workflows/supabase-keepalive.yml` stays as a manual fallback.
 *
 * The anon key is the publishable key already shipped in the web bundle —
 * row-level security gates every read, so there is nothing to leak here.
 */

export const config = { runtime: 'edge' };

// Fallbacks keep the cron working even if the env vars are missing in Vercel.
// Same values the client bundle already exposes publicly.
const FALLBACK_URL = 'https://sdxfxkqzgnonxfshbjfc.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkeGZ4a3F6Z25vbnhmc2hiamZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzAwODEsImV4cCI6MjA5MDkwNjA4MX0.JfxZ5_d9-AEt3kkjrRq-FnDlTDwtexSCBsyUHzLcM78';

export default async function handler(request: Request): Promise<Response> {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
  // set in the project env. If it is not set, the endpoint stays open — it only
  // performs one public read, so an unauthenticated hit is harmless.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? FALLBACK_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? FALLBACK_ANON_KEY;

  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/plant_searches?limit=1&select=id`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      },
    );

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[keepalive] Supabase ping failed: HTTP ${response.status} — ${body.slice(0, 200)}`,
      );
      // Non-200 makes Vercel mark the invocation as failed, so it shows up in
      // the project logs instead of passing silently.
      return Response.json(
        { ok: false, status: response.status, durationMs },
        { status: 500 },
      );
    }

    console.log(`[keepalive] Supabase is awake (${durationMs}ms)`);
    return Response.json({ ok: true, status: response.status, durationMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[keepalive] Supabase ping threw: ${message}`);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
