import { useState, useEffect } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FloatingActionButton from '@/components/floating-action-button';
import { MonthNavigation, SwipeableCalendarWrapper } from './components/MonthNavigation';
import { UpcomingEventBanner } from './components/UpcomingEventBanner';

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

  // Get next upcoming event
  const upcomingEvents = events
    .filter((event) => {
      if (event.type === 'unavailable') return false;
      const eventDate = new Date(event.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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

  // Calendar export functions
  const handleExportCalendar = async (includePrivate: boolean = false, memberOnly: boolean = false) => {
    try {
      if (!session?.access_token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to export calendar",
          variant: "destructive"
        });
        return;
      }

      if (!effectiveArtistId) {
        toast({
          title: "No artist context",
          description: "Please select an artist to export calendar",
          variant: "destructive"
        });
        return;
      }

      const { blob, filename } = await eventsService.exportCalendar(effectiveArtistId, {
        includePrivate,
        memberOnly,
        accessToken: session.access_token,
      });

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Calendar exported",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGetCalendarUrls = async () => {
    try {
      if (!session?.access_token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to get calendar URLs",
          variant: "destructive"
        });
        return;
      }

      if (!effectiveArtistId) {
        toast({
          title: "No artist context",
          description: "Please select an artist to get calendar URLs",
          variant: "destructive"
        });
        return;
      }

      const data = await eventsService.getCalendarUrls(effectiveArtistId, session.access_token);

      // Copy the full calendar URL to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.urls.full);
        toast({
          title: "Calendar URL copied",
          description: "Paste this URL in your calendar app to subscribe to live updates",
        });
      } else {
        toast({
          title: "Calendar URLs",
          description: "Calendar subscription URL copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to get URLs",
        description: "Failed to get calendar URLs. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Calendar Controls - Compact on mobile */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border p-2 md:p-4">
        <div className="flex items-center justify-between">
          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 md:gap-2 h-8 px-2 md:px-3"
                data-testid="button-calendar-export"
              >
                <i className="fas fa-download text-xs md:text-sm"></i>
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem
                onClick={() => handleExportCalendar(false, false)}
                data-testid="menu-export-all-public"
              >
                <i className="fas fa-calendar mr-2 w-4 h-4"></i>
                Export All Public Events
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportCalendar(true, true)}
                data-testid="menu-export-personal-all"
              >
                <i className="fas fa-user mr-2 w-4 h-4"></i>
                Export My Events (All)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportCalendar(false, true)}
                data-testid="menu-export-personal-public"
              >
                <i className="fas fa-user mr-2 w-4 h-4"></i>
                Export My Public Events
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleGetCalendarUrls}
                data-testid="menu-get-calendar-urls"
              >
                <i className="fas fa-link mr-2 w-4 h-4"></i>
                Get Subscription URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
            artistMembers={artistMembers}
            currentUserDisplayName={userProfile?.user?.displayName}
            effectiveArtistId={effectiveArtistId}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            onAddEvent={(date) => {
              setSelectedDate(date);
              setShowEventTypeSelector(true);
            }}
          />
        </SwipeableCalendarWrapper>
      ) : (
        <AgendaView
          events={events}
          artistDisplayColour={artistData?.displayColour}
          artistMembers={artistMembers}
          currentUserDisplayName={userProfile?.user?.displayName}
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
