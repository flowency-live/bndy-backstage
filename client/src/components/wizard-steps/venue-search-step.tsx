// VenueSearchStep - Search venues from DB + Google Places
import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2, Building2, Globe, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';
import { searchGooglePlaces, placeResultToVenueData } from '@/lib/services/places-service';
import { useToast } from '@/hooks/use-toast';
import type { PublicGigFormData } from '@/components/public-gig-wizard';

interface Venue {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
  source?: 'db' | 'google_places';
}

interface VenueSearchStepProps {
  formData: PublicGigFormData;
  onUpdate: (data: Partial<PublicGigFormData>) => void;
  artistName: string;
  artistLocation: string | null;
}

export default function VenueSearchStep({ formData, onUpdate, artistName, artistLocation }: VenueSearchStepProps) {
  const { toast } = useToast();
  const { isLoaded: googleMapsLoaded, loadGoogleMaps } = useGoogleMaps();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbResults, setDbResults] = useState<Venue[]>([]);
  const [googleResults, setGoogleResults] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    const input = document.getElementById('venue-search-input');
    if (input) {
      (input as HTMLInputElement).focus();
    }
  }, []);

  // Restore selected venue from formData on mount
  useEffect(() => {
    if (formData.venueId && formData.venueName) {
      setSelectedVenue({
        id: formData.venueId,
        name: formData.venueName,
        address: formData.venueAddress || '',
        latitude: formData.venueLocation?.lat || 0,
        longitude: formData.venueLocation?.lng || 0,
        googlePlaceId: formData.googlePlaceId,
        source: 'db',
      });
    }
  }, []);

  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term);

    if (!term || term.length < 2) {
      setDbResults([]);
      setGoogleResults([]);
      return;
    }

    setLoading(true);

    try {
      // Search DB venues first
      const dbResponse = await fetch(
        `https://api.bndy.co.uk/api/venues?search=${encodeURIComponent(term)}`,
        { credentials: 'include' }
      );

      let venues: any[] = [];
      if (dbResponse.ok) {
        venues = await dbResponse.json();
        setDbResults(
          venues.map((v: any) => ({
            ...v,
            source: 'db' as const,
          }))
        );
      }

      // If no DB results, search Google Places
      if (venues.length === 0) {
        // Load Google Maps if not already loaded
        if (!googleMapsLoaded) {
          await loadGoogleMaps();
        }

        // Search Google Places with location bias
        const googlePlaces = await searchGooglePlaces(term, artistLocation);
        const googleVenues: Venue[] = googlePlaces.map((place) => {
          const venueData = placeResultToVenueData(place);
          return {
            name: venueData.name,
            address: venueData.address,
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            googlePlaceId: venueData.googlePlaceId,
            source: 'google_places' as const,
          };
        });
        setGoogleResults(googleVenues);
      } else {
        // Clear Google results if we have DB results
        setGoogleResults([]);
      }
    } catch (error) {
      console.error('Venue search error:', error);
      toast({
        title: 'Search error',
        description: 'Failed to search venues. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [googleMapsLoaded, loadGoogleMaps, toast]);

  const handleVenueSelect = async (venue: Venue) => {
    setSelectedVenue(venue);
    // Clear search term to show selected venue display
    setSearchTerm('');
    setDbResults([]);
    setGoogleResults([]);

    // If venue is from Google Places, create/find in DB via find-or-create endpoint
    if (venue.source === 'google_places') {
      try {
        const response = await fetch('https://api.bndy.co.uk/api/venues/find-or-create', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: venue.name,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
            googlePlaceId: venue.googlePlaceId,
            source: 'backstage_wizard',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create/find venue');
        }

        const resolvedVenue = await response.json();

        // Show match confidence if not 100%
        if (resolvedVenue.matchConfidence && resolvedVenue.matchConfidence < 100) {
          toast({
            title: `Matched existing venue (${resolvedVenue.matchConfidence}% confidence)`,
            description: `Using "${resolvedVenue.name}" from database`,
          });
        }

        // Update form with resolved venue ID
        onUpdate({
          venueId: resolvedVenue.id,
          venueName: resolvedVenue.name,
          venueAddress: resolvedVenue.address,
          venueLocation: {
            lat: resolvedVenue.latitude,
            lng: resolvedVenue.longitude,
          },
          googlePlaceId: resolvedVenue.googlePlaceId,
          // Auto-generate title: [artistname] @ [venuename]
          title: `${artistName} @ ${resolvedVenue.name}`,
        });
      } catch (error) {
        console.error('Venue resolution error:', error);
        toast({
          title: 'Error',
          description: 'Failed to save venue. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      // DB venue - use directly
      onUpdate({
        venueId: venue.id,
        venueName: venue.name,
        venueAddress: venue.address,
        venueLocation: {
          lat: venue.latitude,
          lng: venue.longitude,
        },
        googlePlaceId: venue.googlePlaceId,
        // Auto-generate title: [artistname] @ [venuename]
        title: `${artistName} @ ${venue.name}`,
      });
    }
  };

  const totalResults = dbResults.length + googleResults.length;

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          id="venue-search-input"
          type="text"
          placeholder="Search for venue (e.g., The Ritz, Manchester)"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-4 h-14 text-base focus:border-orange-500 focus:ring-orange-500" // 56px height for mobile touch
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-muted-foreground">Searching venues...</span>
        </div>
      )}

      {/* Selected Venue Display */}
      {selectedVenue && !searchTerm && (
        <div className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-foreground">✓ Venue Selected</h4>
              </div>
              <div className="font-medium text-foreground mt-2">{selectedVenue.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{selectedVenue.address}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedVenue(null);
                setSearchTerm('');
                onUpdate({
                  venueId: undefined,
                  venueName: undefined,
                  venueAddress: undefined,
                  venueLocation: undefined,
                  googlePlaceId: undefined,
                });
              }}
              className="flex-shrink-0"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {!loading && searchTerm.length >= 2 && totalResults > 0 && (
        <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
          {/* DB Results Section */}
          {dbResults.length > 0 && (
            <div>
              <div className="bg-primary/10 px-4 py-2 flex items-center gap-2 sticky top-0">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">bndy Venues</span>
              </div>
              {dbResults.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => handleVenueSelect(venue)}
                  className="w-full p-4 text-left hover:bg-accent border-b last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-foreground">{venue.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{venue.address}</div>
                </button>
              ))}
            </div>
          )}

          {/* Google Places Results Section */}
          {googleResults.length > 0 && (
            <div>
              <div className="bg-secondary/10 px-4 py-2 flex items-center gap-2 sticky top-0">
                <Globe className="w-4 h-4 text-secondary" />
                <span className="text-sm font-semibold text-secondary">From Google Places</span>
              </div>
              {googleResults.map((venue, idx) => (
                <button
                  key={`google-${idx}`}
                  onClick={() => handleVenueSelect(venue)}
                  className="w-full p-4 text-left hover:bg-accent border-b last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-foreground">{venue.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{venue.address}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && searchTerm.length >= 2 && totalResults === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No venues found matching "{searchTerm}"</p>
          <p className="text-sm mt-2">Try a different search term or check spelling</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !searchTerm && !selectedVenue && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Start typing to search for venues</p>
          <p className="text-sm mt-2">Searches bndy database and Google Places</p>
        </div>
      )}
    </div>
  );
}
