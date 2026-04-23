import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ModelName,
  extractScientificName,
  computeConsensus,
} from "./consensus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un botánico experto que ayuda a personas con plantas en casa. Responde SIEMPRE en español, con tono cercano y claro. Evita jerga botánica innecesaria — si usas un término técnico, explícalo brevemente.

El usuario te envía una foto de una planta. Analízala y responde SOLO con un JSON válido (sin texto antes ni después) con esta estructura:

{
  "name": "Nombre común (Nombre científico)",
  "description": "Markdown con descripción de la planta",
  "care": "Markdown con guía de cuidados",
  "diagnosis": "Markdown con diagnóstico visual"
}

Instrucciones para cada campo:

**name**: Nombre común seguido del nombre científico entre paréntesis. Ej: "Potus (Epipremnum aureum)"

**description**: Usa Markdown. Incluye:
- Qué planta es y a qué familia pertenece
- De dónde es originaria
- Características visuales principales (hojas, flores, tamaño típico)
- Algún dato curioso o útil si lo hay

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
- Si la foto no permite un diagnóstico claro, dilo honestamente`;

const USER_MESSAGE = "Identifica esta planta, dime cómo cuidarla y analiza si le pasa algo.";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlantInfo {
  name: string;
  description: string;
  care: string;
  diagnosis: string;
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

async function callClaude(base64Data: string, mediaType: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
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

  return {
    name: toStr(parsed.name, FALLBACK_NAME),
    description: toStr(parsed.description, FALLBACK_DESCRIPTION),
    care: toStr(parsed.care, FALLBACK_CARE),
    diagnosis: toStr(parsed.diagnosis, FALLBACK_DIAGNOSIS),
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

    // Service role client — bypasses RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call all 3 models in parallel
    const allResults = await Promise.all([
      callModelTimed("claude", () => callClaude(base64Data, mediaType)),
      callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
      callModelTimed("gpt4o", () => callOpenAI(base64Data, mediaType)),
    ]);

    // Compute consensus first — winner selection uses it
    const consensusGroups = computeConsensus(allResults);

    // Pick winner: prefer consensus models, then fastest
    const successful = allResults.filter((r) => r.success);
    const consensusWinners = successful
      .filter((r) => consensusGroups.get(r.model)?.verdict === "correct")
      .sort((a, b) => a.responseMs - b.responseMs);
    const winner = consensusWinners[0]
      ?? successful.sort((a, b) => a.responseMs - b.responseMs)[0]
      ?? null;

    if (!winner) {
      const isRateLimit = allResults.some((r) => r.errorMessage?.startsWith("RATE_LIMIT:"));
      return new Response(
        JSON.stringify({
          error: isRateLimit
            ? "Demasiadas consultas. Espera un momento y vuelve a intentarlo."
            : "No se pudo identificar la planta. Inténtalo de nuevo.",
        }),
        {
          status: isRateLimit ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload image to Supabase Storage (replaces storing base64 in DB)
    // Use user_id as folder prefix, or "anonymous" for non-authenticated users
    const folderPrefix = user_id ?? "anonymous";
    const fileName = `${folderPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    let imageUrl = image; // fallback to original base64 if upload fails

    try {
      // Convert base64 to binary
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { error: uploadError } = await supabaseAdmin.storage
        .from("plant-images")
        .upload(fileName, bytes, {
          contentType: mediaType,
          cacheControl: "31536000", // 1 year — images are immutable
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from("plant-images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } else {
        console.error("Storage upload error:", uploadError);
        // Non-fatal: fall back to base64 in DB (worse for Android but doesn't break functionality)
      }
    } catch (e) {
      console.error("Storage upload exception:", e);
      // Non-fatal: fall back to base64
    }

    // Write plant_searches row
    const { data: searchRow, error: searchError } = await supabaseAdmin
      .from("plant_searches")
      .insert({
        name: winner.plantInfo!.name,
        description: winner.plantInfo!.description,
        care: winner.plantInfo!.care,
        diagnosis: winner.plantInfo!.diagnosis,
        image_url: imageUrl,
        model: winner.model,
        ...(user_id ? { user_id } : { user_id: null, anonymous_id: anonymous_id ?? null }),
        ...(typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90 &&
           typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180
          ? { lat, lng } : {}),
      })
      .select("id, created_at")
      .single();

    if (searchError) {
      console.error("plant_searches insert error:", searchError);
      throw new Error("No se pudo guardar el resultado. Inténtalo de nuevo.");
    }

    // Write model_evaluations rows (3 rows, one per model)
    const evaluationRows = allResults.map((r) => {
      const consensus = r.success ? (consensusGroups.get(r.model) ?? null) : null;
      return {
        plant_search_id: searchRow.id,
        model: r.model,
        raw_name: r.rawName,
        scientific_name: r.scientificName,
        description: r.plantInfo?.description ?? null,
        care: r.plantInfo?.care ?? null,
        diagnosis: r.plantInfo?.diagnosis ?? null,
        response_ms: r.responseMs,
        success: r.success,
        error_message: r.errorMessage,
        is_winner: r.model === winner.model,
        consensus_group: consensus?.verdict ?? null,
        consensus_match_level: consensus?.matchLevel ?? null,
      };
    });

    const { error: evalError } = await supabaseAdmin
      .from("model_evaluations")
      .insert(evaluationRows);

    if (evalError) {
      // Non-fatal: user still gets their result
      console.error("model_evaluations insert error:", evalError);
    }

    const modelsSummary = allResults.map((r) => {
      const consensus = consensusGroups.get(r.model);
      return {
        model: r.model,
        success: r.success,
        response_ms: r.responseMs,
        consensus_group: consensus?.verdict ?? "no_consensus",
        consensus_match_level: consensus?.matchLevel ?? null,
        error_message: r.errorMessage,
      };
    });

    return new Response(
      JSON.stringify({
        name: winner.plantInfo!.name,
        description: winner.plantInfo!.description,
        care: winner.plantInfo!.care,
        diagnosis: winner.plantInfo!.diagnosis,
        model: winner.model,
        plant_search_id: searchRow.id,
        created_at: searchRow.created_at,
        models: modelsSummary,
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
