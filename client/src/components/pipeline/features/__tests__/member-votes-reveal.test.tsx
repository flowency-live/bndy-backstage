/**
 * MemberVotesReveal Component Tests
 *
 * Tests for displaying member voting status:
 * - Shows all members including those who haven't voted
 * - Hides actual vote values when showPendingOnly is true
 * - Shows "Not yet voted" for members without votes
 * - Shows "Voted" indicator when hiding values
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MemberVotesReveal from '../member-votes-reveal';
import type { ArtistMembership } from '@/types/api';

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

describe('MemberVotesReveal', () => {
  const memberships: ArtistMembership[] = [
    createMembership('user-1', 'Alice'),
    createMembership('user-2', 'Bob'),
    createMembership('user-3', 'Charlie'),
    createMembership('user-4', 'Dave'),
  ];

  const allVotes = {
    'user-1': { value: 5, updated_at: '2025-01-01T10:00:00Z' },
    'user-2': { value: 3, updated_at: '2025-01-01T11:00:00Z' },
    'user-3': { value: 0, updated_at: '2025-01-01T12:00:00Z' }, // Poo vote
    'user-4': { value: 4, updated_at: '2025-01-01T13:00:00Z' },
  };

  const partialVotes = {
    'user-1': { value: 5, updated_at: '2025-01-01T10:00:00Z' },
    'user-2': { value: 3, updated_at: '2025-01-01T11:00:00Z' },
    // user-3 and user-4 have not voted
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reveal button', () => {
    it('should show "Show member votes" button initially', () => {
      render(
        <MemberVotesReveal
          votes={allVotes}
          memberships={memberships}
          votingScale={5}
        />
      );

      expect(screen.getByText('Show member votes')).toBeInTheDocument();
    });

    it('should reveal votes when button is clicked', () => {
      render(
        <MemberVotesReveal
          votes={allVotes}
          memberships={memberships}
          votingScale={5}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      expect(screen.getByText('Member Votes')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('showing all members including non-voters', () => {
    it('should display members who have not voted when showPendingOnly is false', () => {
      render(
        <MemberVotesReveal
          votes={partialVotes}
          memberships={memberships}
          votingScale={5}
          currentUserId="user-1"
          showPendingOnly={false}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      // Members who voted
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();

      // Members who haven't voted should show "Not yet voted"
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Dave')).toBeInTheDocument();
      expect(screen.getAllByText('Not yet voted')).toHaveLength(2);
    });

    it('should show poo emoji for vote value 0', () => {
      render(
        <MemberVotesReveal
          votes={allVotes}
          memberships={memberships}
          votingScale={5}
          currentUserId="user-1"
          showPendingOnly={false}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      // Charlie voted 0 (poo)
      expect(screen.getByTitle('Pass')).toBeInTheDocument();
      expect(screen.getByText('💩')).toBeInTheDocument();
    });
  });

  describe('showPendingOnly mode (user has not voted)', () => {
    it('should show "Voted" instead of actual values when showPendingOnly is true', () => {
      render(
        <MemberVotesReveal
          votes={partialVotes}
          memberships={memberships}
          votingScale={5}
          currentUserId="user-3" // User-3 hasn't voted
          showPendingOnly={true}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      // Should see "Voted" indicators, not star ratings
      expect(screen.getAllByText('Voted')).toHaveLength(2);

      // Should NOT see star ratings (5 stars would mean seeing filled stars)
      // The actual vote values should be hidden
      expect(screen.queryByTitle('Pass')).not.toBeInTheDocument();
    });

    it('should still show "Not yet voted" for non-voters when showPendingOnly is true', () => {
      render(
        <MemberVotesReveal
          votes={partialVotes}
          memberships={memberships}
          votingScale={5}
          currentUserId="user-3"
          showPendingOnly={true}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      expect(screen.getAllByText('Not yet voted')).toHaveLength(2);
    });
  });

  describe('sorting', () => {
    it('should sort voters before non-voters', () => {
      render(
        <MemberVotesReveal
          votes={partialVotes}
          memberships={memberships}
          votingScale={5}
          currentUserId="user-1"
          showPendingOnly={false}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      const memberNames = screen.getAllByText(/Alice|Bob|Charlie|Dave/);
      const nameOrder = memberNames.map(el => el.textContent);

      // Voters (Alice, Bob) should come before non-voters (Charlie, Dave)
      const aliceIndex = nameOrder.indexOf('Alice');
      const bobIndex = nameOrder.indexOf('Bob');
      const charlieIndex = nameOrder.indexOf('Charlie');
      const daveIndex = nameOrder.indexOf('Dave');

      expect(aliceIndex).toBeLessThan(charlieIndex);
      expect(aliceIndex).toBeLessThan(daveIndex);
      expect(bobIndex).toBeLessThan(charlieIndex);
      expect(bobIndex).toBeLessThan(daveIndex);
    });
  });

  describe('backwards compatibility', () => {
    it('should work without new props (original behavior)', () => {
      render(
        <MemberVotesReveal
          votes={allVotes}
          memberships={memberships}
          votingScale={5}
        />
      );

      fireEvent.click(screen.getByText('Show member votes'));

      // Should show all voters with their votes
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Dave')).toBeInTheDocument();
    });
  });
});
