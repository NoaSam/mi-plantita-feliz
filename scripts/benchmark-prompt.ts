/**
 * Benchmark the SYSTEM_PROMPT against a committed golden set.
 *
 * Calls all 3 models (Claude Sonnet 4, Gemini 2.5 Flash Lite, GPT-4o) for each
 * photo in the golden set and computes:
 *   - PRIMARY:   % of photos where >=2 of 3 models match the ground truth
 *                scientific name (exact / normalized / genus).
 *   - SECONDARY: stddev of watering_interval_days across the 3 models
 *                (proxy for coherence — no ground truth for watering).
 *   - SANITY:    % of model calls that returned non-null watering_interval_days.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... GEMINI_API_KEY=... OPENAI_API_KEY=... \
 *     npx tsx scripts/benchmark-prompt.ts
 *   # or
 *   npm run benchmark:prompt
 *
 * Golden set lives at scripts/.benchmark-golden-set.json (committed).
 *
 * Read-only: NEVER writes to plant_searches or model_evaluations.
 *
 * See: .planning/phases/02-prompt-optimization/02-CONTEXT.md § D-09, D-10, D-11, D-12.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  extractScientificName,
  normalizeScientificName,
} from "../supabase/functions/identify-plant/consensus.ts";

// ─── Env gating ───────────────────────────────────────────────────────────────

const REQUIRED_KEYS = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY"] as const;
for (const key of REQUIRED_KEYS) {
  if (!process.env[key]) {
    console.error(`Missing ${key} env var`);
    process.exit(1);
  }
}

const GOLDEN_SET_PATH = resolve(import.meta.dirname, ".benchmark-golden-set.json");

// ─── Prompt (kept in sync with supabase/functions/identify-plant/index.ts) ────
// NOTE: This is a one-shot benchmark; duplicating the prompt avoids the runtime
// boundary between the edge function (esm.sh imports + env via Deno globals) and
// this Node script. Update this constant in lockstep with the edge function's
// SYSTEM_PROMPT when iterating.
//
// LOCKSTEP RESPONSIBILITY: this constant MUST stay verbatim-identical to the
// SYSTEM_PROMPT in supabase/functions/identify-plant/index.ts. Both files carry
// matching IMPORTANT comments to remind future editors. If you change one,
// change the other in the SAME commit.

const SYSTEM_PROMPT = `Eres un botánico experto que ayuda a personas con plantas en casa. Responde SIEMPRE en español, con tono cercano y claro. Evita jerga botánica innecesaria — si usas un término técnico, explícalo brevemente.

El usuario te envía una foto de una planta. Analízala y responde SOLO con un JSON válido (sin texto antes ni después) con esta estructura:

{
  "name": "Nombre común (Nombre científico)",
  "description": "Markdown con descripción de la planta",
  "care": "Markdown con guía de cuidados",
  "diagnosis": "Markdown con diagnóstico visual",
  "watering_interval_days": 7
}

Instrucciones para cada campo:

**name**: Nombre común seguido del nombre científico entre paréntesis. Ej: "Potus (Epipremnum aureum)". Usa nombres canónicos en español — evita variantes ortográficas. Plantas comunes y su nomenclatura de referencia:
- Potus → Epipremnum aureum
- Monstera → Monstera deliciosa
- Sansevieria / Lengua de suegra → Sansevieria trifasciata
- Ficus / Ficus lira → Ficus lyrata
- Palmera de salón → Chamaedorea elegans
- Calatea → Calathea
- Dracena → Dracaena marginata
- Espatifilo / Lirio de la paz → Spathiphyllum
- Suculenta → Echeveria
- Cactus → Cactaceae

**description**: Usa Markdown. Incluye:
- Qué planta es y a qué familia pertenece
- De dónde es originaria
- Características visuales principales (hojas, flores, tamaño típico)
- Algún dato curioso o útil si lo hay
- Si NO estás del todo seguro de la identificación, dilo claramente al principio: indica qué planta crees que es y por qué tu confianza es baja (e.g. "podría ser X, pero la foto no muestra bien Y").

**care**: Usa Markdown con una lista clara. Incluye estas categorías con indicaciones concretas y prácticas:
- **Riego** — frecuencia y cantidad (ej: "cada 3-4 días en verano, cada semana en invierno")
- **Luz** — tipo e intensidad (ej: "luz indirecta brillante, evitar sol directo")
- **Temperatura** — rango ideal
- **Sustrato** — tipo recomendado
- **Abono** — frecuencia y época
- **Consejo extra** — un tip práctico que marque la diferencia

**diagnosis**: Usa Markdown. Analiza lo que ves en la foto:
- Si se ve **sana**: dilo claramente y menciona qué señales positivas observas
- Si tiene **problemas**: describe los síntomas que ves, la causa más probable, y qué hacer paso a paso para solucionarlo
- Si la foto no permite un diagnóstico claro, dilo honestamente

**watering_interval_days**: Número entero entre 1 y 60 que representa la **frecuencia promedio anual de riego en días** para una planta de interior en condiciones típicas (luz indirecta, 20-22°C). Ej: 7 significa "regar cada 7 días en promedio a lo largo del año". Si no puedes determinar la frecuencia con confianza (planta desconocida, identificación incierta, o sin datos suficientes), devuelve \`null\` — es preferible no inventar un número.`;
const USER_MESSAGE = "Identifica esta planta, dime cómo cuidarla y analiza si le pasa algo.";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoldenSetItem {
  id: string;
  imageUrl: string;
  groundTruth: {
    scientificName: string;
    commonNameEs?: string;
    notes?: string;
  };
}

interface GoldenSet {
  version: number;
  createdAt: string;
  notes?: string;
  items: GoldenSetItem[];
}

interface ParsedPlantInfo {
  name: string;
  description: string;
  care: string;
  diagnosis: string;
  watering_interval_days: number | null;
}

interface ModelCallResult {
  model: "claude" | "gemini" | "gpt4o";
  success: boolean;
  scientificName: string | null;   // extracted from parsed.name
  wateringDays: number | null;
  errorMessage: string | null;
}

// ─── Model callers (duplicated from index.ts, adapted to Node) ────────────────

async function callClaude(base64Data: string, mediaType: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: USER_MESSAGE },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callGemini(base64Data: string, mediaType: string): Promise<string> {
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
            { inlineData: { mimeType: mediaType, data: base64Data } },
            { text: USER_MESSAGE },
          ],
        }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(base64Data: string, mediaType: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64Data}`, detail: "high" },
            },
            { type: "text", text: USER_MESSAGE },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`gpt4o ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Parsing (mirror of edge function parseAIResponse) ────────────────────────

function parseResponse(text: string): ParsedPlantInfo | null {
  let parsed: Record<string, unknown> | null = null;
  try { parsed = JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { /* */ } }
  }
  if (!parsed) return null;

  const toStr = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);
  const toIntOrNull = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n)) return null;
    const int = Math.round(n);
    return int >= 1 && int <= 60 ? int : null;
  };

  return {
    name:                   toStr(parsed.name, ""),
    description:            toStr(parsed.description, ""),
    care:                   toStr(parsed.care, ""),
    diagnosis:              toStr(parsed.diagnosis, ""),
    watering_interval_days: toIntOrNull(parsed.watering_interval_days),
  };
}

