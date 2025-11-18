import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { Event } from '@/types/api';
import { format } from 'date-fns';
import MapContainer from '../../venues/map/MapContainer';

// Create gig marker icon
const createGigIcon = (isToday: boolean = false) => {
  const color = isToday ? '#f97316' : '#3b82f6'; // orange for today, blue for others
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">
        🎵
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Create cluster icon
const createClusterIcon = (count: number) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #3b82f6;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
      ">
        ${count}
      </div>
    `,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

interface GigMarkerLayerProps {
  gigs: Event[];
  onGigClick: (gig: Event) => void;
}

function GigMarkerLayer({ gigs, onGigClick }: GigMarkerLayerProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    // Clean up existing layer
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    // Filter gigs that have location data
    const gigsWithLocation = gigs.filter(gig => {
      // Check if gig has venue with coordinates (from venue lookup)
      // Or if it has latitude/longitude directly
      return (gig as any).latitude && (gig as any).longitude;
    });

    if (gigsWithLocation.length === 0) {
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

    gigsWithLocation.forEach(gig => {
      const lat = (gig as any).latitude;
      const lng = (gig as any).longitude;
      if (!lat || !lng) return;

      const isToday = new Date(gig.date).toDateString() === new Date().toDateString();
      const icon = createGigIcon(isToday);

      const marker = L.marker([lat, lng], {
        icon,
        title: gig.title || 'Gig',
      });

      // Create popup content
      const gigDate = format(new Date(gig.date), 'EEEE, do MMMM yyyy');
      const gigTime = gig.startTime ? ` at ${gig.startTime}` : '';

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${gig.title || 'Gig'}</h3>
          ${gig.venue ? `<p style="margin: 0 0 4px 0; color: #666;"><strong>📍 ${gig.venue}</strong></p>` : ''}
          <p style="margin: 0 0 4px 0; color: #666;">${gigDate}${gigTime}</p>
          ${gig.description ? `<p style="margin: 8px 0 0 0; font-size: 14px;">${gig.description}</p>` : ''}
          <button
            onclick="window.dispatchEvent(new CustomEvent('gigClick', { detail: '${gig.id}' }))"
            style="
              margin-top: 12px;
              padding: 6px 12px;
              background-color: #f97316;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              width: 100%;
            "
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Handle marker click
      marker.on('click', () => {
        // Open popup
        marker.openPopup();
      });

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

    // Listen for custom gig click events from popup buttons
    const handleGigClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      const gigId = customEvent.detail;
      const clickedGig = gigs.find(g => g.id === gigId);
      if (clickedGig) {
        onGigClick(clickedGig);
      }
    };

    window.addEventListener('gigClick', handleGigClick);

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
      window.removeEventListener('gigClick', handleGigClick);
    };
  }, [map, gigs, onGigClick]);

  return null;
}

interface GigsMapViewProps {
  artistId: string;
  gigs: Event[];
  onGigClick: (gig: Event) => void;
}

export default function GigsMapView({ gigs, onGigClick }: GigsMapViewProps) {
  return (
    <div className="relative w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] rounded-lg overflow-hidden">
      <MapContainer>
        <GigMarkerLayer gigs={gigs} onGigClick={onGigClick} />
      </MapContainer>

      {gigs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
          <p className="text-muted-foreground">No gigs with location data to display on map</p>
        </div>
      )}
    </div>
  );
}
