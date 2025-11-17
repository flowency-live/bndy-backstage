// Venue CRM - Manage venue relationships and contacts
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";
import { MapPin, Plus, Building, Search, Map, List, FileText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ArtistMembership } from "@/types/api";
import { venueCRMService } from "@/lib/services/venue-crm-service";
import type { ArtistVenue } from "@/lib/services/venue-crm-service";
import AddVenueModal from "./venues/components/AddVenueModal";
import VenueMapView from "./venues/components/VenueMapView";
import "./venues/map/map-styles.css";

interface VenuesProps {
  artistId: string;
  membership: ArtistMembership;
}

type SortOption = 'name-asc' | 'name-desc' | 'gigs-desc' | 'contacts-desc' | 'recent';
type GigFilter = 'all' | 'with-gigs' | 'without-gigs';
type StatusFilter = 'all' | 'managed' | 'unmanaged';

// Helper function to get sortable name by removing "The" prefix
const getSortableName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith('the ')) {
    return trimmed.substring(4);
  }
  return trimmed;
};

export default function Venues({ artistId, membership }: VenuesProps) {
  const { session } = useServerAuth();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [gigFilter, setGigFilter] = useState<GigFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fetch venues for this artist
  const { data: venues = [], isLoading } = useQuery<ArtistVenue[]>({
    queryKey: ['artist-venues', artistId],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }
      return venueCRMService.getArtistVenues(artistId);
    },
    enabled: !!session && !!artistId,
  });

  // Filter and sort venues
  const filteredAndSortedVenues = useMemo(() => {
    let result = [...venues];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(venue => {
        const customName = venue.custom_venue_name?.toLowerCase() || '';
        const officialName = venue.venue.name.toLowerCase();
        const address = venue.venue.address?.toLowerCase() || '';
        const city = venue.venue.city?.toLowerCase() || '';
        return customName.includes(query) ||
               officialName.includes(query) ||
               address.includes(query) ||
               city.includes(query);
      });
    }

    // Gig filter
    if (gigFilter === 'with-gigs') {
      result = result.filter(venue => venue.gigCount > 0);
    } else if (gigFilter === 'without-gigs') {
      result = result.filter(venue => venue.gigCount === 0);
    }

    // Status filter
    if (statusFilter === 'managed') {
      result = result.filter(venue => venue.managed_on_bndy);
    } else if (statusFilter === 'unmanaged') {
      result = result.filter(venue => !venue.managed_on_bndy);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return getSortableName(a.custom_venue_name || a.venue.name).localeCompare(
            getSortableName(b.custom_venue_name || b.venue.name)
          );
        case 'name-desc':
          return getSortableName(b.custom_venue_name || b.venue.name).localeCompare(
            getSortableName(a.custom_venue_name || a.venue.name)
          );
        case 'gigs-desc':
          return b.gigCount - a.gigCount;
        case 'contacts-desc':
          return b.contactCount - a.contactCount;
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [venues, searchQuery, sortBy, gigFilter, statusFilter]);

  // Group venues alphabetically
  const groupedVenues = useMemo(() => {
    const groups: Record<string, ArtistVenue[]> = {};

    filteredAndSortedVenues.forEach(venue => {
      const name = venue.custom_venue_name || venue.venue.name;
      const sortableName = getSortableName(name);
      const firstChar = sortableName.charAt(0).toUpperCase();
      const groupKey = /[A-Z]/.test(firstChar) ? firstChar : '#';

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(venue);
    });

    // Convert to sorted array
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }, [filteredAndSortedVenues]);

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  return (
    <PageContainer variant="default">
      <PageHeader
        title="Venues"
        showTitleOnMobile={true}
        actions={
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              size="sm"
            >
              <List className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setViewMode('map')}
              size="sm"
            >
              <Map className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Map</span>
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowAddModal(true)}
              size="sm"
              data-testid="button-add-venue"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Venue</span>
            </Button>
          </div>
        }
        filters={
          venues.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={gigFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGigFilter('all')}
              >
                All Venues
              </Button>
              <Button
                variant={gigFilter === 'with-gigs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGigFilter('with-gigs')}
              >
                With Gigs
              </Button>
              <Button
                variant={gigFilter === 'without-gigs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGigFilter('without-gigs')}
              >
                No Gigs Yet
              </Button>
            </div>
          ) : undefined
        }
        search={
          venues.length > 0 ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search venues by name, city, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          ) : undefined
        }
      />

      {/* Map View */}
      {viewMode === 'map' ? (
        <VenueMapView artistId={artistId} />
      ) : (
        <>
          {/* Active Filter Count */}
          {venues.length > 0 && (searchQuery || gigFilter !== 'all') && (
            <div className="flex items-center justify-between text-sm mb-6">
              <p className="text-muted-foreground">
                Showing {filteredAndSortedVenues.length} of {venues.length} venues
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setGigFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Add Venue Modal */}
          <AddVenueModal
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            artistId={artistId}
          />

          {/* Venues List */}
          {venues.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="No venues yet"
              description="Start building your venue network by adding your first venue"
              action={
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Venue
                </Button>
              }
            />
          ) : filteredAndSortedVenues.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="No venues found"
              description="Try adjusting your search or filters"
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setGigFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {groupedVenues.map(([letter, venues]) => (
                <div key={letter} className="space-y-1.5 sm:space-y-2">
                  {/* Letter Header */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg font-bold text-primary">{letter}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
                    </span>
                  </div>

                  {/* Compact Venue Cards */}
                  <div className="space-y-1.5">
                    {venues.map((venue) => {
                      // Determine border color based on venue status
                      const getBorderColor = () => {
                        if (venue.gigCount > 0) return 'border-cyan-500/60 hover:border-cyan-500';
                        if (venue.noteCount > 0) return 'border-yellow-500/60 hover:border-yellow-500';
                        return 'border-border hover:border-primary/50';
                      };

                      return (
                      <div
                        key={venue.id}
                        className={`bg-card border-2 rounded-lg cursor-pointer hover:shadow-sm transition-all duration-200 group overflow-hidden ${getBorderColor()}`}
                        onClick={() => setLocation(`/venues/${venue.venue_id}`)}
                        data-testid={`venue-card-${venue.id}`}
                      >
                        <div className="px-2.5 sm:px-3 py-2 flex items-center gap-2 sm:gap-3">
                          {/* Icon */}
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors flex-shrink-0">
                            <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>

                          {/* Venue Info */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                              <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                {venue.custom_venue_name || venue.venue.name}
                              </h3>
                              {venue.managed_on_bndy && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 flex-shrink-0 whitespace-nowrap">
                                  Managed
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                              <span className="truncate">
                                {venue.venue.city ? `${venue.venue.city}` : venue.venue.address}
                              </span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className="text-center min-w-[28px] sm:min-w-[32px]">
                              <div className="font-bold text-xs sm:text-sm text-foreground leading-none">{venue.gigCount}</div>
                              <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5">gigs</div>
                            </div>
                            <div className="text-center min-w-[28px] sm:min-w-[32px]">
                              <div className="font-bold text-xs sm:text-sm text-foreground leading-none">{venue.contactCount}</div>
                              <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5">contacts</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
