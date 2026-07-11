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
    const { query, filters, searchType } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let searchResults = [];

    if (searchType === 'semantic') {
      // Use OpenAI to understand the search intent
      const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a search intent analyzer for an automotive business system. 
              Analyze the search query and return JSON with:
              - intent: "customer", "product", "order", "service", "vehicle"
              - keywords: array of relevant search terms
              - entities: array of specific entities mentioned (names, dates, etc.)`
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.1,
        }),
      });

      let searchIntent = { intent: 'general', keywords: [query], entities: [] };
      if (intentResponse.ok) {
        const intentData = await intentResponse.json();
        try {
          searchIntent = JSON.parse(intentData.choices[0].message.content);
        } catch (e) {
          console.log('Failed to parse intent:', e);
        }
      }

      // Search based on intent
      switch (searchIntent.intent) {
        case 'customer':
          const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(10);

          searchResults.push(...(customers || []).map(customer => ({
            id: customer.id,
            type: 'customer',
            title: `${customer.first_name} ${customer.last_name}`,
            description: `${customer.email} | ${customer.phone}`,
            relevance_score: 0.9,
            metadata: customer
          })));
          break;

        case 'product':
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
            .limit(10);

          searchResults.push(...(products || []).map(product => ({
            id: product.id,
            type: 'product',
            title: product.name,
            description: `${product.category} | $${product.price}`,
            relevance_score: 0.8,
            metadata: product
          })));
          break;

        case 'order':
          const { data: orders } = await supabase
            .from('orders')
            .select('*, customers(*)')
            .or(`id::text.ilike.%${query}%,status.ilike.%${query}%`)
            .limit(10);

          searchResults.push(...(orders || []).map(order => ({
            id: order.id,
            type: 'order',
            title: `Order #${order.id}`,
            description: `${order.status} | $${order.total_amount} | ${order.customers?.first_name} ${order.customers?.last_name}`,
            relevance_score: 0.7,
            metadata: order
          })));
          break;

        case 'service':
          const { data: workOrders } = await supabase
            .from('work_orders')
            .select('*, customers(*), vehicles(*)')
            .or(`description.ilike.%${query}%,service_type.ilike.%${query}%,status.ilike.%${query}%`)
            .limit(10);

          searchResults.push(...(workOrders || []).map(wo => ({
            id: wo.id,
            type: 'service',
            title: `Work Order #${wo.id}`,
            description: `${wo.service_type} | ${wo.status} | ${wo.customers?.first_name} ${wo.customers?.last_name}`,
            relevance_score: 0.8,
            metadata: wo
          })));
          break;

        default:
          // General search across all entities
          const [customerResults, productResults, orderResults] = await Promise.all([
            supabase.from('customers').select('*').textSearch('fts', query).limit(3),
            supabase.from('products').select('*').textSearch('fts', query).limit(3),
            supabase.from('orders').select('*, customers(*)').textSearch('fts', query).limit(3)
          ]);

          // Add results from all searches
          searchResults.push(
            ...(customerResults.data || []).map(item => ({
              id: item.id,
              type: 'customer',
              title: `${item.first_name} ${item.last_name}`,
              description: item.email,
              relevance_score: 0.6,
              metadata: item
            })),
            ...(productResults.data || []).map(item => ({
              id: item.id,
              type: 'product',
              title: item.name,
              description: item.category,
              relevance_score: 0.6,
              metadata: item
            })),
            ...(orderResults.data || []).map(item => ({
              id: item.id,
              type: 'order',
              title: `Order #${item.id}`,
              description: item.status,
              relevance_score: 0.6,
              metadata: item
            }))
          );
      }

      // Sort by relevance
      searchResults.sort((a, b) => b.relevance_score - a.relevance_score);
    }

    // Log search analytics
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase
        .from('ai_search_analytics')
        .insert({
          user_id: user.user.id,
          query,
          results_count: searchResults.length,
          search_time_ms: Date.now() % 1000, // Simple timing
          filters_used: filters || {}
        });
    }

    return new Response(JSON.stringify({
      results: searchResults,
      total: searchResults.length,
      query,
      filters
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI search function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});