import { useServerAuth } from '@/hooks/useServerAuth';
import type { Event, ArtistMembership } from '@/types/api';

interface UseEventPermissionsOptions {
  artistId?: string | null;
  membership?: ArtistMembership | null;
}

/**
 * Hook for checking event permissions
 * Handles ownership and context-based permission checks
 */
export function useEventPermissions(options: UseEventPermissionsOptions = {}) {
  const { artistId, membership } = options;
  const { session } = useServerAuth();

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

    // For artist events, any member of the artist can edit if the event belongs to that artist
    // This prevents users from editing/deleting other artists' events when viewing cross-artist calendar
    if (event.artistId && artistId && event.artistId === artistId) {
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
   * Same logic as canEdit for now, but separated for future granularity
   */
  const canDelete = (event: Event): boolean => {
    return canEdit(event);
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

    // For artist events, check if the artist matches the current context
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
    isOwner,
    canCreate,
  };
}
