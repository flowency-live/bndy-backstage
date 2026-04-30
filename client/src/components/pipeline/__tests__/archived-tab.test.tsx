/**
 * ArchivedTab Component Tests
 *
 * Tests for displaying "shat on this song" message:
 * - Shows message when discarded song has a poo vote (value = 0)
 * - Shows who shat on the song by name
 * - Only shows when showMemberVotes setting is enabled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ArchivedTab from '../archived-tab';
import type { ArtistMembership, Artist } from '@/types/api';
import { artistsService } from '@/lib/services/artists-service';
import { membershipsService } from '@/lib/services/memberships-service';

// Mock the services
vi.mock('@/lib/services/artists-service', () => ({
  artistsService: {
    getArchivedPipelineSongs: vi.fn(),
    updatePipelineStatus: vi.fn(),
    deletePipelineSong: vi.fn(),
  },
}));

vi.mock('@/lib/services/memberships-service', () => ({
  membershipsService: {
    getArtistMemberships: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createMembership = (userId: string, displayName: string): ArtistMembership => ({
  id: `membership-${userId}`,
  user_id: userId,
  artist_id: 'artist-1',
  display_name: displayName,
  resolved_display_name: displayName,
  status: 'active',
  role: 'member',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('ArchivedTab', () => {
  const memberships: ArtistMembership[] = [
    createMembership('user-1', 'Alice'),
    createMembership('user-2', 'Bob'),
    createMembership('user-3', 'Charlie'),
  ];

  const discardedSongWithPooVote = {
    id: 'song-1',
    artist_id: 'artist-1',
    song_id: 'global-song-1',
    status: 'discarded',
    votes: {
      'user-1': { value: 4, updated_at: '2025-01-01T10:00:00Z' },
      'user-2': { value: 0, updated_at: '2025-01-01T11:00:00Z' }, // Bob shat on it
      'user-3': { value: 3, updated_at: '2025-01-01T12:00:00Z' },
    },
    voting_scale: 5,
    suggested_by_user_id: 'user-1',
    globalSong: {
      id: 'global-song-1',
      title: 'Rejected Song',
      artist_name: 'Test Artist',
      album: 'Test Album',
      spotify_url: 'https://open.spotify.com/track/123',
    },
  };

  const discardedSongNoPooVote = {
    id: 'song-2',
    artist_id: 'artist-1',
    song_id: 'global-song-2',
    status: 'discarded',
    votes: {
      'user-1': { value: 2, updated_at: '2025-01-01T10:00:00Z' },
      'user-2': { value: 1, updated_at: '2025-01-01T11:00:00Z' },
    },
    voting_scale: 5,
    suggested_by_user_id: 'user-1',
    globalSong: {
      id: 'global-song-2',
      title: 'Low Score Song',
      artist_name: 'Test Artist 2',
      album: 'Test Album 2',
      spotify_url: 'https://open.spotify.com/track/456',
    },
  };

  const artistWithShowMemberVotes: Artist = {
    id: 'artist-1',
    name: 'Test Band',
    showMemberVotes: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const artistWithoutShowMemberVotes: Artist = {
    id: 'artist-1',
    name: 'Test Band',
    showMemberVotes: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const baseMembership: ArtistMembership & { artist: Artist } = {
    ...createMembership('user-1', 'Alice'),
    artist: artistWithShowMemberVotes,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(membershipsService.getArtistMemberships).mockResolvedValue({
      memberships,
    });
  });

  describe('shat on this song message', () => {
    it('should show "shat on this song" message for discarded songs with poo votes', async () => {
      vi.mocked(artistsService.getArchivedPipelineSongs).mockResolvedValue([
        discardedSongWithPooVote,
      ]);

      renderWithProviders(
        <ArchivedTab
          artistId="artist-1"
          membership={baseMembership}
        />
      );

      // Wait for songs to load
      const discardedSection = await screen.findByText('Discarded (1)');
      expect(discardedSection).toBeInTheDocument();

      // Expand the discarded song
      const songTitle = await screen.findByText('Rejected Song');
      fireEvent.click(songTitle);

      // Should show who shat on it
      expect(await screen.findByText(/Bob shat on this song/)).toBeInTheDocument();
    });

    it('should NOT show message when showMemberVotes is false', async () => {
      vi.mocked(artistsService.getArchivedPipelineSongs).mockResolvedValue([
        discardedSongWithPooVote,
      ]);

      const membershipWithoutSetting: ArtistMembership & { artist: Artist } = {
        ...baseMembership,
        artist: artistWithoutShowMemberVotes,
      };

      renderWithProviders(
        <ArchivedTab
          artistId="artist-1"
          membership={membershipWithoutSetting}
        />
      );

      // Wait for songs to load
      const discardedSection = await screen.findByText('Discarded (1)');
      expect(discardedSection).toBeInTheDocument();

      // Expand the discarded song
      const songTitle = await screen.findByText('Rejected Song');
      fireEvent.click(songTitle);

      // Should NOT show "shat on this song" message
      expect(screen.queryByText(/shat on this song/)).not.toBeInTheDocument();
    });

    it('should NOT show message for discarded songs without poo votes', async () => {
      vi.mocked(artistsService.getArchivedPipelineSongs).mockResolvedValue([
        discardedSongNoPooVote,
      ]);

      renderWithProviders(
        <ArchivedTab
          artistId="artist-1"
          membership={baseMembership}
        />
      );

      // Wait for songs to load
      const discardedSection = await screen.findByText('Discarded (1)');
      expect(discardedSection).toBeInTheDocument();

      // Expand the discarded song
      const songTitle = await screen.findByText('Low Score Song');
      fireEvent.click(songTitle);

      // Should NOT show "shat on this song" message
      expect(screen.queryByText(/shat on this song/)).not.toBeInTheDocument();
    });

    it('should show multiple names when multiple people shat on the song', async () => {
      const songWithMultiplePooVotes = {
        ...discardedSongWithPooVote,
        votes: {
          'user-1': { value: 4, updated_at: '2025-01-01T10:00:00Z' },
          'user-2': { value: 0, updated_at: '2025-01-01T11:00:00Z' }, // Bob
          'user-3': { value: 0, updated_at: '2025-01-01T12:00:00Z' }, // Charlie
        },
      };

      vi.mocked(artistsService.getArchivedPipelineSongs).mockResolvedValue([
        songWithMultiplePooVotes,
      ]);

      renderWithProviders(
        <ArchivedTab
          artistId="artist-1"
          membership={baseMembership}
        />
      );

      // Wait for songs to load
      await screen.findByText('Discarded (1)');

      // Expand the discarded song
      const songTitle = await screen.findByText('Rejected Song');
      fireEvent.click(songTitle);

      // Should show both names
      expect(await screen.findByText(/Bob and Charlie shat on this song/)).toBeInTheDocument();
    });
  });
});
