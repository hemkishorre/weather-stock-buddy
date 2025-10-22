import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind, RefreshCw, MapPin, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  forecast_date: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
}

const WeatherWidget = () => {
  const [weeklyWeather, setWeeklyWeather] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<LocationData>({
    latitude: 40.7128,
    longitude: -74.0060,
    name: "New York, NY"
  });
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationData>(location);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Fetch user's saved location
        const { data: profile } = await supabase
          .from("profiles")
          .select("weather_latitude, weather_longitude, weather_location_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          const savedLocation = {
            latitude: parseFloat(profile.weather_latitude?.toString() || "40.7128"),
            longitude: parseFloat(profile.weather_longitude?.toString() || "-74.0060"),
            name: profile.weather_location_name || "New York, NY"
          };
          setLocation(savedLocation);
          setEditLocation(savedLocation);
        }
      }
    };

    initUser();
  }, []);

  const fetchWeatherFromCache = async (lat: number, lon: number) => {
    try {
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const locationKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

      const { data, error } = await supabase
        .from("weather_cache")
        .select("*")
        .eq("location", locationKey)
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

  const refreshWeatherData = async (lat?: number, lon?: number) => {
    const latitude = lat || location.latitude;
    const longitude = lon || location.longitude;
    
    setRefreshing(true);
    try {
      const locationKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      
      const { data, error } = await supabase.functions.invoke('fetch-weather', {
        body: { 
          latitude,
          longitude,
          location: locationKey
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Weather data updated!");
        await fetchWeatherFromCache(latitude, longitude);
      }
    } catch (error: any) {
      console.error("Error refreshing weather:", error);
      toast.error("Failed to refresh weather data");
    } finally {
      setRefreshing(false);
    }
  };

  const saveLocation = async () => {
    if (!userId) {
      toast.error("Please log in to save location");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          weather_latitude: editLocation.latitude,
          weather_longitude: editLocation.longitude,
          weather_location_name: editLocation.name
        })
        .eq("id", userId);

      if (error) throw error;

      setLocation(editLocation);
      setShowLocationDialog(false);
      toast.success("Location saved!");
      
      // Refresh weather for new location
      await refreshWeatherData(editLocation.latitude, editLocation.longitude);
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  useEffect(() => {
    const initWeather = async () => {
      if (!location.latitude || !location.longitude) return;
      
      setLoading(true);
      const hasCache = await fetchWeatherFromCache(location.latitude, location.longitude);
      
      if (!hasCache) {
        await refreshWeatherData();
      }
      
      setLoading(false);
    };

    initWeather();
  }, [location]);

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
    <>
      <Card className="shadow-card transition-base hover:shadow-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Weekly Weather Forecast
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refreshWeatherData()}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <button
            onClick={() => setShowLocationDialog(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <MapPin className="w-3 h-3" />
            <span>{location.name}</span>
            <Edit2 className="w-3 h-3" />
          </button>
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
              <Button onClick={() => refreshWeatherData()} disabled={refreshing}>
                {refreshing ? "Loading..." : "Fetch Weather"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Edit Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Weather Location</DialogTitle>
            <DialogDescription>
              Enter the coordinates and name for your location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                placeholder="e.g., New York, NY"
                value={editLocation.name}
                onChange={(e) => setEditLocation({ ...editLocation, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  placeholder="40.7128"
                  value={editLocation.latitude}
                  onChange={(e) => setEditLocation({ ...editLocation, latitude: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  placeholder="-74.0060"
                  value={editLocation.longitude}
                  onChange={(e) => setEditLocation({ ...editLocation, longitude: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">Popular coordinates:</p>
              <div className="space-y-1">
                <button 
                  onClick={() => setEditLocation({ latitude: 40.7128, longitude: -74.0060, name: "New York, NY" })}
                  className="block hover:text-foreground transition-colors"
                >
                  New York: 40.7128, -74.0060
                </button>
                <button 
                  onClick={() => setEditLocation({ latitude: 51.5074, longitude: -0.1278, name: "London, UK" })}
                  className="block hover:text-foreground transition-colors"
                >
                  London: 51.5074, -0.1278
                </button>
                <button 
                  onClick={() => setEditLocation({ latitude: 35.6762, longitude: 139.6503, name: "Tokyo, Japan" })}
                  className="block hover:text-foreground transition-colors"
                >
                  Tokyo: 35.6762, 139.6503
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveLocation} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Save Location
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditLocation(location);
                  setShowLocationDialog(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WeatherWidget;
