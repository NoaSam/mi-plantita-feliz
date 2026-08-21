import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ModelName,
  extractScientificName,
  computeConsensus,
  applyPlantnetOverride,
  type PlantnetOverrideInput,
} from "./consensus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Prompt ────────────────────────────────────────────────────────────────────

// IMPORTANT: keep this prompt in sync with scripts/benchmark-prompt.ts SYSTEM_PROMPT.
//            If you edit one, you MUST edit the other — there is no shared module.
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlantInfo {
  name: string;
  description: string;
  care: string;
  diagnosis: string;
  watering_interval_days: number | null;
}

interface ModelResult {
  model: ModelName;
  success: boolean;
  plantInfo: PlantInfo | null;
  rawName: string | null;
  scientificName: string | null;
  responseMs: number;
  errorMessage: string | null;
}

// ─── Model callers ─────────────────────────────────────────────────────────────

// Per-LLM timeout budget. Kept below the client's own INVOKE_TIMEOUT_MS (30s)
// so a stuck provider surfaces as an aborted fetch in Promise.allSettled
// rather than as a client-side timeout with the edge function still running.
// The remaining time budget after 15s is used by storage upload + DB inserts
// + the return trip to the client.
const LLM_TIMEOUT_MS = 15_000;

// PlantNet timeout — deliberately shorter than LLM_TIMEOUT_MS so PlantNet
// never gates the SSE first-winner. D-13 benchmark 2026-08-18 measured
// PlantNet p95 = 695ms, so 10s is ~14× headroom.
const PLANTNET_TIMEOUT_MS = 10_000;

// Normalize an AbortError from AbortSignal.timeout into the same
// TIMEOUT:<model> shape our downstream error handling / analytics uses.
function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
}

