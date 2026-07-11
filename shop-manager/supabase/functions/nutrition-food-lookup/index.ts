import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const OFF_BASE = 'https://world.openfoodfacts.org';
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface NormalizedProduct {
  name: string;
  brand: string | null;
  barcode: string | null;
  category: string | null;
  serving_size_g: number | null;
  calories_per_serving: number | null;
  image_url: string | null;
  nutriscore_grade: string | null;
  nova_group: number | null;
  nutrients: Record<string, { amount: number; unit: string }>;
  ingredients: string[];
  source: string;
  external_id: string;
  raw_data: any;
}

function normalizeOFFProduct(p: any): NormalizedProduct {
  const nut = p.nutriments || {};
  return {
    name: p.product_name || p.product_name_en || 'Unknown',
    brand: p.brands || null,
    barcode: p.code || null,
    category: p.categories || null,
    serving_size_g: parseFloat(p.serving_size) || p.serving_quantity || 100,
    calories_per_serving: nut['energy-kcal_serving'] || nut['energy-kcal_100g'] || null,
    image_url: p.image_url || p.image_front_url || null,
    nutriscore_grade: p.nutriscore_grade || null,
    nova_group: p.nova_group || null,
    nutrients: {
      calories: { amount: nut['energy-kcal_100g'] || 0, unit: 'kcal' },
      protein: { amount: nut.proteins_100g || 0, unit: 'g' },
      carbohydrates: { amount: nut.carbohydrates_100g || 0, unit: 'g' },
      fat: { amount: nut.fat_100g || 0, unit: 'g' },
      fiber: { amount: nut.fiber_100g || 0, unit: 'g' },
      sugar: { amount: nut.sugars_100g || 0, unit: 'g' },
      sodium: { amount: nut.sodium_100g || 0, unit: 'g' },
      saturated_fat: { amount: nut['saturated-fat_100g'] || 0, unit: 'g' },
    },
    ingredients: (p.ingredients_text || '').split(',').map((i: string) => i.trim()).filter(Boolean),
    source: 'Open Food Facts',
    external_id: p.code || p._id || '',
    raw_data: p,
  };
}

function normalizeUSDAProduct(f: any): NormalizedProduct {
  const nutrients: Record<string, { amount: number; unit: string }> = {};
  for (const n of (f.foodNutrients || [])) {
    const name = (n.nutrientName || n.name || '').toLowerCase();
    const amt = n.value || n.amount || 0;
    const unit = n.unitName || n.unit || 'g';
    if (name.includes('energy') && unit.toLowerCase().includes('kcal')) nutrients.calories = { amount: amt, unit: 'kcal' };
    else if (name.includes('protein')) nutrients.protein = { amount: amt, unit: 'g' };
    else if (name.includes('carbohydrate')) nutrients.carbohydrates = { amount: amt, unit: 'g' };
    else if (name.includes('total lipid') || name === 'fat') nutrients.fat = { amount: amt, unit: 'g' };
    else if (name.includes('fiber')) nutrients.fiber = { amount: amt, unit: 'g' };
    else if (name.includes('sugar')) nutrients.sugar = { amount: amt, unit: 'g' };
    else if (name.includes('sodium')) nutrients.sodium = { amount: amt, unit: unit.toLowerCase() };
    else if (name.includes('fatty acids, total saturated')) nutrients.saturated_fat = { amount: amt, unit: 'g' };
  }
  return {
    name: f.description || f.lowercaseDescription || 'Unknown',
    brand: f.brandName || f.brandOwner || null,
    barcode: f.gtinUpc || null,
    category: f.foodCategory || null,
    serving_size_g: f.servingSize || 100,
    calories_per_serving: nutrients.calories?.amount || null,
    image_url: null,
    nutriscore_grade: null,
    nova_group: null,
    nutrients,
    ingredients: (f.ingredients || '').split(',').map((i: string) => i.trim()).filter(Boolean),
    source: 'USDA FoodData Central',
    external_id: String(f.fdcId || ''),
    raw_data: f,
  };
}

async function searchOFF(query: string): Promise<NormalizedProduct[]> {
  try {
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,product_name_en,brands,categories,nutriments,serving_size,serving_quantity,image_url,image_front_url,nutriscore_grade,nova_group,ingredients_text`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || []).filter((p: any) => p.product_name || p.product_name_en).map(normalizeOFFProduct);
  } catch { return []; }
}

async function lookupOFFBarcode(barcode: string): Promise<NormalizedProduct | null> {
  try {
    const res = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return normalizeOFFProduct(data.product);
  } catch { return null; }
}

async function searchUSDA(query: string, apiKey: string): Promise<NormalizedProduct[]> {
  try {
    const res = await fetch(`${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.foods || []).map(normalizeUSDAProduct);
  } catch { return []; }
}

