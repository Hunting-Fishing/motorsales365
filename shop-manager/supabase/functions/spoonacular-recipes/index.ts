import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOONACULAR_BASE = 'https://api.spoonacular.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'SPOONACULAR_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'search') {
      const { query, diet, intolerances, maxCalories, number = 12, offset = 0 } = body;
      const params = new URLSearchParams({
        apiKey,
        query: query || '',
        number: String(number),
        offset: String(offset),
        addRecipeNutrition: 'true',
        fillIngredients: 'true',
      });
      if (diet) params.set('diet', diet);
      if (intolerances) params.set('intolerances', intolerances);
      if (maxCalories) params.set('maxCalories', String(maxCalories));

      const res = await fetch(`${SPOONACULAR_BASE}/recipes/complexSearch?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Spoonacular search failed [${res.status}]: ${JSON.stringify(data)}`);

      const results = (data.results || []).map(normalizeRecipe);
      return new Response(JSON.stringify({
        results,
        totalResults: data.totalResults || 0,
        offset: data.offset || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'details') {
      const { recipeId } = body;
      if (!recipeId) throw new Error('recipeId required');

      const res = await fetch(
        `${SPOONACULAR_BASE}/recipes/${recipeId}/information?apiKey=${apiKey}&includeNutrition=true`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`Spoonacular details failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify(normalizeFullRecipe(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'meal_plan') {
      const { targetCalories = 2000, diet, timeFrame = 'day' } = body;
      const params = new URLSearchParams({
        apiKey,
        targetCalories: String(targetCalories),
        timeFrame,
      });
      if (diet) params.set('diet', diet);

      const res = await fetch(`${SPOONACULAR_BASE}/mealplanner/generate?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Spoonacular meal plan failed [${res.status}]: ${JSON.stringify(data)}`);

      const meals = (data.meals || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        readyInMinutes: m.readyInMinutes,
        servings: m.servings,
        sourceUrl: m.sourceUrl,
        image: m.id ? `https://img.spoonacular.com/recipes/${m.id}-312x231.jpg` : null,
      }));

      return new Response(JSON.stringify({
        meals,
        nutrients: data.nutrients || {},
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'similar') {
      const { recipeId, number = 6 } = body;
      if (!recipeId) throw new Error('recipeId required');

      const res = await fetch(
        `${SPOONACULAR_BASE}/recipes/${recipeId}/similar?apiKey=${apiKey}&number=${number}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`Spoonacular similar failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('spoonacular-recipes error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractNutrient(nutrients: any[], name: string): number {
  const n = nutrients?.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
  return n ? Math.round(n.amount * 10) / 10 : 0;
}

function normalizeRecipe(r: any) {
  const nutrients = r.nutrition?.nutrients || [];
  return {
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    calories: extractNutrient(nutrients, 'Calories'),
    protein_g: extractNutrient(nutrients, 'Protein'),
    carbs_g: extractNutrient(nutrients, 'Carbohydrates'),
    fat_g: extractNutrient(nutrients, 'Fat'),
    fiber_g: extractNutrient(nutrients, 'Fiber'),
    sugar_g: extractNutrient(nutrients, 'Sugar'),
    diets: r.diets || [],
    dishTypes: r.dishTypes || [],
  };
}

function normalizeFullRecipe(r: any) {
  const nutrients = r.nutrition?.nutrients || [];
  const ingredients = (r.extendedIngredients || []).map((ing: any) => ({
    id: ing.id,
    name: ing.name,
    original: ing.original,
    amount: ing.amount,
    unit: ing.unit,
    aisle: ing.aisle,
    image: ing.image ? `https://img.spoonacular.com/ingredients_100x100/${ing.image}` : null,
  }));

  const instructions = (r.analyzedInstructions?.[0]?.steps || []).map((s: any) => ({
    number: s.number,
    step: s.step,
    ingredients: (s.ingredients || []).map((i: any) => i.name),
    equipment: (s.equipment || []).map((e: any) => e.name),
  }));

  return {
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    sourceUrl: r.sourceUrl,
    summary: r.summary?.replace(/<[^>]+>/g, '') || '',
    calories: extractNutrient(nutrients, 'Calories'),
    protein_g: extractNutrient(nutrients, 'Protein'),
    carbs_g: extractNutrient(nutrients, 'Carbohydrates'),
    fat_g: extractNutrient(nutrients, 'Fat'),
    fiber_g: extractNutrient(nutrients, 'Fiber'),
    sugar_g: extractNutrient(nutrients, 'Sugar'),
    sodium_mg: extractNutrient(nutrients, 'Sodium'),
    cholesterol_mg: extractNutrient(nutrients, 'Cholesterol'),
    diets: r.diets || [],
    dishTypes: r.dishTypes || [],
    ingredients,
    instructions,
    allNutrients: nutrients.map((n: any) => ({
      name: n.name,
      amount: Math.round(n.amount * 10) / 10,
      unit: n.unit,
      percentOfDailyNeeds: Math.round(n.percentOfDailyNeeds || 0),
    })),
  };
}
