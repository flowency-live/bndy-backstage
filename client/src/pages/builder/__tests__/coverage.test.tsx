import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderCoverage from '../coverage';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/coverage', mockSetLocation],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock react-leaflet - avoid actual map rendering in tests
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Circle: ({ center, radius }: { center: [number, number]; radius: number }) => (
    <div data-testid="coverage-circle" data-center={JSON.stringify(center)} data-radius={radius} />
  ),
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
  }),
}));

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

describe('BuilderCoverage', () => {
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

  const renderCoverage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BuilderCoverage />
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderCoverage();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderCoverage();

      expect(screen.getByText('No Builder Selected')).toBeInTheDocument();
    });

    it('displays current postcode in form', () => {
      renderCoverage();

      const postcodeInput = screen.getByLabelText(/postcode/i);
      expect(postcodeInput).toHaveValue('CW12 1AB');
    });

    it('displays current radius in form', () => {
      renderCoverage();

      // Radius is shown in the label area
      expect(screen.getByText('15 miles')).toBeInTheDocument();
    });

    it('shows map container', () => {
      renderCoverage();

      expect(screen.getByTestId('mock-map-container')).toBeInTheDocument();
    });

    it('shows coverage circle on map with correct radius', () => {
      renderCoverage();

      const circle = screen.getByTestId('coverage-circle');
      // Radius in meters (15 miles * 1609.34)
      expect(circle).toHaveAttribute('data-radius', expect.stringContaining('24140'));
    });
  });

  describe('postcode validation', () => {
    it('shows error for empty postcode', async () => {
      renderCoverage();
      const user = userEvent.setup();

      const postcodeInput = screen.getByLabelText(/postcode/i);
      await user.clear(postcodeInput);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/postcode is required/i)).toBeInTheDocument();
    });

    it('validates postcode format', async () => {
      renderCoverage();
      const user = userEvent.setup();

      const postcodeInput = screen.getByLabelText(/postcode/i);
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'invalid');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/invalid postcode/i)).toBeInTheDocument();
    });

    it('looks up postcode via API when valid format entered', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 200,
              result: { latitude: 53.154, longitude: -2.217 },
            }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const postcodeInput = screen.getByLabelText(/postcode/i);
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'CW12 2AB');

      // Wait for debounced lookup
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('postcodes.io')
        );
      }, { timeout: 2000 });
    });

    it('shows error for non-existent postcode', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({ status: 404 }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const postcodeInput = screen.getByLabelText(/postcode/i);
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'ZZ99 9ZZ');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/postcode not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('radius adjustment', () => {
    it('shows radius slider with min and max labels', () => {
      renderCoverage();

      // Slider shows min/max labels
      expect(screen.getByText('5 miles')).toBeInTheDocument();
      expect(screen.getByText('50 miles')).toBeInTheDocument();
    });

    it('slider has correct aria attributes', () => {
      renderCoverage();

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '5');
      expect(slider).toHaveAttribute('aria-valuemax', '50');
      expect(slider).toHaveAttribute('aria-valuenow', '15');
    });

    it('shows current radius in summary section', () => {
      renderCoverage();

      // Summary shows radius in miles (also appears in slider label) and km
      const milesElements = screen.getAllByText(/15 miles/);
      expect(milesElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/24 km/)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls API to update coverage on save', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 200,
              result: { latitude: 53.154, longitude: -2.217 },
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/')) {
          return {
            ok: true,
            json: () => Promise.resolve({ builder: mockBuilder }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('postcode_radius'),
          })
        );
      });
    });

    it('shows success toast on successful save', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 200,
              result: { latitude: 53.154, longitude: -2.217 },
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/')) {
          return {
            ok: true,
            json: () => Promise.resolve({ builder: mockBuilder }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('saved'),
          })
        );
      });
    });

    it('shows error toast on failed save', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 200,
              result: { latitude: 53.154, longitude: -2.217 },
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/')) {
          return {
            ok: false,
            json: () => Promise.resolve({ error: 'Update failed' }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });

    it('refreshes builder context after successful save', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 200,
              result: { latitude: 53.154, longitude: -2.217 },
            }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/api/builders/')) {
          return {
            ok: true,
            json: () => Promise.resolve({ builder: mockBuilder }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('map preview', () => {
    it('updates map center when postcode changes', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('postcodes.io')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 200,
              result: { latitude: 53.5, longitude: -2.5 },
            }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      renderCoverage();
      const user = userEvent.setup();

      const postcodeInput = screen.getByLabelText(/postcode/i);
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'M1 1AA');

      await waitFor(() => {
        const circle = screen.getByTestId('coverage-circle');
        const center = JSON.parse(circle.getAttribute('data-center') || '[]');
        expect(center[0]).toBeCloseTo(53.5, 1);
      }, { timeout: 2000 });
    });
  });
});