async function cacheProduct(supabase: any, product: NormalizedProduct, sourceId: string): Promise<string> {
  // Check if already cached
  if (product.barcode) {
    const { data: existing } = await supabase.from('nt_food_products').select('id').eq('barcode', product.barcode).maybeSingle();
    if (existing) return existing.id;
  }

  const { data: inserted, error } = await supabase.from('nt_food_products').insert({
    source_id: sourceId,
    external_id: product.external_id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    serving_size_g: product.serving_size_g,
    calories_per_serving: product.calories_per_serving,
    image_url: product.image_url,
    nutriscore_grade: product.nutriscore_grade,
    nova_group: product.nova_group,
    raw_data: product.raw_data,
  }).select('id').single();

  if (error || !inserted) return '';

  // Cache nutrients
  const nutrientRows = Object.entries(product.nutrients).map(([name, val]) => ({
    product_id: inserted.id,
    nutrient_name: name,
    amount: val.amount,
    unit: val.unit,
    per_serving: false, // per 100g
  }));
  if (nutrientRows.length > 0) {
    await supabase.from('nt_food_product_nutrients').insert(nutrientRows);
  }

  // Cache ingredients
  if (product.ingredients.length > 0) {
    const ingredientRows = product.ingredients.map((name, idx) => ({
      product_id: inserted.id,
      ingredient_name: name,
      position: idx,
      is_additive: /^e\d{3}/i.test(name),
      additive_code: /^(e\d{3}\w?)/i.test(name) ? name.match(/^(e\d{3}\w?)/i)?.[1] || null : null,
    }));
    await supabase.from('nt_food_product_ingredients').insert(ingredientRows);
  }

  return inserted.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const usdaKey = Deno.env.get('USDA_API_KEY') || '';

    const { action, query, barcode } = await req.json();

    // Get source IDs
    const { data: sources } = await supabase.from('nt_food_sources').select('id, source_name').eq('is_active', true);
    const sourceMap: Record<string, string> = {};
    for (const s of (sources || [])) sourceMap[s.source_name] = s.id;

    if (action === 'search') {
      if (!query) return new Response(JSON.stringify({ error: 'Query required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Search internal cache first
      const { data: cached } = await supabase
        .from('nt_food_products')
        .select('*, nt_food_product_nutrients(*)')
        .ilike('name', `%${query}%`)
        .limit(5);

      // Search OFF
      const offResults = await searchOFF(query);

      // Search USDA if key available
      let usdaResults: NormalizedProduct[] = [];
      if (usdaKey) {
        usdaResults = await searchUSDA(query, usdaKey);
      }

      // Cache new results
      for (const product of [...offResults.slice(0, 5), ...usdaResults.slice(0, 5)]) {
        const sid = product.source === 'Open Food Facts' ? sourceMap['Open Food Facts'] : sourceMap['USDA FoodData Central'];
        if (sid) await cacheProduct(supabase, product, sid);
      }

      return new Response(JSON.stringify({
        cached: cached || [],
        off_results: offResults.slice(0, 10),
        usda_results: usdaResults.slice(0, 10),
        total: (cached?.length || 0) + offResults.length + usdaResults.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'barcode_lookup') {
      if (!barcode) return new Response(JSON.stringify({ error: 'Barcode required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Check cache
      const { data: cached } = await supabase
        .from('nt_food_products')
        .select('*, nt_food_product_nutrients(*), nt_food_product_ingredients(*)')
        .eq('barcode', barcode)
        .maybeSingle();

      if (cached) {
        return new Response(JSON.stringify({ product: cached, source: 'cache' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Try OFF
      const offProduct = await lookupOFFBarcode(barcode);
      if (offProduct && sourceMap['Open Food Facts']) {
        const productId = await cacheProduct(supabase, offProduct, sourceMap['Open Food Facts']);
        const { data: full } = await supabase
          .from('nt_food_products')
          .select('*, nt_food_product_nutrients(*), nt_food_product_ingredients(*)')
          .eq('id', productId)
          .single();
        return new Response(JSON.stringify({ product: full, source: 'off' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ product: null, source: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_product') {
      const { data: product } = await supabase
        .from('nt_food_products')
        .select('*, nt_food_product_nutrients(*), nt_food_product_ingredients(*), nt_food_quality_scores(*)')
        .eq('id', query)
        .single();
      return new Response(JSON.stringify({ product }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('nutrition-food-lookup error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
