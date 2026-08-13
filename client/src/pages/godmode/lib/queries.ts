// Godmode data layer — react-query hooks over the godmode + source-runs services.
//
// Every godmode page previously fetched full tables on mount with raw
// useState/useEffect, so navigating between tabs refetched everything and the
// dashboard alone issued four full-table requests. These hooks share one cache:
// a table is fetched once, kept fresh for a minute, and every mutation patches
// the cache in place instead of refetching the world.

import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  godmodeService,
  type Artist,
  type Event,
  type Membership,
  type Song,
  type User,
  type UserRole,
  type Venue,
  type VenueGroup,
  type VenueTenure,
} from '@/lib/services/godmode-service';
import {
  sourceRunsService,
  type ActivityResponse,
  type ReviewItem,
  type ReviewItemStatus,
  type SourceSummary,
} from '@/lib/services/source-runs-service';

const STALE_MS = 60 * 1000;

export const godmodeKeys = {
  artists: ['godmode', 'artists'] as const,
  venues: ['godmode', 'venues'] as const,
  events: ['godmode', 'events'] as const,
  users: ['godmode', 'users'] as const,
  memberships: ['godmode', 'memberships'] as const,
  songs: ['godmode', 'songs'] as const,
  reviewItems: (status: ReviewItemStatus) => ['godmode', 'review-items', status] as const,
  sourceSummaries: ['godmode', 'source-summaries'] as const,
  activity: (days: number) => ['godmode', 'activity', days] as const,
  enrichmentQueue: ['godmode', 'enrichment-queue'] as const,
  venueGroups: ['godmode', 'venue-groups'] as const,
};

// ===== Reads =====

export function useGodmodeArtists() {
  return useQuery<Artist[]>({
    queryKey: godmodeKeys.artists,
    queryFn: () => godmodeService.getAllArtists(),
    staleTime: STALE_MS,
  });
}

export function useGodmodeVenues() {
  return useQuery<Venue[]>({
    queryKey: godmodeKeys.venues,
    queryFn: () => godmodeService.getAllVenues(),
    staleTime: STALE_MS,
  });
}

/** All public events from today forward (the godmode events endpoint). */
export function useGodmodeEvents() {
  return useQuery<Event[]>({
    queryKey: godmodeKeys.events,
    queryFn: () => godmodeService.getAllEvents(),
    staleTime: STALE_MS,
  });
}

export function useGodmodeUsers() {
  return useQuery<User[]>({
    queryKey: godmodeKeys.users,
    queryFn: () => godmodeService.getAllUsers(),
    staleTime: STALE_MS,
  });
}

export function useGodmodeMemberships() {
  return useQuery<Membership[]>({
    queryKey: godmodeKeys.memberships,
    queryFn: () => godmodeService.getAllMemberships(),
    staleTime: STALE_MS,
  });
}

export function useGodmodeSongs() {
  return useQuery<Song[]>({
    queryKey: godmodeKeys.songs,
    queryFn: () => godmodeService.getAllSongs(),
    staleTime: STALE_MS,
  });
}

export function useReviewItems(status: ReviewItemStatus) {
  return useQuery<ReviewItem[]>({
    queryKey: godmodeKeys.reviewItems(status),
    queryFn: () => sourceRunsService.getReviewItems(status),
    staleTime: STALE_MS,
  });
}

/** Open review-item count for the nav badge. Shares the review-items cache. */
export function useOpenReviewCount(): number | undefined {
  const { data } = useReviewItems('open');
  return data?.length;
}

export function useSourceSummaries() {
  return useQuery<SourceSummary[]>({
    queryKey: godmodeKeys.sourceSummaries,
    queryFn: () => sourceRunsService.getSourceSummaries(),
    staleTime: STALE_MS,
  });
}

export function useSourceActivity(days: number) {
  return useQuery<ActivityResponse>({
    queryKey: godmodeKeys.activity(days),
    queryFn: () => sourceRunsService.getSourceActivity(days),
    staleTime: STALE_MS,
  });
}

// ===== Cache helpers =====

function replaceInList<T extends { id: string }>(list: T[] | undefined, updated: T): T[] | undefined {
  return list?.map((item) => (item.id === updated.id ? updated : item));
}

function removeFromList<T extends { id: string }>(list: T[] | undefined, id: string): T[] | undefined {
  return list?.filter((item) => item.id !== id);
}

// ===== Artist mutations =====

