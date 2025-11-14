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
  website?: string;
  source?: 'db' | 'google_places';
}

interface VenueSearchStepProps {
  formData: PublicGigFormData;
  onUpdate: (data: Partial<PublicGigFormData>) => void;
  artistName: string;
  artistLocation: string | null;
  artistLocationLat?: number;
  artistLocationLng?: number;
  onQuickAdd?: () => void;
  initialDate?: string;
}

export default function VenueSearchStep({ formData, onUpdate, artistName, artistLocation, artistLocationLat, artistLocationLng, onQuickAdd, initialDate }: VenueSearchStepProps) {
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
      } else {
      }

      // If no DB results, search Google Places
      if (venues.length === 0) {
        // Load Google Maps if not already loaded
        if (!googleMapsLoaded) {
          const loaded = await loadGoogleMaps();
          if (!loaded) {
            console.error('[VenueSearch] Failed to load Google Maps API');
            toast({
              title: 'Google Maps unavailable',
              description: 'Unable to search external venues. Please try again.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        // Search Google Places with location bias (using stored lat/lng)
        const googlePlaces = await searchGooglePlaces(term, artistLocation, artistLocationLat, artistLocationLng);
        const googleVenues: Venue[] = googlePlaces.map((place) => {
          const venueData = placeResultToVenueData(place);
          return {
            name: venueData.name,
            address: venueData.address,
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            googlePlaceId: venueData.googlePlaceId,
            website: venueData.website,
            source: 'google_places' as const,
          };
        });
        setGoogleResults(googleVenues);
      } else {
        // Clear Google results if we have DB results
        setGoogleResults([]);
      }
    } catch (error) {
      console.error('[VenueSearch] Search error:', error);
      toast({
        title: 'Search error',
        description: 'Failed to search venues. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [googleMapsLoaded, loadGoogleMaps, toast, artistLocation, artistLocationLat, artistLocationLng]);

  const handleVenueSelect = async (venue: Venue) => {
    setSelectedVenue(venue);
    // Clear search term to show selected venue display
    setSearchTerm('');
    setDbResults([]);
    setGoogleResults([]);

    // Store venue data in formData
    // For DB venues, we have venueId immediately
    // For Google Places venues, venueId will be undefined and created on final submit
    onUpdate({
      venueId: venue.source === 'db' ? venue.id : undefined,
      venueName: venue.name,
      venueAddress: venue.address,
      venueLocation: {
        lat: venue.latitude,
        lng: venue.longitude,
      },
      googlePlaceId: venue.googlePlaceId,
      venueWebsite: venue.website,
      // Auto-generate title: [artistname] @ [venuename]
      title: `${artistName} @ ${venue.name}`,
    });
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

      {/* Loading State - Fixed height to prevent jumping */}
      {loading && (
        <div className="h-[280px] flex items-center justify-center">
          <div className="flex items-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-muted-foreground">Searching venues...</span>
          </div>
        </div>
      )}

      {/* Selected Venue Display */}
      {selectedVenue && !searchTerm && (
        <>
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

          {/* Quick Add Button - appears when venue is selected */}
          {onQuickAdd && (
            <div className="mt-4 bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Create gig immediately with default settings:
                </p>
                <ul className="text-xs text-muted-foreground mb-4 space-y-1">
                  <li>• Date: {initialDate ? new Date(initialDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}</li>
                  <li>• Time: 9:00 PM - Midnight</li>
                  <li>• Title: {artistName} @ {selectedVenue.name}</li>
                  <li>• Visibility: Public</li>
                </ul>
                <Button
                  onClick={onQuickAdd}
                  className="w-full min-h-[56px] md:min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
                >
                  <i className="fas fa-bolt mr-2"></i>
                  Quick Add Gig
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Search Results - Fixed height container to prevent modal jumping */}
      {!loading && searchTerm.length >= 2 && totalResults > 0 && (
        <div className="border rounded-xl overflow-hidden h-[280px] overflow-y-auto">
          {/* DB Results Section */}
          {dbResults.length > 0 && (
            <div>
              <div className="bg-primary/10 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
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
              <div className="bg-secondary/10 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
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

      {/* No Results - Fixed height to prevent jumping */}
      {!loading && searchTerm.length >= 2 && totalResults === 0 && (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No venues found matching "{searchTerm}"</p>
            <p className="text-sm mt-2">Try a different search term or check spelling</p>
          </div>
        </div>
      )}

      {/* Empty State - Fixed height to prevent jumping */}
      {!loading && !searchTerm && !selectedVenue && (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start typing to search for venues</p>
            <p className="text-sm mt-2">Searches bndy database and Google Places</p>
          </div>
        </div>
      )}
    </div>
  );
}
