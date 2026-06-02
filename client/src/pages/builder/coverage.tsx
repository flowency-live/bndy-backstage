import { useState, useEffect, useCallback, useRef } from 'react';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { CARTO_VOYAGER_TILES } from '../venues/map/config/tileProviders';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = 'https://api.bndy.co.uk';
const MILES_TO_METERS = 1609.34;

interface PostcodeResult {
  lat: number;
  lng: number;
}

// Component to handle map view updates
function MapUpdater({ center, radius }: { center: [number, number]; radius: number }) {
  const map = useMap();

  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, calculateZoomForRadius(radius));
    }
  }, [map, center, radius]);

  return null;
}

// Calculate appropriate zoom level for radius
function calculateZoomForRadius(radiusMiles: number): number {
  if (radiusMiles <= 5) return 11;
  if (radiusMiles <= 10) return 10;
  if (radiusMiles <= 20) return 9;
  if (radiusMiles <= 35) return 8;
  return 7;
}

// Validate UK postcode format
function isValidPostcodeFormat(postcode: string): boolean {
  const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim());
}

// Lookup postcode via postcodes.io
async function lookupPostcode(postcode: string): Promise<PostcodeResult | null> {
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`);
    const data = await response.json();

    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function BuilderCoverage() {
  const { currentBuilder, isLoading, refresh } = useBuilder();
  const { toast } = useToast();

  const [postcode, setPostcode] = useState('');
  const [radius, setRadius] = useState(15);
  const [center, setCenter] = useState<[number, number]>([53.154, -2.217]); // Default to Congleton area
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [errors, setErrors] = useState<{ postcode?: string; radius?: string }>({});

  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync form with current builder
  useEffect(() => {
    if (currentBuilder?.coverage.type === 'postcode_radius') {
      setPostcode(currentBuilder.coverage.postcode);
      setRadius(currentBuilder.coverage.radius);

      // Look up the initial postcode to get center
      lookupPostcode(currentBuilder.coverage.postcode).then((result) => {
        if (result) {
          setCenter([result.lat, result.lng]);
        }
      });
    }
  }, [currentBuilder]);

  // Debounced postcode lookup
  const handlePostcodeChange = useCallback((value: string) => {
    setPostcode(value);
    setErrors((prev) => ({ ...prev, postcode: undefined }));

    // Clear previous timeout
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    // Only lookup if format is valid
    if (isValidPostcodeFormat(value)) {
      lookupTimeoutRef.current = setTimeout(async () => {
        setIsLookingUp(true);
        const result = await lookupPostcode(value);
        setIsLookingUp(false);

        if (result) {
          setCenter([result.lat, result.lng]);
        }
      }, 500);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBuilder) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Builder Selected</CardTitle>
            <CardDescription>
              Select a builder from the persona selector to edit coverage.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const validate = async (): Promise<boolean> => {
    const newErrors: { postcode?: string; radius?: string } = {};

    // Validate postcode
    if (!postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    } else if (!isValidPostcodeFormat(postcode)) {
      newErrors.postcode = 'Invalid postcode format';
    } else {
      // Check if postcode exists
      const result = await lookupPostcode(postcode);
      if (!result) {
        newErrors.postcode = 'Postcode not found';
      }
    }

    // Validate radius
    if (radius < 5) {
      newErrors.radius = 'Minimum radius is 5 miles';
    } else if (radius > 50) {
      newErrors.radius = 'Maximum radius is 50 miles';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validate();
    if (!isValid) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/builders/${currentBuilder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          coverage: {
            type: 'postcode_radius',
            postcode: postcode.trim().toUpperCase(),
            radius,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update coverage');
      }

      toast({
        title: 'Coverage saved',
        description: 'Your coverage area has been updated.',
      });

      // Refresh the builder context to get updated data
      await refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save coverage',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const radiusInMeters = radius * MILES_TO_METERS;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Coverage Area</h1>
        <p className="text-muted-foreground">
          Define the geographic area your site covers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <div>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Postcode &amp; Radius
                </CardTitle>
                <CardDescription>
                  Enter a central postcode and set the radius in miles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <div className="relative">
                    <Input
                      id="postcode"
                      value={postcode}
                      onChange={(e) => handlePostcodeChange(e.target.value)}
                      placeholder="e.g., CW12 1AB"
                      className="uppercase"
                      aria-invalid={!!errors.postcode}
                    />
                    {isLookingUp && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {errors.postcode && (
                    <p className="text-sm text-destructive">{errors.postcode}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This will be the center of your coverage area.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="radius">Radius</Label>
                    <span className="text-sm font-medium">{radius} miles</span>
                  </div>
                  <Slider
                    id="radius"
                    value={[radius]}
                    onValueChange={([value]) => {
                      setRadius(value);
                      setErrors((prev) => ({ ...prev, radius: undefined }));
                    }}
                    min={5}
                    max={50}
                    step={1}
                    aria-label="Radius"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 miles</span>
                    <span>50 miles</span>
                  </div>
                  {errors.radius && (
                    <p className="text-sm text-destructive">{errors.radius}</p>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Coverage Summary</h4>
                  <dl className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Center</dt>
                      <dd className="font-mono">{postcode.toUpperCase() || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Radius</dt>
                      <dd>{radius} miles ({Math.round(radiusInMeters / 1000)} km)</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Approximate area</dt>
                      <dd>{Math.round(Math.PI * radius * radius)} sq miles</dd>
                    </div>
                  </dl>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Map Section */}
        <div className="lg:sticky lg:top-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Coverage Preview</CardTitle>
              <CardDescription>
                The shaded area shows your coverage region.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] rounded-lg overflow-hidden">
                <MapContainer
                  center={center}
                  zoom={calculateZoomForRadius(radius)}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    url={CARTO_VOYAGER_TILES.url}
                    attribution={CARTO_VOYAGER_TILES.attribution}
                    maxZoom={CARTO_VOYAGER_TILES.maxZoom}
                    subdomains={CARTO_VOYAGER_TILES.subdomains as string[]}
                  />
                  <Circle
                    center={center}
                    radius={radiusInMeters}
                    pathOptions={{
                      color: currentBuilder.theme.primaryColor,
                      fillColor: currentBuilder.theme.primaryColor,
                      fillOpacity: 0.2,
                      weight: 2,
                    }}
                  />
                  <MapUpdater center={center} radius={radius} />
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
