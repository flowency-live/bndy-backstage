import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderTheme from '../theme';

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
  useLocation: () => ['/builder/theme', mockSetLocation],
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

describe('BuilderTheme', () => {
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

  const renderTheme = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BuilderTheme />
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('shows loading state when builder context is loading', () => {
      mockBuilderContext.isLoading = true;
      mockBuilderContext.currentBuilder = null;

      renderTheme();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows message when no builder is selected', () => {
      mockBuilderContext.currentBuilder = null;
      mockBuilderContext.isLoading = false;

      renderTheme();

      expect(screen.getByText('No Builder Selected')).toBeInTheDocument();
    });

    it('displays primary color input with current value', () => {
      renderTheme();

      const primaryInput = screen.getByRole('textbox', { name: /primary color/i });
      expect(primaryInput).toHaveValue('#ff00ff');
    });

    it('displays secondary color input with current value', () => {
      renderTheme();

      const secondaryInput = screen.getByRole('textbox', { name: /secondary color/i });
      expect(secondaryInput).toHaveValue('#00ffff');
    });

    it('displays background color input with current value', () => {
      renderTheme();

      const bgInput = screen.getByRole('textbox', { name: /background color/i });
      expect(bgInput).toHaveValue('#0a0a0a');
    });

    it('displays foreground color input with current value', () => {
      renderTheme();

      const fgInput = screen.getByRole('textbox', { name: /foreground color/i });
      expect(fgInput).toHaveValue('#ffffff');
    });

    it('displays default mode selector with current value', () => {
      renderTheme();

      const modeSelector = screen.getByRole('combobox', { name: /default mode/i });
      expect(modeSelector).toHaveTextContent('Dark');
    });
  });

  describe('live preview', () => {
    it('shows preview panel', () => {
      renderTheme();

      expect(screen.getByTestId('theme-preview')).toBeInTheDocument();
    });

    it('applies theme colors to preview', () => {
      renderTheme();

      const preview = screen.getByTestId('theme-preview');
      expect(preview).toHaveStyle({ backgroundColor: '#0a0a0a' });
    });

    it('updates preview when primary color changes', async () => {
      renderTheme();
      const user = userEvent.setup();

      const primaryInput = screen.getByRole('textbox', { name: /primary color/i });
      await user.clear(primaryInput);
      await user.type(primaryInput, '#ff0000');

      // Preview button should use the new primary color
      const previewButton = screen.getByTestId('preview-primary-button');
      expect(previewButton).toHaveStyle({ backgroundColor: '#ff0000' });
    });
  });

  describe('form validation', () => {
    it('shows error for invalid hex color', async () => {
      renderTheme();
      const user = userEvent.setup();

      const primaryInput = screen.getByRole('textbox', { name: /primary color/i });
      await user.clear(primaryInput);
      await user.type(primaryInput, 'not-a-color');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/invalid color/i)).toBeInTheDocument();
    });

    it('requires all color fields', async () => {
      renderTheme();
      const user = userEvent.setup();

      const primaryInput = screen.getByRole('textbox', { name: /primary color/i });
      await user.clear(primaryInput);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls API to update theme on save', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: { ...mockBuilder, theme: { ...mockBuilder.theme, primaryColor: '#ff0000' } } }),
      } as Response);

      renderTheme();
      const user = userEvent.setup();

      const primaryInput = screen.getByRole('textbox', { name: /primary color/i });
      await user.clear(primaryInput);
      await user.type(primaryInput, '#ff0000');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/builders/builder-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('#ff0000'),
          })
        );
      });
    });

    it('shows success toast on successful save', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ builder: mockBuilder }),
      } as Response);

      renderTheme();
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

      renderTheme();
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

      renderTheme();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('color presets', () => {
    it('shows preset theme options', () => {
      renderTheme();

      expect(screen.getByText(/preset themes/i)).toBeInTheDocument();
    });

    it('applies preset when clicked', async () => {
      renderTheme();
      const user = userEvent.setup();

      // Click on a preset (e.g., "Midnight")
      const presetButton = screen.getByRole('button', { name: /midnight/i });
      await user.click(presetButton);

      // Should update the form values
      const bgInput = screen.getByRole('textbox', { name: /background color/i });
      expect(bgInput).toHaveValue('#1a1a2e');
    });
  });
});
