import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    if (!MAPBOX_TOKEN) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { address, coordinates } = await req.json();
    
    let url: string;
    
    if (coordinates) {
      // Reverse geocode: coordinates to address
      const [lng, lat] = coordinates;
      url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      console.log(`Reverse geocoding: [${lng}, ${lat}]`);
    } else if (address) {
      // Forward geocode: address to coordinates with autocomplete support
      const encodedAddress = encodeURIComponent(address);
      url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=US,CA&autocomplete=true&types=address,place,poi`;
      console.log(`Forward geocoding (autocomplete): ${address}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'Address or coordinates required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(url);
    const data = await response.json();
    
    // Check for Mapbox API errors (invalid token, missing scopes, restrictions)
    if (!response.ok || data.message) {
      console.error(`Mapbox API error (${response.status}):`, data.message || 'Unknown error');
      return new Response(
        JSON.stringify({ 
          error: data.message || `Mapbox API error: ${response.status}`, 
          results: [],
          status: response.status 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!data.features || data.features.length === 0) {
      console.log('Mapbox returned 0 features for query');
      return new Response(
        JSON.stringify({ error: 'No results found', results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = data.features.map((feature: any) => ({
      placeName: feature.place_name,
      coordinates: feature.center, // [lng, lat]
      address: feature.place_name,
      context: feature.context?.reduce((acc: any, ctx: any) => {
        if (ctx.id.startsWith('postcode')) acc.postcode = ctx.text;
        if (ctx.id.startsWith('place')) acc.city = ctx.text;
        if (ctx.id.startsWith('region')) acc.state = ctx.text;
        if (ctx.id.startsWith('country')) acc.country = ctx.text;
        return acc;
      }, {}),
    }));

    console.log(`Geocoding returned ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
