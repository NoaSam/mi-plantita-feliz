const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: "text", text: USER_MESSAGE },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    const t = await response.text();
    console.error("Anthropic API error:", response.status, t);
    throw new Error("API_ERROR");
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function callGemini(base64Data: string, mediaType: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mediaType,
                  data: base64Data,
                },
              },
              { text: USER_MESSAGE },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    const t = await response.text();
    console.error("Gemini API error:", response.status, t);
    throw new Error("API_ERROR");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    // Extract base64 data and media type from data URL
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image format");
    const mediaType = match[1];
    const base64Data = match[2];

    // A/B test: randomly pick model
    const model = Math.random() < 0.5 ? "claude" : "gemini";

    let text: string;
    try {
      text = model === "claude"
        ? await callClaude(base64Data, mediaType)
        : await callGemini(base64Data, mediaType);
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Demasiadas consultas. Espera un momento y vuelve a intentarlo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }

    // Extract JSON from response (handle possible markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({
          name: "Planta no identificada",
          description: text || "No se pudo identificar la planta. Intenta con otra foto más clara.",
          care: "Asegúrate de que la foto muestre bien la planta.",
          diagnosis: "No hay suficiente información para un diagnóstico.",
          model,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const plantInfo = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ ...plantInfo, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-plant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
