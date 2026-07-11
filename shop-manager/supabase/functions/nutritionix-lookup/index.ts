import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NUTRITIONIX_BASE = 'https://trackapi.nutritionix.com/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('NUTRITIONIX_APP_ID');
    const apiKey = Deno.env.get('NUTRITIONIX_API_KEY');

    if (!appId || !apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Nutritionix API credentials not configured',
          setup_required: true,
          message: 'Please add NUTRITIONIX_APP_ID and NUTRITIONIX_API_KEY secrets. Sign up at https://developer.nutritionix.com/'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'x-app-id': appId,
      'x-app-key': apiKey,
      'Content-Type': 'application/json',
    };

    const body = await req.json();
    const { action, query, upc, nix_item_id } = body;

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid query parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const res = await fetch(`${NUTRITIONIX_BASE}/search/instant?query=${encodeURIComponent(query)}`, {
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Nutritionix search failed [${res.status}]:`, errText);
        return new Response(
          JSON.stringify({ error: `Nutritionix API error: ${res.status}` }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      const branded = (data.branded || []).slice(0, 20).map((item: any) => ({
        nix_item_id: item.nix_item_id,
        food_name: item.food_name,
        brand_name: item.brand_name,
        serving_qty: item.serving_qty,
        serving_unit: item.serving_unit,
        nf_calories: item.nf_calories,
        photo: item.photo?.thumb || null,
      }));

      return new Response(
        JSON.stringify({ results: branded }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'barcode') {
      if (!upc || typeof upc !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid UPC parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const res = await fetch(`${NUTRITIONIX_BASE}/search/item?upc=${encodeURIComponent(upc)}`, {
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Nutritionix barcode lookup failed [${res.status}]:`, errText);
        return new Response(
          JSON.stringify({ error: `Product not found for UPC: ${upc}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      const food = data.foods?.[0];
      if (!food) {
        return new Response(
          JSON.stringify({ error: 'No product data found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ product: normalizeProduct(food) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'item') {
      if (!nix_item_id || typeof nix_item_id !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Missing nix_item_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const res = await fetch(`${NUTRITIONIX_BASE}/search/item?nix_item_id=${encodeURIComponent(nix_item_id)}`, {
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Nutritionix item lookup failed [${res.status}]:`, errText);
        return new Response(
          JSON.stringify({ error: `Item not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      const food = data.foods?.[0];
      if (!food) {
        return new Response(
          JSON.stringify({ error: 'No product data found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ product: normalizeProduct(food) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: search, barcode, or item' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('nutritionix-lookup error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeProduct(food: any) {
  const nutritionFacts: Record<string, { amount: string; dv: number | null }> = {};

  const addNutrient = (key: string, value: number | null, unit: string, dvPercent: number | null) => {
    if (value != null && value > 0) {
      nutritionFacts[key] = {
        amount: `${Math.round(value * 10) / 10}${unit}`,
        dv: dvPercent != null ? Math.round(dvPercent) : null,
      };
    }
  };

  // Macros
  addNutrient('calories', food.nf_calories, 'kcal', null);
  addNutrient('total_fat', food.nf_total_fat, 'g', food.nf_total_fat ? Math.round((food.nf_total_fat / 78) * 100) : null);
  addNutrient('saturated_fat', food.nf_saturated_fat, 'g', food.nf_saturated_fat ? Math.round((food.nf_saturated_fat / 20) * 100) : null);
  addNutrient('cholesterol', food.nf_cholesterol, 'mg', food.nf_cholesterol ? Math.round((food.nf_cholesterol / 300) * 100) : null);
  addNutrient('sodium', food.nf_sodium, 'mg', food.nf_sodium ? Math.round((food.nf_sodium / 2300) * 100) : null);
  addNutrient('total_carbohydrate', food.nf_total_carbohydrate, 'g', food.nf_total_carbohydrate ? Math.round((food.nf_total_carbohydrate / 275) * 100) : null);
  addNutrient('dietary_fiber', food.nf_dietary_fiber, 'g', food.nf_dietary_fiber ? Math.round((food.nf_dietary_fiber / 28) * 100) : null);
  addNutrient('sugars', food.nf_sugars, 'g', null);
  addNutrient('protein', food.nf_protein, 'g', food.nf_protein ? Math.round((food.nf_protein / 50) * 100) : null);

  // Micronutrients from full_nutrients array
  const fullNutrients = food.full_nutrients || [];
  const nutrientMap: Record<number, { key: string; unit: string; dv: number }> = {
    301: { key: 'calcium', unit: 'mg', dv: 1300 },
    303: { key: 'iron', unit: 'mg', dv: 18 },
    306: { key: 'potassium', unit: 'mg', dv: 4700 },
    318: { key: 'vitamin_a', unit: 'mcg', dv: 900 },
    401: { key: 'vitamin_c', unit: 'mg', dv: 90 },
    324: { key: 'vitamin_d', unit: 'mcg', dv: 20 },
    323: { key: 'vitamin_e', unit: 'mg', dv: 15 },
    430: { key: 'vitamin_k', unit: 'mcg', dv: 120 },
    404: { key: 'thiamin_b1', unit: 'mg', dv: 1.2 },
    405: { key: 'riboflavin_b2', unit: 'mg', dv: 1.3 },
    406: { key: 'niacin_b3', unit: 'mg', dv: 16 },
    415: { key: 'vitamin_b6', unit: 'mg', dv: 1.7 },
    417: { key: 'folate', unit: 'mcg', dv: 400 },
    418: { key: 'vitamin_b12', unit: 'mcg', dv: 2.4 },
    304: { key: 'magnesium', unit: 'mg', dv: 420 },
    309: { key: 'zinc', unit: 'mg', dv: 11 },
    317: { key: 'selenium', unit: 'mcg', dv: 55 },
    315: { key: 'manganese', unit: 'mg', dv: 2.3 },
    312: { key: 'copper', unit: 'mg', dv: 0.9 },
    313: { key: 'chromium', unit: 'mcg', dv: 35 },
  };

  for (const fn of fullNutrients) {
    const mapping = nutrientMap[fn.attr_id];
    if (mapping && fn.value > 0) {
      nutritionFacts[mapping.key] = {
        amount: `${Math.round(fn.value * 10) / 10}${mapping.unit}`,
        dv: Math.round((fn.value / mapping.dv) * 100),
      };
    }
  }

  return {
    name: food.food_name,
    brand_name: food.brand_name || null,
    serving_size: `${food.serving_qty} ${food.serving_unit}`,
    serving_weight_grams: food.serving_weight_grams,
    calories: food.nf_calories,
    image_url: food.photo?.highres || food.photo?.thumb || null,
    barcode: food.upc || null,
    nix_item_id: food.nix_item_id || null,
    nutrition_facts: nutritionFacts,
  };
}
