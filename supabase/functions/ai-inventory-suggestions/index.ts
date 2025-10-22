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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Fetch weather data for the next 7 days
    const today = new Date();
    const sevenDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const locationKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const { data: weatherData } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('location', locationKey)
      .in('forecast_date', sevenDays)
      .order('forecast_date', { ascending: true });

    // Fetch all available products from all wholesalers
    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        unit,
        price_per_unit,
        stock_quantity,
        wholesaler_id,
        wholesalers (
          name
        )
      `);

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

    const systemPrompt = `You are an intelligent supply chain assistant for food vendors. Your role is to analyze the vendor's inventory needs alongside a 7-day weather forecast to provide actionable, smart recommendations with specific quantities.

Location: ${locationName}

Current Inventory Needs:
${inventoryContext}

Weather Forecast (Next 7 Days):
${weatherContext}

Available Product Categories: ${allProducts ? [...new Set(allProducts.map((p: any) => p.category))].join(', ') : 'Various'}

Provide 3-5 specific, actionable recommendations considering:
1. How weather conditions affect demand for specific items over the week
2. Priority levels of inventory needs
3. Temperature impacts and patterns across multiple days
4. Practical quantity adjustments based on weekly weather trends
5. Suggest realistic quantities to purchase (e.g., "15 kg", "20 units")

Format your response as a JSON array of suggestions, each with:
- "item": the inventory item or category
- "recommendation": specific action to take
- "reason": why this is recommended based on weather/demand patterns
- "priority": "high", "medium", or "low"
- "suggested_quantity": numeric value (e.g., 15, 20, 30)
- "unit": measurement unit (e.g., "kg", "units", "boxes")

Example format:
[
  {
    "item": "Fresh Vegetables",
    "recommendation": "Increase tomato order to 25 kg total",
    "reason": "Sunny weather for 5 days increases demand for fresh salads and cold dishes",
    "priority": "high",
    "suggested_quantity": 25,
    "unit": "kg"
  }
]

If no inventory items are specified, provide general recommendations for a food vendor based on the weather patterns.`;

    console.log('Calling AI with context...');

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
          { role: 'user', content: 'Based on my inventory needs and the 7-day weather forecast, what are your smart recommendations with specific quantities to buy?' }
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

    let suggestions;
    try {
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      suggestions = JSON.parse(jsonStr);

      // Match suggestions with actual products
      suggestions = suggestions.map((suggestion: any) => {
        const matchingProducts = allProducts?.filter((product: any) => {
          const productName = product.name.toLowerCase();
          const suggestionItem = suggestion.item.toLowerCase();
          const category = product.category.toLowerCase();
          
          return productName.includes(suggestionItem) || 
                 suggestionItem.includes(productName) ||
                 category.includes(suggestionItem) ||
                 suggestionItem.includes(category);
        }).map((product: any) => ({
          id: product.id,
          name: product.name,
          price_per_unit: product.price_per_unit,
          wholesaler_id: product.wholesaler_id,
          wholesaler_name: product.wholesalers?.name || 'Unknown Supplier',
          stock_quantity: product.stock_quantity
        })) || [];

        return {
          ...suggestion,
          matching_products: matchingProducts.slice(0, 3) // Limit to top 3 matches
        };
      });
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      suggestions = [{
        item: "General Recommendation",
        recommendation: aiContent,
        reason: "AI analysis based on current conditions",
        priority: "medium",
        suggested_quantity: 0,
        unit: "units",
        matching_products: []
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
