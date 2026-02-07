import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useServerAuth } from '@/hooks/useServerAuth';
import { venueCRMService } from '@/lib/services/venue-crm-service';
import type { ArtistVenue } from '@/lib/services/venue-crm-service';
import { BndySpinnerOverlay } from '@/components/ui/bndy-spinner';
import MapContainer from '../map/MapContainer';
import VenueMarkerLayer from '../map/VenueMarkerLayer';

interface VenueMapViewProps {
  artistId: string;
}

export default function VenueMapView({ artistId }: VenueMapViewProps) {
  const { session } = useServerAuth();
  const [, setLocation] = useLocation();

  const { data: venues = [], isLoading } = useQuery<ArtistVenue[]>({
    queryKey: ['artist-venues', artistId],
    queryFn: async () => {
      if (!session) throw new Error("Not authenticated");
      return venueCRMService.getArtistVenues(artistId);
    },
    enabled: !!session && !!artistId,
    staleTime: 10 * 60 * 1000,
  });

  const handleVenueClick = useCallback((venue: ArtistVenue) => {
    setLocation(`/venues/${venue.venue_id}`);
  }, [setLocation]);

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  return (
    <div className="fixed top-[64px] left-0 right-0 bottom-[60px] lg:bottom-0 lg:left-64 z-10">
      <MapContainer>
        <VenueMarkerLayer
          venues={venues}
          onVenueClick={handleVenueClick}
          filter="all"
        />
      </MapContainer>
    </div>
  );
}
