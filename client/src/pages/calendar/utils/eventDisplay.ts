import type { Event, ArtistMembership } from '@/types/api';
import { EVENT_TYPE_CONFIG } from '@/types/api';

interface EventDisplayOptions {
  effectiveArtistId?: string | null;
  artistMembers?: ArtistMembership[];
  currentUserDisplayName?: string;
}

/**
 * Gets the display name for an event, handling privacy and event types
 */
export function getEventDisplayName(
  event: Event & { artistName?: string; displayName?: string; crossArtistEvent?: boolean },
  options: EventDisplayOptions = {}
): string {
  const { effectiveArtistId, artistMembers = [], currentUserDisplayName } = options;
  let eventName = '';

  // Check if this is a cross-artist event
  const isCrossArtist =
    (event as any).crossArtistEvent ||
    (effectiveArtistId && event.artistId && event.artistId !== effectiveArtistId);

  if (event.type === 'unavailable') {
    // For unavailability events, apply privacy protection
    if (event.displayName) {
      // Backend enriched with display name
      eventName = event.displayName;
    } else if (event.membershipId) {
      // Legacy band member unavailable event
      const member = artistMembers.find(
        m => m.membership_id === event.membershipId || m.user_id === event.membershipId
      );
      eventName = member?.user?.displayName?.trim() || member?.displayName || 'Unavailable';
    } else if (event.ownerUserId) {
      // Fallback for events not yet enriched
      eventName = currentUserDisplayName || 'Unavailable';
    } else {
      eventName = 'Unavailable';
    }
  } else if (event.type === 'gig') {
    // Format: Venue, Time, Title
    const parts = [];
    if (event.venue) parts.push(event.venue);
    if (event.startTime) parts.push(event.startTime);
    if (event.title) parts.push(event.title);
    eventName = parts.join(' ');
    if (!eventName) eventName = 'Gig';
  } else if (event.type === 'rehearsal' || event.type === 'other') {
    // Format: Title Time (e.g., "Rehearsal 19:00" or "Gig Practice 19:00")
    const title = event.title || EVENT_TYPE_CONFIG[event.type]?.label || 'Event';
    eventName = event.startTime ? `${title} ${event.startTime}` : title;
  } else {
    eventName = event.title || EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.label || 'Event';
  }

  // Add artist prefix when not in artist context if artistName is available
  if (!effectiveArtistId && event.artistName) {
    return `${event.artistName} - ${eventName}`;
  }

  return eventName;
}

/**
 * Gets the color for an event based on its type and artist context
 */
export function getEventColor(
  event: Event,
  artistDisplayColour?: string,
  effectiveArtistId?: string | null
): string {
  // Use artist display color for artist events if in artist context
  if (effectiveArtistId && event.artistId === effectiveArtistId && artistDisplayColour) {
    return artistDisplayColour;
  }

  // Fall back to event type color
  return EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.color || '#6b7280';
}

/**
 * Gets the background color with opacity for event badges
 */
export function getEventBackgroundColor(
  event: Event,
  artistDisplayColour?: string,
  effectiveArtistId?: string | null,
  opacity: number = 0.1
): string {
  const color = getEventColor(event, artistDisplayColour, effectiveArtistId);

  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Gets the text color for an event badge (ensures readability)
 */
export function getEventTextColor(
  event: Event,
  artistDisplayColour?: string,
  effectiveArtistId?: string | null
): string {
  // Always use the solid color for text
  return getEventColor(event, artistDisplayColour, effectiveArtistId);
}

/**
 * Formats event time for display (e.g., "19:00" or "All Day")
 */
export function formatEventTime(event: Event): string {
  if (event.isAllDay) {
    return 'All Day';
  }

  if (event.startTime) {
    if (event.endTime && event.endTime !== event.startTime) {
      return `${event.startTime} - ${event.endTime}`;
    }
    return event.startTime;
  }

  return '';
}

/**
 * Gets the icon for an event type
 */
export function getEventIcon(eventType: string): string {
  return EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG]?.icon || '📅';
}

/**
 * Gets the label for an event type
 */
export function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG]?.label || 'Event';
}

/**
 * Checks if an event should show privacy protection
 */
export function shouldShowPrivacyProtection(
  event: Event,
  currentUserId?: string,
  currentArtistId?: string | null
): boolean {
  // Unavailability events have privacy protection
  if (event.type !== 'unavailable') {
    return false;
  }

  // If it's the current user's unavailability, no privacy needed
  if (event.ownerUserId === currentUserId) {
    return false;
  }

  // If it's from a different artist, show privacy protection
  if (currentArtistId && event.artistId && event.artistId !== currentArtistId) {
    return true;
  }

  return false;
}
