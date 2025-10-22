import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMORROW_IO_API_KEY = Deno.env.get('TOMORROW_IO_API_KEY');
    if (!TOMORROW_IO_API_KEY) {
      throw new Error('TOMORROW_IO_API_KEY is not configured');
    }

    // Get location and days from request body, default to NYC and 7 days
    const { latitude = 40.7128, longitude = -74.0060, location = 'local', days = 7 } = await req.json().catch(() => ({}));

    console.log(`Fetching weather for location: ${latitude}, ${longitude} for ${days} days`);

    // Fetch weather data from Tomorrow.io
    const weatherUrl = `https://api.tomorrow.io/v4/weather/forecast?location=${latitude},${longitude}&apikey=${TOMORROW_IO_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error('Tomorrow.io API error:', weatherResponse.status, errorText);
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('Weather data received successfully');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract daily forecasts and store in database
    const dailyForecasts = weatherData.timelines?.daily || [];
    const forecastsToStore = [];

    // Store the requested number of days (up to what's available from API)
    const daysToStore = Math.min(days, dailyForecasts.length);
    
    for (const day of dailyForecasts.slice(0, daysToStore)) {
      const forecastDate = day.time.split('T')[0];
      const values = day.values;

      const forecastData = {
        location,
        temperature: values.temperatureAvg || values.temperature || 20,
        condition: getWeatherCondition(values.weatherCodeMax || values.weatherCode),
        humidity: values.humidityAvg || values.humidity || 65,
        forecast_date: forecastDate,
        fetched_at: new Date().toISOString(),
      };

      forecastsToStore.push(forecastData);
    }

    // Upsert weather data (update if exists, insert if not)
    for (const forecast of forecastsToStore) {
      const { error: upsertError } = await supabase
        .from('weather_cache')
        .upsert(
          forecast,
          { onConflict: 'location,forecast_date' }
        );

      if (upsertError) {
        console.error('Error storing weather data:', upsertError);
      }
    }

    console.log(`Successfully stored ${forecastsToStore.length} days of weather data`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecasts: forecastsToStore,
        message: `Stored ${forecastsToStore.length} days of weather data` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-weather function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather data';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to convert weather codes to readable conditions
function getWeatherCondition(weatherCode: number): string {
  const conditions: Record<number, string> = {
    0: 'Unknown',
    1000: 'Clear',
    1001: 'Cloudy',
    1100: 'Mostly Clear',
    1101: 'Partly Cloudy',
    1102: 'Mostly Cloudy',
    2000: 'Fog',
    2100: 'Light Fog',
    3000: 'Light Wind',
    3001: 'Wind',
    3002: 'Strong Wind',
    4000: 'Drizzle',
    4001: 'Rain',
    4200: 'Light Rain',
    4201: 'Heavy Rain',
    5000: 'Snow',
    5001: 'Flurries',
    5100: 'Light Snow',
    5101: 'Heavy Snow',
    6000: 'Freezing Drizzle',
    6001: 'Freezing Rain',
    6200: 'Light Freezing Rain',
    6201: 'Heavy Freezing Rain',
    7000: 'Ice Pellets',
    7101: 'Heavy Ice Pellets',
    7102: 'Light Ice Pellets',
    8000: 'Thunderstorm',
  };

  return conditions[weatherCode] || 'Partly Cloudy';
}
