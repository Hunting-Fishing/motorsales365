import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchClientContext(supabase: any, clientId: string, shopId: string) {
  const [
    { data: client },
    { data: scores },
    { data: interests },
    { data: goals },
    { data: context },
    { data: biometrics },
    { data: medicalConditions },
  ] = await Promise.all([
    supabase.from('pt_clients').select('*').eq('id', clientId).single(),
    supabase.from('pt_client_fitness_scores').select('*').eq('client_id', clientId).eq('shop_id', shopId).maybeSingle(),
    supabase.from('pt_user_fitness_interests').select('*, interest_id').eq('client_id', clientId).eq('shop_id', shopId),
    supabase.from('pt_user_fitness_goals').select('*').eq('client_id', clientId).eq('shop_id', shopId).order('priority_rank'),
    supabase.from('pt_user_training_context').select('*').eq('client_id', clientId).eq('shop_id', shopId).maybeSingle(),
    supabase.from('pt_biometric_history').select('*').eq('client_id', clientId).eq('shop_id', shopId).order('recorded_at', { ascending: false }).limit(14),
    supabase.from('pt_client_medical_conditions').select('*').eq('client_id', clientId).eq('shop_id', shopId).in('status', ['active', 'chronic', 'monitoring']),
  ]);
  return { client, scores, interests: interests || [], goals: goals || [], context, biometrics: biometrics || [], medicalConditions: medicalConditions || [] };
}

function buildProfileSummary(ctx: any): string {
  const { client, scores, goals, context, biometrics, medicalConditions } = ctx;
  const lines: string[] = [];
  lines.push(`Client: ${client?.first_name} ${client?.last_name}`);
  lines.push(`Fitness Level: ${client?.fitness_level || 'unknown'}`);
  lines.push(`Goals: ${goals.map((g: any) => g.goal_name).join(', ') || client?.goals || 'none'}`);
  
  // Medical conditions (structured)
  if (medicalConditions && medicalConditions.length > 0) {
    lines.push(`\nMedical Conditions:`);
    for (const mc of medicalConditions) {
      lines.push(`  - ${mc.condition_name} (${mc.category}) — Severity: ${mc.severity}, Status: ${mc.status}`);
      if (mc.exercise_restrictions?.length > 0) {
        lines.push(`    Exercise Restrictions: ${mc.exercise_restrictions.join(', ')}`);
      }
      if (mc.dietary_implications?.length > 0) {
        lines.push(`    Dietary Implications: ${mc.dietary_implications.join(', ')}`);
      }
      if (mc.cleared_by_physician) {
        lines.push(`    ✓ Cleared by physician`);
      }
      if (mc.notes) {
        lines.push(`    Notes: ${mc.notes}`);
      }
    }
  }
  
  // Legacy fields as fallback
  if ((!medicalConditions || medicalConditions.length === 0) && (client?.injuries || context?.injury_notes)) {
    lines.push(`Injuries: ${client?.injuries || context?.injury_notes || 'none'}`);
  }
  
  if (context) {
    lines.push(`Environment: ${(context.environment_preference || []).join(', ')}`);
    lines.push(`Equipment: ${(context.equipment_access || []).join(', ')}`);
    lines.push(`Session Length: ${context.session_length || 'unset'}`);
    lines.push(`Frequency: ${context.weekly_frequency || 'unset'}`);
    lines.push(`Motivation: ${(context.motivation_style || []).join(', ')}`);
  }
  if (scores) {
    lines.push(`\nAffinity Scores (0-100):`);
    lines.push(`  Strength: ${Math.round(scores.strength_affinity)}, Endurance: ${Math.round(scores.endurance_affinity)}, Aesthetics: ${Math.round(scores.aesthetics_affinity)}`);
    lines.push(`  Competition: ${Math.round(scores.competition_affinity)}, Recovery: ${Math.round(scores.recovery_need)}, Beginner Support: ${Math.round(scores.beginner_support_need)}`);
    lines.push(`  Equipment Richness: ${Math.round(scores.equipment_richness)}, Coaching Intensity: ${Math.round(scores.coaching_intensity)}`);
  }
  if (biometrics.length > 0) {
    const recent = biometrics[0];
    lines.push(`\nLatest Biometrics (${recent.source}):`);
    if (recent.steps) lines.push(`  Steps: ${recent.steps}`);
    if (recent.heart_rate_avg) lines.push(`  Avg HR: ${recent.heart_rate_avg}`);
    if (recent.sleep_hours) lines.push(`  Sleep: ${recent.sleep_hours}h`);
    if (recent.calories_burned) lines.push(`  Calories: ${recent.calories_burned}`);
  }
  return lines.join('\n');
}

