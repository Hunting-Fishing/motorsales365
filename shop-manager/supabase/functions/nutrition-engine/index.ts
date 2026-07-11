import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface ScoringWeights {
  protein_density: number;
  fiber: number;
  added_sugar: number;
  sodium: number;
  micronutrients: number;
  calorie_efficiency: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  protein_density: 0.25,
  fiber: 0.20,
  added_sugar: -0.15,
  sodium: -0.10,
  micronutrients: 0.15,
  calorie_efficiency: 0.15,
};

function computeNutritionDensity(nutrients: any[]): number {
  const nutMap: Record<string, number> = {};
  for (const n of nutrients) nutMap[n.nutrient_name] = n.amount || 0;

  const cal = nutMap.calories || 1;
  const proteinPer100 = (nutMap.protein || 0);
  const fiberPer100 = (nutMap.fiber || 0);
  const sugarPer100 = (nutMap.sugar || 0);
  const sodiumPer100 = (nutMap.sodium || 0) * 1000; // convert to mg if in g

  // Score 0-100 per dimension
  const proteinScore = Math.min(100, (proteinPer100 / 25) * 100);
  const fiberScore = Math.min(100, (fiberPer100 / 10) * 100);
  const sugarScore = Math.max(0, 100 - (sugarPer100 / 20) * 100);
  const sodiumScore = Math.max(0, 100 - (sodiumPer100 / 2000) * 100);
  const calorieEfficiency = Math.min(100, ((proteinPer100 * 4 + fiberPer100 * 2) / Math.max(cal, 1)) * 100);
  const microScore = 50; // baseline — needs real micronutrient data to refine

  const score =
    proteinScore * Math.abs(DEFAULT_WEIGHTS.protein_density) +
    fiberScore * Math.abs(DEFAULT_WEIGHTS.fiber) +
    sugarScore * Math.abs(DEFAULT_WEIGHTS.added_sugar) +
    sodiumScore * Math.abs(DEFAULT_WEIGHTS.sodium) +
    microScore * Math.abs(DEFAULT_WEIGHTS.micronutrients) +
    calorieEfficiency * Math.abs(DEFAULT_WEIGHTS.calorie_efficiency);

  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

function computeGoalFit(nutrients: any[], goal: any): number {
  if (!goal) return 50;
  const nutMap: Record<string, number> = {};
  for (const n of nutrients) nutMap[n.nutrient_name] = n.amount || 0;

  let score = 50;
  const goalType = (goal.goal_type || '').toLowerCase();

  if (goalType.includes('fat_loss') || goalType.includes('fat loss')) {
    if ((nutMap.protein || 0) > 15) score += 20;
    if ((nutMap.sugar || 0) < 5) score += 15;
    if ((nutMap.fiber || 0) > 3) score += 10;
    if ((nutMap.fat || 0) > 20) score -= 15;
  } else if (goalType.includes('muscle') || goalType.includes('gain')) {
    if ((nutMap.protein || 0) > 20) score += 25;
    if ((nutMap.calories || 0) > 150) score += 10;
    if ((nutMap.carbohydrates || 0) > 20) score += 10;
  } else if (goalType.includes('endurance')) {
    if ((nutMap.carbohydrates || 0) > 25) score += 20;
    if ((nutMap.protein || 0) > 10) score += 10;
    if ((nutMap.fiber || 0) > 3) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

async function fetchClientNutritionContext(supabase: any, clientId: string, shopId: string) {
  const [
    { data: profile },
    { data: goals },
    { data: biometrics },
    { data: recentLogs },
    { data: client },
  ] = await Promise.all([
    supabase.from('nt_nutrition_profiles').select('*').eq('client_id', clientId).eq('shop_id', shopId).maybeSingle(),
    supabase.from('nt_fitness_goals').select('*').eq('client_id', clientId).eq('shop_id', shopId).eq('is_active', true).limit(1).maybeSingle(),
    supabase.from('nt_biometric_snapshots').select('*').eq('client_id', clientId).eq('shop_id', shopId).order('recorded_at', { ascending: false }).limit(5),
    supabase.from('nt_food_logs').select('*').eq('client_id', clientId).eq('shop_id', shopId).order('created_at', { ascending: false }).limit(20),
    supabase.from('pt_clients').select('first_name, last_name, fitness_level, goals, injuries').eq('id', clientId).single(),
  ]);
  return { profile, goals, biometrics: biometrics || [], recentLogs: recentLogs || [], client };
}

function buildNutritionSummary(ctx: any): string {
  const { profile, goals, biometrics, recentLogs, client } = ctx;
  const lines: string[] = [];
  lines.push(`Client: ${client?.first_name} ${client?.last_name}`);
  lines.push(`Fitness Level: ${client?.fitness_level || 'unknown'}`);
  if (profile) {
    lines.push(`Dietary Style: ${profile.dietary_style}`);
    lines.push(`Allergies: ${(profile.allergies || []).join(', ') || 'none'}`);
    lines.push(`Cooking Level: ${profile.cooking_level}`);
    lines.push(`Budget: ${profile.budget_level}`);
  }
  if (goals) {
    lines.push(`\nGoal: ${goals.goal_type}`);
    lines.push(`Targets: ${goals.target_calories || '?'} kcal, P:${goals.target_protein_g || '?'}g, C:${goals.target_carbs_g || '?'}g, F:${goals.target_fat_g || '?'}g`);
  }
  if (biometrics.length > 0) {
    const b = biometrics[0];
    lines.push(`\nLatest Biometrics: Weight ${b.weight_kg || '?'}kg, BF ${b.body_fat_pct || '?'}%, TDEE ${b.tdee_kcal || '?'}kcal`);
  }
  if (recentLogs.length > 0) {
    const todayLogs = recentLogs.filter((l: any) => l.log_date === new Date().toISOString().split('T')[0]);
    const todayCal = todayLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0);
    const todayProt = todayLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0);
    lines.push(`Today's Intake: ${todayCal} kcal, ${todayProt}g protein (${todayLogs.length} meals)`);
  }
  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, clientId, shopId, productId, dayType } = await req.json();

    // ---- score_food ----
    if (action === 'score_food') {
      if (!productId) return new Response(JSON.stringify({ error: 'productId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: nutrients } = await supabase.from('nt_food_product_nutrients').select('*').eq('product_id', productId);
      let goal = null;
      if (clientId && shopId) {
        const { data: g } = await supabase.from('nt_fitness_goals').select('*').eq('client_id', clientId).eq('shop_id', shopId).eq('is_active', true).maybeSingle();
        goal = g;
      }

      const nutritionDensity = computeNutritionDensity(nutrients || []);
      const goalFit = computeGoalFit(nutrients || [], goal);
      const ingredientQuality = 60; // baseline
      const overallScore = Math.round((nutritionDensity * 0.4 + goalFit * 0.35 + ingredientQuality * 0.25) * 10) / 10;

      // Upsert score
      await supabase.from('nt_food_quality_scores').upsert({
        product_id: productId,
        client_id: clientId || null,
        shop_id: shopId || null,
        nutrition_density: nutritionDensity,
        ingredient_quality: ingredientQuality,
        goal_fit: goalFit,
        overall_score: overallScore,
        scoring_details: { weights: DEFAULT_WEIGHTS },
        computed_at: new Date().toISOString(),
      }, { onConflict: 'product_id,client_id' });

      return new Response(JSON.stringify({ nutrition_density: nutritionDensity, ingredient_quality: ingredientQuality, goal_fit: goalFit, overall_score: overallScore }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- get_daily_targets ----
    if (action === 'get_daily_targets') {
      if (!clientId || !shopId) return new Response(JSON.stringify({ error: 'clientId and shopId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: goal } = await supabase.from('nt_fitness_goals').select('*').eq('client_id', clientId).eq('shop_id', shopId).eq('is_active', true).maybeSingle();
      const { data: dayTypeConfig } = await supabase.from('nt_workout_day_types').select('*').eq('day_type', dayType || 'moderate').limit(1).maybeSingle();

      const baseCal = goal?.target_calories || 2000;
      const baseProt = goal?.target_protein_g || 150;
      const baseCarbs = goal?.target_carbs_g || 200;
      const baseFat = goal?.target_fat_g || 65;

      const bias = dayTypeConfig || { calorie_bias: 1, protein_bias: 1, carb_bias: 1, fat_bias: 1 };

      return new Response(JSON.stringify({
        calories: Math.round(baseCal * (bias.calorie_bias || 1)),
        protein_g: Math.round(baseProt * (bias.protein_bias || 1)),
        carbs_g: Math.round(baseCarbs * (bias.carb_bias || 1)),
        fat_g: Math.round(baseFat * (bias.fat_bias || 1)),
        day_type: dayType || 'moderate',
        day_type_label: dayTypeConfig?.label || 'Moderate Training',
        goal_type: goal?.goal_type || 'general_health',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- generate_meal_plan ----
    if (action === 'generate_meal_plan') {
      if (!clientId || !shopId) return new Response(JSON.stringify({ error: 'clientId and shopId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const ctx = await fetchClientNutritionContext(supabase, clientId, shopId);
      const summary = buildNutritionSummary(ctx);
      const { data: dayTypes } = await supabase.from('nt_workout_day_types').select('*').eq('is_default', true);

      const systemPrompt = `You are an expert sports nutritionist and meal planning AI. Create personalized meal plans based on the client's profile, goals, and biometrics. 
Return a JSON object with this exact structure:
{
  "plan_name": "string",
  "meals": [
    { "meal_type": "breakfast|pre_workout|lunch|post_workout|dinner|snack", "name": "string", "foods": ["string"], "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "prep_time_min": number, "notes": "string" }
  ],
  "grocery_list": [{ "item": "string", "quantity": "string", "category": "string" }],
  "daily_totals": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "tips": ["string"]
}`;

      const userPrompt = `Create a ${dayType || 'moderate'} training day meal plan for this client:\n\n${summary}\n\nMake it practical, varied, and aligned with their dietary preferences. Use whole foods. Include portion sizes. Respect allergies and intolerances.`;

      const aiRes = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          tools: [{
            type: 'function',
            function: {
              name: 'create_meal_plan',
              description: 'Create a structured meal plan',
              parameters: {
                type: 'object',
                properties: {
                  plan_name: { type: 'string' },
                  meals: { type: 'array', items: { type: 'object', properties: { meal_type: { type: 'string' }, name: { type: 'string' }, foods: { type: 'array', items: { type: 'string' } }, calories: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' }, prep_time_min: { type: 'number' }, notes: { type: 'string' } }, required: ['meal_type', 'name', 'foods', 'calories', 'protein_g', 'carbs_g', 'fat_g'] } },
                  grocery_list: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, quantity: { type: 'string' }, category: { type: 'string' } }, required: ['item', 'quantity'] } },
                  daily_totals: { type: 'object', properties: { calories: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' } } },
                  tips: { type: 'array', items: { type: 'string' } }
                },
                required: ['plan_name', 'meals', 'grocery_list', 'daily_totals'],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'create_meal_plan' } },
        }),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (status === 402) return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let plan: any = {};
      if (toolCall?.function?.arguments) {
        plan = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
      }

      // Save meal plan
      const { data: saved } = await supabase.from('nt_meal_plans').insert({
        client_id: clientId,
        shop_id: shopId,
        plan_name: plan.plan_name || `${dayType || 'moderate'} Day Plan`,
        plan_type: 'ai_generated',
        day_type: dayType || 'moderate',
        target_calories: plan.daily_totals?.calories,
        target_protein_g: plan.daily_totals?.protein_g,
        target_carbs_g: plan.daily_totals?.carbs_g,
        target_fat_g: plan.daily_totals?.fat_g,
        meals: plan.meals || [],
        grocery_list: plan.grocery_list || [],
        valid_from: new Date().toISOString().split('T')[0],
      }).select('id').single();

      return new Response(JSON.stringify({ plan, saved_id: saved?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- nutrition_advice ----
    if (action === 'nutrition_advice') {
      if (!clientId || !shopId) return new Response(JSON.stringify({ error: 'clientId and shopId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const ctx = await fetchClientNutritionContext(supabase, clientId, shopId);
      const summary = buildNutritionSummary(ctx);

      const aiRes = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'You are a sports nutritionist AI. Give specific, actionable nutrition advice based on the client data. Use markdown formatting. Be concise but thorough.' },
            { role: 'user', content: `Provide personalized nutrition advice for:\n\n${summary}` },
          ],
        }),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (status === 402) return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || 'No advice generated.';

      return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('nutrition-engine error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
