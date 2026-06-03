import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { isPointInCircle, isPointInPolygon } from '@/lib/utils/polygon';
import 'leaflet/dist/leaflet.css';

export interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export type SelectionMode = 'radius' | 'polygon' | 'individual';

export interface VenueCoverageMapProps {
  venues: Venue[];
  selectedVenueIds: string[];
  onSelectionChange: (venueIds: string[]) => void;
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  postcode?: string;
  radiusMiles?: number;
  polygon?: [number, number][];
  onPostcodeChange?: (postcode: string) => void;
  onRadiusChange?: (radius: number) => void;
  onPolygonChange?: (polygon: [number, number][]) => void;
}

// Convert miles to meters for Leaflet
const milesToMeters = (miles: number): number => miles * 1609.344;

// Postcode lookup with caching
const postcodeCache = new Map<string, { lat: number; lng: number } | null>();
async function getPostcodeCoordinates(postcode: string): Promise<{ lat: number; lng: number } | null> {
  const normalized = postcode.toUpperCase().replace(/\s/g, '');
  if (postcodeCache.has(normalized)) {
    return postcodeCache.get(normalized) || null;
  }
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await response.json();
    if (data.status === 200) {
      const result = { lat: data.result.latitude, lng: data.result.longitude };
      postcodeCache.set(normalized, result);
      return result;
    }
    postcodeCache.set(normalized, null);
    return null;
  } catch {
    return null;
  }
}

// Create marker icons - CYAN for selected, gray for unselected
const createVenueIcon = (isSelected: boolean): L.DivIcon => {
  const color = isSelected ? '#06B6D4' : '#9ca3af';
  const size = isSelected ? 14 : 10;
  return L.divIcon({
    className: 'venue-marker',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
  });
};

// Create cluster icon
const createClusterIcon = (count: number, hasSelected: boolean): L.DivIcon => {
  const color = hasSelected ? '#06B6D4' : '#FF1493';
  const size = count < 10 ? 30 : count < 50 ? 36 : 42;
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size),
  });
};

// Map drag controller
function MapDragController({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    }
    return () => {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    };
  }, [enabled, map]);
  return null;
}

