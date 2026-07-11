import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, targetId } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let recommendations = [];
    let contextData = {};

    switch (type) {
      case 'product':
        // Get customer purchase history and preferences
        const { data: customer } = await supabase
          .from('customers')
          .select(`
            *,
            orders(*),
            vehicles(*)
          `)
          .eq('id', targetId)
          .single();

        if (customer) {
          // Get available products
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .limit(20);

          contextData = {
            customer,
            availableProducts: products
          };

          // Generate product recommendations using AI
          const prompt = `
            Based on this customer's profile and purchase history, recommend 3-5 relevant products:
            
            Customer: ${customer.first_name} ${customer.last_name}
            Vehicle(s): ${customer.vehicles?.map((v: any) => `${v.year} ${v.make} ${v.model}`).join(', ')}
            Previous Orders: ${customer.orders?.length || 0}
            
            Available Products: ${products?.map((p: any) => `${p.name} - ${p.category}`).join(', ')}
            
            Return a JSON array of recommendations with: id, reason, confidence (0-1)
          `;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are an AI product recommendation engine for an automotive business. Provide practical, relevant recommendations in JSON format.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.3,
            }),
          });

          if (response.ok) {
            const aiResponse = await response.json();
            try {
              recommendations = JSON.parse(aiResponse.choices[0].message.content);
            } catch {
              // Fallback to basic recommendations
              recommendations = products?.slice(0, 3).map((p: any) => ({
                id: p.id,
                reason: 'Popular product in this category',
                confidence: 0.7
              })) || [];
            }
          }
        }
        break;

      case 'service':
        // Get vehicle service history
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select(`
            *,
            customers(*),
            work_orders(*)
          `)
          .eq('id', targetId)
          .single();

        if (vehicle) {
          // Get available services
          const { data: services } = await supabase
            .from('service_categories')
            .select('*')
            .limit(20);

          const prompt = `
            Based on this vehicle's history, recommend maintenance services:
            
            Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
            Mileage: ${vehicle.mileage || 'Unknown'}
            Work Orders: ${vehicle.work_orders?.length || 0}
            
            Return JSON array with service recommendations including: category, reason, priority (high/medium/low), confidence (0-1)
          `;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are an automotive service recommendation AI. Provide maintenance recommendations based on vehicle data.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.2,
            }),
          });

          if (response.ok) {
            const aiResponse = await response.json();
            try {
              recommendations = JSON.parse(aiResponse.choices[0].message.content);
            } catch {
              // Fallback recommendations
              recommendations = [
                { category: 'Oil Change', reason: 'Regular maintenance', priority: 'medium', confidence: 0.8 },
                { category: 'Tire Inspection', reason: 'Safety check', priority: 'high', confidence: 0.9 }
              ];
            }
          }
        }
        break;

      default:
        throw new Error(`Unsupported recommendation type: ${type}`);
    }

    // Store recommendations in database
    for (const rec of recommendations) {
      await supabase.rpc('generate_ai_recommendation', {
        p_type: type,
        p_target_id: targetId,
        p_recommended_items: [rec],
        p_confidence: rec.confidence || 0.5,
        p_reason: rec.reason || 'AI generated recommendation'
      });
    }

    return new Response(JSON.stringify({
      recommendations,
      context: contextData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});