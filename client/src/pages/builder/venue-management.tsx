import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import VenueManagementTable, {
  type BuilderVenueWithDetails,
  type SortField,
  type SortOrder,
} from '@/components/builder/VenueManagementTable';
import VenueDetailsModal from '@/components/builder/VenueDetailsModal';

const API_BASE_URL = 'https://api.bndy.co.uk';

export default function VenueManagement() {
  const { currentBuilder, isLoading: builderLoading } = useBuilder();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sorting state
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Modal state
  const [selectedVenue, setSelectedVenue] = useState<BuilderVenueWithDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch builder venues with extended data
  const {
    data: venues = [],
    isLoading: venuesLoading,
    error: venuesError,
  } = useQuery<BuilderVenueWithDetails[]>({
    queryKey: ['builder-venues-extended', currentBuilder?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/builders/${currentBuilder!.id}/venues`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch venues');
      const data = await response.json();
      return data.venues || [];
    },
    enabled: !!currentBuilder,
    staleTime: 5 * 60 * 1000,
  });

  // Show error toast
  useEffect(() => {
    if (venuesError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load venues',
      });
    }
  }, [venuesError, toast]);

  // Sort venues
  const sortedVenues = useMemo(() => {
    return [...venues].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;

      switch (sortBy) {
        case 'name':
          aVal = a.venue.name.toLowerCase();
          bVal = b.venue.name.toLowerCase();
          break;
        case 'event_count':
          aVal = a.event_count;
          bVal = b.event_count;
          break;
        case 'last_event_date':
          aVal = a.last_event_date || '';
          bVal = b.last_event_date || '';
          break;
        case 'standard_fee':
          aVal = a.standard_fee || '';
          bVal = b.standard_fee || '';
          break;
        case 'payment_terms':
          aVal = a.payment_terms || '';
          bVal = b.payment_terms || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [venues, sortBy, sortOrder]);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  // Handle venue click
  const handleVenueClick = useCallback((venue: BuilderVenueWithDetails) => {
    setSelectedVenue(venue);
  }, []);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  // Handle save venue
  const handleSaveVenue = useCallback(
    async (data: Partial<BuilderVenueWithDetails>) => {
      if (!currentBuilder || !selectedVenue) return;

      setIsSaving(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/builders/${currentBuilder.id}/venues/${selectedVenue.venue_id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to update venue');
        }

        toast({
          title: 'Venue updated',
          description: 'Changes have been saved.',
        });

        // Refresh data
        queryClient.invalidateQueries({
          queryKey: ['builder-venues-extended', currentBuilder.id],
        });

        setSelectedVenue(null);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [currentBuilder, selectedVenue, toast, queryClient]
  );

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
              Select a builder from the persona selector to manage venues.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Venue Management</h1>
        <p className="text-muted-foreground">
          Manage your relationships with {venues.length} venues.
        </p>
      </div>

      {/* Loading state */}
      {venuesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading venues...</span>
        </div>
      )}

      {/* Empty state */}
      {!venuesLoading && venues.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No venues selected. Go to Venue Coverage to select venues.
            </p>
            <Link
              href="/builder/venue-coverage"
              className="text-primary hover:underline"
            >
              Go to Venue Coverage
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Venue table */}
      {!venuesLoading && venues.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <VenueManagementTable
              venues={sortedVenues}
              onVenueClick={handleVenueClick}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </CardContent>
        </Card>
      )}

      {/* Venue details modal */}
      {selectedVenue && (
        <VenueDetailsModal
          venue={selectedVenue}
          isOpen={true}
          onClose={handleCloseModal}
          onSave={handleSaveVenue}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
