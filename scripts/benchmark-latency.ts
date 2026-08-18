/**
 * Benchmark wall-clock latency of all 4 identification providers.
 *
 * Motivation: decide whether PlantNet can participate in the consensus race
 * without hurting SSE first-winner latency (Phase 4).
 *
 * Protocol per iteration:
 *   1. t0 = performance.now()
 *   2. Fire PlantNet FIRST (network request leaves first, per CPO request "para darle tiempo")
 *   3. Fire Claude, Gemini, GPT-4o immediately after, in parallel
 *   4. Promise.allSettled — record wall-clock ms from t0 to each response
 *
 * Aggregates over N iterations:
 *   - min / avg / p50 / p95 / max per model
 *   - order-of-arrival: how often each model is 1st, 2nd, 3rd, 4th
 *
 * Usage:
 *   PLANTNET_API_KEY=... ANTHROPIC_API_KEY=... GEMINI_API_KEY=... OPENAI_API_KEY=... \
 *     npm run benchmark:latency
 *
 * Read-only: never writes to DB.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import * as readline from "readline";
import { Writable } from "stream";

// ─── Env gating with interactive prompt fallback ──────────────────────────────

const REQUIRED_KEYS = [
  "PLANTNET_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
] as const;

async function promptHidden(label: string): Promise<string> {
  // Muted stdout: hides the pasted value so terminal history / screen sharing stays clean.
  let muted = false;
  const mutedStdout = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = readline.createInterface({ input: process.stdin, output: mutedStdout, terminal: true });
  process.stdout.write(`${label}: `);
  muted = true;
  return new Promise((resolve) => {
    rl.question("", (answer) => {
      muted = false;
      process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function ensureKeys(): Promise<void> {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length === 0) return;
  console.log(`Faltan ${missing.length} keys. Te las pido una a una (entrada oculta, no se muestran).\n`);
  for (const key of missing) {
    const value = await promptHidden(`  ${key}`);
    if (!value) {
      console.error(`\n${key} vacío — abortando.`);
      process.exit(1);
    }
    process.env[key] = value;
  }
  console.log("");
}

const ITERATIONS = 10;
const PLANTNET_PROJECT = "all";
const GOLDEN_SET_PATH = resolve(import.meta.dirname, ".benchmark-golden-set.json");

// Prompt kept minimal — we're measuring latency, not identification quality.
// The full SYSTEM_PROMPT would only add tokens without changing network behavior meaningfully.
const SYSTEM_PROMPT =
  "Identifica esta planta. Responde solo con un JSON válido: {\"name\":\"Nombre común (Nombre científico)\"}.";
const USER_MESSAGE = "Identifica esta planta.";

type ModelName = "plantnet" | "claude" | "gemini" | "gpt4o";

interface IterationResult {
  iteration: number;
  imageId: string;
  latencies: Record<ModelName, number | null>;
  errors: Partial<Record<ModelName, string>>;
}

// ─── Model callers ────────────────────────────────────────────────────────────

async function callPlantNet(buffer: Buffer, mediaType: string, filename: string): Promise<void> {
  const form = new FormData();
  form.append("images", new Blob([buffer], { type: mediaType }), filename);
  form.append("organs", "auto");
  const url = `https://my-api.plantnet.org/v2/identify/${PLANTNET_PROJECT}?api-key=${process.env.PLANTNET_API_KEY!}&nb-results=3`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`plantnet ${res.status}: ${(await res.text()).substring(0, 200)}`);
  await res.json();
}

async function callClaude(base64: string, mediaType: string): Promise<void> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: USER_MESSAGE },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${(await res.text()).substring(0, 200)}`);
  await res.json();
}

async function callGemini(base64: string, mediaType: string): Promise<void> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY!}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: base64 } },
            { text: USER_MESSAGE },
          ],
        }],
        generationConfig: { maxOutputTokens: 512 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).substring(0, 200)}`);
  await res.json();
}

async function callOpenAI(base64: string, mediaType: string): Promise<void> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" },
            },
            { type: "text", text: USER_MESSAGE },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`gpt4o ${res.status}: ${(await res.text()).substring(0, 200)}`);
  await res.json();
}

// ─── Image loading ────────────────────────────────────────────────────────────

interface TestImage {
  id: string;
  base64: string;
  mediaType: string;
  buffer: Buffer;
  filename: string;
}

function loadTestImages(n: number): TestImage[] {
  const raw = JSON.parse(readFileSync(GOLDEN_SET_PATH, "utf-8"));
  const items = (raw.items ?? []).slice(0, n) as { id: string; imageUrl: string }[];
  if (items.length < n) throw new Error(`golden set has only ${items.length} items, need ${n}`);

  return items.map((item) => {
    const m = item.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) throw new Error(`item ${item.id}: not a base64 data URI (URLs not supported in this benchmark)`);
    const mediaType = m[1];
    const base64 = m[2];
    const buffer = Buffer.from(base64, "base64");
    const ext = mediaType.split("/")[1] ?? "jpg";
    return { id: item.id, base64, mediaType, buffer, filename: `${item.id}.${ext}` };
  });
}

// ─── Per-iteration runner ─────────────────────────────────────────────────────

async function runIteration(iteration: number, img: TestImage): Promise<IterationResult> {
  const t0 = performance.now();

  const record = async <T>(name: ModelName, promise: Promise<T>): Promise<{ name: ModelName; ms: number; ok: boolean; err?: string }> => {
    try {
      await promise;
      return { name, ms: performance.now() - t0, ok: true };
    } catch (e) {
      return { name, ms: performance.now() - t0, ok: false, err: (e as Error).message };
    }
  };

  // PlantNet fires FIRST (per CPO request "darle tiempo").
  // In JS the microsecond gap is negligible for network I/O, but we honor the ordering.
  const plantnetP = record("plantnet", callPlantNet(img.buffer, img.mediaType, img.filename));
  const claudeP   = record("claude",   callClaude(img.base64, img.mediaType));
  const geminiP   = record("gemini",   callGemini(img.base64, img.mediaType));
  const gpt4oP    = record("gpt4o",    callOpenAI(img.base64, img.mediaType));

  const results = await Promise.all([plantnetP, claudeP, geminiP, gpt4oP]);

  const latencies: Record<ModelName, number | null> = { plantnet: null, claude: null, gemini: null, gpt4o: null };
  const errors: Partial<Record<ModelName, string>> = {};
  for (const r of results) {
    latencies[r.name] = r.ok ? r.ms : null;
    if (!r.ok) errors[r.name] = r.err ?? "unknown";
  }

  return { iteration, imageId: img.id, latencies, errors };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(latencies: number[]): { min: number; avg: number; p50: number; p95: number; max: number; n: number } {
  if (latencies.length === 0) return { min: NaN, avg: NaN, p50: NaN, p95: NaN, max: NaN, n: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    avg: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
    n: sorted.length,
  };
}

function orderCounts(results: IterationResult[]): Record<ModelName, [number, number, number, number]> {
  const counts: Record<ModelName, [number, number, number, number]> = {
    plantnet: [0, 0, 0, 0],
    claude:   [0, 0, 0, 0],
    gemini:   [0, 0, 0, 0],
    gpt4o:    [0, 0, 0, 0],
  };
  for (const r of results) {
    const ranked = (Object.entries(r.latencies) as [ModelName, number | null][])
      .filter(([, ms]) => ms !== null)
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .map(([m]) => m);
    ranked.forEach((m, i) => { if (i < 4) counts[m][i]++; });
  }
  return counts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await ensureKeys();
  console.log(`Benchmark latency: ${ITERATIONS} iterations × 4 providers = ${ITERATIONS * 4} calls\n`);
  console.log("Loading test images from golden set...");
  const images = loadTestImages(ITERATIONS);
  console.log(`Loaded ${images.length} images\n`);

  const results: IterationResult[] = [];
  console.log("iter | image | plantnet |  claude  |  gemini  |   gpt4o  | winner");
  console.log("-----|-------|----------|----------|----------|----------|--------");
  for (let i = 0; i < images.length; i++) {
    const r = await runIteration(i + 1, images[i]);
    results.push(r);
    const fmt = (n: number | null) => n === null ? "  ERR   " : `${n.toFixed(0).padStart(6, " ")}ms`;
    const ranked = (Object.entries(r.latencies) as [ModelName, number | null][])
      .filter(([, ms]) => ms !== null)
      .sort((a, b) => (a[1] as number) - (b[1] as number));
    const winner = ranked[0]?.[0] ?? "none";
    console.log(
      ` ${String(i + 1).padStart(2, " ")}  |  ${r.imageId}   | ${fmt(r.latencies.plantnet)} | ${fmt(r.latencies.claude)} | ${fmt(r.latencies.gemini)} | ${fmt(r.latencies.gpt4o)} | ${winner}`,
    );
  }

  // Aggregate
  const models: ModelName[] = ["plantnet", "claude", "gemini", "gpt4o"];
  const perModel: Record<ModelName, ReturnType<typeof summarize>> = {} as Record<ModelName, ReturnType<typeof summarize>>;
  for (const m of models) {
    const lat = results.map((r) => r.latencies[m]).filter((n): n is number => n !== null);
    perModel[m] = summarize(lat);
  }

  const orders = orderCounts(results);
  const errorRows = results.flatMap((r) =>
    (Object.entries(r.errors) as [ModelName, string][]).map(([m, e]) => `  iter ${r.iteration} ${m}: ${e.substring(0, 120)}`),
  );

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log(" LATENCY (wall-clock ms from t0, per model)");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("model     |  n  |  min  |  avg  |  p50  |  p95  |  max");
  console.log("----------|-----|-------|-------|-------|-------|-------");
  for (const m of models) {
    const s = perModel[m];
    const fmt = (n: number) => Number.isNaN(n) ? "  —  " : `${n.toFixed(0).padStart(4, " ")}`;
    console.log(`${m.padEnd(9)} | ${String(s.n).padStart(2, " ")}  | ${fmt(s.min)}ms | ${fmt(s.avg)}ms | ${fmt(s.p50)}ms | ${fmt(s.p95)}ms | ${fmt(s.max)}ms`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log(" ORDER OF ARRIVAL (how often each model is 1st / 2nd / 3rd / 4th)");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("model     |  1st  |  2nd  |  3rd  |  4th");
  console.log("----------|-------|-------|-------|------");
  for (const m of models) {
    const [a, b, c, d] = orders[m];
    console.log(`${m.padEnd(9)} |  ${String(a).padStart(2, " ")}   |  ${String(b).padStart(2, " ")}   |  ${String(c).padStart(2, " ")}   |  ${String(d).padStart(2, " ")}`);
  }

  if (errorRows.length > 0) {
    console.log("\n─── ERRORS ─────────────────────────────────────────────────────────────");
    errorRows.forEach((r) => console.log(r));
  }

  console.log(`\nDone: ${results.length} iterations, ${errorRows.length} errors total.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("benchmark-latency failed:", err.message);
  process.exit(1);
});
