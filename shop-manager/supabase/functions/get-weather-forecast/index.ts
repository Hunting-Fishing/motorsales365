import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Weather code to condition mapping
const weatherCodeToCondition: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Showers',
  81: 'Showers',
  82: 'Heavy Showers',
  85: 'Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Severe Thunderstorm',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`);

    // Call Open-Meteo API (free, no API key required)
    const apiUrl = new URL('https://api.open-meteo.com/v1/forecast');
    apiUrl.searchParams.set('latitude', latitude.toString());
    apiUrl.searchParams.set('longitude', longitude.toString());
    apiUrl.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code');
    apiUrl.searchParams.set('temperature_unit', 'fahrenheit');
    apiUrl.searchParams.set('wind_speed_unit', 'mph');
    apiUrl.searchParams.set('timezone', 'auto');
    apiUrl.searchParams.set('forecast_days', '7');

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Open-Meteo API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch weather data from Open-Meteo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Open-Meteo response:', JSON.stringify(data));

    // Transform the data into our format
    const forecast = data.daily.time.map((date: string, index: number) => {
      const precipChance = data.daily.precipitation_probability_max[index] ?? 0;
      const windSpeed = data.daily.wind_speed_10m_max[index] ?? 0;
      const weatherCode = data.daily.weather_code[index] ?? 0;

      // Determine work suitability based on conditions
      // Good: Rain <40%, Wind <20 mph
      // Marginal: Rain 40-60%, Wind 15-25 mph
      // Poor: Rain >60% OR Wind >25 mph
      let suitability: 'good' | 'marginal' | 'poor';
      if (precipChance > 60 || windSpeed > 25) {
        suitability = 'poor';
      } else if (precipChance >= 40 || windSpeed >= 15) {
        suitability = 'marginal';
      } else {
        suitability = 'good';
      }

      return {
        forecast_date: date,
        temperature_high: Math.round(data.daily.temperature_2m_max[index] ?? 0),
        temperature_low: Math.round(data.daily.temperature_2m_min[index] ?? 0),
        precipitation_chance: precipChance,
        wind_speed: Math.round(windSpeed),
        conditions: weatherCodeToCondition[weatherCode] || 'Unknown',
        weather_code: weatherCode,
        is_suitable_for_work: suitability !== 'poor',
        suitability,
      };
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecast,
        location: {
          latitude,
          longitude,
          timezone: data.timezone,
        },
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Weather forecast error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
