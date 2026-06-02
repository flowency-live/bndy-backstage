import { useState, useEffect, useMemo } from 'react';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Check, X } from 'lucide-react';

const API_BASE_URL = 'https://api.bndy.co.uk';

interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface BuilderVenue {
  id: string;
  builder_id: string;
  venue_id: string;
  selection: 'auto' | 'manual' | 'excluded';
  featured: boolean;
  created_at: string;
}

type FilterMode = 'all' | 'included' | 'excluded';

export default function BuilderVenues() {
  const { currentBuilder, isLoading: builderLoading } = useBuilder();
  const { toast } = useToast();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [builderVenues, setBuilderVenues] = useState<BuilderVenue[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [updatingVenueId, setUpdatingVenueId] = useState<string | null>(null);

  // Fetch venues in coverage area and builder venue selections
  useEffect(() => {
    if (!currentBuilder) return;

    const fetchData = async () => {
      setIsLoadingVenues(true);
      try {
        // Fetch venues in coverage area
        const venuesResponse = await fetch(
          `${API_BASE_URL}/api/venues-in-coverage?` +
          `postcode=${encodeURIComponent(currentBuilder.coverage.postcode)}&` +
          `radius=${currentBuilder.coverage.radius}`,
          { credentials: 'include' }
        );
        const venuesData = await venuesResponse.json();
        setVenues(venuesData.venues || []);

        // Fetch builder venue selections
        const selectionsResponse = await fetch(
          `${API_BASE_URL}/api/builders/${currentBuilder.id}/venues`,
          { credentials: 'include' }
        );
        const selectionsData = await selectionsResponse.json();
        setBuilderVenues(selectionsData.venues || []);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load venues',
        });
      } finally {
        setIsLoadingVenues(false);
      }
    };

    fetchData();
  }, [currentBuilder, toast]);

  // Get selection status for a venue
  const getVenueSelection = (venueId: string): 'auto' | 'manual' | 'excluded' => {
    const builderVenue = builderVenues.find(bv => bv.venue_id === venueId);
    return builderVenue?.selection || 'auto';
  };

  // Check if venue is included (auto or manual) or excluded
  const isVenueIncluded = (venueId: string): boolean => {
    const selection = getVenueSelection(venueId);
    return selection !== 'excluded';
  };

  // Toggle venue selection
  const toggleVenueSelection = async (venueId: string, newSelection: 'auto' | 'excluded') => {
    if (!currentBuilder) return;

    setUpdatingVenueId(venueId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/builders/${currentBuilder.id}/venues/${venueId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ selection: newSelection }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update venue');
      }

      const data = await response.json();

      // Update local state
      setBuilderVenues(prev => {
        const existing = prev.find(bv => bv.venue_id === venueId);
        if (existing) {
          return prev.map(bv =>
            bv.venue_id === venueId
              ? { ...bv, selection: newSelection }
              : bv
          );
        } else {
          return [...prev, data.venue];
        }
      });

      toast({
        title: newSelection === 'excluded' ? 'Venue excluded' : 'Venue included',
        description: `Venue has been ${newSelection === 'excluded' ? 'excluded from' : 'included in'} your site.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update venue',
      });
    } finally {
      setUpdatingVenueId(null);
    }
  };

  // Calculate counts
  const counts = useMemo(() => {
    const included = venues.filter(v => isVenueIncluded(v.id)).length;
    const excluded = venues.filter(v => !isVenueIncluded(v.id)).length;
    return { total: venues.length, included, excluded };
  }, [venues, builderVenues]);

  // Filter venues based on current filter mode
  const filteredVenues = useMemo(() => {
    switch (filterMode) {
      case 'included':
        return venues.filter(v => isVenueIncluded(v.id));
      case 'excluded':
        return venues.filter(v => !isVenueIncluded(v.id));
      default:
        return venues;
    }
  }, [venues, builderVenues, filterMode]);

  if (builderLoading) {
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
              Select a builder from the persona selector to manage venues.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Venues</h1>
        <p className="text-muted-foreground">
          Manage which venues appear on your site.
        </p>
      </div>

      {/* Stats bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="font-semibold text-lg">{counts.total}</span>
                <span className="text-muted-foreground ml-1">venues in coverage area</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="text-sm text-green-600">
                <span className="font-semibold">{counts.included}</span>
                <span className="ml-1">included</span>
              </div>
              <div className="text-sm text-red-600">
                <span className="font-semibold">{counts.excluded}</span>
                <span className="ml-1">excluded</span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('all')}
              >
                All
              </Button>
              <Button
                variant={filterMode === 'included' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('included')}
                aria-label="Show included venues"
              >
                Included
              </Button>
              <Button
                variant={filterMode === 'excluded' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('excluded')}
                aria-label="Show excluded venues"
              >
                Excluded
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Venues list */}
      {isLoadingVenues ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading venues...</span>
        </div>
      ) : filteredVenues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filterMode === 'all'
                ? 'No venues found in your coverage area.'
                : `No ${filterMode} venues.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVenues.map(venue => {
            const included = isVenueIncluded(venue.id);
            const isUpdating = updatingVenueId === venue.id;

            return (
              <Card
                key={venue.id}
                data-testid={`venue-card-${venue.id}`}
                className={included ? '' : 'opacity-60'}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{venue.name}</CardTitle>
                    <Badge variant={included ? 'default' : 'secondary'}>
                      {included ? 'Included' : 'Excluded'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {venue.address && <div>{venue.address}</div>}
                    {venue.city && <div>{venue.city}</div>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {included ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVenueSelection(venue.id, 'excluded')}
                        disabled={isUpdating}
                        aria-label="Exclude venue"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Exclude
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => toggleVenueSelection(venue.id, 'auto')}
                        disabled={isUpdating}
                        aria-label="Include venue"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Include
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
