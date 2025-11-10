import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerAuth } from '@/hooks/useServerAuth';
import { venueCRMService } from '@/lib/services/venue-crm-service';
import type { ArtistVenue } from '@/lib/services/venue-crm-service';
import { BndySpinnerOverlay } from '@/components/ui/bndy-spinner';
import { useToast } from '@/hooks/use-toast';
import MapContainer from '../map/MapContainer';
import VenueMarkerLayer from '../map/VenueMarkerLayer';
import MapControls from '../map/MapControls';
import VenueEditPanel from '../map/VenueEditPanel';
import type L from 'leaflet';

interface VenueMapViewProps {
  artistId: string;
}

export default function VenueMapView({ artistId }: VenueMapViewProps) {
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<ArtistVenue | null>(null);
  const [filter, setFilter] = useState<'all' | 'managed' | 'unmanaged'>('all');

  const { data: venues = [], isLoading } = useQuery<ArtistVenue[]>({
    queryKey: ['artist-venues', artistId],
    queryFn: async () => {
      if (!session) throw new Error("Not authenticated");
      return venueCRMService.getArtistVenues(artistId);
    },
    enabled: !!session && !!artistId,
    staleTime: 10 * 60 * 1000,
  });

  const updateVenueMutation = useMutation({
    mutationFn: async (updates: { customVenueName?: string; notes?: string }) => {
      if (!session || !selectedVenue) throw new Error("Not authenticated or no venue selected");
      return venueCRMService.updateArtistVenue(
        artistId,
        selectedVenue.venue_id,
        updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-venues', artistId] });
      toast({
        title: "Venue updated",
        description: "Your changes have been saved",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update venue",
        description: error.message,
      });
    },
  });

  const handleMapReady = useCallback((mapInstance: L.Map) => {
    setMap(mapInstance);
  }, []);

  // Fit bounds once when map and venues are ready
  const [hasFitBounds, setHasFitBounds] = useState(false);

  useEffect(() => {
    if (!map || !venues.length || hasFitBounds) return;

    const bounds = venues
      .filter(v => v.venue.latitude && v.venue.longitude)
      .map(v => [v.venue.latitude, v.venue.longitude] as [number, number]);

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      setHasFitBounds(true);
    }
  }, [map, venues, hasFitBounds]);

  const handleVenueClick = useCallback((venue: ArtistVenue) => {
    setSelectedVenue(venue);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!map) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          map.flyTo(location, 12);
          toast({
            title: "Location found",
            description: "Showing your current location",
          });
        },
        () => {
          toast({
            variant: "destructive",
            title: "Location error",
            description: "Could not access your location",
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Location not supported",
        description: "Your browser doesn't support geolocation",
      });
    }
  }, [map, toast]);

  const handleFitBounds = useCallback(() => {
    if (!map || venues.length === 0) return;

    const bounds = venues
      .filter(v => v.venue.latitude && v.venue.longitude)
      .map(v => [v.venue.latitude, v.venue.longitude] as [number, number]);

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [map, venues]);

  const handleSaveVenue = useCallback(
    async (updates: { customVenueName?: string; notes?: string }) => {
      await updateVenueMutation.mutateAsync(updates);
    },
    [updateVenueMutation]
  );

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] rounded-lg overflow-hidden">
      <MapContainer onMapReady={handleMapReady} />

      {map && (
        <>
          <VenueMarkerLayer
            map={map}
            venues={venues}
            onVenueClick={handleVenueClick}
            filter={filter}
          />
          <MapControls
            onLocateMe={handleLocateMe}
            onFitBounds={handleFitBounds}
            filter={filter}
            onFilterChange={setFilter}
            venueCount={venues.length}
          />
        </>
      )}

      <VenueEditPanel
        venue={selectedVenue}
        artistId={artistId}
        onClose={() => setSelectedVenue(null)}
        onSave={handleSaveVenue}
      />
    </div>
  );
}
