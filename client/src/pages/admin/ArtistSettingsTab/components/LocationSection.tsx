import { Label } from '@/components/ui/label';
import LocationAutocomplete from '@/components/ui/location-autocomplete';

interface LocationSectionProps {
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  onChange: (location: string, lat: number | null, lng: number | null) => void;
}

export default function LocationSection({
  location,
  locationLat,
  locationLng,
  onChange
}: LocationSectionProps) {
  return (
    <div>
      <Label className="text-card-foreground font-semibold mb-3 block">Location</Label>
      <LocationAutocomplete
        value={location}
        onChange={onChange}
        placeholder="e.g., Stoke-on-Trent, Manchester, London"
      />
      {locationLat && locationLng && (
        <p className="text-xs text-muted-foreground mt-1">
          Coordinates: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
