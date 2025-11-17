import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider, useUser } from '../user-context';
import { server } from '@/test/setupTests';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';

const API_BASE = 'https://api.bndy.co.uk';

// Mock useServerAuth hook
vi.mock('@/hooks/useServerAuth', () => ({
  useServerAuth: vi.fn(() => ({
    session: { user: { id: 'user-1' }, session: { expiresAt: Date.now() + 3600000 } },
    isAuthenticated: true,
    loading: false,
    signOut: vi.fn(),
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <UserProvider>{children}</UserProvider>
      </QueryClientProvider>
    );
  };
};

describe('UserContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('User Profile Loading', () => {
    it('should load user profile when authenticated', async () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.id).toBe('user-1');
      expect(result.current.user?.displayName).toBe('Test User');
    });

    it('should load artist memberships when authenticated', async () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userProfile).not.toBeNull();
      expect(result.current.userProfile?.artists).toHaveLength(1);
      expect(result.current.userProfile?.artists[0].artist_id).toBe('artist-1');
    });

    it('should handle profile fetch errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/users/profile`, () => {
          return HttpResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('Artist Selection', () => {
    it('should auto-select artist when user has only one membership', async () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentArtistId).toBe('artist-1');
      });

      expect(localStorage.getItem('bndy-selected-artist-id')).toBe('artist-1');
    });

    it('should allow manual artist selection', async () => {
      server.use(
        http.get(`${API_BASE}/api/memberships/me`, () => {
          return HttpResponse.json({
            user: { id: 'user-1' },
            artists: [
              {
                id: 'membership-1',
                membership_id: 'membership-1',
                user_id: 'user-1',
                artist_id: 'artist-1',
                role: 'owner',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
              {
                id: 'membership-2',
                membership_id: 'membership-2',
                user_id: 'user-1',
                artist_id: 'artist-2',
                role: 'member',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
            ],
          });
        })
      );

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectArtist('artist-2');
      });

      expect(result.current.currentArtistId).toBe('artist-2');
      expect(localStorage.getItem('bndy-selected-artist-id')).toBe('artist-2');
    });

    it('should restore artist selection from localStorage', async () => {
      localStorage.setItem('bndy-selected-artist-id', 'artist-1');

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentArtistId).toBe('artist-1');
      });
    });

    it('should clear invalid artist selection from localStorage', async () => {
      localStorage.setItem('bndy-selected-artist-id', 'invalid-artist-id');

      server.use(
        http.get(`${API_BASE}/api/memberships/me`, () => {
          return HttpResponse.json({
            user: { id: 'user-1' },
            artists: [
              {
                id: 'membership-1',
                membership_id: 'membership-1',
                user_id: 'user-1',
                artist_id: 'artist-1',
                role: 'owner',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
              {
                id: 'membership-2',
                membership_id: 'membership-2',
                user_id: 'user-1',
                artist_id: 'artist-2',
                role: 'member',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
            ],
          });
        })
      );

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(localStorage.getItem('bndy-selected-artist-id')).toBeNull();
      });
    });

    it('should migrate legacy localStorage keys', async () => {
      localStorage.setItem('bndy-selected-band-id', 'artist-1');

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(localStorage.getItem('bndy-selected-artist-id')).toBe('artist-1');
        expect(localStorage.getItem('bndy-selected-band-id')).toBeNull();
      });
    });

    it('should clear artist selection', async () => {
      server.use(
        http.get(`${API_BASE}/api/memberships/me`, () => {
          return HttpResponse.json({
            user: { id: 'user-1' },
            artists: [
              {
                id: 'membership-1',
                membership_id: 'membership-1',
                user_id: 'user-1',
                artist_id: 'artist-1',
                role: 'owner',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
              {
                id: 'membership-2',
                membership_id: 'membership-2',
                user_id: 'user-1',
                artist_id: 'artist-2',
                role: 'member',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
            ],
          });
        })
      );

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With multiple artists, need to manually select first
      act(() => {
        result.current.selectArtist('artist-1');
      });

      await waitFor(() => {
        expect(result.current.currentArtistId).toBe('artist-1');
      });

      act(() => {
        result.current.clearArtistSelection();
      });

      expect(result.current.currentArtistId).toBeNull();
      expect(localStorage.getItem('bndy-selected-artist-id')).toBeNull();
    });
  });

  describe('Current Membership', () => {
    it('should return current membership when artist is selected', async () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentMembership).not.toBeNull();
      });

      expect(result.current.currentMembership?.artist_id).toBe('artist-1');
      expect(result.current.currentMembership?.role).toBe('owner');
    });

    it('should return null membership when no artist selected', async () => {
      server.use(
        http.get(`${API_BASE}/api/memberships/me`, () => {
          return HttpResponse.json({
            user: { id: 'user-1' },
            artists: [
              {
                id: 'membership-1',
                membership_id: 'membership-1',
                user_id: 'user-1',
                artist_id: 'artist-1',
                role: 'owner',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
              {
                id: 'membership-2',
                membership_id: 'membership-2',
                user_id: 'user-1',
                artist_id: 'artist-2',
                role: 'member',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
            ],
          });
        })
      );

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With multiple artists, no auto-selection
      expect(result.current.currentMembership).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify users with multiple artists', async () => {
      server.use(
        http.get(`${API_BASE}/api/memberships/me`, () => {
          return HttpResponse.json({
            user: { id: 'user-1' },
            artists: [
              {
                id: 'membership-1',
                membership_id: 'membership-1',
                user_id: 'user-1',
                artist_id: 'artist-1',
                role: 'owner',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
              {
                id: 'membership-2',
                membership_id: 'membership-2',
                user_id: 'user-1',
                artist_id: 'artist-2',
                role: 'member',
                membership_type: 'full',
                status: 'active',
                joined_at: '2025-01-01T00:00:00Z',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
              },
            ],
          });
        })
      );

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMultipleArtists).toBe(true);
    });

    it('should verify artist access correctly', async () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccessArtist('artist-1')).toBe(true);
      expect(result.current.canAccessArtist('invalid-artist')).toBe(false);
    });
  });

  describe('useUser Hook Error Handling', () => {
    it('should throw error when used outside UserProvider', () => {
      expect(() => {
        renderHook(() => useUser());
      }).toThrow('useUser must be used within a UserProvider');
    });
  });
});
