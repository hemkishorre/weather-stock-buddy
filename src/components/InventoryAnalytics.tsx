import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, DollarSign, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InventoryNeed {
  item_name: string;
  quantity_needed: number;
  unit: string;
}

interface AISuggestion {
  item: string;
  suggested_quantity: number;
  reason: string;
}

interface InventoryAnalyticsProps {
  aiSuggestions: AISuggestion[];
}

// Average prices per kg for common items (mock data - in real scenario, fetch from products)
const ITEM_PRICES: Record<string, number> = {
  tomato: 3.5,
  carrot: 2.8,
  watermelon: 1.5,
  biscuits: 8.0,
  potato: 2.0,
  onion: 2.5,
  cabbage: 3.0,
  milk: 1.2,
  rice: 4.0,
  default: 3.0
};

const getItemPrice = (itemName: string): number => {
  const normalizedName = itemName.toLowerCase();
  return ITEM_PRICES[normalizedName] || ITEM_PRICES.default;
};

export const InventoryAnalytics = ({ aiSuggestions }: InventoryAnalyticsProps) => {
  const [originalNeeds, setOriginalNeeds] = useState<InventoryNeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryNeeds = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("inventory_needs")
          .select("item_name, quantity_needed, unit")
          .eq("vendor_id", user.id);

        if (error) throw error;
        setOriginalNeeds(data || []);
      } catch (error) {
        console.error("Error fetching inventory needs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryNeeds();
  }, []);

  if (loading || originalNeeds.length === 0) {
    return null;
  }

  // Calculate costs for original needs
  const originalCost = originalNeeds.reduce((total, need) => {
    const price = getItemPrice(need.item_name);
    return total + (need.quantity_needed * price);
  }, 0);

  // Calculate costs for AI suggestions
  const aiSuggestedCost = aiSuggestions.reduce((total, suggestion) => {
    const price = getItemPrice(suggestion.item);
    return total + (suggestion.suggested_quantity * price);
  }, 0);

  // Calculate potential savings/loss
  const difference = originalCost - aiSuggestedCost;
  const percentageChange = originalCost > 0 ? ((difference / originalCost) * 100) : 0;

  // Prepare chart data
  const chartData = originalNeeds.map(need => {
    const aiSuggestion = aiSuggestions.find(
      s => s.item.toLowerCase() === need.item_name.toLowerCase()
    );
    const price = getItemPrice(need.item_name);
    
    return {
      name: need.item_name,
      original: need.quantity_needed * price,
      aiSuggested: aiSuggestion ? aiSuggestion.suggested_quantity * price : 0,
    };
  });

  const isAISavingMoney = difference > 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Cost Analysis: Original vs AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Original Plan Cost</p>
                  <p className="text-2xl font-bold">${originalCost.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Suggested Cost</p>
                  <p className="text-2xl font-bold">${aiSuggestedCost.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className={isAISavingMoney ? "bg-success/10" : "bg-destructive/10"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isAISavingMoney ? "Potential Savings" : "Additional Cost"}
                  </p>
                  <p className="text-2xl font-bold">
                    ${Math.abs(difference).toFixed(2)}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {Math.abs(percentageChange).toFixed(1)}% {isAISavingMoney ? "savings" : "increase"}
                  </p>
                </div>
                {isAISavingMoney ? (
                  <TrendingDown className="w-8 h-8 text-success" />
                ) : (
                  <TrendingUp className="w-8 h-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Item-by-Item Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="original" fill="hsl(var(--muted-foreground))" name="Original Plan" />
              <Bar dataKey="aiSuggested" fill="hsl(var(--primary))" name="AI Suggested" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insight */}
        <div className={`p-4 rounded-lg ${isAISavingMoney ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
          <p className="text-sm font-medium">
            💡 {isAISavingMoney ? "Cost Optimization Insight" : "Investment Insight"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {isAISavingMoney 
              ? `By following AI suggestions, you could save $${Math.abs(difference).toFixed(2)} (${Math.abs(percentageChange).toFixed(1)}%) on your inventory costs. The AI has optimized quantities based on weather patterns, demand forecasts, and seasonal trends.`
              : `AI suggests investing an additional $${Math.abs(difference).toFixed(2)} (${Math.abs(percentageChange).toFixed(1)}%) to meet expected demand. This investment could prevent stockouts and maximize sales opportunities based on weather and demand forecasts.`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
