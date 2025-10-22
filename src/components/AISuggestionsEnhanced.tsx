import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RefreshCw, TrendingUp, AlertCircle, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SuggestionWithQuantity {
  item: string;
  recommendation: string;
  reason: string;
  priority: string;
  suggested_quantity: number;
  unit: string;
  estimated_shelf_life?: number;
  spoilage_risk?: "low" | "medium" | "high";
  matching_products?: Array<{
    id: string;
    name: string;
    price_per_unit: number;
    wholesaler_id: string;
    wholesaler_name: string;
    stock_quantity: number;
  }>;
}

interface AISuggestionsEnhancedProps {
  onAddToCart: (productId: string, quantity: number, price: number, wholesalerId: string) => void;
  onSuggestionsChange?: (suggestions: SuggestionWithQuantity[]) => void;
}

const AISuggestionsEnhanced = ({ onAddToCart, onSuggestionsChange }: AISuggestionsEnhancedProps) => {
  const [suggestions, setSuggestions] = useState<SuggestionWithQuantity[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [forecastDays, setForecastDays] = useState<string>("7");

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-inventory-suggestions', {
        body: { forecastDays: parseInt(forecastDays) }
      });

      if (error) throw error;

      if (data?.success) {
        setSuggestions(data.suggestions);
        setContext(data.context);
        onSuggestionsChange?.(data.suggestions);
        toast.success("AI suggestions updated!");
      }
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  const getSpoilageRiskColor = (risk?: string): string => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const getSpoilageRiskBadge = (risk?: string): "destructive" | "default" | "secondary" => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" => {
    switch (priority.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const handleQuickPurchase = (product: any, quantity: number) => {
    onAddToCart(product.id, quantity, product.price_per_unit, product.wholesaler_id);
    toast.success(`Added ${quantity} ${product.name} to cart from ${product.wholesaler_name}`);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Smart Suggestions
            </CardTitle>
            <CardDescription>
              Weather & shelf-life optimized recommendations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={forecastDays} onValueChange={setForecastDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 Week</SelectItem>
                <SelectItem value="14">2 Weeks</SelectItem>
                <SelectItem value="21">3 Weeks</SelectItem>
                <SelectItem value="30">1 Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={fetchSuggestions}
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Suggestions
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length > 0 ? (
          <div className="space-y-4">
            {context && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <span>📦 {context.inventoryItemsCount} items</span>
                <span>•</span>
                <span>🌤️ {context.weatherDays} day forecast</span>
                <span>•</span>
                <span>📍 {context.location}</span>
              </div>
            )}

            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary mt-1" />
                      <h4 className="font-semibold">{suggestion.item}</h4>
                    </div>
                    <Badge variant={getPriorityVariant(suggestion.priority)}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-sm mb-2 font-medium text-foreground">
                    {suggestion.recommendation}
                  </p>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    💡 {suggestion.reason}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {suggestion.suggested_quantity > 0 && (
                      <div className="px-3 py-1.5 bg-primary/10 rounded-md text-sm font-medium">
                        📦 {suggestion.suggested_quantity} {suggestion.unit}
                      </div>
                    )}
                    {suggestion.estimated_shelf_life && (
                      <div className="px-3 py-1.5 bg-muted rounded-md text-sm">
                        ⏱️ {suggestion.estimated_shelf_life} days shelf life
                      </div>
                    )}
                    {suggestion.spoilage_risk && (
                      <Badge variant={getSpoilageRiskBadge(suggestion.spoilage_risk)} className="px-3 py-1.5">
                        {suggestion.spoilage_risk === "high" && "⚠️"}
                        {suggestion.spoilage_risk === "medium" && "⚡"}
                        {suggestion.spoilage_risk === "low" && "✓"}
                        {" "}{suggestion.spoilage_risk.toUpperCase()} spoilage risk
                      </Badge>
                    )}
                  </div>

                  {suggestion.matching_products && suggestion.matching_products.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold">Available from suppliers:</p>
                      {suggestion.matching_products.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{product.wholesaler_name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${product.price_per_unit}/{suggestion.unit} • Stock: {product.stock_quantity}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleQuickPurchase(product, suggestion.suggested_quantity)}
                            disabled={product.stock_quantity < suggestion.suggested_quantity}
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Add to Cart
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Suggestions Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Get Suggestions" to receive AI-powered recommendations<br />
              based on your inventory needs and weather forecast
            </p>
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-left">
                Add items to "Inventory Needs" above to get more specific recommendations
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AISuggestionsEnhanced;
