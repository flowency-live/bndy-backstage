import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderBranding from '../branding';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/branding', mockSetLocation],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
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

describe('BuilderBranding', () => {
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

  const renderBranding = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BuilderBranding />
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderBranding();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderBranding();

      expect(screen.getByText('No Builder Selected')).toBeInTheDocument();
    });

    it('displays current logo URL in form', () => {
      renderBranding();

      const logoInput = screen.getByLabelText(/logo url/i);
      expect(logoInput).toHaveValue('https://example.com/logo.png');
    });

    it('displays current tagline in form', () => {
      renderBranding();

      const taglineInput = screen.getByLabelText(/tagline/i);
      expect(taglineInput).toHaveValue('Music for Congleton');
    });

    it('shows logo preview when URL is provided', () => {
      renderBranding();

      const logoPreview = screen.getByAltText(/logo preview/i);
      expect(logoPreview).toBeInTheDocument();
      expect(logoPreview).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('shows placeholder when no logo URL is provided', () => {
      mockBuilderContext.currentBuilder = {
        ...mockBuilder,
        branding: { logoUrl: undefined, tagline: 'Music for Congleton' },
      };

      renderBranding();

      expect(screen.getByText(/no logo set/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('accepts empty logo URL', async () => {
      renderBranding();
      const user = userEvent.setup();

      const logoInput = screen.getByLabelText(/logo url/i);
      await user.clear(logoInput);

      const submitButton = screen.getByRole('button', { name: /save/i });

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: mockBuilder }),
      } as Response);

      await user.click(submitButton);

      // No validation error should appear
      expect(screen.queryByText(/url is required/i)).not.toBeInTheDocument();
    });

    it('shows error for invalid URL format', async () => {
      renderBranding();
      const user = userEvent.setup();

      const logoInput = screen.getByLabelText(/logo url/i);
      await user.clear(logoInput);
      await user.type(logoInput, 'not-a-valid-url');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/invalid url/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls API to update branding on save', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: { ...mockBuilder, branding: { logoUrl: 'https://new.com/logo.png', tagline: 'New tagline' } } }),
      } as Response);

      renderBranding();
      const user = userEvent.setup();

      const taglineInput = screen.getByLabelText(/tagline/i);
      await user.clear(taglineInput);
      await user.type(taglineInput, 'New tagline');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('New tagline'),
          })
        );
      });
    });

    it('shows success toast on successful save', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: mockBuilder }),
      } as Response);

      renderBranding();
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
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Update failed' }),
      } as Response);

      renderBranding();
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
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: mockBuilder }),
      } as Response);

      renderBranding();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('logo preview', () => {
    it('updates preview when URL changes', async () => {
      renderBranding();
      const user = userEvent.setup();

      const logoInput = screen.getByLabelText(/logo url/i);
      await user.clear(logoInput);
      await user.type(logoInput, 'https://newlogo.com/image.png');

      const logoPreview = screen.getByAltText(/logo preview/i);
      expect(logoPreview).toHaveAttribute('src', 'https://newlogo.com/image.png');
    });
  });
});
