import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlatformAdminGate from '../platform-admin-gate';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/godmode', mockSetLocation],
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
  isAuthenticated: true,
  isLoading: false,
  isUberAdmin: false,
  user: null,
  userProfile: null,
};

vi.mock('@/lib/user-context', () => ({
  useUser: () => mockUserContext,
}));

describe('PlatformAdminGate', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    // Reset to default state
    mockServerAuth.loading = false;
    mockServerAuth.isAuthenticated = true;
    mockUserContext.isAuthenticated = true;
    mockUserContext.isLoading = false;
    mockUserContext.isUberAdmin = false;
    mockUserContext.user = null;
    mockUserContext.userProfile = null;
  });

  const renderGate = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PlatformAdminGate>
          <div data-testid="protected-content">Godmode Content</div>
        </PlatformAdminGate>
      </QueryClientProvider>
    );
  };

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockServerAuth.isAuthenticated = false;
      mockUserContext.isAuthenticated = false;
    });

    it('redirects to /login', async () => {
      renderGate();

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith('/login');
      });
    });

    it('does not render protected content', () => {
      renderGate();

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated but not platformAdmin', () => {
    beforeEach(() => {
      mockServerAuth.isAuthenticated = true;
      mockUserContext.isAuthenticated = true;
      mockUserContext.isUberAdmin = false;
      mockUserContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        platformAdmin: false,
      };
    });

    it('shows 403 forbidden message', async () => {
      renderGate();

      await waitFor(() => {
        expect(screen.getByText(/forbidden/i)).toBeInTheDocument();
      });
    });

    it('does not render protected content', () => {
      renderGate();

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('does not redirect to login', async () => {
      renderGate();

      await waitFor(() => {
        expect(mockSetLocation).not.toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('when user is platformAdmin', () => {
    beforeEach(() => {
      mockServerAuth.isAuthenticated = true;
      mockUserContext.isAuthenticated = true;
      mockUserContext.isUberAdmin = true;
      mockUserContext.user = {
        id: 'user-1',
        email: 'jason@flowency.co.uk',
        displayName: 'Jason',
        platformAdmin: true,
      };
    });

    it('renders protected content', async () => {
      renderGate();

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('does not redirect', async () => {
      renderGate();

      await waitFor(() => {
        expect(mockSetLocation).not.toHaveBeenCalled();
      });
    });

    it('does not show forbidden message', async () => {
      renderGate();

      await waitFor(() => {
        expect(screen.queryByText(/forbidden/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('when loading', () => {
    beforeEach(() => {
      mockServerAuth.loading = true;
      mockUserContext.isLoading = true;
    });

    it('shows loading state', () => {
      renderGate();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('does not render protected content', () => {
      renderGate();

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('does not redirect', () => {
      renderGate();

      expect(mockSetLocation).not.toHaveBeenCalled();
    });
  });
});
