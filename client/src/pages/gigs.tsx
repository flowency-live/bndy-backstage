import { useState, useMemo, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useUser } from "@/lib/user-context";
import { format, isToday, isPast, isFuture, startOfYear, endOfYear, addYears, startOfMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Music, Plus, Map, List, Search, ChevronDown, ChevronRight, LayoutGrid, AlignJustify } from "lucide-react";
import type { Event, ArtistMembership } from "@/types/api";
import { apiRequest } from "@/lib/queryClient";

// Import calendar components for modal
import { CalendarProvider, useCalendarContext } from './calendar/CalendarContext';
import EventDetails from './calendar/modals/EventDetails';
import PublicGigWizard from './calendar/modals/PublicGigWizard';

// Import map view component
import GigsMapView from './gigs/components/GigsMapView';

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

interface GigsProps {
  artistId: string;
  membership: ArtistMembership;
}

function GigsContent({ artistId, membership }: GigsProps) {
  const { session } = useServerAuth();
  const { currentMembership, userProfile } = useUser();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [listViewMode, setListViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('upcoming');
  const [showAddGigWizard, setShowAddGigWizard] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Calendar context for modal handling
  const {
    selectedEvent,
    setSelectedEvent,
    showEventDetails,
    setShowEventDetails,
  } = useCalendarContext();

  // Fetch all gigs (past and future)
  const { data: gigsData, isLoading } = useQuery<{
    artistEvents: Event[];
    userEvents: Event[];
    otherArtistEvents: Event[];
  }>({
    queryKey: ["/api/artists", artistId, "calendar", "all-gigs"],
    queryFn: async () => {
      // Get gigs from start of current year to end of next year
      const today = new Date();
      const startDate = startOfYear(today);
      const endDate = endOfYear(addYears(today, 1));

      const response = await apiRequest(
        "GET",
        `/api/artists/${artistId}/calendar?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      );
      return response.json();
    },
    enabled: !!session && !!artistId,
  });

  // Extract only this artist's gigs
  const allGigs = useMemo(() => {
    return (gigsData?.artistEvents || [])
      .filter((event) => event.type === "gig")
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [gigsData]);

  // Filter gigs based on search and time filter
  const filteredGigs = useMemo(() => {
    let result = [...allGigs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(gig => {
        const title = gig.title?.toLowerCase() || '';
        const venue = gig.venue?.toLowerCase() || '';
        const location = gig.location?.toLowerCase() || '';
        const dateStr = format(new Date(gig.date), 'EEEE do MMMM yyyy').toLowerCase();
        return title.includes(query) || venue.includes(query) || location.includes(query) || dateStr.includes(query);
      });
    }

    // Time filter
    if (timeFilter === 'today') {
      result = result.filter(gig => isToday(new Date(gig.date)));
    } else if (timeFilter === 'upcoming') {
      result = result.filter(gig => isFuture(new Date(gig.date)) || isToday(new Date(gig.date)));
    } else if (timeFilter === 'past') {
      result = result.filter(gig => isPast(new Date(gig.date)) && !isToday(new Date(gig.date)));
    }

    return result;
  }, [allGigs, searchQuery, timeFilter]);

  // Prepare flat list view data (sorted appropriately)
  const flatListGigs = useMemo(() => {
    const todayGigs = filteredGigs.filter((gig) => isToday(new Date(gig.date)));
    const futureGigs = filteredGigs.filter((gig) => isFuture(new Date(gig.date)) && !isToday(new Date(gig.date)));
    const pastGigs = filteredGigs.filter((gig) => isPast(new Date(gig.date)) && !isToday(new Date(gig.date)));

    // Sort future gigs ascending (earliest first)
    const sortedFuture = [...futureGigs].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Sort past gigs descending (most recent first)
    const sortedPast = [...pastGigs].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return {
      today: todayGigs,
      future: sortedFuture,
      past: sortedPast,
    };
  }, [filteredGigs]);

  // Group gigs by month
  const groupedGigs = useMemo(() => {
    const todayGigs = filteredGigs.filter((gig) => isToday(new Date(gig.date)));
    const futureGigs = filteredGigs.filter((gig) => isFuture(new Date(gig.date)) && !isToday(new Date(gig.date)));
    const pastGigs = filteredGigs.filter((gig) => isPast(new Date(gig.date)) && !isToday(new Date(gig.date)));

    // Group future gigs by month
    const futureByMonth: Record<string, Event[]> = {};
    futureGigs.forEach(gig => {
      const monthKey = format(new Date(gig.date), 'yyyy-MM');
      if (!futureByMonth[monthKey]) {
        futureByMonth[monthKey] = [];
      }
      futureByMonth[monthKey].push(gig);
    });

    // Sort future gigs within each month by date ascending (earliest first)
    Object.keys(futureByMonth).forEach(monthKey => {
      futureByMonth[monthKey].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    });

    // Group past gigs by month
    const pastByMonth: Record<string, Event[]> = {};
    pastGigs.forEach(gig => {
      const monthKey = format(new Date(gig.date), 'yyyy-MM');
      if (!pastByMonth[monthKey]) {
        pastByMonth[monthKey] = [];
      }
      pastByMonth[monthKey].push(gig);
    });

    // Sort past gigs within each month by date descending (most recent first)
    Object.keys(pastByMonth).forEach(monthKey => {
      pastByMonth[monthKey].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    });

    return {
      today: todayGigs,
      futureByMonth: Object.entries(futureByMonth).sort(([a], [b]) => a.localeCompare(b)),
      pastByMonth: Object.entries(pastByMonth).sort(([a], [b]) => b.localeCompare(a)),
    };
  }, [filteredGigs]);

  // Auto-expand the first future month
  useEffect(() => {
    if (groupedGigs.futureByMonth.length > 0) {
      const firstMonthKey = groupedGigs.futureByMonth[0][0];
      setExpandedMonths(prev => {
        if (!prev.has(firstMonthKey)) {
          const newSet = new Set(prev);
          newSet.add(firstMonthKey);
          return newSet;
        }
        return prev;
      });
    }
  }, [groupedGigs.futureByMonth]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const handleGigClick = (gig: Event) => {
    setSelectedEvent(gig);
    setShowEventDetails(true);
  };

  const handleEditEvent = () => {
    // EventDetails modal will handle edit via PublicGigWizard
    setShowEventDetails(false);
  };

  const handleDeleteEvent = async () => {
    // EventDetails modal handles delete
    setShowEventDetails(false);
  };

  const canEditEvent = (event: Event) => {
    // For unavailability events, only the owner can edit
    if (event.type === 'unavailable') {
      return event.ownerUserId === session?.user?.cognitoId || 
             event.membershipId === currentMembership?.membership_id;
    }

    // For artist events, any member of the artist can edit if the event belongs to that artist
    if (event.artistId && artistId && event.artistId === artistId) {
      return !!currentMembership; // User is a member of the artist
    }

    // For personal events without artist context, allow editing
    if (!event.artistId) {
      return true;
    }

    // Default: no permission
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gigs"
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
            {viewMode === 'list' && (
              <div className="flex bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setListViewMode('grouped')}
                  className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
                    listViewMode === 'grouped'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grouped by month"
                >
                  <LayoutGrid className="h-4 w-4 inline sm:mr-1" />
                  <span className="hidden sm:inline">Grouped</span>
                </button>
                <button
                  onClick={() => setListViewMode('flat')}
                  className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
                    listViewMode === 'flat'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Flat list"
                >
                  <AlignJustify className="h-4 w-4 inline sm:mr-1" />
                  <span className="hidden sm:inline">Flat</span>
                </button>
              </div>
            )}
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowAddGigWizard(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Gig</span>
            </Button>
          </div>
        }
        filters={
          allGigs.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={timeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('all')}
              >
                All Gigs
              </Button>
              <Button
                variant={timeFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('today')}
              >
                Today
              </Button>
              <Button
                variant={timeFilter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('upcoming')}
              >
                Upcoming
              </Button>
              <Button
                variant={timeFilter === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('past')}
              >
                Past Gigs
              </Button>
            </div>
          ) : undefined
        }
        search={
          allGigs.length > 0 ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search gigs by venue, title, or date..."
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
        <GigsMapView artistId={artistId} gigs={filteredGigs} onGigClick={handleGigClick} />
      ) : (
        <>
          {/* Active Filter Count */}
          {allGigs.length > 0 && (searchQuery || timeFilter !== 'upcoming') && (
            <div className="flex items-center justify-between text-sm mb-6">
              <p className="text-muted-foreground">
                Showing {filteredGigs.length} of {allGigs.length} gigs
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTimeFilter('upcoming');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Gigs List */}
          {allGigs.length === 0 ? (
            <EmptyState
              icon={<Music className="h-12 w-12" />}
              title="No gigs yet"
              description="Add your first gig to get started"
              action={
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowAddGigWizard(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Gig
                </Button>
              }
            />
          ) : filteredGigs.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="No gigs found"
              description="Try adjusting your search or filters"
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setTimeFilter('upcoming');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : listViewMode === 'flat' ? (
            <div className="space-y-6">
              {/* Today's Gigs */}
              {flatListGigs.today.length > 0 && (
                <div>
                  <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-orange-500">🎸</span> Today
                  </h2>
                  <div className="space-y-3">
                    {flatListGigs.today.map((gig) => (
                      <GigCard key={gig.id} gig={gig} highlighted onClick={() => handleGigClick(gig)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Future Gigs - Flat List */}
              {flatListGigs.future.length > 0 && (
                <div>
                  <h2 className="text-xl font-serif font-bold text-foreground mb-4">
                    Upcoming
                  </h2>
                  <div className="space-y-3">
                    {flatListGigs.future.map((gig) => (
                      <GigCard key={gig.id} gig={gig} onClick={() => handleGigClick(gig)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Gigs - Flat List */}
              {flatListGigs.past.length > 0 && (
                <div>
                  <h2 className="text-xl font-serif font-bold text-foreground mb-4">
                    Past Gigs
                  </h2>
                  <div className="space-y-3">
                    {flatListGigs.past.map((gig) => (
                      <GigCard key={gig.id} gig={gig} past onClick={() => handleGigClick(gig)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today's Gigs */}
              {groupedGigs.today.length > 0 && (
                <div>
                  <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-orange-500">🎸</span> Today
                  </h2>
                  <div className="space-y-3">
                    {groupedGigs.today.map((gig) => (
                      <GigCard key={gig.id} gig={gig} highlighted onClick={() => handleGigClick(gig)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Future Gigs - Grouped by Month */}
              {groupedGigs.futureByMonth.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-serif font-bold text-foreground mb-2">
                    Upcoming
                  </h2>
                  {groupedGigs.futureByMonth.map(([monthKey, gigs]) => {
                    const isExpanded = expandedMonths.has(monthKey);
                    const monthDate = new Date(monthKey + '-01');
                    const monthLabel = format(monthDate, 'MMMM yyyy');

                    return (
                      <div key={monthKey} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="font-semibold text-foreground">{monthLabel}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            {gigs.map((gig) => (
                              <GigCard key={gig.id} gig={gig} onClick={() => handleGigClick(gig)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Past Gigs - Grouped by Month */}
              {groupedGigs.pastByMonth.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-serif font-bold text-foreground mb-2">
                    Past Gigs
                  </h2>
                  {groupedGigs.pastByMonth.map(([monthKey, gigs]) => {
                    const isExpanded = expandedMonths.has(monthKey);
                    const monthDate = new Date(monthKey + '-01');
                    const monthLabel = format(monthDate, 'MMMM yyyy');

                    return (
                      <div key={monthKey} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="font-semibold text-foreground">{monthLabel}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            {gigs.map((gig) => (
                              <GigCard key={gig.id} gig={gig} past onClick={() => handleGigClick(gig)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Gig Wizard */}
      {showAddGigWizard && currentMembership && (
        <PublicGigWizard
          isOpen={showAddGigWizard}
          onClose={() => setShowAddGigWizard(false)}
          artistId={artistId}
          currentUser={currentMembership}
        />
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          open={showEventDetails}
          onClose={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          artistMembers={[]}
          currentMembershipId={currentMembership?.membership_id || null}
          currentUserId={userProfile?.user.id || null}
          canEdit={canEditEvent}
        />
      )}
    </PageContainer>
  );
}

// Wrapper component with CalendarProvider
export default function Gigs(props: GigsProps) {
  return (
    <CalendarProvider>
      <GigsContent {...props} />
    </CalendarProvider>
  );
}

interface GigCardProps {
  gig: Event;
  highlighted?: boolean;
  past?: boolean;
  onClick?: () => void;
}

function GigCard({ gig, highlighted, past, onClick }: GigCardProps) {
  // Format date with short day name (e.g., "Sat 31st Jan")
  const gigDateObj = new Date(gig.date);
  const dayName = format(gigDateObj, 'EEE');
  const day = gigDateObj.getDate();
  const monthName = format(gigDateObj, 'MMM');
  const gigDate = `${dayName} ${day}${getOrdinalSuffix(day)} ${monthName}`;

  // Format time - always show if available
  const gigTime = gig.startTime || null;
  const gigEndTime = gig.endTime && gig.endTime !== "00:00" ? gig.endTime : null;

  // Check if title is custom or default format (ArtistName @ VenueName)
  const isDefaultTitle = gig.venue && gig.title?.includes(' @ ') && gig.title?.includes(gig.venue);
  const displayTitle = isDefaultTitle ? null : gig.title;

  // Color for the border - orange for today, muted for past, brand accent for future
  const borderColor = highlighted ? '#f97316' : past ? '#94a3b8' : '#f97316';

  return (
    <Card
      className={`transition-all hover:shadow-md cursor-pointer border-l-4 ${
        highlighted ? "shadow-lg" : ""
      } ${past ? "opacity-70" : ""}`}
      style={{ borderLeftColor: borderColor }}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Venue Name with City */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground">📍</span>
                <h3 className="text-base font-semibold text-card-foreground">
                  {gig.venue || 'Unknown Venue'}
                </h3>
                {highlighted && (
                  <Badge className="bg-orange-500 text-white text-xs ml-1">Today</Badge>
                )}
                {!gig.isPublic && (
                  <Badge variant="outline" className="text-xs ml-1">Private</Badge>
                )}
              </div>
              {gig.venueCity && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">{gig.venueCity}</span>
              )}
            </div>

            {/* Custom Title - Only show if not default */}
            {displayTitle && (
              <p className="text-sm text-muted-foreground mb-1">
                {displayTitle}
              </p>
            )}

            {/* Date and Time - Compact */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{gigDate}</span>
              {gigTime && (
                <>
                  <span>•</span>
                  <span className="font-medium">{gigTime}{gigEndTime ? ` - ${gigEndTime}` : ''}</span>
                </>
              )}
            </div>

            {/* Description */}
            {gig.description && (
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">
                {gig.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
