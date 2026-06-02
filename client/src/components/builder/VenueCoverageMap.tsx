import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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

// Postcode lookup
async function getPostcodeCoordinates(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await response.json();
    if (data.status === 200) {
      return { lat: data.result.latitude, lng: data.result.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

// Create marker icons
const createVenueIcon = (isSelected: boolean): L.DivIcon => {
  const color = isSelected ? '#22c55e' : '#9ca3af';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Polygon drawing component - disables drag when drawing
function PolygonDrawer({
  onPointAdded,
  enabled,
}: {
  onPointAdded: (point: [number, number]) => void;
  enabled: boolean;
}) {
  const map = useMapEvents({
    click(e) {
      if (enabled) {
        onPointAdded([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  // Disable/enable dragging based on mode
  useEffect(() => {
    if (enabled) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
    return () => {
      map.dragging.enable();
    };
  }, [enabled, map]);

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

  // Resolve postcode to coordinates
  useEffect(() => {
    if (mode === 'radius' && postcode) {
      setPostcodeError(null);
      getPostcodeCoordinates(postcode).then((coords) => {
        if (coords) {
          setCenter(coords);
        } else {
          setCenter(null);
          setPostcodeError('Invalid postcode');
        }
      });
    } else if (mode !== 'radius') {
      setCenter(null);
    }
  }, [postcode, mode]);

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

  // Map center defaults to UK
  const mapCenter: [number, number] = useMemo(() => {
    if (center) return [center.lat, center.lng];
    if (venues.length > 0) {
      const avgLat = venues.reduce((sum, v) => sum + v.latitude, 0) / venues.length;
      const avgLng = venues.reduce((sum, v) => sum + v.longitude, 0) / venues.length;
      return [avgLat, avgLng];
    }
    return [54.5, -4.0]; // UK center
  }, [center, venues]);

  const selectedCount = selectedVenueIds.length;

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex items-center gap-4 p-4 bg-background border-b">
        {/* Mode selector */}
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

        {/* Radius controls */}
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

        {/* Polygon controls */}
        {mode === 'polygon' && (
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm text-muted-foreground">
              Click on the map to draw a coverage area
            </span>
            {polygon.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearPolygon}>
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Selected count */}
        <div className="text-sm text-muted-foreground">
          {selectedCount === 1
            ? '1 venue selected'
            : `${selectedCount} venues selected`}
        </div>
      </div>

      {/* Error display */}
      {postcodeError && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          {postcodeError}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-[400px]">
        <MapContainer
          center={mapCenter}
          zoom={8}
          style={{ width: '100%', height: '100%' }}
          data-testid="map-container"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Polygon drawer */}
          <PolygonDrawer
            onPointAdded={handlePolygonPointAdded}
            enabled={mode === 'polygon'}
          />

          {/* Coverage circle */}
          {mode === 'radius' && center && (
            <Circle
              center={[center.lat, center.lng]}
              radius={milesToMeters(radiusMiles)}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
              }}
            />
          )}

          {/* Coverage polygon */}
          {mode === 'polygon' && polygon.length >= 3 && (
            <Polygon
              positions={polygon}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
              }}
            />
          )}

          {/* Venue markers */}
          {venues.map((venue) => {
            const isSelected = selectedVenueIds.includes(venue.id);
            return (
              <Marker
                key={venue.id}
                position={[venue.latitude, venue.longitude]}
                icon={createVenueIcon(isSelected)}
                eventHandlers={{
                  click: () => handleVenueClick(venue.id),
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
