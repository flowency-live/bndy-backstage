// LocationAutocomplete - Google Places autocomplete for cities/regions
import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchLocationAutocomplete } from '@/lib/services/places-service';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';

interface LocationData {
  location: string;
  lat?: number;
  lng?: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string, lat?: number, lng?: number) => void;
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
  const initialValue = useRef(value);
  const justSelectedRef = useRef(false); // Track if user just selected from dropdown

  // Sync external value changes and update initialValue ref
  useEffect(() => {
    // Update initialValue ref when value changes from parent (like form reset)
    if (value !== searchTerm) {
      initialValue.current = value;
    }
    setSearchTerm(value);
  }, [value, searchTerm]);

  // Handle search with debouncing
  useEffect(() => {
    // Don't search on initial mount with existing value
    if (searchTerm === initialValue.current && initialValue.current) {
      return;
    }

    // Don't search if we just selected from dropdown (prevents reopening)
    if (justSelectedRef.current) {
      justSelectedRef.current = false; // Reset flag for future searches
      return;
    }

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
        console.error('[LocationAutocomplete] Search error:', error);
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchLocations, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, googleMapsLoaded, loadGoogleMaps]);

  // Close dropdown when clicking/tapping outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    const location = prediction.description;
    justSelectedRef.current = true; // Mark that we just selected from dropdown
    setSearchTerm(location);
    setShowDropdown(false);
    setPredictions([]);

    // Geocode the selected location using Google Maps JavaScript SDK
    try {
      // Ensure Google Maps is loaded
      if (!window.google?.maps?.Geocoder) {
        onChange(location);
        return;
      }

      // Use the JavaScript SDK Geocoder instead of REST API
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        {
          address: location,
          region: 'gb'
        },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const { lat, lng } = results[0].geometry.location;
            onChange(location, lat(), lng());
          } else {
            onChange(location);
          }
        }
      );
    } catch (error) {
      console.error('[LocationAutocomplete] Geocoding error:', error);
      onChange(location);
    }
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
        <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              onClick={() => handleSelect(prediction)}
              onTouchEnd={(e) => {
                e.preventDefault(); // Prevent ghost click and keyboard
                handleSelect(prediction);
              }}
              className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                {prediction.structured_formatting?.secondary_text && (
                  <div className="text-xs text-muted-foreground truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
