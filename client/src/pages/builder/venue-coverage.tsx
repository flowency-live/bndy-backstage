import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import VenueCoverageMap, { type SelectionMode, type Venue } from '@/components/builder/VenueCoverageMap';

const API_BASE_URL = 'https://api.bndy.co.uk';

interface BuilderVenue {
  id: string;
  builder_id: string;
  venue_id: string;
  selection: 'auto' | 'manual' | 'excluded';
}

export default function VenueCoverage() {
  const { currentBuilder, isLoading: builderLoading } = useBuilder();
  const { toast } = useToast();

  // Local state
  const [mode, setMode] = useState<SelectionMode>('radius');
  const [postcode, setPostcode] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [polygon, setPolygon] = useState<[number, number][]>([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>([]);

  // Fetch all venues
  const {
    data: venues = [],
    isLoading: venuesLoading,
    error: venuesError,
  } = useQuery<Venue[]>({
    queryKey: ['all-venues'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/venues`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch venues');
      const data = await response.json();
      return data.venues || [];
    },
    enabled: !!currentBuilder,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch builder's venue selections
  const {
    data: builderVenues = [],
    isLoading: builderVenuesLoading,
  } = useQuery<BuilderVenue[]>({
    queryKey: ['builder-venues', currentBuilder?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/builders/${currentBuilder!.id}/venues`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch builder venues');
      const data = await response.json();
      return data.venues || [];
    },
    enabled: !!currentBuilder,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize state from builder coverage settings and selections
  useEffect(() => {
    if (currentBuilder?.coverage) {
      setPostcode(currentBuilder.coverage.postcode || '');
      setRadiusMiles(currentBuilder.coverage.radius || 10);
    }
  }, [currentBuilder]);

  // Initialize selected venues from builder venues
  useEffect(() => {
    if (builderVenues.length > 0) {
      const selectedIds = builderVenues
        .filter((bv) => bv.selection !== 'excluded')
        .map((bv) => bv.venue_id);
      setSelectedVenueIds(selectedIds);
      setInitialSelectedIds(selectedIds);
    }
  }, [builderVenues]);

  // Show error toast for venues fetch failure
  useEffect(() => {
    if (venuesError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load venues',
      });
    }
  }, [venuesError, toast]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentBuilder) return;

    setIsSaving(true);
    try {
      const venueSelections = selectedVenueIds.map((id) => ({
        venue_id: id,
        selection: 'auto',
      }));

      const response = await fetch(
        `${API_BASE_URL}/api/builders/${currentBuilder.id}/venues/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ venues: venueSelections }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save venue selection');
      }

      toast({
        title: 'Venues updated',
        description: 'Your venue coverage has been saved.',
      });
      setInitialSelectedIds(selectedVenueIds);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentBuilder, selectedVenueIds, toast]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    // Reset to initial state
    setMode('radius');
    if (currentBuilder?.coverage) {
      setPostcode(currentBuilder.coverage.postcode || '');
      setRadiusMiles(currentBuilder.coverage.radius || 10);
    }
    setPolygon([]);
    setSelectedVenueIds(initialSelectedIds);
  }, [currentBuilder, initialSelectedIds]);

  // Loading state
  if (builderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No builder selected
  if (!currentBuilder) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Builder Selected</CardTitle>
            <CardDescription>
              Select a builder from the persona selector to manage venue coverage.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isLoading = venuesLoading || builderVenuesLoading;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Venue Coverage</h1>
          <p className="text-muted-foreground">
            Select which venues appear on your public site.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading venues...</span>
        </div>
      )}

      {/* Map */}
      {!isLoading && (
        <Card>
          <CardContent className="p-0">
            <div className="h-[600px]">
              <VenueCoverageMap
                venues={venues}
                selectedVenueIds={selectedVenueIds}
                onSelectionChange={setSelectedVenueIds}
                mode={mode}
                onModeChange={setMode}
                postcode={postcode}
                radiusMiles={radiusMiles}
                polygon={polygon}
                onPostcodeChange={setPostcode}
                onRadiusChange={setRadiusMiles}
                onPolygonChange={setPolygon}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
