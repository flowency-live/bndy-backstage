import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VenueCoverage from '../venue-coverage';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/venue-coverage', vi.fn()],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Circle: () => <div data-testid="coverage-circle" />,
  Polygon: () => <div data-testid="coverage-polygon" />,
  Marker: ({ eventHandlers }: { eventHandlers?: { click?: () => void } }) => (
    <div data-testid="venue-marker" onClick={eventHandlers?.click} />
  ),
  useMapEvents: vi.fn(),
}));

// Mock data
const mockVenues = [
  { id: 'v1', name: 'The Lion Inn', latitude: 53.162, longitude: -2.212 },
  { id: 'v2', name: 'The Bear Head', latitude: 53.158, longitude: -2.215 },
  { id: 'v3', name: 'Music Hall', latitude: 53.481, longitude: -2.243 },
];

const mockBuilderVenues = [
  { id: 'bv1', builder_id: 'builder-1', venue_id: 'v1', selection: 'auto' },
  { id: 'bv2', builder_id: 'builder-1', venue_id: 'v2', selection: 'auto' },
];

const mockBuilder = {
  id: 'builder-1',
  user_id: 'user-1',
  name: 'Congleton Live Music',
  slug: 'congleton',
  description: 'Live music events in Congleton',
  branding: { logoUrl: '', tagline: '' },
  theme: {
    primaryColor: '#ff00ff',
    secondaryColor: '#00ffff',
    backgroundColor: '#0a0a0a',
    foregroundColor: '#ffffff',
    defaultMode: 'dark' as const,
  },
  coverage: { type: 'postcode_radius' as const, postcode: 'CW12 1AB', radius: 15 },
  status: 'draft' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockBuilderContext = {
  builders: [mockBuilder],
  currentBuilderId: 'builder-1',
  currentBuilder: mockBuilder,
  isLoading: false,
  error: null,
  hasBuilders: true,
  hasMultipleBuilders: false,
  selectBuilder: vi.fn(),
  clearBuilderSelection: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/lib/builder-context', () => ({
  useBuilder: () => mockBuilderContext,
}));

describe('VenueCoverage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockBuilderContext.currentBuilder = mockBuilder;
    mockBuilderContext.isLoading = false;
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VenueCoverage />
      </QueryClientProvider>
    );
  };

  const setupFetchMocks = (options?: {
    venuesError?: boolean;
    builderVenuesError?: boolean;
    saveError?: boolean;
  }) => {
    return vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      // GET venues
      if (urlStr.includes('/api/venues') && !urlStr.includes('/builders/')) {
        if (options?.venuesError) {
          return { ok: false, json: () => Promise.resolve({ error: 'Failed' }) } as Response;
        }
        return {
          ok: true,
          json: () => Promise.resolve({ venues: mockVenues }),
        } as Response;
      }

      // GET builder venues
      if (urlStr.includes('/api/builders/') && urlStr.includes('/venues') && opts?.method !== 'POST') {
        if (options?.builderVenuesError) {
          return { ok: false, json: () => Promise.resolve({ error: 'Failed' }) } as Response;
        }
        return {
          ok: true,
          json: () => Promise.resolve({ venues: mockBuilderVenues }),
        } as Response;
      }

      // POST bulk venues
      if (urlStr.includes('/api/builders/') && urlStr.includes('/venues/bulk')) {
        if (options?.saveError) {
          return { ok: false, json: () => Promise.resolve({ error: 'Save failed' }) } as Response;
        }
        return {
          ok: true,
          json: () => Promise.resolve({ created: 2, updated: 1, skipped: 0 }),
        } as Response;
      }

      // Postcode lookup
      if (urlStr.includes('postcodes.io')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            status: 200,
            result: { latitude: 53.162, longitude: -2.213 },
          }),
        } as Response;
      }

      return { ok: false } as Response;
    });
  };

  describe('loading states', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderPage();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderPage();

      expect(screen.getByText(/no builder selected/i)).toBeInTheDocument();
    });

    it('shows loading state while fetching venues', () => {
      vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

      renderPage();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('page rendering', () => {
    it('displays page title', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /venue coverage/i })).toBeInTheDocument();
      });
    });

    it('displays map container', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('displays mode selection buttons', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /radius/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /draw/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /individual/i })).toBeInTheDocument();
      });
    });

    it('displays save button', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });

  describe('initial data loading', () => {
    it('fetches all venues on mount', async () => {
      const fetchSpy = setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/venues'),
          expect.any(Object)
        );
      });
    });

    it('fetches builder venue selections on mount', async () => {
      const fetchSpy = setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1/venues'),
          expect.any(Object)
        );
      });
    });

    it('shows error toast when venues fetch fails', async () => {
      setupFetchMocks({ venuesError: true });

      renderPage();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
    });
  });

  describe('mode switching', () => {
    it('starts in radius mode by default', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        const radiusButton = screen.getByRole('button', { name: /radius/i });
        expect(radiusButton).toHaveAttribute('data-active', 'true');
      });
    });

    it('switches to polygon mode when draw button is clicked', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /draw/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /draw/i }));

      expect(screen.getByRole('button', { name: /draw/i })).toHaveAttribute('data-active', 'true');
    });

    it('switches to individual mode when individual button is clicked', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /individual/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /individual/i }));

      expect(screen.getByRole('button', { name: /individual/i })).toHaveAttribute('data-active', 'true');
    });
  });

  describe('radius mode', () => {
    it('shows postcode input in radius mode', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/postcode/i)).toBeInTheDocument();
      });
    });

    it('shows radius slider in radius mode', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });
    });

    it('pre-fills postcode from builder coverage', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        const postcodeInput = screen.getByPlaceholderText(/postcode/i);
        expect(postcodeInput).toHaveValue('CW12 1AB');
      });
    });

    it('pre-fills radius from builder coverage', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/15.*mi/i)).toBeInTheDocument();
      });
    });
  });

  describe('saving selection', () => {
    it('calls bulk API when save is clicked', async () => {
      const fetchSpy = setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1/venues/bulk'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('shows success toast after saving', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/saved|updated/i),
          })
        );
      });
    });

    it('shows error toast when save fails', async () => {
      setupFetchMocks({ saveError: true });
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
    });

    it('disables save button while saving', async () => {
      // Make the save request hang
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();

        if (urlStr.includes('/api/venues')) {
          return { ok: true, json: () => Promise.resolve({ venues: mockVenues }) } as Response;
        }
        if (urlStr.includes('/venues/bulk')) {
          return new Promise(() => {}); // Never resolves
        }
        if (urlStr.includes('/api/builders/') && urlStr.includes('/venues')) {
          return { ok: true, json: () => Promise.resolve({ venues: mockBuilderVenues }) } as Response;
        }
        if (urlStr.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({ status: 200, result: { latitude: 53.162, longitude: -2.213 } }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });

  describe('cancel functionality', () => {
    it('shows cancel button', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('resets selection when cancel is clicked', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      // Wait for the map to load with mode buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /individual/i })).toBeInTheDocument();
      });

      // Make some changes then cancel
      await user.click(screen.getByRole('button', { name: /individual/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should be back in radius mode
      expect(screen.getByRole('button', { name: /radius/i })).toHaveAttribute('data-active', 'true');
    });
  });

  describe('selected count display', () => {
    it('shows count of selected venues', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        // Initially has 2 venues selected from mockBuilderVenues
        expect(screen.getByText(/2.*venues.*selected/i)).toBeInTheDocument();
      });
    });
  });
});
