import { useServerAuth } from '@/hooks/useServerAuth';
import type { Event, ArtistMembership } from '@/types/api';

interface UseEventPermissionsOptions {
  artistId?: string | null;
  membership?: ArtistMembership | null;
}

/**
 * Hook for checking event permissions
 * Handles ownership and context-based permission checks
 * Supports multi-artist events with primary/collaborating artist distinction
 */
export function useEventPermissions(options: UseEventPermissionsOptions = {}) {
  const { artistId, membership } = options;
  const { session } = useServerAuth();

  /**
   * Check if current artist is the primary artist for the event
   */
  const isPrimaryArtist = (event: Event): boolean => {
    if (!artistId) return false;
    return event.artistId === artistId;
  };

  /**
   * Check if current artist is a collaborating artist (not primary)
   */
  const isCollaboratingArtist = (event: Event): boolean => {
    if (!artistId) return false;
    return event.collaboratingArtistIds?.includes(artistId) || false;
  };

  /**
   * Check if current artist is part of the event (primary or collaborating)
   */
  const isPartOfEvent = (event: Event): boolean => {
    if (!artistId) return false;
    // Check if in artistIds array (enriched) or check primary + collaborating
    if (event.artistIds?.includes(artistId)) return true;
    return isPrimaryArtist(event) || isCollaboratingArtist(event);
  };

  /**
   * Check if user can edit an event
   */
  const canEdit = (event: Event): boolean => {
    // For unavailability events, only the owner can edit
    if (event.type === 'unavailable') {
      // User personal unavailable event - check if owned by current user
      if (event.ownerUserId) {
        return event.ownerUserId === session?.user?.cognitoId;
      }
      // Legacy band member unavailable event - check membership
      return event.membershipId === membership?.membership_id || event.membershipId === membership?.id;
    }

    // For artist events, any member of the artist can edit if they are part of the event
    // This includes both primary and collaborating artists
    if (artistId && isPartOfEvent(event)) {
      return !!membership; // User is a member of the artist
    }

    // For personal events without artist context, allow editing
    if (!event.artistId) {
      return true;
    }

    // Default: no permission
    return false;
  };

  /**
   * Check if user can delete an event
   * Only primary artist (or owner) can delete - collaborators should use "Leave"
   */
  const canDelete = (event: Event): boolean => {
    // For unavailability events, use same logic as canEdit
    if (event.type === 'unavailable') {
      return canEdit(event);
    }

    // For artist events, only the primary artist can delete
    // Collaborating artists must use "Leave Event" instead
    if (artistId && isPrimaryArtist(event)) {
      return !!membership;
    }

    // For personal events without artist context, allow deleting
    if (!event.artistId) {
      return true;
    }

    // Collaborating artists cannot delete - they can only leave
    return false;
  };

  /**
   * Check if user can leave an event (for collaborating artists)
   * Primary artist cannot leave - they must delete the event
   */
  const canLeave = (event: Event): boolean => {
    // Only for artist events with multiple artists
    if (!artistId || !membership) return false;

    // Must be a collaborating artist (not primary)
    return isCollaboratingArtist(event);
  };

  /**
   * Check if user is the owner of an event
   */
  const isOwner = (event: Event): boolean => {
    // For unavailability events
    if (event.type === 'unavailable') {
      if (event.ownerUserId) {
        return event.ownerUserId === session?.user?.cognitoId;
      }
      return event.membershipId === membership?.id;
    }

    // For artist events, check if they are the primary artist (owner)
    // ownerArtistId takes precedence if set
    if (event.ownerArtistId && artistId) {
      return event.ownerArtistId === artistId;
    }
    if (event.artistId && artistId) {
      return event.artistId === artistId;
    }

    // For personal events without artist context
    if (!event.artistId) {
      return true;
    }

    return false;
  };

  /**
   * Check if user can create events in the current context
   */
  const canCreate = (): boolean => {
    // Must be authenticated
    if (!session) {
      return false;
    }

    // If in artist context, check if user is a member
    if (artistId && membership) {
      return true;
    }

    // If not in artist context, user can create personal events
    if (!artistId) {
      return true;
    }

    return false;
  };

  return {
    canEdit,
    canDelete,
    canLeave,
    isOwner,
    canCreate,
    isPrimaryArtist,
    isCollaboratingArtist,
    isPartOfEvent,
  };
}