async function callClaude(base64Data: string, mediaType: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
              { type: "text", text: USER_MESSAGE },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    if (isAbortError(e)) throw new Error(`TIMEOUT:claude:${LLM_TIMEOUT_MS}ms`);
    throw e;
  }

  if (!response.ok) {
    const t = await response.text();
    console.error("claude API error:", response.status, t);
    throw new Error(
      response.status === 429
        ? "RATE_LIMIT:claude:429"
        : `API_ERROR:claude:${response.status}`
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function callGemini(base64Data: string, mediaType: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: mediaType, data: base64Data } },
                { text: USER_MESSAGE },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 2048 },
        }),
      }
    );
  } catch (e) {
    if (isAbortError(e)) throw new Error(`TIMEOUT:gemini:${LLM_TIMEOUT_MS}ms`);
    throw e;
  }

  if (!response.ok) {
    const t = await response.text();
    console.error("gemini API error:", response.status, t);
    throw new Error(
      response.status === 429
        ? "RATE_LIMIT:gemini:429"
        : `API_ERROR:gemini:${response.status}`
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(base64Data: string, mediaType: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
                image_url: {
                  url: `data:${mediaType};base64,${base64Data}`,
                  detail: "high",
                },
              },
              { type: "text", text: USER_MESSAGE },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    if (isAbortError(e)) throw new Error(`TIMEOUT:gpt4o:${LLM_TIMEOUT_MS}ms`);
    throw e;
  }

  if (!response.ok) {
    const t = await response.text();
    console.error("gpt4o API error:", response.status, t);
    throw new Error(
      response.status === 429
        ? "RATE_LIMIT:gpt4o:429"
        : `API_ERROR:gpt4o:${response.status}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── PlantNet caller (Phase 5 — silent failure per D-09) ──────────────────────

interface PlantnetEvaluationResult {
  success: boolean;
  rawName: string | null;         // top-1 scientificNameWithoutAuthor
  scientificName: string | null;  // lowercased (matches LLMs' extractScientificName output)
  score: number | null;           // results[0].score (0..1), needed for D-10 threshold
  rawResponse: unknown | null;    // full JSON payload (D-03)
  responseMs: number;
  errorMessage: string | null;
}

async function callPlantnetTimed(
  base64Data: string,
  mediaType: string,
): Promise<PlantnetEvaluationResult> {
  const start = Date.now();
  const PLANTNET_API_KEY = Deno.env.get("PLANTNET_API_KEY");
  if (!PLANTNET_API_KEY) {
    return {
      success: false, rawName: null, scientificName: null, score: null, rawResponse: null,
      responseMs: Date.now() - start,
      errorMessage: "PLANTNET_API_KEY not configured",
    };
  }

  try {
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const form = new FormData();
    form.append("images", new Blob([bytes], { type: mediaType }), "plant.jpg");
    form.append("organs", "auto");

    // nb-results=5, NO include-related-images (evita inflación storage — Pitfall #6 de RESEARCH.md)
    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}&nb-results=5&lang=es`;
    const res = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(PLANTNET_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("plantnet API error:", res.status, text.substring(0, 200));
      return {
        success: false, rawName: null, scientificName: null, score: null, rawResponse: null,
        responseMs: Date.now() - start,
        errorMessage: res.status === 429
          ? "RATE_LIMIT:plantnet:429"
          : `API_ERROR:plantnet:${res.status}`,
      };
    }

    const json = await res.json();
    const top = json?.results?.[0];
    const rawName = top?.species?.scientificNameWithoutAuthor ?? null;
    const score  = typeof top?.score === "number" ? top.score : null;
    const scientificName = typeof rawName === "string" ? rawName.toLowerCase() : null;

    return {
      success: rawName !== null,
      rawName,
      scientificName,
      score,
      rawResponse: json,
      responseMs: Date.now() - start,
      errorMessage: rawName === null ? "NO_RESULTS" : null,
    };
  } catch (e) {
    return {
      success: false, rawName: null, scientificName: null, score: null, rawResponse: null,
      responseMs: Date.now() - start,
      errorMessage: isAbortError(e)
        ? `TIMEOUT:plantnet:${PLANTNET_TIMEOUT_MS}ms`
        : (e instanceof Error ? e.message : "Unknown error"),
    };
  }
}

// ─── Parsing and extraction ────────────────────────────────────────────────────

const FALLBACK_NAME        = "Planta no identificada";
const FALLBACK_DESCRIPTION = "No se pudo identificar la planta. Intenta con otra foto más clara.";
const FALLBACK_CARE        = "Asegúrate de que la foto muestre bien la planta.";
const FALLBACK_DIAGNOSIS   = "No hay suficiente información para un diagnóstico.";

function isFallbackResult(info: PlantInfo): boolean {
  return (
    info.name        === FALLBACK_NAME &&
    info.description === FALLBACK_DESCRIPTION &&
    info.care        === FALLBACK_CARE &&
    info.diagnosis   === FALLBACK_DIAGNOSIS
  );
}

function parseAIResponse(text: string): PlantInfo | null {
  let parsed: Record<string, unknown> | null = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* invalid JSON */ }
    }
  }

  if (!parsed) return null;

  const toStr = (v: unknown, fb: string) =>
    typeof v === "string" && v.trim() ? v : fb;

  const toIntOrNull = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n)) return null;
    const int = Math.round(n);
    if (int < 1 || int > 60) return null;
    return int;
  };

  return {
    name: toStr(parsed.name, FALLBACK_NAME),
    description: toStr(parsed.description, FALLBACK_DESCRIPTION),
    care: toStr(parsed.care, FALLBACK_CARE),
    diagnosis: toStr(parsed.diagnosis, FALLBACK_DIAGNOSIS),
    watering_interval_days: toIntOrNull(parsed.watering_interval_days),
  };
}

// extractScientificName and computeConsensus imported from ./consensus.ts

// ─── Timed model caller ────────────────────────────────────────────────────────

