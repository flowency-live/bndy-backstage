import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderEvents from '../events';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/events', mockSetLocation],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock event data with different sources
const mockEvents = [
  {
    id: 'event-1',
    name: 'Friday Night Live',
    date: '2026-06-15',
    startTime: '20:00',
    endTime: '23:00',
    venueId: 'venue-1',
    venueName: 'The Lion Inn',
    venueCity: 'Congleton',
    artistIds: ['artist-1'],
    artistName: 'The Rockers',
    location: { lat: 53.162, lng: -2.212 },
    source: 'user', // Artist-created (backstage_wizard equivalent)
    status: 'approved',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'event-2',
    name: 'Open Mic Night',
    date: '2026-06-16',
    startTime: '19:00',
    endTime: '22:00',
    venueId: 'venue-2',
    venueName: 'The Bear Head',
    venueCity: 'Congleton',
    artistIds: [],
    location: { lat: 53.158, lng: -2.215 },
    source: 'bndy.live', // Community submission (frontstage equivalent)
    status: 'approved',
    isOpenMic: true,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'event-3',
    name: 'Jazz Evening',
    date: '2026-06-17',
    startTime: '19:30',
    venueId: 'venue-3',
    venueName: 'Music Hall',
    venueCity: 'Sandbach',
    artistIds: ['artist-2'],
    artistName: 'Jazz Trio',
    location: { lat: 53.145, lng: -2.365 },
    source: 'bndy.core', // AI-created (integration_api equivalent)
    status: 'approved',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
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

describe('BuilderEvents', () => {
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

  const renderEvents = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BuilderEvents />
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderEvents();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderEvents();

      expect(screen.getByText('No Builder Selected')).toBeInTheDocument();
    });

    it('shows loading state while fetching events', () => {
      vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

      renderEvents();

      expect(screen.getByText(/loading events/i)).toBeInTheDocument();
    });

    it('displays events list when data loads', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });
      expect(screen.getByText('Open Mic Night')).toBeInTheDocument();
      expect(screen.getByText('Jazz Evening')).toBeInTheDocument();
    });

    it('shows event venue and date', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });
      expect(screen.getByText(/15 Jun/i)).toBeInTheDocument();
    });

    it('shows empty state when no events in coverage area', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: [] }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText(/no events found/i)).toBeInTheDocument();
      });
    });
  });

  describe('source badges', () => {
    it('shows artist badge for user-created events', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Friday Night Live').closest('[data-testid^="event-card"]');
      expect(within(eventCard!).getByText(/artist/i)).toBeInTheDocument();
    });

    it('shows community badge for bndy.live events', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Open Mic Night')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Open Mic Night').closest('[data-testid^="event-card"]');
      expect(within(eventCard!).getByText(/community/i)).toBeInTheDocument();
    });

    it('shows AI badge for bndy.core events', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Jazz Evening')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Jazz Evening').closest('[data-testid^="event-card"]');
      expect(within(eventCard!).getByText(/ai/i)).toBeInTheDocument();
    });
  });

  describe('edit permissions', () => {
    it('shows "Suggest Edit" button for artist-created events', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Friday Night Live').closest('[data-testid^="event-card"]');
      expect(within(eventCard!).getByRole('button', { name: /suggest edit/i })).toBeInTheDocument();
    });

    it('shows "Edit" button for community events', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Open Mic Night')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Open Mic Night').closest('[data-testid^="event-card"]');
      expect(within(eventCard!).getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });

    it('shows "Edit" and "Verify" buttons for AI-created events', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('Jazz Evening')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Jazz Evening').closest('[data-testid^="event-card"]');
      expect(within(eventCard!).getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
      expect(within(eventCard!).getByRole('button', { name: /verify/i })).toBeInTheDocument();
    });
  });

  describe('suggest edit flow', () => {
    it('opens suggest edit modal when clicking suggest edit', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Friday Night Live').closest('[data-testid^="event-card"]');
      const suggestButton = within(eventCard!).getByRole('button', { name: /suggest edit/i });
      await user.click(suggestButton);

      await waitFor(() => {
        expect(screen.getByText(/suggest changes/i)).toBeInTheDocument();
      });
    });

    it('sends notification when submitting suggestion', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        if (urlStr.includes('/notifications') && options?.method === 'POST') {
          return {
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Friday Night Live').closest('[data-testid^="event-card"]');
      const suggestButton = within(eventCard!).getByRole('button', { name: /suggest edit/i });
      await user.click(suggestButton);

      await waitFor(() => {
        expect(screen.getByText(/suggest changes/i)).toBeInTheDocument();
      });

      // Fill in suggestion
      const suggestionInput = screen.getByLabelText(/suggestion/i);
      await user.type(suggestionInput, 'Please update the start time to 21:00');

      const submitButton = screen.getByRole('button', { name: /send suggestion/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/notifications'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('event-1'),
          })
        );
      });
    });

    it('shows success toast after sending suggestion', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        if (urlStr.includes('/notifications') && options?.method === 'POST') {
          return {
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Friday Night Live').closest('[data-testid^="event-card"]');
      const suggestButton = within(eventCard!).getByRole('button', { name: /suggest edit/i });
      await user.click(suggestButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/suggestion/i)).toBeInTheDocument();
      });

      const suggestionInput = screen.getByLabelText(/suggestion/i);
      await user.type(suggestionInput, 'Please update the start time');

      const submitButton = screen.getByRole('button', { name: /send suggestion/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/suggestion sent/i),
          })
        );
      });
    });
  });

  describe('event counts', () => {
    it('shows total events count', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/events in coverage/i)).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('can filter by source type', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/events-in-coverage')) {
          return {
            ok: true,
            json: () => Promise.resolve({ events: mockEvents }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderEvents();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      });

      // Click filter to show only artist events
      const artistFilter = screen.getByRole('button', { name: /artist/i });
      await user.click(artistFilter);

      // Should show only Friday Night Live (artist event)
      expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      expect(screen.queryByText('Open Mic Night')).not.toBeInTheDocument();
      expect(screen.queryByText('Jazz Evening')).not.toBeInTheDocument();
    });
  });
});
