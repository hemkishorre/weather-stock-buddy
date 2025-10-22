import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, IndianRupee, Target, Shield, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

  // Calculate risk metrics
  const riskMetrics = originalNeeds.map(need => {
    const aiSuggestion = aiSuggestions.find(
      s => s.item.toLowerCase() === need.item_name.toLowerCase()
    );
    
    if (!aiSuggestion) return null;
    
    const quantityDiff = need.quantity_needed - aiSuggestion.suggested_quantity;
    const price = getItemPrice(need.item_name);
    const potentialLoss = quantityDiff > 0 ? quantityDiff * price : 0;
    
    return {
      item: need.item_name,
      quantityReduced: Math.max(0, quantityDiff),
      quantityIncreased: Math.max(0, -quantityDiff),
      potentialLoss,
      spoilageRisk: (aiSuggestion as any).spoilage_risk || 'medium',
      shelfLife: (aiSuggestion as any).estimated_shelf_life || 7
    };
  }).filter(Boolean);

  const totalItemsOptimized = riskMetrics.filter(m => m && m.quantityReduced > 0).length;
  const totalPotentialSpoilagePrevented = riskMetrics.reduce((sum, m) => sum + (m?.potentialLoss || 0), 0);
  const highRiskItemsProtected = riskMetrics.filter(m => m && m.spoilageRisk === 'high').length;

  // Pie chart data - show individual items at risk with vibrant colors
  const pieColors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))',
    'hsl(217 91% 70%)', // primary-glow
    'hsl(270 60% 70%)', // secondary variant
  ];
  
  const riskDistribution = riskMetrics
    .filter(m => m && m.quantityReduced > 0)
    .map((m, index) => ({
      name: m!.item,
      value: m!.potentialLoss,
      color: pieColors[index % pieColors.length]
    }));

  return (
    <Card className="gradient-card border-0 shadow-card hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg gradient-primary shadow-glow-primary">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Cost & Risk Analysis: AI-Powered Inventory Optimization
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <Card className="gradient-card border-0 shadow-card hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Original Plan Cost</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-muted-foreground to-foreground bg-clip-text text-transparent">
                    ₹{originalCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <IndianRupee className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-card hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Suggested Cost</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ₹{aiSuggestedCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg gradient-primary shadow-glow-primary">
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`gradient-card border-0 shadow-card hover-lift ${isAISavingMoney ? "ring-2 ring-success/50" : "ring-2 ring-warning/50"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isAISavingMoney ? "Potential Savings" : "Additional Cost"}
                  </p>
                  <p className={`text-2xl font-bold ${isAISavingMoney ? "bg-gradient-to-r from-success to-accent bg-clip-text text-transparent" : "bg-gradient-to-r from-warning to-destructive bg-clip-text text-transparent"}`}>
                    ₹{Math.abs(difference).toFixed(2)}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {Math.abs(percentageChange).toFixed(1)}% {isAISavingMoney ? "savings" : "increase"}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${isAISavingMoney ? "gradient-success shadow-glow-success" : "bg-warning/20"}`}>
                  {isAISavingMoney ? (
                    <TrendingDown className="w-6 h-6 text-white" />
                  ) : (
                    <TrendingUp className="w-6 h-6 text-warning" />
                  )}
                </div>
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
              <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="original" fill="hsl(var(--muted-foreground))" name="Original Plan" />
              <Bar dataKey="aiSuggested" fill="hsl(var(--primary))" name="AI Suggested" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Protection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-slide-up">
          <Card className="gradient-card border-0 shadow-card hover-lift ring-2 ring-success/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Items Protected</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-success to-accent bg-clip-text text-transparent">
                    {totalItemsOptimized}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Quantities optimized</p>
                </div>
                <div className="p-3 rounded-lg gradient-success shadow-glow-success">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-card hover-lift ring-2 ring-accent/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Spoilage Prevention</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-accent to-success bg-clip-text text-transparent">
                    ₹{totalPotentialSpoilagePrevented.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Potential loss avoided</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/20 shadow-glow-accent">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-card hover-lift ring-2 ring-warning/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High-Risk Items</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-warning to-destructive bg-clip-text text-transparent">
                    {highRiskItemsProtected}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Weather-sensitive</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/20">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution Chart */}
        {riskDistribution.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-4">Items at Risk - Potential Spoilage Loss</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ₹${value.toFixed(2)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="space-y-3">
          <div className={`p-4 rounded-lg ${isAISavingMoney ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
            <p className="text-sm font-medium">
              💡 {isAISavingMoney ? "Cost Optimization Insight" : "Investment Insight"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {isAISavingMoney 
                ? `By following AI suggestions, you could save ₹${Math.abs(difference).toFixed(2)} (${Math.abs(percentageChange).toFixed(1)}%) on your inventory costs. The AI has optimized quantities based on weather patterns, demand forecasts, and seasonal trends.`
                : `AI suggests investing an additional ₹${Math.abs(difference).toFixed(2)} (${Math.abs(percentageChange).toFixed(1)}%) to meet expected demand. This investment could prevent stockouts and maximize sales opportunities based on weather and demand forecasts.`
              }
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Risk Protection Summary
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              AI predictions protect you from ₹{totalPotentialSpoilagePrevented.toFixed(2)} in potential spoilage losses by optimizing {totalItemsOptimized} items. 
              {highRiskItemsProtected > 0 && ` Special attention given to ${highRiskItemsProtected} high-risk item(s) affected by weather conditions.`}
              {' '}The recommendations account for shelf life, humidity, temperature, and precipitation forecasts to minimize waste and maximize freshness.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
