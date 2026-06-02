import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SideNav from '../side-nav';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()],
}));

// Mock server auth
vi.mock('@/hooks/useServerAuth', () => ({
  useServerAuth: () => ({
    session: { user: { email: 'test@example.com' } },
    signOut: vi.fn(),
  }),
}));

// Mock user context
const mockUserContext = {
  userProfile: {
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
  },
  currentArtistId: 'artist-1',
  currentMembership: {
    artist_id: 'artist-1',
    name: 'Test Band',
    role: 'admin',
    resolved_display_name: 'Test User',
    color: '#ff0000',
    icon: 'fa-music',
  },
  selectArtist: vi.fn(),
  clearArtistSelection: vi.fn(),
  isUberAdmin: false,
  isStealthMode: false,
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
  error: null,
  hasBuilders: false,
  hasMultipleBuilders: false,
  selectBuilder: vi.fn(),
  clearBuilderSelection: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/lib/builder-context', () => ({
  useBuilder: () => mockBuilderContext,
}));

// Mock other dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/onboarding-tour', () => ({
  restartOnboardingTour: vi.fn(),
}));

vi.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

describe('SideNav Builder Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderSideNav = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SideNav isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );
  };

  describe('when user has no builders', () => {
    beforeEach(() => {
      mockBuilderContext.builders = [];
      mockBuilderContext.hasBuilders = false;
      mockBuilderContext.currentBuilderId = null;
      mockBuilderContext.currentBuilder = null;
    });

    it('shows artist context switcher', () => {
      renderSideNav();

      expect(screen.getByTestId('button-context-switcher')).toBeInTheDocument();
    });

    it('does not show builder dashboard nav item', () => {
      renderSideNav();

      // Builder nav item should not appear
      expect(screen.queryByTestId('nav-builder')).not.toBeInTheDocument();
    });

    it('shows standard navigation items', () => {
      renderSideNav();

      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-calendar')).toBeInTheDocument();
    });
  });

  describe('when user has builders', () => {
    beforeEach(() => {
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
      mockBuilderContext.currentBuilderId = null;
      mockBuilderContext.currentBuilder = null;
    });

    it('shows persona selector with builder option', async () => {
      renderSideNav();
      const user = userEvent.setup();

      // Context switcher should exist
      const switcher = screen.getByTestId('button-context-switcher');
      expect(switcher).toBeInTheDocument();

      // Click to open dropdown
      await user.click(switcher);

      // Should see builder section in dropdown
      expect(screen.getByText('Congleton Live Music')).toBeInTheDocument();
    });

    it('shows builder dashboard nav item', () => {
      renderSideNav();

      expect(screen.getByTestId('nav-builder')).toBeInTheDocument();
    });
  });

  describe('when user is in builder context', () => {
    const builder = {
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
    };

    beforeEach(() => {
      mockBuilderContext.builders = [builder];
      mockBuilderContext.hasBuilders = true;
      mockBuilderContext.currentBuilderId = 'builder-1';
      mockBuilderContext.currentBuilder = builder;

      // Clear artist context when in builder mode
      mockUserContext.currentArtistId = null;
      mockUserContext.currentMembership = null;
    });

    it('shows builder name in context switcher', () => {
      renderSideNav();

      const switcher = screen.getByTestId('button-context-switcher');
      expect(switcher).toHaveTextContent('Congleton Live Music');
    });

    it('shows builder info in context switcher', () => {
      renderSideNav();

      const switcher = screen.getByTestId('button-context-switcher');
      expect(switcher).toHaveTextContent('congleton.bndy.live');
    });
  });
});