export function useUpdateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Artist> }) =>
      godmodeService.updateArtist(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Artist[]>(godmodeKeys.artists, (list) => replaceInList(list, updated));
    },
  });
}

export function useCreateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) =>
      godmodeService.createArtist(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Artist[]>(godmodeKeys.artists, (list) =>
        list ? [created, ...list] : [created],
      );
    },
  });
}

export function useDeleteArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      godmodeService.deleteArtist(id, force),
    onSuccess: (_void, { id }) => {
      queryClient.setQueryData<Artist[]>(godmodeKeys.artists, (list) => removeFromList(list, id));
      // Force-deleting an artist cascades to its events.
      queryClient.invalidateQueries({ queryKey: godmodeKeys.events });
    },
  });
}

export function useMarkArtistReviewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => godmodeService.markArtistAsReviewed(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<Artist[]>(godmodeKeys.artists, (list) => replaceInList(list, updated));
    },
  });
}

// ===== Venue mutations =====

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Venue> }) =>
      godmodeService.updateVenue(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Venue[]>(godmodeKeys.venues, (list) => replaceInList(list, updated));
    },
  });
}

/* ---------------- venue ownership groups (feature 19) ---------------- */

export function useVenueGroups() {
  return useQuery<VenueGroup[]>({
    queryKey: godmodeKeys.venueGroups,
    queryFn: () => godmodeService.getVenueGroups(),
    staleTime: STALE_MS,
  });
}

export function useCreateVenueGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<VenueGroup>) => godmodeService.createVenueGroup(data),
    onSuccess: (created) => {
      queryClient.setQueryData<VenueGroup[]>(godmodeKeys.venueGroups, (list) =>
        list ? [...list, created].sort((a, b) => a.name.localeCompare(b.name)) : [created],
      );
    },
  });
}

export function useUpdateVenueGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VenueGroup> }) =>
      godmodeService.updateVenueGroup(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<VenueGroup[]>(godmodeKeys.venueGroups, (list) =>
        (list ?? []).map((g) => (g.id === updated.id ? updated : g)),
      );
      // A rename sweeps ownerGroupName across the estate server-side, so the
      // cached venue rows are now stale. Refetch rather than guess.
      queryClient.invalidateQueries({ queryKey: godmodeKeys.venues });
    },
  });
}

/**
 * Assign or clear one venue's owner group, patching the venue cache in place.
 * The bulk action on the venues page calls this once per venue: the estate is
 * hundreds of rows, not thousands, and a per-row result is what lets the toast
 * report how many actually landed.
 */
export function useSetVenueGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, ownerGroupId, tenure }: { venueId: string; ownerGroupId: string | null; tenure?: VenueTenure }) =>
      godmodeService.setVenueGroup(venueId, ownerGroupId, tenure),
    onSuccess: (res) => {
      queryClient.setQueryData<Venue[]>(godmodeKeys.venues, (list) =>
        (list ?? []).map((v) =>
          v.id === res.venueId
            ? { ...v, ownerGroupId: res.ownerGroupId ?? undefined, ownerGroupName: res.ownerGroupName, tenure: res.tenure }
            : v,
        ),
      );
      queryClient.invalidateQueries({ queryKey: godmodeKeys.venueGroups });
    },
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>) =>
      godmodeService.createVenue(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Venue[]>(godmodeKeys.venues, (list) =>
        list ? [created, ...list] : [created],
      );
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => godmodeService.deleteVenue(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<Venue[]>(godmodeKeys.venues, (list) => removeFromList(list, id));
    },
  });
}

// ===== Event mutations =====

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artistId, eventId, data }: { artistId: string; eventId: string; data: Partial<Event> }) =>
      godmodeService.updateEvent(artistId, eventId, data),
    onSuccess: (updated, { eventId }) => {
      queryClient.setQueryData<Event[]>(godmodeKeys.events, (list) =>
        list?.map((event) => (event.id === eventId ? { ...event, ...updated, id: eventId } : event)),
      );
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artistId, eventId }: { artistId: string; eventId: string }) =>
      godmodeService.deleteEvent(artistId, eventId),
    onSuccess: (_void, { eventId }) => {
      queryClient.setQueryData<Event[]>(godmodeKeys.events, (list) => removeFromList(list, eventId));
    },
  });
}

// ===== User mutations =====

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      godmodeService.setUserRole(id, role),
    onSuccess: (_void, { id, role }) => {
      queryClient.setQueryData<User[]>(godmodeKeys.users, (list) =>
        list?.map((u) => (u.id === id ? { ...u, role } : u)),
      );
      queryClient.invalidateQueries({ queryKey: ['godmode', 'curator-activity'] });
    },
  });
}