// ─── Image fetch helper ───────────────────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image ${res.status} for ${url}`);
  const mediaType = res.headers.get("content-type") ?? "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mediaType };
}

// ─── Per-item runner ──────────────────────────────────────────────────────────

async function runItem(item: GoldenSetItem): Promise<ModelCallResult[]> {
  const { base64, mediaType } = await fetchImageAsBase64(item.imageUrl);

  const settled = await Promise.allSettled([
    callClaude(base64, mediaType).then(parseResponse),
    callGemini(base64, mediaType).then(parseResponse),
    callOpenAI(base64, mediaType).then(parseResponse),
  ]);

  const models = ["claude", "gemini", "gpt4o"] as const;
  return settled.map((s, i): ModelCallResult => {
    if (s.status === "rejected") {
      return { model: models[i], success: false, scientificName: null, wateringDays: null, errorMessage: String(s.reason) };
    }
    const parsed = s.value;
    if (!parsed) {
      return { model: models[i], success: false, scientificName: null, wateringDays: null, errorMessage: "PARSE_NULL" };
    }
    return {
      model:           models[i],
      success:         true,
      scientificName:  extractScientificName(parsed.name),
      wateringDays:    parsed.watering_interval_days,
      errorMessage:    null,
    };
  });
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function matchScientific(predicted: string | null, truth: string): "exact" | "normalized" | "genus" | null {
  if (!predicted) return null;
  const p = predicted.toLowerCase().trim();
  const t = truth.toLowerCase().trim();
  if (p === t) return "exact";
  if (normalizeScientificName(p) === normalizeScientificName(t)) return "normalized";
  const pGenus = p.split(/\s+/)[0];
  const tGenus = t.split(/\s+/)[0];
  if (pGenus && tGenus && pGenus === tGenus) return "genus";
  return null;
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function loadGoldenSet(): GoldenSet {
  try {
    return JSON.parse(readFileSync(GOLDEN_SET_PATH, "utf-8")) as GoldenSet;
  } catch (e) {
    console.error(`Cannot read ${GOLDEN_SET_PATH}: ${(e as Error).message}`);
    console.error("Populate the golden set first. See CONTEXT.md § D-10 + D-11.");
    process.exit(1);
  }
}

async function main() {
  if (!SYSTEM_PROMPT) {
    console.error("SYSTEM_PROMPT constant is empty in scripts/benchmark-prompt.ts.");
    console.error("Paste the current edge-function prompt into the constant and rerun.");
    process.exit(1);
  }

  const goldenSet = loadGoldenSet();
  if (goldenSet.items.length === 0) {
    console.log("Golden set is empty (items: []).");
    console.log("Populate scripts/.benchmark-golden-set.json before running. See CONTEXT.md § D-10.");
    process.exit(0);
  }

  console.log(`Benchmark: ${goldenSet.items.length} photos × 3 models = ${goldenSet.items.length * 3} calls\n`);

  let primaryHits = 0;
  const stddevs: number[] = [];
  let nonNullWatering = 0;
  let totalCalls = 0;

  for (const [idx, item] of goldenSet.items.entries()) {
    process.stdout.write(`[${idx + 1}/${goldenSet.items.length}] ${item.groundTruth.scientificName}... `);
    let results: ModelCallResult[];
    try {
      results = await runItem(item);
    } catch (e) {
      console.log(`SKIP (${(e as Error).message})`);
      continue;
    }

    const matches = results.filter((r) => matchScientific(r.scientificName, item.groundTruth.scientificName) !== null).length;
    if (matches >= 2) primaryHits++;

    const wateringValues = results.map((r) => r.wateringDays).filter((w): w is number => w !== null);
    if (wateringValues.length >= 2) stddevs.push(stddev(wateringValues));

    nonNullWatering += wateringValues.length;
    totalCalls += results.length;

    console.log(`matches=${matches}/3 watering=[${results.map((r) => r.wateringDays ?? "null").join(",")}]`);
  }

  const primaryPct = (primaryHits / goldenSet.items.length) * 100;
  const meanStddev = stddevs.length > 0 ? stddevs.reduce((a, b) => a + b, 0) / stddevs.length : NaN;
  const sanityPct = totalCalls > 0 ? (nonNullWatering / totalCalls) * 100 : 0;

  console.log("\n─── REPORT ───────────────────────────────────────────");
  console.log("PRIMARY (identification accuracy):");
  console.log(`  consensus ≥2/3 matches ground truth:    ${primaryPct.toFixed(1)}%`);
  console.log("SECONDARY (watering coherence):");
  console.log(`  mean stddev across models:              ${Number.isNaN(meanStddev) ? "no data" : meanStddev.toFixed(2) + " days"}`);
  console.log("SANITY:");
  console.log(`  model calls with non-null watering:     ${sanityPct.toFixed(1)}%`);
  process.exit(0);
}

main().catch((err) => {
  console.error("benchmark-prompt failed:", err.message);
  process.exit(1);
});
