import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format, startOfMonth, endOfMonth, startOfDay, addMonths } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { eventsService } from '@/lib/services/events-service';
import type { Event, ArtistMembership } from '@/types/api';

// Context
import { CalendarProvider, useCalendarContext } from './CalendarContext';

// Components
import { Button } from '@/components/ui/button';
import FloatingActionButton from '@/components/floating-action-button';
import { MonthNavigation, SwipeableCalendarWrapper } from './components/MonthNavigation';
import { UpcomingEventBanner } from './components/UpcomingEventBanner';
import { MarkerModeToggle } from './components/MarkerModeToggle';
import { BulkAvailabilityDrawer } from './components/BulkAvailabilityDrawer';

// Views
import { CalendarGridView } from './views/CalendarGridView';
import { AgendaView } from './views/AgendaView';

// Modals
import { EventTypeSelector } from './modals/EventTypeSelector';
import { EventModal } from './modals/EventModal';
import { RehearsalModal } from './modals/RehearsalModal';
import UnavailabilityModal from './modals/UnavailabilityModal';
import PublicGigWizard from './modals/PublicGigWizard';
import EventDetails from './modals/EventDetails';

// Utils
import { filterEvents } from './utils/eventFilters';

interface CalendarProps {
  artistId?: string | null;
  membership?: ArtistMembership | null;
}

/**
 * Main Calendar Component
 * Refactored modular architecture with recurring events support
 */
