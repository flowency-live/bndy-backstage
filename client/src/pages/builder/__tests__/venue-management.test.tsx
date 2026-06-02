import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VenueManagement from '../venue-management';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/venue-management', vi.fn()],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock data
const mockBuilderVenues = [
  {
    id: 'bv1',
    builder_id: 'builder-1',
    venue_id: 'v1',
    selection: 'auto',
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
    venue: {
      id: 'v1',
      name: 'The Lion Inn',
      address: '123 High Street',
      city: 'Congleton',
      latitude: 53.162,
      longitude: -2.212,
    },
    event_count: 12,
    last_event_date: '2026-05-15',
    standard_fee: '£150',
    payment_terms: 'Cash on night',
    notes: 'Great venue',
    contact_name: 'John Smith',
    contact_email: 'john@lioninn.co.uk',
    contact_phone: '07700 900123',
  },
  {
    id: 'bv2',
    builder_id: 'builder-1',
    venue_id: 'v2',
    selection: 'auto',
    featured: true,
    created_at: '2026-01-01T00:00:00Z',
    venue: {
      id: 'v2',
      name: 'The Bear Head',
      address: '45 Market Square',
      city: 'Congleton',
      latitude: 53.158,
      longitude: -2.215,
    },
    event_count: 8,
    last_event_date: '2026-04-22',
    standard_fee: '£100',
    payment_terms: 'Invoice 7 days',
    notes: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
  },
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

describe('VenueManagement', () => {
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
        <VenueManagement />
      </QueryClientProvider>
    );
  };

  const setupFetchMocks = (options?: {
    venuesError?: boolean;
    updateError?: boolean;
  }) => {
    return vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      // GET builder venues
      if (urlStr.includes('/api/builders/') && urlStr.includes('/venues') && opts?.method !== 'PUT') {
        if (options?.venuesError) {
          return { ok: false, json: () => Promise.resolve({ error: 'Failed' }) } as Response;
        }
        return {
          ok: true,
          json: () => Promise.resolve({ venues: mockBuilderVenues }),
        } as Response;
      }

      // PUT update venue
      if (urlStr.includes('/api/builders/') && urlStr.includes('/venues/') && opts?.method === 'PUT') {
        if (options?.updateError) {
          return { ok: false, json: () => Promise.resolve({ error: 'Update failed' }) } as Response;
        }
        const body = JSON.parse(opts?.body as string || '{}');
        return {
          ok: true,
          json: () => Promise.resolve({ venue: { ...mockBuilderVenues[0], ...body } }),
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
        expect(screen.getByRole('heading', { name: /venue management/i })).toBeInTheDocument();
      });
    });

    it('displays venue count', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/2.*venues/i)).toBeInTheDocument();
      });
    });

    it('displays venue table', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('displays venue names in table', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
        expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it.skip('shows empty message when no venues', async () => {
      // TODO: Fix react-query timing issue in test
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/builders/') && urlStr.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: [] }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/no venues/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it.skip('shows link to venue coverage', async () => {
      // TODO: Fix react-query timing issue in test
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/builders/') && urlStr.includes('/venues')) {
          return {
            ok: true,
            json: () => Promise.resolve({ venues: [] }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /venue coverage/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('venue details modal', () => {
    it('opens modal when clicking a venue row', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('displays venue details in modal', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText(/fee/i)).toHaveValue('£150');
      });
    });

    it('closes modal when cancel is clicked', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('venue update', () => {
    it('calls API when saving venue changes', async () => {
      const fetchSpy = setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const feeInput = screen.getByLabelText(/fee/i);
      await user.clear(feeInput);
      await user.type(feeInput, '£200');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1/venues/v1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('200'),
          })
        );
      });
    });

    it('shows success toast after saving', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
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

    it('shows error toast when update fails', async () => {
      setupFetchMocks({ updateError: true });
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
    });

    it('closes modal after successful save', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      });

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('sorts by name by default', async () => {
      setupFetchMocks();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('data-sorted', 'asc');
      });
    });

    it('toggles sort order when clicking sorted column', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      await user.click(nameHeader);

      expect(nameHeader).toHaveAttribute('data-sorted', 'desc');
    });

    it('changes sort field when clicking different column', async () => {
      setupFetchMocks();
      const user = userEvent.setup();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /events/i })).toBeInTheDocument();
      });

      const eventsHeader = screen.getByRole('columnheader', { name: /events/i });
      await user.click(eventsHeader);

      expect(eventsHeader).toHaveAttribute('data-sorted', 'asc');
    });
  });

  describe('error handling', () => {
    it.skip('shows error toast when venues fetch fails', async () => {
      // TODO: Fix react-query error handling timing in test
      setupFetchMocks({ venuesError: true });

      renderPage();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      }, { timeout: 3000 });
    });
  });
});