function buildMedicalWarnings(medicalConditions: any[]): string {
  if (!medicalConditions || medicalConditions.length === 0) return '';
  
  const allRestrictions = new Set<string>();
  const conditionSummaries: string[] = [];
  
  for (const mc of medicalConditions) {
    conditionSummaries.push(`${mc.condition_name} (${mc.severity})`);
    (mc.exercise_restrictions || []).forEach((r: string) => allRestrictions.add(r));
  }
  
  return `\n\n⚠️ CRITICAL MEDICAL CONSIDERATIONS:\nClient has the following active conditions: ${conditionSummaries.join(', ')}.\nExercise restrictions to STRICTLY follow: ${[...allRestrictions].join(', ')}.\nDo NOT include any exercises that violate these restrictions. Always provide safe alternatives.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, clientId, shopId, context: reqContext } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    // ---- Original actions ----
    if (action === 'suggest_workout') {
      const { data: client } = await supabase.from('pt_clients').select('*').eq('id', clientId).single();
      const { data: recentMetrics } = await supabase.from('pt_body_metrics').select('*').eq('client_id', clientId).order('recorded_date', { ascending: false }).limit(5);
      const { data: recentLogs } = await supabase.from('pt_workout_logs').select('*').eq('client_id', clientId).order('completed_at', { ascending: false }).limit(10);
      const { data: exercises } = await supabase.from('pt_exercises').select('name, muscle_group, equipment, difficulty').eq('shop_id', shopId).limit(50);
      
      // Fetch medical conditions for workout suggestions
      const { data: medConds } = await supabase.from('pt_client_medical_conditions').select('*').eq('client_id', clientId).eq('shop_id', shopId).in('status', ['active', 'chronic']);
      const medicalWarning = buildMedicalWarnings(medConds || []);

      systemPrompt = `You are an expert personal trainer AI. Generate a workout plan based on the client's profile, recent activity, and available exercises. Return a structured workout with exercises, sets, reps, rest times, and notes. Be specific and practical.${medicalWarning}`;
      userPrompt = `Client Profile:\n- Name: ${client?.first_name} ${client?.last_name}\n- Fitness Level: ${client?.fitness_level || 'intermediate'}\n- Goals: ${client?.goals || 'general fitness'}\n- Injuries: ${client?.injuries || 'none reported'}\n${reqContext?.focus ? `- Focus Area: ${reqContext.focus}` : ''}\n${reqContext?.duration ? `- Session Duration: ${reqContext.duration} minutes` : ''}\n\nRecent Metrics: ${JSON.stringify(recentMetrics?.slice(0, 3) || [])}\nRecent Workouts: ${recentLogs?.length || 0} sessions completed recently\nAvailable Exercises: ${exercises?.map((e: any) => `${e.name} (${e.muscle_group}, ${e.difficulty})`).join(', ')}\n\nPlease suggest a complete workout session with warm-up, main exercises (with sets/reps/rest), and cooldown.`;

    } else if (action === 'summarize_checkins') {
      const { data: checkIns } = await supabase.from('pt_check_ins').select('*').eq('client_id', clientId).order('check_in_date', { ascending: false }).limit(8);
      const { data: client } = await supabase.from('pt_clients').select('first_name, last_name, goals').eq('id', clientId).single();

      systemPrompt = `You are a fitness analytics AI. Analyze the client's check-in data and provide a concise, actionable summary with trends, concerns, and recommendations for the trainer.`;
      userPrompt = `Client: ${client?.first_name} ${client?.last_name}\nGoals: ${client?.goals || 'general fitness'}\n\nRecent Check-ins (newest first):\n${(checkIns || []).map((c: any) => `Date: ${c.check_in_date}, Weight: ${c.weight_kg}kg, Mood: ${c.mood}, Energy: ${c.energy_level}/10, Sleep: ${c.sleep_hours}h, Workout Compliance: ${c.workout_compliance || 'N/A'}/10, Soreness: ${c.soreness_level || 'N/A'}/10, Notes: ${c.notes || 'none'}`).join('\n')}\n\nProvide: 1) Key trends, 2) Areas of concern, 3) Specific recommendations for the trainer.`;

    } else if (action === 'nutrition_advice') {
      const { data: client } = await supabase.from('pt_clients').select('*').eq('id', clientId).single();
      const { data: logs } = await supabase.from('pt_nutrition_logs').select('*').eq('client_id', clientId).order('log_date', { ascending: false }).limit(21);
      
      // Fetch medical conditions for dietary advice
      const { data: medConds } = await supabase.from('pt_client_medical_conditions').select('*').eq('client_id', clientId).eq('shop_id', shopId).in('status', ['active', 'chronic']);
      const dietaryImplications = (medConds || []).flatMap((c: any) => c.dietary_implications || []);
      const dietaryNote = dietaryImplications.length > 0 ? `\n\nDietary restrictions from medical conditions: ${[...new Set(dietaryImplications)].join(', ')}. Ensure all nutrition advice respects these constraints.` : '';

      systemPrompt = `You are a sports nutrition advisor. Analyze the client's nutrition data and targets, then provide practical advice. Do not prescribe medical diets.${dietaryNote}`;
      userPrompt = `Client: ${client?.first_name} ${client?.last_name}\nGoals: ${client?.goals || 'general fitness'}\nTargets: Calories=${client?.calorie_target || 2000}, Protein=${client?.protein_target_g || 150}g\nRecent meals logged: ${logs?.length || 0} entries\n${logs?.length ? `Sample entries: ${JSON.stringify(logs.slice(0, 7))}` : 'No recent logs'}\n\nProvide brief nutrition advice and meal suggestions aligned with their goals.`;

    // ---- Taxonomy-aware actions ----
    } else if (action === 'generate_hybrid_program') {
      const ctx = await fetchClientContext(supabase, clientId, shopId);
      const profile = buildProfileSummary(ctx);
      const medicalWarning = buildMedicalWarnings(ctx.medicalConditions);
      const { data: exercises } = await supabase.from('pt_exercises').select('name, muscle_group, equipment, difficulty').eq('shop_id', shopId).limit(80);

      systemPrompt = `You are an elite personal trainer AI that creates hybrid training programs. You design multi-day weekly programs that intelligently blend the client's interests (e.g., CrossFit + Running + Strength) into a cohesive progressive plan. Be specific with exercises, sets, reps, tempo, rest, and weekly periodization. Use equipment the client has access to. Match session duration to their preference.${medicalWarning}`;
      userPrompt = `${profile}\n\nAvailable Exercises: ${(exercises || []).map((e: any) => `${e.name} (${e.muscle_group}, ${e.equipment || 'bodyweight'}, ${e.difficulty})`).join(', ')}\n\nGenerate a complete weekly hybrid training program (4-6 days) with:\n1. Each day labeled with focus (e.g., "Day 1: MetCon + Upper Strength")\n2. Warm-up, main workout (exercises/sets/reps/rest), cooldown\n3. Progressive overload notes for weeks 2-4\n4. Recovery day recommendations\n5. How this program aligns with their specific affinity scores`;

    } else if (action === 'suggest_classes') {
      const ctx = await fetchClientContext(supabase, clientId, shopId);
      const profile = buildProfileSummary(ctx);

      systemPrompt = `You are a fitness program advisor. Recommend specific group class types and training formats based on the client's fitness taxonomy profile. Be specific about class names, formats, and why each is a match. Include frequency recommendations.`;
      userPrompt = `${profile}\n\nBased on this client's interests, goals, affinity scores, and training context, recommend:\n1. Top 5 class types (e.g., HIIT, CrossFit WOD, Yoga Flow, Running Club, Olympic Lifting)\n2. For each: name, description, why it matches them, recommended frequency per week\n3. A suggested weekly class schedule combining these\n4. Any classes to avoid given their injuries/limitations`;

    } else if (action === 'match_trainer') {
      const ctx = await fetchClientContext(supabase, clientId, shopId);
      const profile = buildProfileSummary(ctx);
      const { data: trainers } = await supabase.from('pt_trainers').select('id, first_name, last_name, specializations, bio, certifications, rating').eq('shop_id', shopId).eq('is_active', true);

      systemPrompt = `You are an AI trainer-matching system. Score and rank available trainers against the client's affinity profile. Consider specialization overlap, experience alignment, and coaching style match. Return structured match scores and reasoning.`;
      userPrompt = `${profile}\n\nAvailable Trainers:\n${(trainers || []).map((t: any) => `- ${t.first_name} ${t.last_name}: Specializations: ${(t.specializations || []).join(', ')}, Bio: ${t.bio || 'N/A'}, Certs: ${(t.certifications || []).join(', ')}, Rating: ${t.rating || 'N/A'}`).join('\n')}\n\nFor each trainer provide:\n1. Match score (0-100)\n2. Top 3 reasons they match or don't match\n3. Overall recommendation with the best trainer match highlighted`;

    } else if (action === 'suggest_upsells') {
      const ctx = await fetchClientContext(supabase, clientId, shopId);
      const profile = buildProfileSummary(ctx);
      const { data: packages } = await supabase.from('pt_packages').select('name, description, price, session_count').eq('shop_id', shopId).eq('is_active', true);

      systemPrompt = `You are a fitness business advisor. Based on the client's fitness profile, suggest relevant upsells, packages, challenges, and add-ons. Focus on genuine value alignment, not just revenue. Be specific about why each recommendation fits.`;
      userPrompt = `${profile}\n\nAvailable Packages/Services:\n${(packages || []).map((p: any) => `- ${p.name}: ${p.description || 'N/A'}, $${p.price}, ${p.session_count} sessions`).join('\n')}\n\nSuggest:\n1. Top 3 package/service recommendations with match reasoning\n2. Challenge or competition invites based on their competition affinity\n3. Add-on services (nutrition coaching, recovery sessions, etc.)\n4. Upgrade path if they're on a basic plan`;

    } else if (action === 'suggest_community') {
      const ctx = await fetchClientContext(supabase, clientId, shopId);
      const profile = buildProfileSummary(ctx);

      const { data: otherScores } = await supabase.from('pt_client_fitness_scores').select('client_id, strength_affinity, endurance_affinity, competition_affinity, coaching_intensity').eq('shop_id', shopId).neq('client_id', clientId).limit(30);
      const clientIds = (otherScores || []).map((s: any) => s.client_id);
      const { data: otherClients } = clientIds.length > 0
        ? await supabase.from('pt_clients').select('id, first_name, last_name, fitness_level').in('id', clientIds)
        : { data: [] };

      const peerData = (otherScores || []).map((s: any) => {
        const c = (otherClients || []).find((cl: any) => cl.id === s.client_id);
        return c ? `${c.first_name} ${c.last_name} (${c.fitness_level}): Str=${Math.round(s.strength_affinity)}, End=${Math.round(s.endurance_affinity)}, Comp=${Math.round(s.competition_affinity)}, Coach=${Math.round(s.coaching_intensity)}` : null;
      }).filter(Boolean);

      systemPrompt = `You are a community and social fitness advisor. Group clients by shared interests, goals, and affinity scores for challenges, accountability groups, and peer matching. Identify the best community fits.`;
      userPrompt = `Target Client:\n${profile}\n\nPotential Peers:\n${peerData.join('\n') || 'No other scored clients yet'}\n\nSuggest:\n1. Best accountability partner matches (top 3) with reasoning\n2. Group challenge ideas based on shared interests\n3. Community group names and themes this client should join\n4. Social engagement recommendations`;

    } else if (action === 'analyze_progression') {
      const ctx = await fetchClientContext(supabase, clientId, shopId);
      const profile = buildProfileSummary(ctx);
      const { data: workoutLogs } = await supabase.from('pt_workout_logs').select('*').eq('client_id', clientId).order('completed_at', { ascending: false }).limit(30);
      const { data: bodyMetrics } = await supabase.from('pt_body_metrics').select('*').eq('client_id', clientId).order('recorded_date', { ascending: false }).limit(20);

      systemPrompt = `You are a fitness progression analyst AI. Analyze the client's workout history, biometric trends, and body metrics to identify plateaus, PRs, volume trends, and recovery signals. Provide actionable recommendations to refine their program.`;
      userPrompt = `${profile}\n\nWorkout History (last 30 sessions):\n${(workoutLogs || []).map((w: any) => `${w.completed_at}: ${w.workout_name || 'session'}, Duration: ${w.duration_minutes || '?'}min, Notes: ${w.notes || 'none'}`).join('\n') || 'No workout logs'}\n\nBody Metrics Trend:\n${(bodyMetrics || []).map((m: any) => `${m.recorded_date || m.measurement_date}: Weight=${m.weight_kg || '?'}kg, BF=${m.body_fat_percent || '?'}%`).join('\n') || 'No metrics'}\n\nBiometric History (7-14 days):\n${ctx.biometrics.map((b: any) => `${b.recorded_at}: Steps=${b.steps || '?'}, HR=${b.heart_rate_avg || '?'}, Sleep=${b.sleep_hours || '?'}h`).join('\n') || 'No biometric data'}\n\nAnalyze:\n1. Progression trends (improving, plateauing, declining)\n2. Potential PRs or milestones hit\n3. Recovery signals (overtraining, fatigue)\n4. Specific program adjustments recommended\n5. Volume/intensity periodization suggestions`;

    } else if (action === 'generate_program_template') {
      const ctx = reqContext || {};
      let clientProfile = '';
      let medicalWarning = '';
      
      if (clientId && shopId) {
        const clientCtx = await fetchClientContext(supabase, clientId, shopId);
        clientProfile = `\n\nClient Profile:\n${buildProfileSummary(clientCtx)}`;
        medicalWarning = buildMedicalWarnings(clientCtx.medicalConditions);
      }
      
      // Also use medical conditions passed from frontend context
      if (ctx.medical_conditions && ctx.medical_conditions.length > 0 && !medicalWarning) {
        const condSummaries = ctx.medical_conditions.map((c: any) => `${c.name} (${c.severity})`);
        const allRestrictions = ctx.medical_conditions.flatMap((c: any) => c.restrictions || []);
        medicalWarning = `\n\n⚠️ CRITICAL MEDICAL CONSIDERATIONS:\nClient has: ${condSummaries.join(', ')}.\nExercise restrictions: ${[...new Set(allRestrictions)].join(', ')}.\nDo NOT include exercises that violate these restrictions.`;
      }

      const { data: exercises } = await supabase.from('pt_exercises')
        .select('name, muscle_group, equipment, difficulty')
        .eq('shop_id', shopId).limit(100);

      systemPrompt = `You are an expert personal trainer AI that creates detailed, structured workout programs. You output complete multi-day training programs with specific exercises, sets, reps, rest periods, tempo, and progression notes. Be practical and evidence-based. Match the program to the client's equipment access, limitations, and goals.${medicalWarning}`;
      
      userPrompt = `Create a complete workout program with these parameters:
- Workout Style: ${(ctx.workout_style || []).join(', ') || 'General'}
- Training Platform: ${ctx.training_platform || 'Gym'}
- Target Muscles: ${(ctx.target_muscles || []).join(', ') || 'Full Body'}
- Difficulty: ${ctx.difficulty || 'intermediate'}
- Days Per Week: ${ctx.days_per_week || 4}
- Session Duration: ${ctx.session_duration_minutes || 60} minutes
- Goal: ${ctx.goal || 'General Fitness'}
- Limitations/Injuries: ${ctx.limitations || 'None'}
${clientProfile}

Available Exercises in Library: ${(exercises || []).map((e: any) => `${e.name} (${e.muscle_group}, ${e.equipment || 'bodyweight'})`).join(', ')}

Generate a complete program with:
1. Program overview and philosophy
2. Each training day with:
   - Day name and focus area
   - Warm-up (5 min)
   - Main exercises: Name, Sets x Reps, Rest period, Tempo (if relevant), RPE
   - Cooldown
3. Weekly progression plan (weeks 1-4)
4. Deload recommendations
5. Notes on exercise substitutions for equipment limitations`;

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please top up in workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || 'No response generated.';

    // Cache recommendation in DB for taxonomy-aware actions
    const cacheableActions = ['generate_hybrid_program', 'suggest_classes', 'match_trainer', 'suggest_upsells', 'suggest_community', 'analyze_progression'];
    if (cacheableActions.includes(action) && clientId && shopId) {
      const typeMap: Record<string, string> = {
        generate_hybrid_program: 'program',
        suggest_classes: 'class',
        match_trainer: 'trainer',
        suggest_upsells: 'upsell',
        suggest_community: 'community',
        analyze_progression: 'progression',
      };
      await supabase.from('pt_ai_recommendations').insert({
        client_id: clientId,
        shop_id: shopId,
        type: typeMap[action],
        content: { text: content, generated_at: new Date().toISOString() },
        confidence: 0.85,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return new Response(JSON.stringify({ content, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PT AI Assistant error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
