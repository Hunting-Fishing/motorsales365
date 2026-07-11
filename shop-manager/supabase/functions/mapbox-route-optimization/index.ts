import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Location {
  id: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  name?: string;
  priority?: 'high' | 'normal' | 'low';
  timeWindow?: { start: string; end: string };
}

interface OptimizationRequest {
  origin: [number, number]; // [lng, lat] - starting point
  destinations: Location[];
  returnToOrigin?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const { origin, destinations, returnToOrigin = true }: OptimizationRequest = await req.json();
    
    console.log(`Optimizing route for ${destinations.length} destinations from origin:`, origin);

    if (!origin || !destinations || destinations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Origin and at least one destination required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build coordinates string for Mapbox Optimization API
    // Format: origin;dest1;dest2;...;destN[;origin if returning]
    const allCoords = [
      origin,
      ...destinations.map(d => d.coordinates),
      ...(returnToOrigin ? [origin] : [])
    ];
    
    const coordsString = allCoords.map(c => `${c[0]},${c[1]}`).join(';');
    
    // Mapbox Optimization API v1
    // Using roundtrip=false because we handle return manually
    const optimizationUrl = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsString}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&annotations=duration,distance&source=first${returnToOrigin ? '&destination=last&roundtrip=true' : '&roundtrip=false'}`;
    
    console.log('Calling Mapbox Optimization API...');
    
    const response = await fetch(optimizationUrl);
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      console.error('Mapbox API error:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Route optimization failed', 
          details: data.message || data.code 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the optimized trip
    const trip = data.trips?.[0];
    if (!trip) {
      return new Response(
        JSON.stringify({ error: 'No optimized route found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map waypoint indices back to original destinations
    const optimizedOrder = data.waypoints
      ?.slice(1, returnToOrigin ? -1 : undefined) // Remove origin (and final origin if returning)
      .map((wp: any) => {
        const destIndex = wp.waypoint_index - 1; // Adjust for origin
        return destinations[destIndex] || null;
      })
      .filter(Boolean) || [];

    const result = {
      success: true,
      optimizedRoute: {
        geometry: trip.geometry,
        duration: trip.duration, // seconds
        distance: trip.distance, // meters
        durationMinutes: Math.round(trip.duration / 60),
        distanceMiles: Math.round((trip.distance / 1609.34) * 10) / 10,
      },
      optimizedOrder,
      legs: trip.legs?.map((leg: any, index: number) => ({
        from: index === 0 ? 'Start Location' : (optimizedOrder[index - 1]?.name || `Stop ${index}`),
        to: optimizedOrder[index]?.name || (index === trip.legs.length - 1 && returnToOrigin ? 'Return to Start' : `Stop ${index + 1}`),
        duration: leg.duration,
        distance: leg.distance,
        durationMinutes: Math.round(leg.duration / 60),
        distanceMiles: Math.round((leg.distance / 1609.34) * 10) / 10,
        steps: leg.steps?.map((step: any) => ({
          instruction: step.maneuver?.instruction,
          distance: step.distance,
          duration: step.duration,
        })),
      })),
      waypoints: data.waypoints,
    };

    console.log(`Route optimized: ${result.optimizedRoute.distanceMiles} miles, ${result.optimizedRoute.durationMinutes} mins`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Route optimization error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
