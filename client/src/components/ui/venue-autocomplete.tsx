// VenueAutocomplete - Searches BNDY venues first, then Google Places Text Search
import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Database, Globe, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';
import { getAllVenues, type Venue } from '@/lib/services/godmode-service';

interface CombinedResult {
  id: string;
  type: 'bndy' | 'google';
  name: string;
  address: string;
  placeId?: string;
  venue?: Venue;
}

interface VenueAutocompleteProps {
  value: string;
  onChange: (placeId: string, name: string, address: string, location?: { lat: number; lng: number }, existingVenue?: Venue) => void;
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
  const [bndyResults, setBndyResults] = useState<CombinedResult[]>([]);
  const [googleResults, setGoogleResults] = useState<CombinedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const placesServiceRef = useRef<any>(null);
  const justSelectedRef = useRef(false);
  const bndyVenuesRef = useRef<Venue[]>([]);

  // Sync external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Load BNDY venues on mount
  useEffect(() => {
    const loadBndyVenues = async () => {
      try {
        const venues = await getAllVenues();
        bndyVenuesRef.current = venues;
      } catch (error) {
        console.error('[VenueAutocomplete] Failed to load BNDY venues:', error);
      }
    };
    loadBndyVenues();
  }, []);

  // Initialize Google Places service (PlacesService for Text Search API)
  useEffect(() => {
    if (googleMapsLoaded && (window as any).google?.maps?.places) {
      if (!placesServiceRef.current) {
        const div = document.createElement('div');
        placesServiceRef.current = new (window as any).google.maps.places.PlacesService(div);
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
      setBndyResults([]);
      setGoogleResults([]);
      setShowDropdown(false);
      return;
    }

    const searchVenues = async () => {
      setLoading(true);

      // Search BNDY venues
      const searchLower = searchTerm.toLowerCase();
      const matchingVenues = bndyVenuesRef.current
        .filter(v => {
          // Check official name, address, city, and postcode
          const nameMatch = v.name?.toLowerCase().includes(searchLower);
          const addressMatch = v.address?.toLowerCase().includes(searchLower);
          const cityMatch = (v as any).city?.toLowerCase().includes(searchLower);
          const postcodeMatch = v.postcode?.toLowerCase().includes(searchLower);

          // Check name variants (also known as names)
          const variantsMatch = v.nameVariants && Array.isArray(v.nameVariants) &&
            v.nameVariants.some(variant => variant.toLowerCase().includes(searchLower));

          return nameMatch || addressMatch || cityMatch || postcodeMatch || variantsMatch;
        })
        .slice(0, 5)
        .map(v => ({
          id: v.id,
          type: 'bndy' as const,
          name: v.name || '',
          address: v.address || '',
          venue: v,
        }));

      setBndyResults(matchingVenues);

      // Load Google Maps if not already loaded
      if (!googleMapsLoaded) {
        await loadGoogleMaps();
      }

      // Search Google Places using Text Search API (matches frontstage behavior)
      try {
        if (!placesServiceRef.current) {
          console.error('[VenueAutocomplete] PlacesService not initialized');
          setLoading(false);
          return;
        }

        console.log('[VenueAutocomplete] Calling textSearch with query:', searchTerm);
        placesServiceRef.current.textSearch(
          {
            query: searchTerm,
            type: 'establishment'
          },
          (results: any, status: any) => {
            console.log('[VenueAutocomplete] textSearch response - status:', status, 'results count:', results?.length || 0);
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results) {
              console.log('[VenueAutocomplete] First 3 results:', results.slice(0, 3).map((r: any) => ({ name: r.name, address: r.formatted_address })));
              const googleMatches = results.slice(0, 5).map((place: any) => ({
                id: place.place_id,
                type: 'google' as const,
                name: place.name || '',
                address: place.formatted_address || '',
                placeId: place.place_id,
              }));

              // CRITICAL: Filter out Google results that match ANY existing BNDY venue
              // (not just search results, but ALL venues in the database)
              // This prevents duplicates when user types non-matching suffix (e.g., "Torr Vale Tap house")
              const normalizeVenueName = (name: string) =>
                name.toLowerCase().replace(/[^a-z0-9]/g, '');

              const allBndyVenueNames = new Set(
                bndyVenuesRef.current.map(v => normalizeVenueName(v.name || ''))
              );

              const filteredGoogleMatches = googleMatches.filter(g => {
                const normalizedGoogleName = normalizeVenueName(g.name);
                const isDuplicate = allBndyVenueNames.has(normalizedGoogleName);
                if (isDuplicate) {
                  console.log('[VenueAutocomplete] Filtering out duplicate:', g.name, 'normalized:', normalizedGoogleName);
                }
                return !isDuplicate;
              });

              console.log('[VenueAutocomplete] After filtering:', filteredGoogleMatches.length, 'results');
              setGoogleResults(filteredGoogleMatches);
              setShowDropdown(matchingVenues.length > 0 || filteredGoogleMatches.length > 0);
            } else {
              setGoogleResults([]);
              setShowDropdown(matchingVenues.length > 0);
            }
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('[VenueAutocomplete] Search error:', error);
        setGoogleResults([]);
        setShowDropdown(matchingVenues.length > 0);
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

  const handleSelectBndy = (result: CombinedResult) => {
    justSelectedRef.current = true;
    setSearchTerm('');
    setShowDropdown(false);
    setBndyResults([]);
    setGoogleResults([]);

    if (result.venue) {
      const location = result.venue.location ||
        (result.venue.latitude && result.venue.longitude ?
          { lat: result.venue.latitude, lng: result.venue.longitude } :
          undefined);

      onChange(
        result.venue.googlePlaceId || '',
        result.name,
        result.address,
        location,
        result.venue
      );
    }
  };

  const handleSelectGoogle = async (result: CombinedResult) => {
    justSelectedRef.current = true;
    setSearchTerm('');
    setShowDropdown(false);
    setBndyResults([]);
    setGoogleResults([]);

    if (!result.placeId) return;

    // Get place details including location
    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: result.placeId,
          fields: ['name', 'formatted_address', 'geometry'],
        },
        (place: any, status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place) {
            const location = place.geometry?.location ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            } : undefined;

            onChange(
              result.placeId!,
              place.name || result.name,
              place.formatted_address || result.address,
              location
            );
          } else {
            onChange(result.placeId!, result.name, result.address);
          }
        }
      );
    } else {
      onChange(result.placeId, result.name, result.address);
    }
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    if (newValue !== value) {
      onChange('', newValue, '', undefined, undefined);
    }
  };

  const allResults = [...bndyResults, ...googleResults];

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
      {showDropdown && allResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-md border bg-popover shadow-md max-h-96 overflow-y-auto">
          {/* BNDY Results */}
          {bndyResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                <Database className="h-3 w-3" />
                BNDY Venues (Already in database)
              </div>
              <div className="p-1">
                {bndyResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectBndy(result)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSelectBndy(result);
                    }}
                    className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 mb-1"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate flex items-center gap-2">
                        {result.name}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">EXISTS</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google Results */}
          {googleResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                <Globe className="h-3 w-3" />
                Google Places (Add new venue)
              </div>
              <div className="p-1">
                {googleResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectGoogle(result)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSelectGoogle(result);
                    }}
                    className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {result.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
