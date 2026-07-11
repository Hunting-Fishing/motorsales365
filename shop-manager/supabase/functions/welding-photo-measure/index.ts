// Welding AI Photo-Measure: extracts dimensions from a sketch/site photo
// and proposes quote material line items.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert welding/metal fabrication estimator. You analyze a photo or sketch of a project (gates, railings, frames, brackets, stairs, fences, repairs, etc.) and extract:

1. A short project description.
2. Visible or inferred dimensions (length, width, height, diameter, thickness) with units.
3. A list of material line items needed to fabricate the project.

For each material line item provide:
- name (e.g. "1.5\" Square Tube", "1/4\" Steel Plate", "Hinge - Heavy Duty")
- category (one of: tube, plate, beam, angle, channel, bar, sheet, pipe, hardware, consumable, other)
- shape (square_tube, round_tube, plate, sheet, angle, channel, beam, flat_bar, pipe, hardware, other)
- material_grade (A36, 304SS, 6061, mild_steel, etc — best guess)
- length_value, length_unit (in/ft/mm/cm/m) — total linear length needed across all pieces
- pieces (integer count)
- per_piece_length_value (length of one piece)
- thickness_value, thickness_unit (if applicable)
- diameter_value, diameter_unit (if applicable)
- width_value, width_unit (if applicable)
- quantity (number of units to buy — pieces or sticks of standard 20ft stock as needed)
- estimated_cost_each (USD, conservative)
- estimated_sell_each (cost * 1.4 markup unless user provided markup)
- measurements (a single human-readable summary string for the line)
- notes (assumptions made)

Also include:
- waste_percent (default 10)
- estimated_labour_hours (rough fabrication + welding time)
- confidence (0–1) for the extraction
- assumptions (array of strings explaining what you inferred vs measured)

Be conservative. If a dimension is not visible, infer from typical proportions and note it in assumptions. Always return units. Never invent prices wildly — use conservative US market rates for steel.`;

const TOOL = {
  type: "function",
  function: {
    name: "propose_quote_materials",
    description: "Return extracted measurements and proposed quote material line items.",
    parameters: {
      type: "object",
      properties: {
        project_description: { type: "string" },
        confidence: { type: "number" },
        waste_percent: { type: "number" },
        estimated_labour_hours: { type: "number" },
        assumptions: { type: "array", items: { type: "string" } },
        dimensions_summary: { type: "string" },
        materials: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              shape: { type: "string" },
              material_grade: { type: "string" },
              length_value: { type: "number" },
              length_unit: { type: "string" },
              pieces: { type: "number" },
              per_piece_length_value: { type: "number" },
              thickness_value: { type: "number" },
              thickness_unit: { type: "string" },
              diameter_value: { type: "number" },
              diameter_unit: { type: "string" },
              width_value: { type: "number" },
              width_unit: { type: "string" },
              quantity: { type: "number" },
              estimated_cost_each: { type: "number" },
              estimated_sell_each: { type: "number" },
              measurements: { type: "string" },
              notes: { type: "string" },
            },
            required: ["name", "category", "quantity", "estimated_cost_each", "estimated_sell_each", "measurements"],
            additionalProperties: false,
          },
        },
      },
      required: ["project_description", "confidence", "materials", "assumptions"],
      additionalProperties: false,
    },
  },
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user — prevents anonymous abuse of AI credits.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_data_url, hint, markup_multiplier } = await req.json();
    if (!image_data_url || typeof image_data_url !== "string" || !image_data_url.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "image_data_url (data:image/...;base64,...) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userText = `Analyze this welding/fabrication ${hint ? `(${hint})` : "project photo or sketch"} and propose materials. Use markup multiplier ${markup_multiplier || 1.4} for sell prices.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: image_data_url } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "propose_quote_materials" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "AI rate limit reached. Please wait and try again." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured output", raw: data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("welding-photo-measure error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
