import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';
import { CARTO_VOYAGER_TILES } from './config/tileProviders';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MapContainerProps {
  children?: React.ReactNode;
  center?: [number, number];
  zoom?: number;
}

export default function MapContainer({
  children,
  center = [54.5, -4.0],
  zoom = 6
}: MapContainerProps) {
  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      minZoom={5}
      maxZoom={18}
      zoomControl={true}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
      className="rounded-lg"
    >
      <TileLayer
        url={CARTO_VOYAGER_TILES.url}
        attribution={CARTO_VOYAGER_TILES.attribution}
        maxZoom={CARTO_VOYAGER_TILES.maxZoom}
        subdomains={CARTO_VOYAGER_TILES.subdomains as string[]}
      />
      {children}
    </LeafletMapContainer>
  );
}