function CalendarContent({ artistId, membership }: CalendarProps) {
  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { currentArtistId, currentMembership, userProfile } = useUser();
  const { toast } = useToast();

  // Use context values if props aren't provided (for standalone usage)
  const effectiveArtistId = artistId ?? currentArtistId;
  const effectiveMembership = membership ?? currentMembership;

  // Build artist color map for cross-artist event rendering
  const artistColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    userProfile?.artists?.forEach(membership => {
      if (membership.artist?.displayColour && membership.artist_id) {
        map[membership.artist_id] = membership.artist.displayColour;
      }
    });
    return map;
  }, [userProfile?.artists]);

  // Get calendar context state
  const {
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    showArtistEvents,
    setShowArtistEvents,
    showMyEvents,
    setShowMyEvents,
    showAllArtists,
    setShowAllArtists,
    selectedEvent,
    setSelectedEvent,
    selectedDate,
    setSelectedDate,
    showEventTypeSelector,
    setShowEventTypeSelector,
    showEventModal,
    setShowEventModal,
    showRehearsalModal,
    setShowRehearsalModal,
    showUnavailabilityModal,
    setShowUnavailabilityModal,
    showPublicGigWizard,
    setShowPublicGigWizard,
    showEventDetails,
    setShowEventDetails,
  } = useCalendarContext();

  const [dismissedHighlight, setDismissedHighlight] = useState(false);
  const [markerModeActive, setMarkerModeActive] = useState(false);
  const [showBulkAvailabilityDrawer, setShowBulkAvailabilityDrawer] = useState(false);

  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // For agenda view, calculate 3-month range
  const todayStart = startOfDay(new Date());
  const agendaEnd = endOfMonth(addMonths(todayStart, 2));

  // Fetch calendar data (month view)
  const { data: calendarData } = useQuery<{
    artistEvents: Event[];
    userEvents: Event[];
    otherArtistEvents: (Event & { artistName: string })[];
  } | Event[]>({
    queryKey: effectiveArtistId
      ? ['/api/artists', effectiveArtistId, 'calendar', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')]
      : ['/api/me/events', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!session) {
        throw new Error('Not authenticated');
      }

      let url: string;
      if (effectiveArtistId) {
        url = `/api/artists/${effectiveArtistId}/calendar?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`;
      } else {
        url = `/api/me/events?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`;
      }

      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: !!session && viewMode === 'calendar',
  });

  // Fetch agenda data (3-month view) - only when in agenda mode
  const { data: agendaData } = useQuery<{
    artistEvents: Event[];
    userEvents: Event[];
    otherArtistEvents: (Event & { artistName: string })[];
  } | Event[]>({
    queryKey: effectiveArtistId
      ? ['/api/artists', effectiveArtistId, 'agenda', format(todayStart, 'yyyy-MM-dd'), format(agendaEnd, 'yyyy-MM-dd')]
      : ['/api/me/events-agenda', format(todayStart, 'yyyy-MM-dd'), format(agendaEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!session) {
        throw new Error('Not authenticated');
      }

      let url: string;
      if (effectiveArtistId) {
        url = `/api/artists/${effectiveArtistId}/calendar?startDate=${format(todayStart, 'yyyy-MM-dd')}&endDate=${format(agendaEnd, 'yyyy-MM-dd')}`;
      } else {
        url = `/api/me/events?startDate=${format(todayStart, 'yyyy-MM-dd')}&endDate=${format(agendaEnd, 'yyyy-MM-dd')}`;
      }

      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: !!session && viewMode === 'agenda',
  });

  // Use the appropriate data source based on view mode
  const activeData = viewMode === 'agenda' ? agendaData : calendarData;

  // Extract and filter events
  const allEvents: Event[] = activeData
    ? Array.isArray(activeData)
      ? activeData
      : [
          ...activeData.artistEvents,
          ...activeData.userEvents,
          ...activeData.otherArtistEvents,
        ]
    : [];

  const events = filterEvents(allEvents, {
    showArtistEvents,
    showMyEvents,
    showAllArtists,
    effectiveArtistId,
    currentUserId: session?.user?.cognitoId,
  });

  // Fetch artist members
  const { data: artistMembers = [] } = useQuery<ArtistMembership[]>({
    queryKey: ['/api/artists', effectiveArtistId, 'members'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/artists/${effectiveArtistId}/members`);
      const data = await response.json();
      return data.members;
    },
    enabled: !!effectiveArtistId,
  });

  // Fetch artist data
  const { data: artistData } = useQuery<{ displayColour?: string; name?: string }>({
    queryKey: ['/api/artists', effectiveArtistId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/artists/${effectiveArtistId}`);
      return response.json();
    },
    enabled: !!effectiveArtistId,
  });

  // Fetch ALL upcoming events for banner (independent of current month view)
  // This ensures the "Next Up" banner shows on page load regardless of which month is being viewed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneYearFromNow = addMonths(today, 12);

  const { data: upcomingEventsData } = useQuery<{
    artistEvents: Event[];
    userEvents: Event[];
    otherArtistEvents: (Event & { artistName: string })[];
  } | Event[]>({
    queryKey: effectiveArtistId
      ? ['/api/artists', effectiveArtistId, 'upcoming-events', format(today, 'yyyy-MM-dd'), format(oneYearFromNow, 'yyyy-MM-dd')]
      : ['/api/me/upcoming-events', format(today, 'yyyy-MM-dd'), format(oneYearFromNow, 'yyyy-MM-dd')],
    queryFn: async () => {
      const url = effectiveArtistId
        ? `/api/artists/${effectiveArtistId}/calendar?startDate=${format(today, 'yyyy-MM-dd')}&endDate=${format(oneYearFromNow, 'yyyy-MM-dd')}`
        : `/api/me/events?startDate=${format(today, 'yyyy-MM-dd')}&endDate=${format(oneYearFromNow, 'yyyy-MM-dd')}`;
      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: !dismissedHighlight && viewMode === 'calendar',
  });

  // Get next upcoming event from the dedicated upcoming events query
  const allUpcomingEvents: Event[] = upcomingEventsData
    ? Array.isArray(upcomingEventsData)
      ? upcomingEventsData
      : [
          ...upcomingEventsData.artistEvents,
          ...upcomingEventsData.userEvents,
          ...upcomingEventsData.otherArtistEvents,
        ]
    : [];

  const upcomingEvents = allUpcomingEvents
    .filter((event) => {
      if (event.type === 'unavailable' || event.type === 'available') return false;
      const eventDate = new Date(event.date + 'T00:00:00');
      return eventDate >= today;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T00:00:00');
      const dateB = new Date(b.date + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });
  const nextEvent = upcomingEvents[0];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ event, deleteAll }: { event: Event; deleteAll?: boolean }) => {
      const url = deleteAll
        ? `/api/artists/${effectiveArtistId}/events/${event.id}?deleteAll=true`
        : `/api/artists/${effectiveArtistId}/events/${event.id}`;
      return apiRequest('DELETE', url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/artists', effectiveArtistId, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/events'] });
      toast({
        title: 'Event deleted',
        description: 'Event has been removed from the calendar',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
    },
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (date: string) => {
      if (!effectiveArtistId) throw new Error('No artist selected');
      return await eventsService.toggleAvailability(effectiveArtistId, date);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/artists', effectiveArtistId, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/events'] });
      toast({
        title: data.action === 'created' ? 'Added availability' : 'Removed availability',
        description: data.action === 'created' ? 'Day marked as available' : 'Availability removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle availability',
        variant: 'destructive',
      });
    },
  });

  // Bulk set availability mutation
  const bulkAvailabilityMutation = useMutation({
    mutationFn: async (params: {
      startDate: string;
      endDate: string;
      rules: string[];
      notes?: string;
    }) => {
      if (!effectiveArtistId) throw new Error('No artist selected');
      return await eventsService.bulkSetAvailability({
        artistId: effectiveArtistId,
        ...params,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/artists', effectiveArtistId, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/events'] });
      toast({
        title: `Marked ${data.created} days as available`,
        description: data.skipped > 0 ? `Skipped ${data.skipped} days with existing events` : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk set availability',
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setShowEventTypeSelector(true);
  };

  const handleEventTypeSelect = (type: 'gig' | 'rehearsal' | 'unavailable' | 'other') => {
    if (type === 'gig') {
      setShowPublicGigWizard(true);
    } else if (type === 'rehearsal') {
      setShowRehearsalModal(true);
    } else if (type === 'unavailable') {
      setShowUnavailabilityModal(true);
    } else if (type === 'other') {
      setShowEventModal(true);
    }
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);

    // Close EventDetails modal when opening edit modal
    setShowEventDetails(false);

    if (event.type === 'gig' || event.type === 'public_gig') {
      setShowPublicGigWizard(true);
    } else if (event.type === 'rehearsal') {
      setShowRehearsalModal(true);
    } else if (event.type === 'unavailable') {
      setShowUnavailabilityModal(true);
    } else {
      setShowEventModal(true);
    }
  };

  const handleDeleteEvent = (event: Event, deleteAll?: boolean) => {
    deleteMutation.mutate({ event, deleteAll });
  };

  const handleDayClickInMarkerMode = (date: string) => {
    // Check for member unavailability on this date
    const unavailableMembers = events.filter(
      (e) => e.type === 'unavailable' && e.date === date
    );

    if (unavailableMembers.length > 0) {
      const memberNames = unavailableMembers
        .map((e) => e.displayName || 'Unknown Member')
        .join(', ');

      if (!confirm(`${memberNames} is unavailable on this day. Mark as available anyway?`)) {
        return;
      }
    }

    toggleAvailabilityMutation.mutate(date);
  };

  const handleDeleteAvailability = (event: Event) => {
    if (!effectiveArtistId) return;
    deleteMutation.mutate({ event });
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/artists', effectiveArtistId, 'calendar'] });
    queryClient.invalidateQueries({ queryKey: ['/api/me/events'] });
  };

  const canEdit = (event: Event): boolean => {
    if (event.type === 'unavailable') {
      return event.ownerUserId === session?.user?.cognitoId;
    }
    return event.membershipId === effectiveMembership?.membership_id;
  };

  // TODO: Implement calendar export functionality properly
  // Export functionality removed - needs proper implementation with correct auth structure

  return (
    <div className="min-h-screen bg-background">
      {/* Calendar Controls - Compact on mobile */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border p-2 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Marker Mode Toggle (Artist context only) */}
            {effectiveArtistId && viewMode === 'calendar' && (
              <MarkerModeToggle
                isActive={markerModeActive}
                onToggle={() => setMarkerModeActive(!markerModeActive)}
              />
            )}

            {/* Bulk Availability Button (Artist context only) */}
            {effectiveArtistId && viewMode === 'calendar' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkAvailabilityDrawer(true)}
                className="gap-1 md:gap-2 h-8 px-2 md:px-3"
              >
                <i className="fas fa-calendar-plus text-xs md:text-sm"></i>
                <span className="hidden lg:inline">Bulk Availability</span>
              </Button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-0.5 md:p-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
                viewMode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-calendar-view"
            >
              <i className="fas fa-calendar mr-1 md:mr-2"></i>
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
                viewMode === "agenda"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-agenda-view"
            >
              <i className="fas fa-list mr-1 md:mr-2"></i>
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Event Banner */}
      {!dismissedHighlight && nextEvent && viewMode === 'calendar' && (
        <UpcomingEventBanner
          event={nextEvent}
          artistName={artistData?.name}
          onDismiss={() => setDismissedHighlight(true)}
          onClick={() => handleEventClick(nextEvent)}
        />
      )}

      {/* Month Navigation with Filter Buttons (Calendar view only) */}
      {viewMode === 'calendar' && (
        <MonthNavigation
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          showArtistEvents={showArtistEvents}
          onToggleArtistEvents={() => setShowArtistEvents(!showArtistEvents)}
          showMyEvents={showMyEvents}
          onToggleMyEvents={() => setShowMyEvents(!showMyEvents)}
          showAllArtists={showAllArtists}
          onToggleAllArtists={() => setShowAllArtists(!showAllArtists)}
          hasArtistContext={!!effectiveArtistId}
          hasMultipleArtists={userProfile?.artists && userProfile.artists.length > 1}
        />
      )}

      {/* Agenda View Filter Buttons - COPIED from calendar.tsx.old lines 737-801 */}
      {viewMode === 'agenda' && (
        <div className="bg-brand-primary-light border-t px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Artist Events Toggle */}
            {effectiveArtistId && (
              <button
                onClick={() => setShowArtistEvents(!showArtistEvents)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                  ${showArtistEvents
                    ? 'bg-brand-accent text-white border-brand-accent shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                  }
                `}
                data-testid="toggle-artist-events"
              >
                <i className="fas fa-users mr-2 text-xs"></i>
                Artist Events
                {showArtistEvents && (
                  <i className="fas fa-check ml-2 text-xs"></i>
                )}
              </button>
            )}

            {/* My Events Toggle */}
            <button
              onClick={() => setShowMyEvents(!showMyEvents)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                ${showMyEvents
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-md'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                }
              `}
              data-testid="toggle-my-events"
            >
              <i className="fas fa-user mr-2 text-xs"></i>
              My Events
              {showMyEvents && (
                <i className="fas fa-check ml-2 text-xs"></i>
              )}
            </button>

            {/* All Artists Toggle - only show when in artist context, user has multiple artists, AND artist events is enabled */}
            {effectiveArtistId && userProfile?.artists && userProfile.artists.length > 1 && showArtistEvents && (
              <button
                onClick={() => setShowAllArtists(!showAllArtists)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                  ${showAllArtists
                    ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                  }
                `}
                data-testid="toggle-all-artists"
              >
                <i className="fas fa-layer-group mr-2 text-xs"></i>
                All Artists
                {showAllArtists && (
                  <i className="fas fa-check ml-2 text-xs"></i>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Calendar Views */}
      {viewMode === 'calendar' ? (
        <SwipeableCalendarWrapper currentDate={currentDate} onDateChange={setCurrentDate}>
          <CalendarGridView
            currentDate={currentDate}
            events={events}
            artistDisplayColour={artistData?.displayColour}
            artistColorMap={artistColorMap}
            artistMembers={artistMembers}
            currentUserDisplayName={userProfile?.user?.displayName || undefined}
            currentUserId={session?.user?.cognitoId}
            effectiveArtistId={effectiveArtistId}
            onEventClick={handleEventClick}
            onDayClick={markerModeActive ? handleDayClickInMarkerMode : handleDayClick}
            onAddEvent={(date) => {
              setSelectedDate(date);
              setShowEventTypeSelector(true);
            }}
            onDeleteAvailability={handleDeleteAvailability}
          />
        </SwipeableCalendarWrapper>
      ) : (
        <AgendaView
          events={events}
          artistDisplayColour={artistData?.displayColour}
          artistColorMap={artistColorMap}
          artistMembers={artistMembers}
          currentUserDisplayName={userProfile?.user?.displayName || undefined}
          effectiveArtistId={effectiveArtistId}
          showAllArtists={showAllArtists}
          onEventClick={handleEventClick}
        />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => {
          setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
          setShowEventTypeSelector(true);
        }}
      />

      {/* Modals */}
      <EventTypeSelector
        isOpen={showEventTypeSelector}
        onClose={() => setShowEventTypeSelector(false)}
        onSelectType={handleEventTypeSelect}
        selectedDate={selectedDate}
      />

      <EventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        onSuccess={handleSuccess}
        artistId={effectiveArtistId || ''}
        event={selectedEvent}
        selectedDate={selectedDate}
      />

      <RehearsalModal
        isOpen={showRehearsalModal}
        onClose={() => {
          setShowRehearsalModal(false);
          setSelectedEvent(null);
        }}
        onSuccess={handleSuccess}
        artistId={effectiveArtistId || ''}
        event={selectedEvent}
        selectedDate={selectedDate}
      />

      {effectiveArtistId && (
        <UnavailabilityModal
          isOpen={showUnavailabilityModal}
          onClose={() => {
            setShowUnavailabilityModal(false);
            setSelectedEvent(null);
          }}
          selectedDate={selectedDate}
          userDisplayName={userProfile?.user?.displayName || 'You'}
          userId={session?.user?.cognitoId || ''}
          artistId={effectiveArtistId}
        />
      )}

      {effectiveArtistId && effectiveMembership && (
        <PublicGigWizard
          isOpen={showPublicGigWizard}
          onClose={() => {
            setShowPublicGigWizard(false);
            setSelectedEvent(null);
          }}
          onSuccess={handleSuccess}
          artistId={effectiveArtistId}
          currentUser={effectiveMembership}
          editingEventId={selectedEvent ? selectedEvent.id : undefined}
          initialData={
            selectedEvent
              ? {
                  venueId: selectedEvent.venueId || undefined,
                  venueName: selectedEvent.venue || undefined,
                  venueAddress: selectedEvent.venueAddress || undefined,
                  venueLocation:
                    selectedEvent.venueLatitude && selectedEvent.venueLongitude
                      ? { lat: selectedEvent.venueLatitude, lng: selectedEvent.venueLongitude }
                      : undefined,
                  googlePlaceId: selectedEvent.venueGooglePlaceId || undefined,
                  date: selectedEvent.date,
                  startTime: selectedEvent.startTime || undefined,
                  endTime: selectedEvent.endTime || undefined,
                  title: selectedEvent.title,
                  description: selectedEvent.description || undefined,
                  isPublic: selectedEvent.isPublic !== undefined ? selectedEvent.isPublic : true,
                }
              : selectedDate
                ? { date: selectedDate }
                : undefined
          }
        />
      )}

      <EventDetails
        event={selectedEvent}
        open={showEventDetails}
        onClose={() => {
          setShowEventDetails(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        artistMembers={artistMembers}
        currentMembershipId={effectiveMembership?.membership_id || null}
        currentUserId={session?.user?.cognitoId || null}
        canEdit={canEdit}
      />

      {/* Bulk Availability Drawer */}
      <BulkAvailabilityDrawer
        isOpen={showBulkAvailabilityDrawer}
        onClose={() => setShowBulkAvailabilityDrawer(false)}
        onApply={(params) => {
          bulkAvailabilityMutation.mutate(params);
          setShowBulkAvailabilityDrawer(false);
        }}
        isLoading={bulkAvailabilityMutation.isPending}
      />
    </div>
  );
}

/**
 * Calendar with Context Provider
 */
export default function Calendar(props: CalendarProps) {
  return (
    <CalendarProvider>
      <CalendarContent {...props} />
    </CalendarProvider>
  );
}
