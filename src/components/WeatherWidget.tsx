import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  forecast_date: string;
}

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Try to get cached weather data
        const { data, error } = await supabase
          .from("weather_cache")
          .select("*")
          .eq("location", "local")
          .eq("forecast_date", today)
          .maybeSingle();

        if (data && !error) {
          setWeather({
            temperature: parseFloat(data.temperature?.toString() || "20"),
            condition: data.condition || "Partly Cloudy",
            humidity: data.humidity || 65,
            forecast_date: data.forecast_date,
          });
        } else {
          // Set demo weather data if no cached data
          setWeather({
            temperature: 22,
            condition: "Partly Cloudy",
            humidity: 65,
            forecast_date: today,
          });
        }
      } catch (error) {
        console.error("Error fetching weather:", error);
        // Fallback to demo data
        setWeather({
          temperature: 22,
          condition: "Partly Cloudy",
          humidity: 65,
          forecast_date: new Date().toISOString().split('T')[0],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="w-8 h-8 text-primary" />;
    
    const condition = weather.condition.toLowerCase();
    if (condition.includes("rain")) {
      return <CloudRain className="w-8 h-8 text-primary" />;
    } else if (condition.includes("sun") || condition.includes("clear")) {
      return <Sun className="w-8 h-8 text-warning" />;
    } else {
      return <Cloud className="w-8 h-8 text-primary" />;
    }
  };

  const getWeatherImpact = () => {
    if (!weather) return "Loading forecast...";
    
    if (weather.temperature > 25) {
      return "Hot day - expect higher demand for cold drinks and fresh produce.";
    } else if (weather.condition.toLowerCase().includes("rain")) {
      return "Rainy weather - consider stocking comfort foods and hot beverages.";
    } else if (weather.temperature < 15) {
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
            Weather Forecast
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
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{weather?.temperature}°C</p>
            <p className="text-sm text-muted-foreground">{weather?.condition}</p>
          </div>
          <div>{getWeatherIcon()}</div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wind className="w-4 h-4" />
          <span>Humidity: {weather?.humidity}%</span>
        </div>

        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-sm font-medium text-success-foreground">
            📊 Supply Suggestion
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {getWeatherImpact()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
