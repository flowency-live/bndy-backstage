import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MemberGate from '../member-gate';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', mockSetLocation],
}));

// Mock server auth
const mockServerAuth = {
  loading: false,
  isAuthenticated: true,
  checkAuth: vi.fn(),
};

vi.mock('@/hooks/useServerAuth', () => ({
  useServerAuth: () => mockServerAuth,
}));

// Mock user context
const mockUserContext = {
  currentArtistId: null,
  currentMembership: null,
  userProfile: null,
  isLoading: false,
  logout: vi.fn(),
};

vi.mock('@/lib/user-context', () => ({
  useUser: () => mockUserContext,
}));

// Mock builder context
const mockBuilderContext = {
  builders: [],
  currentBuilderId: null,
  currentBuilder: null,
  isLoading: false,
  hasBuilders: false,
  selectBuilder: vi.fn(),
  clearBuilderSelection: vi.fn(),
};

vi.mock('@/lib/builder-context', () => ({
  useBuilder: () => mockBuilderContext,
}));

describe('MemberGate Builder Redirect', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    // Reset to default state
    mockServerAuth.loading = false;
    mockServerAuth.isAuthenticated = true;
    mockUserContext.currentArtistId = null;
    mockUserContext.currentMembership = null;
    mockUserContext.userProfile = null;
    mockUserContext.isLoading = false;
    mockBuilderContext.builders = [];
    mockBuilderContext.hasBuilders = false;
    mockBuilderContext.currentBuilderId = null;
  });

  const renderMemberGate = (allowNoContextForDashboard = false) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemberGate allowNoContextForDashboard={allowNoContextForDashboard}>
          {({ contextId, membership, userProfile }) => (
            <div data-testid="gate-content">
              {contextId ? `Artist: ${contextId}` : 'No artist'}
            </div>
          )}
        </MemberGate>
      </QueryClientProvider>
    );
  };

  describe('when user has no artists but has builders', () => {
    beforeEach(() => {
      mockUserContext.userProfile = {
        user: { email: 'test@example.com', displayName: 'Test User' },
        artists: [], // No artists
      };
      mockBuilderContext.builders = [
        {
          id: 'builder-1',
          user_id: 'user-1',
          name: 'Congleton Live Music',
          slug: 'congleton',
          description: 'Live music in Congleton',
          branding: { logoUrl: null, tagline: 'Music for Congleton' },
          theme: {
            primaryColor: '#ff00ff',
            secondaryColor: '#00ffff',
            backgroundColor: '#0a0a0a',
            foregroundColor: '#ffffff',
            defaultMode: 'dark' as const,
          },
          coverage: { type: 'postcode_radius' as const, postcode: 'CW12 1AB', radius: 15 },
          status: 'published' as const,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ];
      mockBuilderContext.hasBuilders = true;
    });

    it('redirects to /builder when accessing dashboard', async () => {
      renderMemberGate(true);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith('/builder');
      });
    });

    it('auto-selects single builder', async () => {
      renderMemberGate(true);

      await waitFor(() => {
        expect(mockBuilderContext.selectBuilder).toHaveBeenCalledWith('builder-1');
      });
    });
  });

  describe('when user has both artists and builders', () => {
    beforeEach(() => {
      mockUserContext.userProfile = {
        user: { email: 'test@example.com', displayName: 'Test User' },
        artists: [
          {
            artist_id: 'artist-1',
            name: 'Test Band',
            role: 'admin',
            resolved_display_name: 'Test User',
            color: '#ff0000',
            icon: 'fa-music',
          },
        ],
      };
      mockUserContext.currentArtistId = 'artist-1';
      mockUserContext.currentMembership = mockUserContext.userProfile.artists[0];
      mockBuilderContext.builders = [
        {
          id: 'builder-1',
          user_id: 'user-1',
          name: 'Congleton Live Music',
          slug: 'congleton',
        },
      ];
      mockBuilderContext.hasBuilders = true;
    });

    it('does not redirect, shows normal dashboard', async () => {
      renderMemberGate(true);

      await waitFor(() => {
        expect(screen.getByTestId('gate-content')).toHaveTextContent('Artist: artist-1');
      });

      expect(mockSetLocation).not.toHaveBeenCalledWith('/builder');
    });
  });

  describe('when user has only artists (no builders)', () => {
    beforeEach(() => {
      mockUserContext.userProfile = {
        user: { email: 'test@example.com', displayName: 'Test User' },
        artists: [
          {
            artist_id: 'artist-1',
            name: 'Test Band',
            role: 'admin',
            resolved_display_name: 'Test User',
            color: '#ff0000',
            icon: 'fa-music',
          },
        ],
      };
      mockUserContext.currentArtistId = 'artist-1';
      mockUserContext.currentMembership = mockUserContext.userProfile.artists[0];
      mockBuilderContext.builders = [];
      mockBuilderContext.hasBuilders = false;
    });

    it('shows normal dashboard without redirect', async () => {
      renderMemberGate(true);

      await waitFor(() => {
        expect(screen.getByTestId('gate-content')).toHaveTextContent('Artist: artist-1');
      });

      expect(mockSetLocation).not.toHaveBeenCalledWith('/builder');
    });
  });
});
