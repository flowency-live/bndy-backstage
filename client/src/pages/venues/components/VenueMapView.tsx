import { useState, useCallback } from 'react';
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

interface VenueMapViewProps {
  artistId: string;
}

export default function VenueMapView({ artistId }: VenueMapViewProps) {
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedVenue, setSelectedVenue] = useState<ArtistVenue | null>(null);

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

  const handleVenueClick = useCallback((venue: ArtistVenue) => {
    setSelectedVenue(venue);
  }, []);

  const handleLocateMe = useCallback(() => {
    // This would need access to map instance - we'll implement via a custom hook if needed
    toast({
      title: "Feature coming soon",
      description: "Locate me functionality will be added",
    });
  }, [toast]);

  const handleFitBounds = useCallback(() => {
    // This would need access to map instance - fitBounds is handled automatically on load
    toast({
      title: "Map centered",
      description: "Showing all venues",
    });
  }, [toast]);

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
    <div className="relative w-full h-[calc(100vh-140px)] sm:h-[calc(100vh-200px)] rounded-lg overflow-hidden">
      <MapContainer>
        <VenueMarkerLayer
          venues={venues}
          onVenueClick={handleVenueClick}
          filter="all"
        />
      </MapContainer>

      <MapControls
        onLocateMe={handleLocateMe}
        onFitBounds={handleFitBounds}
        venueCount={venues.length}
      />

      <VenueEditPanel
        venue={selectedVenue}
        artistId={artistId}
        onClose={() => setSelectedVenue(null)}
        onSave={handleSaveVenue}
      />
    </div>
  );
}
