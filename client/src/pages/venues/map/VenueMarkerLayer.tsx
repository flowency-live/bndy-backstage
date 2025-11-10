import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { ArtistVenue } from '@/lib/services/venue-crm-service';
import {
  createManagedVenueIcon,
  createUnmanagedVenueIcon,
  createClusterIcon
} from './config/markerIcons';

interface VenueMarkerLayerProps {
  map: L.Map | null;
  venues: ArtistVenue[];
  onVenueClick: (venue: ArtistVenue) => void;
  filter: 'all' | 'managed' | 'unmanaged';
}

export default function VenueMarkerLayer({
  map,
  venues,
  onVenueClick,
  filter
}: VenueMarkerLayerProps) {
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clean up existing layer first
    if (clusterRef.current) {
      try {
        map.removeLayer(clusterRef.current);
      } catch (e) {
        // Layer might already be removed
      }
      clusterRef.current = null;
    }

    const filteredVenues = venues.filter(v => {
      if (filter === 'managed') return v.managed_on_bndy;
      if (filter === 'unmanaged') return !v.managed_on_bndy;
      return true;
    });

    if (filteredVenues.length === 0) return;

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

    // Add to map
    try {
      map.addLayer(clusterGroup);
      clusterRef.current = clusterGroup;
    } catch (e) {
      console.error('Error adding markers to map:', e);
    }

    return () => {
      if (clusterRef.current) {
        try {
          map.removeLayer(clusterRef.current);
        } catch (e) {
          // Layer might already be removed
        }
        clusterRef.current = null;
      }
    };
  }, [map, venues, filter]);

  return null;
}
