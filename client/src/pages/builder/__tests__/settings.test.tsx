import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderSettings from '../settings';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock pointer capture for Radix UI
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);

// Mock scrollIntoView for Radix Select
Element.prototype.scrollIntoView = vi.fn();

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/builder/settings', mockSetLocation],
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
  branding: { logoUrl: null, tagline: 'Music for Congleton' },
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

describe('BuilderSettings', () => {
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

  const renderSettings = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BuilderSettings />
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderSettings();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderSettings();

      expect(screen.getByText('No Builder Selected')).toBeInTheDocument();
    });

    it('displays current builder name in form', () => {
      renderSettings();

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue('Congleton Live Music');
    });

    it('displays current builder description in form', () => {
      renderSettings();

      const descInput = screen.getByLabelText(/description/i);
      expect(descInput).toHaveValue('Live music events in Congleton');
    });

    it('displays current builder status', () => {
      renderSettings();

      // Status combobox should show the current status value
      const statusButton = screen.getByRole('combobox', { name: /status/i });
      expect(statusButton).toHaveTextContent('Draft');
    });
  });

  describe('form validation', () => {
    it('shows error when name is empty', async () => {
      renderSettings();
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls API to update builder on save', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: { ...mockBuilder, name: 'Updated Name' } }),
      } as Response);

      renderSettings();
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Name'),
          })
        );
      });
    });

    it('shows success toast on successful save', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: mockBuilder }),
      } as Response);

      renderSettings();
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

      renderSettings();
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

      renderSettings();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('status change', () => {
    it('displays status selector with current value', () => {
      renderSettings();

      // Status selector should show current value
      const statusButton = screen.getByRole('combobox', { name: /status/i });
      expect(statusButton).toBeInTheDocument();
      expect(statusButton).toHaveTextContent('Draft');
    });

    it('shows status description based on current status', () => {
      renderSettings();

      // Draft status should show the draft description
      expect(screen.getByText(/Your site is not visible to the public/i)).toBeInTheDocument();
    });
  });
});
