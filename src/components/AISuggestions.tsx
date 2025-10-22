import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Suggestion {
  item: string;
  recommendation: string;
  reason: string;
  priority: string;
}

const AISuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-inventory-suggestions', {
        body: {}
      });

      if (error) throw error;

      if (data?.success) {
        setSuggestions(data.suggestions);
        setContext(data.context);
        toast.success("AI suggestions updated!");
      }
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setLoading(false);
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
              Intelligent recommendations based on weather and your inventory needs
            </CardDescription>
          </div>
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
                  
                  <p className="text-sm text-muted-foreground">
                    💡 {suggestion.reason}
                  </p>
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

export default AISuggestions;
