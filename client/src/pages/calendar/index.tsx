import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Event, ArtistMembership } from '@/types/api';

// Context
import { CalendarProvider, useCalendarContext } from './CalendarContext';

// Components
import { PageHeader } from '@/components/layout';
import FloatingActionButton from '@/components/floating-action-button';
import { MonthNavigation, SwipeableCalendarWrapper } from './components/MonthNavigation';
import { UpcomingEventBanner } from './components/UpcomingEventBanner';
import { CalendarControls } from './components/CalendarControls';

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

  // Fetch calendar data
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
    enabled: !!session,
  });

  // Extract and filter events
  const allEvents: Event[] = calendarData
    ? Array.isArray(calendarData)
      ? calendarData
      : [
          ...calendarData.artistEvents,
          ...calendarData.userEvents,
          ...calendarData.otherArtistEvents,
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
        ? `/api/events/${event.id}?deleteAll=true`
        : `/api/events/${event.id}`;
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={artistData?.name ? `${artistData.name} Calendar` : 'Calendar'}
        subtitle={viewMode === 'calendar' ? format(currentDate, 'MMMM yyyy') : 'Upcoming Events'}
      />

      {/* Upcoming Event Banner */}
      {!dismissedHighlight && nextEvent && viewMode === 'calendar' && (
        <UpcomingEventBanner
          event={nextEvent}
          artistName={artistData?.name}
          onDismiss={() => setDismissedHighlight(true)}
          onClick={() => handleEventClick(nextEvent)}
        />
      )}

      {/* Month Navigation (Calendar view only) */}
      {viewMode === 'calendar' && (
        <MonthNavigation currentDate={currentDate} onDateChange={setCurrentDate}>
          <CalendarControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showArtistEvents={showArtistEvents}
            onToggleArtistEvents={() => setShowArtistEvents(!showArtistEvents)}
            showMyEvents={showMyEvents}
            onToggleMyEvents={() => setShowMyEvents(!showMyEvents)}
            showAllArtists={showAllArtists}
            onToggleAllArtists={() => setShowAllArtists(!showAllArtists)}
            hasArtistContext={!!effectiveArtistId}
          />
        </MonthNavigation>
      )}

      {/* Agenda View Controls */}
      {viewMode === 'agenda' && (
        <div className="bg-brand-primary-light border-t px-4 py-3">
          <CalendarControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showArtistEvents={showArtistEvents}
            onToggleArtistEvents={() => setShowArtistEvents(!showArtistEvents)}
            showMyEvents={showMyEvents}
            onToggleMyEvents={() => setShowMyEvents(!showMyEvents)}
            showAllArtists={showAllArtists}
            onToggleAllArtists={() => setShowAllArtists(!showAllArtists)}
            hasArtistContext={!!effectiveArtistId}
          />
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
          />
        </SwipeableCalendarWrapper>
      ) : (
        <AgendaView
          events={events}
          artistDisplayColour={artistData?.displayColour}
          artistMembers={artistMembers}
          currentUserDisplayName={userProfile?.user?.displayName}
          effectiveArtistId={effectiveArtistId}
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
