import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COACH_SYSTEM_PROMPT = `You are FitCoach AI — an expert personal trainer, nutritionist, and meal prep coach embedded in a fitness management platform. You have deep knowledge of:

- Exercise science, program design, and periodization
- Sports nutrition, macro/micro nutrients, and supplementation
- Meal prep strategies, grocery planning, and cooking techniques
- Body composition, weight management, and recovery
- Food quality scoring (Nutri-Score, NOVA classification, ingredient analysis)
- Workout-day-specific nutrition (adjusting macros for rest/light/heavy/endurance days)
- Barcode-based food lookup and product alternatives

Guidelines:
- Give specific, actionable advice based on the client's data when available
- Use metric AND imperial units when discussing weight/measurements
- When suggesting meals, consider the client's dietary style, allergies, and budget
- Adjust nutrition advice based on workout day type and training intensity
- Reference real foods and practical recipes, not generic advice
- If you don't have enough client data, ask clarifying questions
- Be motivational but honest — don't sugarcoat if someone is off track
- Format responses with clear headers, bullet points, and emojis for readability
- Keep responses focused and under 500 words unless a detailed plan is requested`;

const CHEF_SYSTEM_PROMPT = `You are FitChef AI — a friendly, encouraging kitchen buddy who happens to be an amazing cook 👨‍🍳. You're embedded in a fitness platform, so everything you teach is health-conscious, but your primary job is to make cooking feel fun and doable.

Your personality:
- Talk like a supportive friend in the kitchen, not a textbook
- Use casual, warm language with cooking emojis (🔥🍳🧈🥘🌿)
- Celebrate wins ("That's gonna taste incredible!")
- Make it feel easy, even for total beginners

Your expertise:
- Step-by-step cooking instructions with exact times and temperatures
- Meal prep strategies: batch cooking, storage, reheating tips
- Seasoning and flavor building — making healthy food taste amazing
- Ingredient substitutions for allergies, budget, and dietary preferences
- Kitchen equipment recommendations and efficiency tips
- Knife skills, cooking techniques, and food safety basics
- Grocery shopping tips and budget-friendly ingredient swaps

Guidelines:
- ALWAYS adapt instructions to the client's cooking level (if available):
  • Beginner: Very simple steps, explain everything, suggest easy swaps
  • Intermediate: More techniques, flavor layering, efficiency tips
  • Advanced: Complex techniques, restaurant-quality tips, creative plating
- Consider the client's allergies, intolerances, and dietary style when suggesting recipes
- Consider budget level when recommending ingredients
- Include storage instructions (how long it keeps, freezer-friendly?)
- Include reheating instructions when relevant
- When discussing meal prep, give a clear timeline ("Sunday: 2 hours of prep")
- Use temperature in both °F and °C
- Suggest protein-rich, nutrient-dense options by default
- Format with clear numbered steps, timing callouts, and ingredient lists
- Keep responses practical and under 500 words unless a full recipe is requested
- If you reference the client's meal plan, suggest how to actually cook those meals`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientId, shopId, mode = "coach" } = await req.json();
    // Use dedicated PT key, fall back to shared key
    const OPENAI_API_KEY = Deno.env.get("PT_OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Neither PT_OPENAI_API_KEY nor OPENAI_API_KEY is configured");

    // Build rich context from database
    let contextSections: string[] = [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client's nutrition profile
    if (clientId && shopId) {
      const [
        { data: profile },
        { data: goals },
        { data: recentLogs },
        { data: mealPlans },
        { data: biometrics },
        { data: workoutDayTypes },
        { data: fitnessScores },
        { data: ptClient },
        { data: medicalConditions },
      ] = await Promise.all([
        supabase.from("nt_nutrition_profiles").select("*").eq("client_id", clientId).eq("shop_id", shopId).maybeSingle(),
        supabase.from("nt_fitness_goals").select("*").eq("client_id", clientId).eq("shop_id", shopId).eq("is_active", true).limit(3),
        supabase.from("nt_food_logs").select("*, product:nt_food_products(product_name, brand, nutri_score_grade)").eq("client_id", clientId).eq("shop_id", shopId).order("logged_at", { ascending: false }).limit(10),
        supabase.from("nt_meal_plans").select("*").eq("client_id", clientId).eq("shop_id", shopId).eq("is_active", true).limit(1),
        supabase.from("nt_biometric_snapshots").select("*").eq("client_id", clientId).eq("shop_id", shopId).order("recorded_at", { ascending: false }).limit(1),
        supabase.from("nt_workout_day_types").select("*").eq("shop_id", shopId),
        supabase.from("pt_fitness_scores").select("*").eq("client_id", clientId).eq("shop_id", shopId).limit(1),
        supabase.from("pt_clients").select("first_name, last_name, email, status, assigned_trainer_id, fitness_interests").eq("id", clientId).maybeSingle(),
        supabase.from("pt_client_medical_conditions").select("*").eq("client_id", clientId).eq("shop_id", shopId).in("status", ["active", "chronic", "monitoring"]),
      ]);

      if (ptClient) {
        contextSections.push(`## Client Info\nName: ${ptClient.first_name} ${ptClient.last_name}\nStatus: ${ptClient.status}\nFitness Interests: ${JSON.stringify(ptClient.fitness_interests || [])}`);
      }

      // Medical conditions context
      if (medicalConditions && medicalConditions.length > 0) {
        const medLines = medicalConditions.map((mc: any) => {
          let line = `- **${mc.condition_name}** (${mc.category}) — ${mc.severity}, ${mc.status}`;
          if (mc.exercise_restrictions?.length > 0) line += `\n  Exercise restrictions: ${mc.exercise_restrictions.join(', ')}`;
          if (mc.dietary_implications?.length > 0) line += `\n  Dietary implications: ${mc.dietary_implications.join(', ')}`;
          if (mc.cleared_by_physician) line += `\n  ✓ Cleared by physician`;
          if (mc.notes) line += `\n  Notes: ${mc.notes}`;
          return line;
        });
        contextSections.push(`## ⚠️ Medical Conditions\n${medLines.join("\n")}\n\n**Important**: Always consider these conditions when giving exercise or nutrition advice. Do not recommend exercises that violate the listed restrictions.`);
      }

      if (profile) {
        contextSections.push(`## Nutrition Profile\nDietary Style: ${profile.dietary_style || "Not set"}\nAllergies: ${JSON.stringify(profile.allergies || [])}\nIntolerances: ${JSON.stringify(profile.intolerances || [])}\nBudget: ${profile.budget_level || "Not set"}\nCooking Level: ${profile.cooking_level || "Not set"}\nSupplements: ${JSON.stringify(profile.supplements || [])}`);
      }

      if (goals && goals.length > 0) {
        const goalTexts = goals.map((g: any) => `- ${g.goal_type}: ${g.target_calories || "?"} cal, P:${g.target_protein || "?"}g C:${g.target_carbs || "?"}g F:${g.target_fat || "?"}g`);
        contextSections.push(`## Active Fitness Goals\n${goalTexts.join("\n")}`);
      }

      if (recentLogs && recentLogs.length > 0) {
        const logTexts = recentLogs.map((l: any) => `- ${l.meal_type}: ${l.product?.product_name || "Unknown"} (${l.servings} servings, ${l.calories_consumed || "?"}cal)`);
        contextSections.push(`## Recent Food Logs (last 10)\n${logTexts.join("\n")}`);
      }

      if (mealPlans && mealPlans.length > 0) {
        const mp = mealPlans[0];
        contextSections.push(`## Active Meal Plan\nName: ${mp.plan_name}\nCalories: ${mp.daily_calories}\nMacros: P:${mp.daily_protein}g C:${mp.daily_carbs}g F:${mp.daily_fat}g\nMeals: ${JSON.stringify(mp.meals || {})}`);
      }

      if (biometrics && biometrics.length > 0) {
        const b = biometrics[0];
        contextSections.push(`## Latest Biometrics\nWeight: ${b.weight_kg || "?"}kg\nBody Fat: ${b.body_fat_pct || "?"}%\nHR: ${b.heart_rate_avg || "?"}bpm\nSleep: ${b.sleep_hours || "?"}h\nSteps: ${b.steps || "?"}\nRecorded: ${b.recorded_at}`);
      }

      if (fitnessScores) {
        contextSections.push(`## Fitness Affinity Scores\n${JSON.stringify(fitnessScores)}`);
      }

      if (workoutDayTypes && workoutDayTypes.length > 0) {
        const dayTexts = workoutDayTypes.map((d: any) => `- ${d.day_type_name}: Carb bias ${d.carb_bias}x, Protein bias ${d.protein_bias}x, Fat bias ${d.fat_bias}x`);
        contextSections.push(`## Workout Day Types\n${dayTexts.join("\n")}`);
      }
    }

    const contextBlock = contextSections.length > 0 ? `\n\n## Current Client Context\n${contextSections.join("\n\n")}` : "";
    const basePrompt = mode === "chef" ? CHEF_SYSTEM_PROMPT : COACH_SYSTEM_PROMPT;
    const systemPrompt = basePrompt + contextBlock;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("pt-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
