import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un botánico experto. El usuario te envía una foto de una planta. Debes responder SIEMPRE en español, de forma clara y sencilla para una persona mayor.

Usa la herramienta "plant_info" para devolver la información estructurada.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image },
              },
              {
                type: "text",
                text: "Identifica esta planta. Dime qué es, cómo cuidarla y si le pasa algo (si se ve alguna enfermedad o problema).",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "plant_info",
              description: "Devuelve información estructurada sobre la planta identificada.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nombre común de la planta" },
                  description: { type: "string", description: "Descripción breve de qué es la planta, su familia, origen y características principales. 2-3 frases." },
                  care: { type: "string", description: "Consejos de cuidado: riego, luz, suelo, temperatura. 3-4 frases claras." },
                  diagnosis: { type: "string", description: "Diagnóstico visual: si la planta se ve sana o si tiene algún problema visible (plagas, hojas amarillas, falta de agua, etc.). 2-3 frases." },
                },
                required: ["name", "description", "care", "diagnosis"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "plant_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas consultas. Espera un momento y vuelve a intentarlo." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Contacta con el administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error al identificar la planta. Inténtalo de nuevo." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fallback: try to parse content directly
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({
        name: "Planta no identificada",
        description: content || "No se pudo identificar la planta. Intenta con otra foto más clara.",
        care: "Asegúrate de que la foto muestre bien la planta.",
        diagnosis: "No hay suficiente información para un diagnóstico.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plantInfo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(plantInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-plant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
