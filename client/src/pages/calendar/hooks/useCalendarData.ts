import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useServerAuth } from '@/hooks/useServerAuth';
import { apiRequest } from '@/lib/queryClient';
import { filterEvents } from '../utils/eventFilters';
import type { Event } from '@/types/api';

interface CalendarDataResponse {
  artistEvents: Event[];
  userEvents: Event[];
  otherArtistEvents: (Event & { artistName: string })[];
}

interface UseCalendarDataOptions {
  artistId?: string | null;
  currentDate: Date;
  showArtistEvents: boolean;
  showMyEvents: boolean;
  showAllArtists: boolean;
}

/**
 * Hook for fetching and filtering calendar data
 * Handles both artist context and personal calendar views
 * Applies filter toggles and returns filtered events
 */
export function useCalendarData(options: UseCalendarDataOptions) {
  const { artistId, currentDate, showArtistEvents, showMyEvents, showAllArtists } = options;
  const { session } = useServerAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Fetch calendar data
  const { data: calendarData, isLoading, error } = useQuery<CalendarDataResponse | Event[]>({
    queryKey: artistId
      ? ['/api/artists', artistId, 'calendar', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')]
      : ['/api/me/events', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!session) {
        throw new Error('Not authenticated');
      }

      let url: string;
      if (artistId) {
        // Artist context: get unified calendar with all event types
        url = `/api/artists/${artistId}/calendar?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`;
      } else {
        // No artist context: get user's personal events from all artists
        url = `/api/me/events?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`;
      }

      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: !!session,
  });

  // Extract events from the unified calendar response or fallback to legacy format
  const allEvents: Event[] = calendarData
    ? Array.isArray(calendarData)
      ? calendarData // Legacy format (no artist context)
      : [
          ...calendarData.artistEvents,
          ...calendarData.userEvents,
          ...calendarData.otherArtistEvents.map(event => ({
            ...event,
            // Add visual indicator for cross-artist events
            title: event.title
              ? `${event.title} (${event.artistName})`
              : `${event.eventType} (${event.artistName})`,
          })),
        ]
    : [];

  // Apply filter toggles
  const filteredEvents = filterEvents(allEvents, {
    showArtistEvents,
    showMyEvents,
    showAllArtists,
    effectiveArtistId: artistId,
    currentUserId: session?.user?.cognitoId,
  });

  return {
    events: filteredEvents,
    allEvents,
    calendarData,
    isLoading,
    error,
    dateRange: {
      monthStart,
      monthEnd,
      calendarStart,
      calendarEnd,
    },
  };
}
