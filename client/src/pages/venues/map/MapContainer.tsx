import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { CARTO_VOYAGER_TILES } from './config/tileProviders';

interface MapContainerProps {
  onMapReady: (map: L.Map) => void;
  center?: [number, number];
  zoom?: number;
}

export default function MapContainer({
  onMapReady,
  center = [54.5, -4.0],
  zoom = 6
}: MapContainerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: true,
    });

    L.tileLayer(CARTO_VOYAGER_TILES.url, {
      attribution: CARTO_VOYAGER_TILES.attribution,
      maxZoom: CARTO_VOYAGER_TILES.maxZoom,
      subdomains: CARTO_VOYAGER_TILES.subdomains,
    }).addTo(map);

    mapRef.current = map;
    onMapReady(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, onMapReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: '500px' }}
    />
  );
}
