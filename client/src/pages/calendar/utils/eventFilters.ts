import type { Event } from '@/types/api';

interface FilterOptions {
  showArtistEvents: boolean;
  showMyEvents: boolean;
  showAllArtists: boolean;
  effectiveArtistId?: string | null;
  currentUserId?: string;
}

/**
 * Filters events based on user's toggle preferences and context
 *
 * Three-level filtering logic:
 * 1. Artist Events: Events belonging to the current artist
 * 2. My Events: Personal events or user's own unavailability
 * 3. All Artists: Events from other artists (requires Artist Events also enabled)
 */
export function filterEvents(
  events: Event[],
  options: FilterOptions
): Event[] {
  const {
    showArtistEvents,
    showMyEvents,
    showAllArtists,
    effectiveArtistId,
    currentUserId
  } = options;

  return events.filter(event => {
    // Check if this is a cross-artist unavailability event
    const isCrossArtistUnavailability =
      event.type === 'unavailable' && (event as any).crossArtistEvent;

    // Cross-artist unavailability should be treated as artist events
    if (isCrossArtistUnavailability) {
      return showArtistEvents;
    }

    // Handle unavailability events - check ownership
    if (event.type === 'unavailable') {
      // If it's the current user's own unavailability → My Events
      if (event.ownerUserId === currentUserId) {
        return showMyEvents;
      }
      // If it's another user's unavailability within the same artist → Artist Events
      return showArtistEvents;
    }

    // Personal events without artist association
    if (!event.artistId) {
      return showMyEvents;
    }

    // Artist events for current artist context
    if (effectiveArtistId && event.artistId === effectiveArtistId) {
      return showArtistEvents;
    }

    // Events from other artists (when no artist context, show if artist events enabled)
    if (!effectiveArtistId) {
      return showArtistEvents;
    }

    // Other artist events - only show if BOTH "All Artists" AND "Artist Events" are enabled
    return showAllArtists && showArtistEvents;
  });
}

/**
 * Filters events to a specific date range
 */
export function filterToDateRange(
  events: Event[],
  startDate: string,
  endDate: string
): Event[] {
  return events.filter(event => {
    const eventStart = event.date;
    const eventEnd = event.endDate || event.date;
    return eventStart <= endDate && eventEnd >= startDate;
  });
}

/**
 * Gets events for a specific date (including multi-day events spanning that date)
 */
export function getEventsForDate(events: Event[], dateStr: string): Event[] {
  return events.filter(event => {
    const eventDate = event.date;
    const eventEndDate = event.endDate || event.date;
    return dateStr >= eventDate && dateStr <= eventEndDate;
  });
}

/**
 * Gets events that start on a specific date
 */
export function getEventsStartingOnDate(events: Event[], dateStr: string): Event[] {
  return events.filter(event => event.date === dateStr);
}

/**
 * Gets events that extend to a specific date (multi-day continuation)
 */
export function getEventsExtendingToDate(events: Event[], dateStr: string): Event[] {
  return events.filter(event => {
    if (!event.endDate || event.date === event.endDate) return false;
    return dateStr > event.date && dateStr <= event.endDate;
  });
}

/**
 * Detects if an event is from a different artist (cross-artist detection)
 */
export function isCrossArtistEvent(
  event: Event,
  currentArtistId?: string | null
): boolean {
  if (!currentArtistId) return false;
  if (!event.artistId) return false;
  return event.artistId !== currentArtistId;
}
