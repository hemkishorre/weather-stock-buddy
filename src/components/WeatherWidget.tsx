import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  forecast_date: string;
}

const WeatherWidget = () => {
  const [weeklyWeather, setWeeklyWeather] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeatherFromCache = async () => {
    try {
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const { data, error } = await supabase
        .from("weather_cache")
        .select("*")
        .eq("location", "local")
        .in("forecast_date", dates)
        .order("forecast_date", { ascending: true });

      if (!error && data && data.length > 0) {
        setWeeklyWeather(data.map(item => ({
          temperature: parseFloat(item.temperature?.toString() || "20"),
          condition: item.condition || "Partly Cloudy",
          humidity: item.humidity || 65,
          forecast_date: item.forecast_date,
        })));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching weather cache:", error);
      return false;
    }
  };

  const refreshWeatherData = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-weather', {
        body: { 
          latitude: 40.7128, 
          longitude: -74.0060,
          location: 'local'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Weather data updated!");
        await fetchWeatherFromCache();
      }
    } catch (error: any) {
      console.error("Error refreshing weather:", error);
      toast.error("Failed to refresh weather data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initWeather = async () => {
      setLoading(true);
      const hasCache = await fetchWeatherFromCache();
      
      if (!hasCache) {
        // No cache, fetch fresh data
        await refreshWeatherData();
      }
      
      setLoading(false);
    };

    initWeather();
  }, []);

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
      return <CloudRain className="w-6 h-6 text-primary" />;
    } else if (conditionLower.includes("clear") || conditionLower.includes("sun")) {
      return <Sun className="w-6 h-6 text-warning" />;
    } else {
      return <Cloud className="w-6 h-6 text-primary" />;
    }
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const tomorrowOnly = tomorrow.toISOString().split('T')[0];

    if (dateOnly === todayOnly) return "Today";
    if (dateOnly === tomorrowOnly) return "Tomorrow";
    
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeatherImpact = () => {
    if (weeklyWeather.length === 0) return "Loading forecast...";
    
    const today = weeklyWeather[0];
    
    if (today.temperature > 25) {
      return "Hot day - expect higher demand for cold drinks and fresh produce.";
    } else if (today.condition.toLowerCase().includes("rain")) {
      return "Rainy weather - consider stocking comfort foods and hot beverages.";
    } else if (today.temperature < 15) {
      return "Cold weather - warm meals and hot drinks will be popular.";
    }
    return "Pleasant weather - normal inventory levels recommended.";
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weekly Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card transition-base hover:shadow-card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weekly Weather Forecast
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshWeatherData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyWeather.length > 0 && (
          <>
            {/* Today's Highlight */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-3xl font-bold">{weeklyWeather[0].temperature}°C</p>
                <p className="text-sm text-muted-foreground">{weeklyWeather[0].condition}</p>
              </div>
              <div>{getWeatherIcon(weeklyWeather[0].condition)}</div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wind className="w-4 h-4" />
              <span>Humidity: {weeklyWeather[0].humidity}%</span>
            </div>

            {/* Weekly Forecast Grid */}
            <div className="grid grid-cols-7 gap-2 mt-4">
              {weeklyWeather.map((day, index) => (
                <div 
                  key={day.forecast_date}
                  className={`flex flex-col items-center p-2 rounded-lg transition-base ${
                    index === 0 ? 'bg-primary/10' : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <p className="text-xs font-medium mb-1">
                    {getDayName(day.forecast_date)}
                  </p>
                  <div className="my-1">
                    {getWeatherIcon(day.condition)}
                  </div>
                  <p className="text-sm font-bold">{Math.round(day.temperature)}°</p>
                </div>
              ))}
            </div>

            {/* AI Suggestion */}
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm font-medium text-success-foreground">
                📊 Supply Suggestion
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {getWeatherImpact()}
              </p>
            </div>
          </>
        )}

        {weeklyWeather.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">No weather data available</p>
            <Button onClick={refreshWeatherData} disabled={refreshing}>
              {refreshing ? "Loading..." : "Fetch Weather"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
