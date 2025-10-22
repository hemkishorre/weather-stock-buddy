import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const POPULAR_CITIES = [
  { name: "Chennai, Tamil Nadu, India", lat: "13.0827", lon: "80.2707" },
  { name: "Bangalore, Karnataka, India", lat: "12.9716", lon: "77.5946" },
  { name: "Mumbai, Maharashtra, India", lat: "19.0760", lon: "72.8777" },
  { name: "Delhi, India", lat: "28.7041", lon: "77.1025" },
  { name: "Kolkata, West Bengal, India", lat: "22.5726", lon: "88.3639" },
];

export function LocationSearch({ value, onChange, placeholder = "Search for a city..." }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Show popular cities on focus if empty
  const handleFocus = () => {
    if (searchQuery.length < 2) {
      setShowDropdown(true);
    } else if (searchQuery.length >= 2 && locations.length > 0) {
      setShowDropdown(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update search query when value prop changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  useEffect(() => {
    const searchLocations = async () => {
      if (searchQuery.length < 2) {
        setLocations([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      setShowDropdown(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setLocations(data);
      } catch (error) {
        console.error("Error searching locations:", error);
        setLocations([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const formatLocationName = (location: LocationResult) => {
    const parts = location.display_name.split(", ");
    return parts.slice(0, 3).join(", ");
  };

  const handleSelectLocation = (location: LocationResult) => {
    const formatted = formatLocationName(location);
    setSearchQuery(formatted);
    onChange(formatted);
    setShowDropdown(false);
  };

  const handleSelectPopularCity = (cityName: string) => {
    setSearchQuery(cityName);
    onChange(cityName);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleFocus}
          className="pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {searchQuery.length < 2 ? (
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                Popular Cities
              </div>
              {POPULAR_CITIES.map((city, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectPopularCity(city.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{city.name}</span>
                </button>
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {loading ? "Searching..." : "No locations found"}
            </div>
          ) : (
            <div className="py-1">
              {locations.map((location) => (
                <button
                  key={location.place_id}
                  type="button"
                  onClick={() => handleSelectLocation(location)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{formatLocationName(location)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
