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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Processing AI suggestions for user: ${user.id}`);

    // Fetch user's inventory needs
    const { data: inventoryNeeds, error: invError } = await supabase
      .from('inventory_needs')
      .select('*')
      .eq('vendor_id', user.id)
      .order('priority', { ascending: false });

    if (invError) {
      console.error('Error fetching inventory:', invError);
      throw new Error('Failed to fetch inventory needs');
    }

    // Fetch user's location for weather
    const { data: profile } = await supabase
      .from('profiles')
      .select('weather_latitude, weather_longitude, weather_location_name')
      .eq('id', user.id)
      .maybeSingle();

    const latitude = profile?.weather_latitude || 40.7128;
    const longitude = profile?.weather_longitude || -74.0060;
    const locationName = profile?.weather_location_name || 'New York, NY';

    // Fetch weather data
    const today = new Date();
    const threeDays = Array.from({ length: 3 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const locationKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const { data: weatherData } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('location', locationKey)
      .in('forecast_date', threeDays)
      .order('forecast_date', { ascending: true });

    // Prepare context for AI
    const inventoryContext = inventoryNeeds && inventoryNeeds.length > 0
      ? inventoryNeeds.map(item => 
          `- ${item.item_name}: ${item.quantity_needed} ${item.unit} (Priority: ${item.priority}${item.notes ? `, Notes: ${item.notes}` : ''})`
        ).join('\n')
      : 'No inventory items specified yet.';

    const weatherContext = weatherData && weatherData.length > 0
      ? weatherData.map(day => 
          `${day.forecast_date}: ${day.condition}, ${day.temperature}°C, ${day.humidity}% humidity`
        ).join('\n')
      : 'No weather data available.';

    const systemPrompt = `You are an intelligent supply chain assistant for food vendors. Your role is to analyze the vendor's inventory needs alongside weather forecasts to provide actionable, smart recommendations.

Location: ${locationName}

Current Inventory Needs:
${inventoryContext}

Weather Forecast (Next 3 Days):
${weatherContext}

Provide 3-5 specific, actionable recommendations considering:
1. How weather conditions affect demand for specific items
2. Priority levels of inventory needs
3. Seasonal patterns and temperature impacts
4. Practical adjustments to quantities based on weather

Format your response as a JSON array of suggestions, each with:
- "item": the inventory item or category
- "recommendation": specific action to take
- "reason": why this is recommended based on weather/demand
- "priority": "high", "medium", or "low"

Example format:
[
  {
    "item": "Fresh Vegetables",
    "recommendation": "Increase tomato order by 20% (add 2kg to your planned 10kg)",
    "reason": "Sunny weather increases demand for fresh salads and cold dishes",
    "priority": "high"
  }
]

If no inventory items are specified, provide general recommendations for a food vendor based on the weather.`;

    console.log('Calling AI with context...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Based on my inventory needs and the weather forecast, what are your smart recommendations?' }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI response received:', aiContent);

    // Parse AI response as JSON
    let suggestions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback: return raw content
      suggestions = [{
        item: "General Recommendation",
        recommendation: aiContent,
        reason: "AI analysis based on current conditions",
        priority: "medium"
      }];
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions,
        context: {
          inventoryItemsCount: inventoryNeeds?.length || 0,
          weatherDays: weatherData?.length || 0,
          location: locationName
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ai-inventory-suggestions function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
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
