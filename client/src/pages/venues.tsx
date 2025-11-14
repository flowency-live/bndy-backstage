// Venue CRM - Manage venue relationships and contacts
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Phone, Building, Search, Map, List } from "lucide-react";
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
          return (a.custom_venue_name || a.venue.name).localeCompare(
            b.custom_venue_name || b.venue.name
          );
        case 'name-desc':
          return (b.custom_venue_name || b.venue.name).localeCompare(
            a.custom_venue_name || a.venue.name
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
      const firstChar = name.charAt(0).toUpperCase();
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
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-6 pb-2 sm:pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="hidden sm:block">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Venues</h1>
              <p className="text-muted-foreground">
                Manage your venue relationships and contacts
              </p>
            </div>
            <h1 className="sm:hidden text-xl font-serif font-bold text-foreground">Venues</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <List className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                onClick={() => setViewMode('map')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Map className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Map</span>
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none"
                onClick={() => setShowAddModal(true)}
                size="sm"
                data-testid="button-add-venue"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Venue</span>
              </Button>
            </div>
          </div>

          {/* Map View */}
          {viewMode === 'map' ? (
            <VenueMapView artistId={artistId} />
          ) : (
            <>
              {/* Search and Filters */}
              {venues.length > 0 && (
            <div className="space-y-4 mb-6">
              {/* Search Bar */}
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

              {/* Filters and Sort */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                {/* Gig Filter Pills */}
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

                <div className="hidden sm:block sm:ml-auto" />

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="gigs-desc">Most Gigs</SelectItem>
                    <SelectItem value="contacts-desc">Most Contacts</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filter Count */}
              {(searchQuery || gigFilter !== 'all') && (
                <div className="flex items-center justify-between text-sm">
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
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No venues yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start building your venue network by adding your first venue
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Venue
                </Button>
              </CardContent>
            </Card>
          ) : filteredAndSortedVenues.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No venues found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or filters
                </p>
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
              </CardContent>
            </Card>
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
                    {venues.map((venue) => (
                      <div
                        key={venue.id}
                        className="bg-card border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all duration-200 group overflow-hidden"
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