export function useGodmodeActivity(action?: string) {
  return useQuery({
    queryKey: ['godmode', 'curator-activity', action ?? 'all'],
    queryFn: () => godmodeService.getAllActivity(action),
    staleTime: 30_000,
  });
}

export function useGodmodeFlags(status: 'open' | 'resolved' = 'open') {
  return useQuery({
    queryKey: ['godmode', 'flags', status],
    queryFn: () => godmodeService.getFlags(status),
    staleTime: 30_000,
  });
}

export function useResolveFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flagId: string) => godmodeService.resolveFlag(flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['godmode', 'flags'] });
    },
  });
}

export function useRestoreHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: 'artist' | 'venue' | 'event'; id: string }) =>
      godmodeService.restoreHidden(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['godmode', 'curator-activity'] });
      queryClient.invalidateQueries({ queryKey: godmodeKeys.artists });
      queryClient.invalidateQueries({ queryKey: godmodeKeys.venues });
      queryClient.invalidateQueries({ queryKey: godmodeKeys.events });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => godmodeService.deleteUser(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<User[]>(godmodeKeys.users, (list) => removeFromList(list, id));
      queryClient.invalidateQueries({ queryKey: godmodeKeys.memberships });
    },
  });
}

// ===== Song mutations =====

export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Song> }) =>
      godmodeService.updateSong(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Song[]>(godmodeKeys.songs, (list) => replaceInList(list, updated));
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => godmodeService.deleteSong(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<Song[]>(godmodeKeys.songs, (list) => removeFromList(list, id));
    },
  });
}

// ===== Enrichment Queue =====

export type EnrichmentQueueItem =
  | (Artist & { type: 'artist' })
  | (Venue & { type: 'venue' });

/**
 * Unified enrichment queue combining artists and venues pending enrichment review.
 * Sorted by enrichment date (newest first).
 */
export function useEnrichmentQueue() {
  const artists = useGodmodeArtists();
  const venues = useGodmodeVenues();

  const data = useMemo(() => {
    const artistItems: EnrichmentQueueItem[] = (artists.data ?? [])
      .filter((a) => a.enrichmentStatus === 'needs_review' && a.enrichmentData)
      .map((a) => ({ ...a, type: 'artist' as const }));

    const venueItems: EnrichmentQueueItem[] = (venues.data ?? [])
      .filter((v) => v.enrichment_status === 'needs_review' && v.enrichment_data)
      .map((v) => ({ ...v, type: 'venue' as const }));

    return [...artistItems, ...venueItems].sort((a, b) => {
      const dateA = a.type === 'artist' ? a.enrichmentDate : a.enrichment_date;
      const dateB = b.type === 'artist' ? b.enrichmentDate : b.enrichment_date;
      return (dateB ?? '').localeCompare(dateA ?? '');
    });
  }, [artists.data, venues.data]);

  return {
    data,
    isLoading: artists.isLoading || venues.isLoading,
    isError: artists.isError || venues.isError,
  };
}

export function useAcceptEnrichment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id, fields }: { type: 'artist' | 'venue'; id: string; fields?: string[] }): Promise<Artist | Venue> =>
      type === 'artist'
        ? godmodeService.acceptArtistEnrichment(id, fields)
        : godmodeService.acceptVenueEnrichment(id, fields),
    onSuccess: (updated, { type }) => {
      if (type === 'artist') {
        queryClient.setQueryData<Artist[]>(godmodeKeys.artists, (list) =>
          replaceInList(list, updated as Artist),
        );
      } else {
        queryClient.setQueryData<Venue[]>(godmodeKeys.venues, (list) =>
          replaceInList(list, updated as unknown as Venue),
        );
      }
    },
  });
}

export function useRejectEnrichment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }: { type: 'artist' | 'venue'; id: string }): Promise<Artist | Venue> =>
      type === 'artist'
        ? godmodeService.rejectArtistEnrichment(id)
        : godmodeService.rejectVenueEnrichment(id),
    onSuccess: (updated, { type }) => {
      if (type === 'artist') {
        queryClient.setQueryData<Artist[]>(godmodeKeys.artists, (list) =>
          replaceInList(list, updated as Artist),
        );
      } else {
        queryClient.setQueryData<Venue[]>(godmodeKeys.venues, (list) =>
          replaceInList(list, updated as unknown as Venue),
        );
      }
    },
  });
}
