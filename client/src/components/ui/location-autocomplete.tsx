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
  const userInteractedRef = useRef(false);

  // Sync external value changes
  useEffect(() => {
    setSearchTerm(value);
    // Reset interaction flag when external value changes
    userInteractedRef.current = false;
  }, [value]);

  // Handle search with debouncing
  useEffect(() => {
    console.log('[LocationAutocomplete] Search term changed:', searchTerm, 'Length:', searchTerm?.length);

    // Don't search if user hasn't interacted yet (initial load with existing value)
    if (!userInteractedRef.current) {
      console.log('[LocationAutocomplete] User has not interacted yet, skipping search');
      return;
    }

    if (!searchTerm || searchTerm.length < 2) {
      console.log('[LocationAutocomplete] Search term too short, clearing predictions');
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    console.log('[LocationAutocomplete] Setting up debounced search...');

    const searchLocations = async () => {
      console.log('[LocationAutocomplete] Starting search, Google Maps loaded:', googleMapsLoaded);
      setLoading(true);

      // Load Google Maps if not already loaded
      if (!googleMapsLoaded) {
        console.log('[LocationAutocomplete] Loading Google Maps...');
        await loadGoogleMaps();
        console.log('[LocationAutocomplete] Google Maps loaded');
      }

      try {
        console.log('[LocationAutocomplete] Calling searchLocationAutocomplete with:', searchTerm);
        const results = await searchLocationAutocomplete(searchTerm);
        console.log('[LocationAutocomplete] Got results:', results.length);
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('[LocationAutocomplete] Search error:', error);
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        console.log('[LocationAutocomplete] Search complete, setting loading to false');
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
    // Mark that user has interacted with the input
    userInteractedRef.current = true;
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
