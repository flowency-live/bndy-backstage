/**
 * VotingSongCard Component Tests
 *
 * Tests for displaying MemberVotesReveal during voting phase:
 * - Shows MemberVotesReveal when showMemberVotes is true and card is expanded
 * - Passes showPendingOnly=true when user has NOT voted
 * - Passes showPendingOnly=false when user HAS voted
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VotingSongCard from '../voting-song-card';
import type { ArtistMembership } from '@/types/api';

// Mock the services
vi.mock('@/lib/services/artists-service', () => ({
  artistsService: {
    votePipelineSong: vi.fn(),
    deletePipelineSong: vi.fn(),
    updatePipelineStatus: vi.fn(),
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

describe('VotingSongCard', () => {
  const memberships: ArtistMembership[] = [
    createMembership('user-1', 'Alice'),
    createMembership('user-2', 'Bob'),
    createMembership('user-3', 'Charlie'),
  ];

  const baseSong = {
    id: 'song-1',
    artist_id: 'artist-1',
    song_id: 'global-song-1',
    status: 'voting',
    voting_scale: 5 as const,
    suggested_by_user_id: 'user-1',
    suggested_comment: 'Great song!',
    globalSong: {
      id: 'global-song-1',
      title: 'Test Song',
      artist_name: 'Test Artist',
      album: 'Test Album',
      spotify_url: 'https://open.spotify.com/track/123',
      thumbnail_url: 'https://example.com/thumb.jpg',
    },
  };

  // Partial votes - user-1 has voted, user-2 and user-3 haven't
  const partialVotes = {
    'user-1': { value: 4, updated_at: '2025-01-01T10:00:00Z' },
  };

  // All votes in
  const allVotes = {
    'user-1': { value: 5, updated_at: '2025-01-01T10:00:00Z' },
    'user-2': { value: 3, updated_at: '2025-01-01T11:00:00Z' },
    'user-3': { value: 4, updated_at: '2025-01-01T12:00:00Z' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MemberVotesReveal during voting phase', () => {
    it('should show MemberVotesReveal when expanded, showMemberVotes=true, and votes are partial', () => {
      const song = { ...baseSong, votes: partialVotes };

      renderWithProviders(
        <VotingSongCard
          song={song}
          userId="user-1"
          memberCount={3}
          isExpanded={true}
          onToggleExpand={vi.fn()}
          memberships={memberships}
          showMemberVotes={true}
        />
      );

      // Should show the member votes button during voting phase
      expect(screen.getByText('Show member votes')).toBeInTheDocument();
    });

    it('should NOT show MemberVotesReveal when showMemberVotes=false', () => {
      const song = { ...baseSong, votes: partialVotes };

      renderWithProviders(
        <VotingSongCard
          song={song}
          userId="user-1"
          memberCount={3}
          isExpanded={true}
          onToggleExpand={vi.fn()}
          memberships={memberships}
          showMemberVotes={false}
        />
      );

      expect(screen.queryByText('Show member votes')).not.toBeInTheDocument();
    });

    it('should show "Not yet voted" for members who have not voted when user has voted', () => {
      const song = { ...baseSong, votes: partialVotes };

      renderWithProviders(
        <VotingSongCard
          song={song}
          userId="user-1" // user-1 has voted
          memberCount={3}
          isExpanded={true}
          onToggleExpand={vi.fn()}
          memberships={memberships}
          showMemberVotes={true}
        />
      );

      // Click to reveal votes
      fireEvent.click(screen.getByText('Show member votes'));

      // Should show "Not yet voted" for Bob and Charlie
      expect(screen.getAllByText('Not yet voted')).toHaveLength(2);
    });

    it('should show "Voted" (hidden values) for voters when current user has NOT voted', () => {
      const song = { ...baseSong, votes: partialVotes };

      renderWithProviders(
        <VotingSongCard
          song={song}
          userId="user-2" // user-2 has NOT voted
          memberCount={3}
          isExpanded={true}
          onToggleExpand={vi.fn()}
          memberships={memberships}
          showMemberVotes={true}
        />
      );

      // Click to reveal votes
      fireEvent.click(screen.getByText('Show member votes'));

      // Should show "Voted" for Alice (hiding the actual value)
      expect(screen.getByText('Voted')).toBeInTheDocument();

      // Should show "Not yet voted" for user-2 (current user) and user-3
      expect(screen.getAllByText('Not yet voted')).toHaveLength(2);
    });
  });

  describe('MemberVotesReveal when all votes collected', () => {
    it('should show MemberVotesReveal with all votes when all votes are in', () => {
      const song = { ...baseSong, votes: allVotes };

      renderWithProviders(
        <VotingSongCard
          song={song}
          userId="user-1"
          memberCount={3}
          isExpanded={true}
          onToggleExpand={vi.fn()}
          memberships={memberships}
          showMemberVotes={true}
        />
      );

      // Should show the member votes button
      expect(screen.getByText('Show member votes')).toBeInTheDocument();

      // Click to reveal
      fireEvent.click(screen.getByText('Show member votes'));

      // All members should be visible with their names
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });
});
