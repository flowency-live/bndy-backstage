// VenueAutocomplete - Google Places autocomplete for specific venues/businesses
import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';

interface VenueResult {
  placeId: string;
  name: string;
  address: string;
}

interface VenueAutocompleteProps {
  value: string;
  onChange: (placeId: string, name: string, address: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export default function VenueAutocomplete({
  value,
  onChange,
  placeholder = 'Search for venue or business...',
  className = '',
  required = false,
  autoFocus = false,
}: VenueAutocompleteProps) {
  const { isLoaded: googleMapsLoaded, loadGoogleMaps } = useGoogleMaps();
  const [searchTerm, setSearchTerm] = useState(value);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const justSelectedRef = useRef(false);

  // Sync external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Initialize Google Places services
  useEffect(() => {
    if (googleMapsLoaded && window.google?.maps?.places) {
      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      }
      if (!placesServiceRef.current) {
        // Create a dummy div for PlacesService (required by Google API)
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
      }
    }
  }, [googleMapsLoaded]);

  // Handle search with debouncing
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!searchTerm || searchTerm.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    const searchVenues = async () => {
      setLoading(true);

      // Load Google Maps if not already loaded
      if (!googleMapsLoaded) {
        await loadGoogleMaps();
      }

      try {
        if (!autocompleteServiceRef.current) {
          console.error('[VenueAutocomplete] AutocompleteService not initialized');
          setLoading(false);
          return;
        }

        // Search for establishments (businesses, venues, etc.)
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: searchTerm,
            types: ['establishment'],
            componentRestrictions: { country: 'gb' },
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(results);
              setShowDropdown(results.length > 0);
            } else {
              setPredictions([]);
              setShowDropdown(false);
            }
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('[VenueAutocomplete] Search error:', error);
        setPredictions([]);
        setShowDropdown(false);
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchVenues, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, googleMapsLoaded, loadGoogleMaps]);

  // Close dropdown when clicking outside
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
    justSelectedRef.current = true;
    setSearchTerm(prediction.description);
    setShowDropdown(false);
    setPredictions([]);

    // Get place details to retrieve formatted address
    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['name', 'formatted_address'],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            onChange(
              prediction.place_id,
              place.name || prediction.structured_formatting.main_text,
              place.formatted_address || prediction.description
            );
          } else {
            // Fallback to prediction data if details fetch fails
            onChange(
              prediction.place_id,
              prediction.structured_formatting.main_text,
              prediction.description
            );
          }
        }
      );
    } else {
      // Fallback if PlacesService not available
      onChange(
        prediction.place_id,
        prediction.structured_formatting.main_text,
        prediction.description
      );
    }
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    if (newValue !== value) {
      onChange('', newValue, ''); // Clear place ID when manually typing
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
        <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-md border bg-popover p-1 shadow-md max-h-64 overflow-y-auto">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              onClick={() => handleSelect(prediction)}
              onTouchEnd={(e) => {
                e.preventDefault();
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