// Polygon drawing component
function PolygonDrawer({
  onPointAdded,
  enabled,
}: {
  onPointAdded: (point: [number, number]) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        e.originalEvent.stopPropagation();
        onPointAdded([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

// Center map on coordinates
function MapCenterer({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Venue marker layer with native leaflet.markercluster
function VenueMarkerLayer({
  venues,
  selectedVenueIds,
  mode,
  onVenueClick,
}: {
  venues: Venue[];
  selectedVenueIds: string[];
  mode: SelectionMode;
  onVenueClick: (venueId: string) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const selectedSetRef = useRef(new Set(selectedVenueIds));
  const onVenueClickRef = useRef(onVenueClick);

  // Keep refs updated
  useEffect(() => {
    selectedSetRef.current = new Set(selectedVenueIds);
  }, [selectedVenueIds]);

  useEffect(() => {
    onVenueClickRef.current = onVenueClick;
  }, [onVenueClick]);

  // Create/update cluster group
  useEffect(() => {
    // Clean up existing
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    if (venues.length === 0) return;

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const childMarkers = cluster.getAllChildMarkers();
        const hasSelected = childMarkers.some((m) => {
          // @ts-expect-error - custom property
          const vid = m.venueId as string | undefined;
          return vid && selectedSetRef.current.has(vid);
        });
        return createClusterIcon(count, hasSelected);
      },
      disableClusteringAtZoom: 13,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      chunkedLoading: true,
    });

    venues.forEach((venue) => {
      const isSelected = selectedSetRef.current.has(venue.id);
      const marker = L.marker([venue.latitude, venue.longitude], {
        icon: createVenueIcon(isSelected),
      });

      // Store venue ID on marker
      // @ts-expect-error - custom property
      marker.venueId = venue.id;

      // Tooltip with venue name
      marker.bindTooltip(venue.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
      });

      marker.on('click', () => onVenueClickRef.current(venue.id));
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterRef.current = clusterGroup;

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [venues, map]);

  // Update marker icons when selection changes
  useEffect(() => {
    if (!clusterRef.current) return;

    clusterRef.current.eachLayer((layer) => {
      const marker = layer as L.Marker;
      // @ts-expect-error - custom property
      const venueId = marker.venueId as string | undefined;
      if (venueId) {
        const isSelected = selectedVenueIds.includes(venueId);
        marker.setIcon(createVenueIcon(isSelected));
      }
    });

    // Refresh clusters
    clusterRef.current.refreshClusters();
  }, [selectedVenueIds]);

  return null;
}

export default function VenueCoverageMap({
  venues,
  selectedVenueIds,
  onSelectionChange,
  mode,
  onModeChange,
  postcode = '',
  radiusMiles = 10,
  polygon = [],
  onPostcodeChange,
  onRadiusChange,
  onPolygonChange,
}: VenueCoverageMapProps) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [postcodeError, setPostcodeError] = useState<string | null>(null);
  const [localPostcode, setLocalPostcode] = useState(postcode);
  const [localRadius, setLocalRadius] = useState(radiusMiles);
  const postcodeTimeoutRef = useRef<number | null>(null);

  // Sync postcode from props
  useEffect(() => {
    setLocalPostcode(postcode);
  }, [postcode]);

  // Debounced postcode lookup
  useEffect(() => {
    if (mode === 'radius' && localPostcode && localPostcode.length >= 5) {
      if (postcodeTimeoutRef.current) {
        clearTimeout(postcodeTimeoutRef.current);
      }
      postcodeTimeoutRef.current = window.setTimeout(() => {
        setPostcodeError(null);
        getPostcodeCoordinates(localPostcode).then((coords) => {
          if (coords) {
            setCenter(coords);
          } else {
            setPostcodeError('Invalid postcode');
          }
        });
      }, 300);
    }
    return () => {
      if (postcodeTimeoutRef.current) {
        clearTimeout(postcodeTimeoutRef.current);
      }
    };
  }, [localPostcode, mode]);

  // Calculate selected venues based on mode
  useEffect(() => {
    if (mode === 'radius' && center) {
      const selectedIds = venues
        .filter((venue) =>
          isPointInCircle(
            { lat: venue.latitude, lng: venue.longitude },
            center,
            radiusMiles
          )
        )
        .map((v) => v.id);
      onSelectionChange(selectedIds);
    } else if (mode === 'polygon' && polygon.length >= 3) {
      const polygonPoints = polygon.map((p) => ({ lat: p[0], lng: p[1] }));
      const selectedIds = venues
        .filter((venue) =>
          isPointInPolygon(
            { lat: venue.latitude, lng: venue.longitude },
            polygonPoints
          )
        )
        .map((v) => v.id);
      onSelectionChange(selectedIds);
    }
  }, [mode, center, radiusMiles, polygon, venues, onSelectionChange]);

  // Handle venue click in individual mode
  const handleVenueClick = useCallback(
    (venueId: string) => {
      if (mode === 'individual') {
        const isCurrentlySelected = selectedVenueIds.includes(venueId);
        const newSelection = isCurrentlySelected
          ? selectedVenueIds.filter((id) => id !== venueId)
          : [...selectedVenueIds, venueId];
        onSelectionChange(newSelection);
      }
    },
    [mode, selectedVenueIds, onSelectionChange]
  );

  // Handle polygon point added
  const handlePolygonPointAdded = useCallback(
    (point: [number, number]) => {
      if (onPolygonChange) {
        onPolygonChange([...polygon, point]);
      }
    },
    [polygon, onPolygonChange]
  );

  // Clear polygon
  const handleClearPolygon = useCallback(() => {
    if (onPolygonChange) {
      onPolygonChange([]);
    }
  }, [onPolygonChange]);

  // Map center
  const mapCenter: [number, number] = useMemo(() => {
    if (center) return [center.lat, center.lng];
    if (venues.length > 0) {
      const avgLat = venues.reduce((sum, v) => sum + v.latitude, 0) / venues.length;
      const avgLng = venues.reduce((sum, v) => sum + v.longitude, 0) / venues.length;
      return [avgLat, avgLng];
    }
    return [53.5, -2.5]; // Northern England
  }, [center, venues]);

  const selectedCount = selectedVenueIds.length;

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex items-center gap-4 p-4 bg-background border-b">
        <div className="flex gap-2">
          <Button
            variant={mode === 'radius' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('radius')}
            data-active={mode === 'radius'}
          >
            Radius
          </Button>
          <Button
            variant={mode === 'polygon' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('polygon')}
            data-active={mode === 'polygon'}
          >
            Draw
          </Button>
          <Button
            variant={mode === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('individual')}
            data-active={mode === 'individual'}
          >
            Individual
          </Button>
        </div>

        {mode === 'radius' && (
          <div className="flex items-center gap-4 flex-1">
            <Input
              placeholder="Postcode"
              value={localPostcode}
              onChange={(e) => {
                setLocalPostcode(e.target.value);
                onPostcodeChange?.(e.target.value);
              }}
              className="w-32"
            />
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {localRadius} mi
              </span>
              <Slider
                value={[localRadius]}
                onValueChange={([value]) => {
                  setLocalRadius(value);
                  onRadiusChange?.(value);
                }}
                min={1}
                max={50}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {mode === 'polygon' && (
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm text-muted-foreground">
              Click to add points ({polygon.length} points)
            </span>
            {polygon.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearPolygon}>
                Clear
              </Button>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {selectedCount} venues selected
        </div>
      </div>

      {postcodeError && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          {postcodeError}
        </div>
      )}

      <div className="flex-1 min-h-[400px]">
        <MapContainer
          center={mapCenter}
          zoom={9}
          style={{ width: '100%', height: '100%' }}
          data-testid="map-container"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <MapDragController enabled={mode === 'polygon'} />
          <MapCenterer center={center ? [center.lat, center.lng] : null} />
          <PolygonDrawer onPointAdded={handlePolygonPointAdded} enabled={mode === 'polygon'} />

          {mode === 'radius' && center && (
            <Circle
              center={[center.lat, center.lng]}
              radius={milesToMeters(radiusMiles)}
              pathOptions={{ color: '#06B6D4', fillColor: '#06B6D4', fillOpacity: 0.1, weight: 2 }}
            />
          )}

          {mode === 'polygon' && polygon.length >= 3 && (
            <Polygon
              positions={polygon}
              pathOptions={{ color: '#06B6D4', fillColor: '#06B6D4', fillOpacity: 0.1, weight: 2 }}
            />
          )}

          {mode === 'polygon' && polygon.map((point, idx) => (
            <Circle
              key={idx}
              center={point}
              radius={100}
              pathOptions={{ color: '#06B6D4', fillColor: '#06B6D4', fillOpacity: 0.8, weight: 2 }}
            />
          ))}

          <VenueMarkerLayer
            venues={venues}
            selectedVenueIds={selectedVenueIds}
            mode={mode}
            onVenueClick={handleVenueClick}
          />
        </MapContainer>
      </div>
    </div>
  );
}
