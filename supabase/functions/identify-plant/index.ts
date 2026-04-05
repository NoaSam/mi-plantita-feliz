import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Extract base64 data and media type from data URL
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image format");
    const mediaType = match[1];
    const base64Data = match[2];

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
        system: `Eres un botánico experto que ayuda a personas con plantas en casa. Responde SIEMPRE en español, con tono cercano y claro. Evita jerga botánica innecesaria — si usas un término técnico, explícalo brevemente.

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
- Si la foto no permite un diagnóstico claro, dilo honestamente`,
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
              {
                type: "text",
                text: "Identifica esta planta, dime cómo cuidarla y analiza si le pasa algo.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas consultas. Espera un momento y vuelve a intentarlo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error al identificar la planta. Inténtalo de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Extract JSON from response (handle possible markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({
          name: "Planta no identificada",
          description: text || "No se pudo identificar la planta. Intenta con otra foto más clara.",
          care: "Asegúrate de que la foto muestre bien la planta.",
          diagnosis: "No hay suficiente información para un diagnóstico.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const plantInfo = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(plantInfo), {
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
