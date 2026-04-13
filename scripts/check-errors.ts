/**
 * Pre-build check: queries PostHog for unresolved production exceptions.
 * Exits with code 1 if there are new errors since the last known baseline.
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=phx_... npx tsx scripts/check-errors.ts
 *
 * The script keeps a local baseline file (scripts/.error-baseline.json)
 * with fingerprints of errors you've already reviewed. New errors not in
 * the baseline will cause the check to fail.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
if (!API_KEY) {
  console.error("Missing POSTHOG_PERSONAL_API_KEY env var");
  process.exit(1);
}

const API_HOST = "https://eu.posthog.com";
const BASELINE_PATH = resolve(import.meta.dirname, ".error-baseline.json");
const DAYS_LOOKBACK = 7;

interface ExceptionEvent {
  properties: Record<string, unknown>;
  timestamp: string;
}

interface Baseline {
  acknowledged: string[]; // fingerprints already reviewed
  updatedAt: string;
}

function loadBaseline(): Baseline {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
  } catch {
    return { acknowledged: [], updatedAt: new Date().toISOString() };
  }
}

function saveBaseline(baseline: Baseline) {
  baseline.updatedAt = new Date().toISOString();
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
}

async function fetchExceptions(): Promise<ExceptionEvent[]> {
  const since = new Date();
  since.setDate(since.getDate() - DAYS_LOOKBACK);

  const url = `${API_HOST}/api/projects/@current/events/?event=%24exception&limit=100&after=${since.toISOString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PostHog API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { results: ExceptionEvent[] };
  return data.results;
}

function isProduction(event: ExceptionEvent): boolean {
  const url = (event.properties.$current_url as string) || "";
  return !url.includes("localhost") && !url.includes("127.0.0.1");
}

interface GroupedError {
  fingerprint: string;
  type: string;
  message: string;
  sources: string[];
  count: number;
  lastSeen: string;
}

function groupErrors(events: ExceptionEvent[]): GroupedError[] {
  const map = new Map<string, GroupedError>();

  for (const e of events) {
    const fp =
      (e.properties.$exception_fingerprint as string) || e.timestamp;
    const existing = map.get(fp);
    if (existing) {
      existing.count++;
      if (e.timestamp > existing.lastSeen) existing.lastSeen = e.timestamp;
    } else {
      const types = (e.properties.$exception_types as string[]) || [];
      const values = (e.properties.$exception_values as string[]) || [];
      const sources = (e.properties.$exception_sources as string[]) || [];
      map.set(fp, {
        fingerprint: fp,
        type: types[0] || "Unknown",
        message: values[0] || "No message",
        sources,
        count: 1,
        lastSeen: e.timestamp,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

async function main() {
  const events = await fetchExceptions();
  const prodEvents = events.filter(isProduction);
  const grouped = groupErrors(prodEvents);
  const baseline = loadBaseline();

  const newErrors = grouped.filter(
    (g) => !baseline.acknowledged.includes(g.fingerprint),
  );

  console.log(
    `PostHog errors (last ${DAYS_LOOKBACK}d): ${events.length} total, ${prodEvents.length} production, ${grouped.length} unique`,
  );

  if (newErrors.length === 0) {
    console.log("\nNo new production errors. All clear.");
    process.exit(0);
  }

  console.log(`\n${newErrors.length} NEW production error(s):\n`);
  for (const err of newErrors) {
    console.log(`  [${err.count}x] ${err.type}: ${err.message}`);
    console.log(`       Sources: ${err.sources.join(", ") || "N/A"}`);
    console.log(`       Last seen: ${err.lastSeen}`);
    console.log(`       Fingerprint: ${err.fingerprint.slice(0, 16)}...`);
    console.log();
  }

  // Check for --update flag to acknowledge current errors
  if (process.argv.includes("--acknowledge")) {
    for (const err of newErrors) {
      if (!baseline.acknowledged.includes(err.fingerprint)) {
        baseline.acknowledged.push(err.fingerprint);
      }
    }
    saveBaseline(baseline);
    console.log(
      `Acknowledged ${newErrors.length} error(s). Baseline updated.`,
    );
    process.exit(0);
  }

  console.log(
    "Run with --acknowledge to mark these as reviewed and update baseline.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("check-errors failed:", err.message);
  process.exit(1);
});
