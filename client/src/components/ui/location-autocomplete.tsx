// LocationAutocomplete - Google Places autocomplete for cities/regions
import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchLocationAutocomplete } from '@/lib/services/places-service';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'e.g., Stoke-on-Trent, Manchester, London',
  className = '',
  required = false,
  autoFocus = false,
}: LocationAutocompleteProps) {
  const { isLoaded: googleMapsLoaded, loadGoogleMaps } = useGoogleMaps();
  const [searchTerm, setSearchTerm] = useState(value);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Handle search with debouncing
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    const searchLocations = async () => {
      setLoading(true);

      // Load Google Maps if not already loaded
      if (!googleMapsLoaded) {
        await loadGoogleMaps();
      }

      try {
        const results = await searchLocationAutocomplete(searchTerm);
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Location search error:', error);
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchLocations, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, googleMapsLoaded, loadGoogleMaps]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const location = prediction.description;
    setSearchTerm(location);
    onChange(location);
    setShowDropdown(false);
    setPredictions([]);
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    if (newValue !== value) {
      onChange(newValue); // Update parent immediately for form validation
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-10 pr-10 ${className}`}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className="w-full p-3 text-left hover:bg-accent border-b last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
