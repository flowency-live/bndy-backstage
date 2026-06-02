import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderVenues from '../venues';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/venues', mockSetLocation],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock venue data
const mockVenues = [
  {
    id: 'venue-1',
    name: 'The Lion Inn',
    address: '123 High Street',
    city: 'Congleton',
    latitude: 53.162,
    longitude: -2.212,
  },
  {
    id: 'venue-2',
    name: 'The Bear Head',
    address: '45 Market Square',
    city: 'Congleton',
    latitude: 53.158,
    longitude: -2.215,
  },
  {
    id: 'venue-3',
    name: 'Music Hall',
    address: '78 Station Road',
    city: 'Sandbach',
    latitude: 53.145,
    longitude: -2.365,
  },
];

// Mock builder venue selections
const mockBuilderVenues = [
  {
    id: 'bv-1',
    builder_id: 'builder-1',
    venue_id: 'venue-1',
    selection: 'auto' as const,
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'bv-2',
    builder_id: 'builder-1',
    venue_id: 'venue-2',
    selection: 'excluded' as const,
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
  },
];

// Mock builder context
const mockBuilder = {
  id: 'builder-1',
  user_id: 'user-1',
  name: 'Congleton Live Music',
  slug: 'congleton',
  description: 'Live music events in Congleton',
  branding: { logoUrl: 'https://example.com/logo.png', tagline: 'Music for Congleton' },
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

const mockRefresh = vi.fn();

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
  refresh: mockRefresh,
};

vi.mock('@/lib/builder-context', () => ({
  useBuilder: () => mockBuilderContext,
}));

describe('BuilderVenues', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockBuilderContext.currentBuilder = mockBuilder;
    mockBuilderContext.isLoading = false;
  });

  const renderVenues = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BuilderVenues />
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderVenues();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderVenues();

      expect(screen.getByText('No Builder Selected')).toBeInTheDocument();
    });

    it('shows loading state while fetching venues', () => {
      vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

      renderVenues();

      expect(screen.getByText(/loading venues/i)).toBeInTheDocument();
    });

    it('displays venues list when data loads', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });
      expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      expect(screen.getByText('Music Hall')).toBeInTheDocument();
    });

    it('shows venue address and city', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: [] }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        expect(screen.getByText('123 High Street')).toBeInTheDocument();
      });
      // Multiple venues have Congleton as city
      expect(screen.getAllByText(/Congleton/).length).toBeGreaterThanOrEqual(1);
    });

    it('shows empty state when no venues in coverage area', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: [] }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: [] }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        expect(screen.getByText(/no venues found/i)).toBeInTheDocument();
      });
    });
  });

  describe('venue selection', () => {
    it('shows included badge for auto-selected venues', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      // Find venue-1 card and check it has an "included" indicator
      const lionInnCard = screen.getByText('The Lion Inn').closest('[data-testid^="venue-card"]');
      expect(lionInnCard).toBeInTheDocument();
      expect(within(lionInnCard!).getByText(/included/i)).toBeInTheDocument();
    });

    it('shows excluded badge for excluded venues', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      });

      // Find venue-2 card and check it has an "excluded" indicator
      const bearHeadCard = screen.getByText('The Bear Head').closest('[data-testid^="venue-card"]');
      expect(bearHeadCard).toBeInTheDocument();
      expect(within(bearHeadCard!).getByText(/excluded/i)).toBeInTheDocument();
    });

    it('can toggle venue from included to excluded', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/builder-1/venues/venue-1') && options?.method === 'PUT') {
          return {
            ok: true,
            json: () => Promise.resolve({
              venue: { ...mockBuilderVenues[0], selection: 'excluded' }
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      // Find and click the exclude button for venue-1
      const lionInnCard = screen.getByText('The Lion Inn').closest('[data-testid^="venue-card"]');
      const excludeButton = within(lionInnCard!).getByRole('button', { name: /exclude/i });
      await user.click(excludeButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1/venues/venue-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('excluded'),
          })
        );
      });
    });

    it('can toggle venue from excluded to included', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/builder-1/venues/venue-2') && options?.method === 'PUT') {
          return {
            ok: true,
            json: () => Promise.resolve({
              venue: { ...mockBuilderVenues[1], selection: 'auto' }
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      });

      // Find and click the include button for venue-2
      const bearHeadCard = screen.getByText('The Bear Head').closest('[data-testid^="venue-card"]');
      const includeButton = within(bearHeadCard!).getByRole('button', { name: /include/i });
      await user.click(includeButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1/venues/venue-2'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('auto'),
          })
        );
      });
    });

    it('shows success toast when venue selection changes', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/builder-1/venues/venue-1') && options?.method === 'PUT') {
          return {
            ok: true,
            json: () => Promise.resolve({
              venue: { ...mockBuilderVenues[0], selection: 'excluded' }
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnCard = screen.getByText('The Lion Inn').closest('[data-testid^="venue-card"]');
      const excludeButton = within(lionInnCard!).getByRole('button', { name: /exclude/i });
      await user.click(excludeButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/venue.*updated|excluded/i),
          })
        );
      });
    });

    it('shows error toast when venue selection fails', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        if (typeof url === 'string' && url.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/builder-1/venues/venue-1') && options?.method === 'PUT') {
          return {
            ok: false,
            json: () => Promise.resolve({ error: 'Update failed' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/') && url.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnCard = screen.getByText('The Lion Inn').closest('[data-testid^="venue-card"]');
      const excludeButton = within(lionInnCard!).getByRole('button', { name: /exclude/i });
      await user.click(excludeButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('venue counts', () => {
    it('shows total venues count', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (urlStr.includes('/api/builders/builder-1/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        // Count and label are in separate spans
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/venues in coverage area/i)).toBeInTheDocument();
      });
    });

    it('shows included vs excluded counts', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (urlStr.includes('/api/builders/builder-1/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();

      await waitFor(() => {
        // 2 included (venue-1 auto, venue-3 not in selections = auto by default)
        // 1 excluded (venue-2)
        const includedSpan = screen.getByText('2');
        expect(includedSpan.nextSibling).toHaveTextContent('included');
        const excludedSpan = screen.getByText('1');
        expect(excludedSpan.nextSibling).toHaveTextContent('excluded');
      });
    });
  });

  describe('filtering', () => {
    it('can filter to show only included venues', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (urlStr.includes('/api/builders/builder-1/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      // Click filter to show only included
      const includedFilter = screen.getByRole('button', { name: /show included/i });
      await user.click(includedFilter);

      // Should show Lion Inn and Music Hall, not Bear Head
      expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      expect(screen.getByText('Music Hall')).toBeInTheDocument();
      expect(screen.queryByText('The Bear Head')).not.toBeInTheDocument();
    });

    it('can filter to show only excluded venues', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/venues-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockVenues }),
          } as Response;
        }
        if (urlStr.includes('/api/builders/builder-1/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: mockBuilderVenues }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderVenues();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      });

      // Click filter to show only excluded
      const excludedFilter = screen.getByRole('button', { name: /show excluded/i });
      await user.click(excludedFilter);

      // Should show only Bear Head
      expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      expect(screen.queryByText('The Lion Inn')).not.toBeInTheDocument();
      expect(screen.queryByText('Music Hall')).not.toBeInTheDocument();
    });
  });
});
