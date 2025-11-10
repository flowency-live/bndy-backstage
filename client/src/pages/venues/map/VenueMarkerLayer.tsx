import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { ArtistVenue } from '@/lib/services/venue-crm-service';
import {
  createManagedVenueIcon,
  createUnmanagedVenueIcon,
  createClusterIcon
} from './config/markerIcons';

interface VenueMarkerLayerProps {
  venues: ArtistVenue[];
  onVenueClick: (venue: ArtistVenue) => void;
  filter: 'all' | 'managed' | 'unmanaged';
}

export default function VenueMarkerLayer({
  venues,
  onVenueClick,
  filter
}: VenueMarkerLayerProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    // Clean up existing layer
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    const filteredVenues = venues.filter(v => {
      if (filter === 'managed') return v.managed_on_bndy;
      if (filter === 'unmanaged') return !v.managed_on_bndy;
      return true;
    });

    if (filteredVenues.length === 0) {
      initialFitDoneRef.current = false;
      return;
    }

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 30,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return createClusterIcon(count);
      },
      disableClusteringAtZoom: 12,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
    });

    filteredVenues.forEach(venue => {
      if (!venue.venue.latitude || !venue.venue.longitude) return;

      const icon = venue.managed_on_bndy
        ? createManagedVenueIcon()
        : createUnmanagedVenueIcon();

      const marker = L.marker(
        [venue.venue.latitude, venue.venue.longitude],
        {
          icon,
          title: venue.custom_venue_name || venue.venue.name,
        }
      );

      marker.on('click', () => onVenueClick(venue));
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterRef.current = clusterGroup;

    // Fit bounds on initial load
    if (!initialFitDoneRef.current) {
      const bounds = clusterGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        initialFitDoneRef.current = true;
      }
    }

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map, venues, filter, onVenueClick]);

  return null;
}