async function callModelTimed(
  model: ModelName,
  caller: () => Promise<string>
): Promise<ModelResult> {
  const start = Date.now();
  try {
    const rawText = await caller();
    const responseMs = Date.now() - start;
    const plantInfo = parseAIResponse(rawText);
    const allFallback = plantInfo !== null && isFallbackResult(plantInfo);
    const rawName = allFallback ? null : (plantInfo?.name ?? null);
    const scientificName = rawName ? extractScientificName(rawName) : null;

    return {
      model,
      success: plantInfo !== null && !allFallback,
      plantInfo: allFallback ? null : plantInfo,
      rawName,
      scientificName,
      responseMs,
      errorMessage: allFallback ? "PARSE_FALLBACK" : null,
    };
  } catch (e) {
    return {
      model,
      success: false,
      plantInfo: null,
      rawName: null,
      scientificName: null,
      responseMs: Date.now() - start,
      errorMessage: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ─── Pick winner via consensus ──────────────────────────────────────────────

const MATCH_LEVEL_RANK: Record<string, number> = { exact: 3, normalized: 2, genus: 1 };

function pickWinner(results: ModelResult[]): ModelResult | null {
  const successful = results.filter((r) => r.success);
  if (successful.length === 0) return null;

  const consensus = computeConsensus(results);

  // Prefer models with consensus "correct", ranked by match level then speed
  const withConsensus = successful
    .filter((r) => consensus.get(r.model)?.verdict === "correct")
    .sort((a, b) => {
      const aLevel = MATCH_LEVEL_RANK[consensus.get(a.model)?.matchLevel ?? ""] ?? 0;
      const bLevel = MATCH_LEVEL_RANK[consensus.get(b.model)?.matchLevel ?? ""] ?? 0;
      if (bLevel !== aLevel) return bLevel - aLevel;
      return a.responseMs - b.responseMs;
    });

  if (withConsensus.length > 0) return withConsensus[0];

  // No consensus — pick fastest successful
  return successful.sort((a, b) => a.responseMs - b.responseMs)[0];
}

// ─── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, user_id, anonymous_id, lat, lng } = body;

    const match = image?.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image format");
    const mediaType = match[1];
    const base64Data = match[2];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // STEP 1: Call all providers in parallel (LLMs guarded by LLM_TIMEOUT_MS,
    // PlantNet by PLANTNET_TIMEOUT_MS). PlantNet is the 4th caller — its shape
    // differs from LLMs and it does NOT participate in pickWinner (D-01).
    const step1Start = Date.now();
    const settled = await Promise.allSettled([
      callModelTimed("claude", () => callClaude(base64Data, mediaType)),
      callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
      callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
      callPlantnetTimed(base64Data, mediaType),
    ]);
    const step1Ms = Date.now() - step1Start;

    // SPLIT: the 3 first are LLMs (ModelResult), the 4th is PlantNet
    // (PlantnetEvaluationResult). pickWinner + computeConsensus receive
    // ONLY llmResults so the LLM consensus mechanic stays intact (D-01).
    const llmSettled = settled.slice(0, 3) as PromiseSettledResult<ModelResult>[];
    const plantnetSettled = settled[3] as PromiseSettledResult<PlantnetEvaluationResult>;

    const llmResults = llmSettled
      .filter((s): s is PromiseFulfilledResult<ModelResult> => s.status === "fulfilled")
      .map((s) => s.value);

    const plantnetResult: PlantnetEvaluationResult | null =
      plantnetSettled.status === "fulfilled" ? plantnetSettled.value : null;

    // Per-invocation timing log — makes future slow-day incidents diagnosable
    // from Supabase Functions logs alone (no external tracing needed).
    const perModelSummary = (() => {
      const parts: string[] = [];
      const llmNames = ["claude", "gemini", "gpt4o"] as const;
      llmSettled.forEach((s, i) => {
        if (s.status === "fulfilled") {
          const r = s.value;
          parts.push(`${llmNames[i]}=${r.success ? "ok" : (r.errorMessage ?? "fail")}(${r.responseMs}ms)`);
        } else {
          parts.push(`${llmNames[i]}=REJECTED`);
        }
      });
      if (plantnetSettled.status === "fulfilled") {
        const p = plantnetSettled.value;
        const scoreStr = p.score !== null ? ` score=${p.score.toFixed(2)}` : "";
        parts.push(`plantnet=${p.success ? "ok" : (p.errorMessage ?? "fail")}(${p.responseMs}ms)${scoreStr}`);
      } else {
        parts.push(`plantnet=REJECTED`);
      }
      return parts.join(" ");
    })();
    console.log(`[identify] STEP 1 done in ${step1Ms}ms — ${perModelSummary}`);

    // STEP 2: Pick winner via LLM consensus (D-01: PlantNet does NOT participate)
    const winner = pickWinner(llmResults);

    if (!winner) {
      const isRateLimit = llmResults.some((r) => r.errorMessage?.startsWith("RATE_LIMIT:"));
      return new Response(
        JSON.stringify({
          error: isRateLimit
            ? "Demasiadas consultas. Espera un momento y vuelve a intentarlo."
            : "No se pudo identificar la planta. Intentalo de nuevo.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 3: Storage upload
    const folderPrefix = user_id ?? "anonymous";
    const fileName = `${folderPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    let imageUrl = image;

    try {
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("plant-images")
        .upload(fileName, bytes, {
          contentType: mediaType,
          cacheControl: "31536000",
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from("plant-images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } else {
        console.error("Storage upload error:", uploadError);
      }
    } catch (e) {
      console.error("Storage upload exception:", e);
    }

    // STEP 2b: Cross-validation PlantNet override (Phase 5 D-01, D-10, D-11).
    // Pure function from consensus.ts. If PlantNet failed or no match,
    // returns winner unchanged. Diverged=true only when score>=0.8 and no LLM
    // matched at exact/normalized tier.
    const plantnetInput: PlantnetOverrideInput | null = plantnetResult
      ? {
          success: plantnetResult.success,
          scientificName: plantnetResult.scientificName,
          score: plantnetResult.score,
        }
      : null;

    const override = applyPlantnetOverride(winner, llmResults, plantnetInput);
    const finalWinner = override.winner as ModelResult;   // preserves plantInfo + all LLM fields
    const diverged = override.diverged;

    if (override.matchedLlm) {
      console.log(
        `[identify] PlantNet override: LLM winner was ${winner.model} (${winner.scientificName}), ` +
        `PlantNet=${plantnetResult?.scientificName} (score=${plantnetResult?.score?.toFixed(2)}), ` +
        `→ using ${override.matchedLlm} row with PlantNet's scientific name.`
      );
    }
    if (diverged) {
      console.log(
        `[identify] PlantNet DIVERGENCE: LLM winner=${winner.scientificName}, ` +
        `PlantNet=${plantnetResult?.scientificName} (score=${plantnetResult?.score?.toFixed(2)}), ` +
        `no LLM matched → keeping LLM winner, flagging plantnet_diverged=true.`
      );
    }

    // STEP 4: DB insert — plant_searches
    const { data: searchRow, error: searchError } = await supabaseAdmin
      .from("plant_searches")
      .insert({
        name:                   finalWinner.plantInfo!.name,
        description:            finalWinner.plantInfo!.description,
        care:                   finalWinner.plantInfo!.care,
        diagnosis:              finalWinner.plantInfo!.diagnosis,
        watering_interval_days: finalWinner.plantInfo!.watering_interval_days,
        image_url:              imageUrl,
        model:                  finalWinner.model,
        plantnet_diverged:      diverged,   // Phase 5 D-12
        ...(user_id ? { user_id } : { user_id: null, anonymous_id: anonymous_id ?? null }),
        ...(typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90 &&
           typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180
          ? { lat, lng } : {}),
      })
      .select("id, created_at")
      .single();

    if (searchError) {
      console.error("plant_searches insert error:", searchError);
    }

    // STEP 5: Analytics — insert model_evaluations (fire-and-forget).
    // 4 rows per identification: 3 LLMs + 1 PlantNet (D-03). PlantNet row
    // carries the full raw_response JSON; LLM rows leave raw_response null.
    const consensusGroups = computeConsensus(llmResults);
    if (searchRow && (llmResults.length > 0 || plantnetResult)) {
      const llmRows = llmResults.map((r) => {
        const consensus = r.success ? (consensusGroups.get(r.model) ?? null) : null;
        return {
          plant_search_id:       searchRow.id,
          model:                 r.model,
          raw_name:              r.rawName,
          scientific_name:       r.scientificName,
          description:           r.plantInfo?.description ?? null,
          care:                  r.plantInfo?.care ?? null,
          diagnosis:             r.plantInfo?.diagnosis ?? null,
          response_ms:           r.responseMs,
          success:               r.success,
          error_message:         r.errorMessage,
          is_winner:             r.model === finalWinner.model,
          consensus_group:       consensus?.verdict ?? null,
          consensus_match_level: consensus?.matchLevel ?? null,
          raw_response:          null,   // LLMs never populate raw_response
        };
      });

      // 4th row: plantnet — inserted even on failure so we retain the record (D-09).
      const plantnetRow = plantnetResult ? {
        plant_search_id:       searchRow.id,
        model:                 "plantnet" as const,
        raw_name:              plantnetResult.rawName,
        scientific_name:       plantnetResult.scientificName,
        description:           null,
        care:                  null,
        diagnosis:             null,
        response_ms:           plantnetResult.responseMs,
        success:               plantnetResult.success,
        error_message:         plantnetResult.errorMessage,
        is_winner:             false,   // D-01: PlantNet never wins the row; LLM aligned always does
        consensus_group:       null,
        consensus_match_level: null,
        raw_response:          plantnetResult.rawResponse,   // full JSON (D-03)
      } : null;

      const evaluationRows = plantnetRow ? [...llmRows, plantnetRow] : llmRows;

      // Don't await — let it complete in the background
      supabaseAdmin
        .from("model_evaluations")
        .insert(evaluationRows)
        .then(({ error: evalError }) => {
          if (evalError) console.error("model_evaluations insert error:", evalError);
        });
    }

    // STEP 5b: PostHog event on divergence (D-12). Fire-and-forget with tight
    // timeout — analytics failure MUST NOT affect the user response.
    if (diverged && plantnetResult && winner) {
      const POSTHOG_API_KEY = Deno.env.get("POSTHOG_PROJECT_API_KEY");
      if (POSTHOG_API_KEY) {
        const distinctId = user_id ?? anonymous_id ?? "edge-fn-anon";
        const payload = {
          api_key: POSTHOG_API_KEY,
          event: "plantnet_divergence",
          distinct_id: distinctId,
          properties: {
            plantnet_scientific:   plantnetResult.scientificName,
            plantnet_score:        plantnetResult.score,
            llm_winner_scientific: winner.scientificName,
            llm_winner_model:      winner.model,
            plant_search_id:       searchRow?.id ?? null,
            $lib: "edge-function",
          },
        };
        fetch("https://eu.i.posthog.com/capture/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(2_000),
        }).catch((e) => console.error("posthog capture error:", e));
      } else {
        console.warn("[identify] POSTHOG_PROJECT_API_KEY not set — divergence event skipped");
      }
    }

    // STEP 6: Return JSON — expose ONLY the 3 LLMs in `models` (D-02: PlantNet invisible)
    const modelsSummary = llmResults.map((r) => {
      const consensus = r.success ? (consensusGroups.get(r.model) ?? null) : null;
      return {
        model: r.model,
        success: r.success,
        scientific_name: r.scientificName,
        response_ms: r.responseMs,
        is_winner: r.model === finalWinner.model,
        consensus_verdict: consensus?.verdict ?? null,
      };
    });
    const consensusReached =
      consensusGroups.get(finalWinner.model)?.verdict === "correct";

    return new Response(
      JSON.stringify({
        name:                   finalWinner.plantInfo!.name,
        description:            finalWinner.plantInfo!.description,
        care:                   finalWinner.plantInfo!.care,
        diagnosis:              finalWinner.plantInfo!.diagnosis,
        watering_interval_days: finalWinner.plantInfo!.watering_interval_days,
        model:                  finalWinner.model,
        plant_search_id:        searchRow?.id ?? null,
        created_at:             searchRow?.created_at ?? null,
        models:                 modelsSummary,
        consensus_reached:      consensusReached,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("identify-plant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
