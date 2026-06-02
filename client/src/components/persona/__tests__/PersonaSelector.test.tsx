/**
 * PersonaSelector Component Tests
 *
 * Tests for the multi-persona dropdown selector:
 * - Shows only artist options when user has no builders
 * - Shows only builder options when user has no artists
 * - Shows both when user has both personas
 * - Routes to appropriate pages on selection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaSelector } from '../PersonaSelector';
import type { ArtistMembership, Builder } from '@/types/api';
import type { ReactNode } from 'react';

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

// Mock wouter for routing
const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', mockNavigate],
}));

// Mock the user context
const mockSelectArtist = vi.fn();
const mockClearArtistSelection = vi.fn();
vi.mock('@/lib/user-context', () => ({
  useUser: vi.fn(() => ({
    isAuthenticated: true,
    userProfile: {
      user: { id: 'user-1', displayName: 'Test User' },
      artists: [],
    },
    currentArtistId: null,
    currentMembership: null,
    selectArtist: mockSelectArtist,
    clearArtistSelection: mockClearArtistSelection,
    hasMultipleArtists: false,
    canAccessArtist: () => true,
  })),
}));

// Mock the builder context
const mockSelectBuilder = vi.fn();
const mockClearBuilderSelection = vi.fn();
vi.mock('@/lib/builder-context', () => ({
  useBuilder: vi.fn(() => ({
    builders: [],
    currentBuilderId: null,
    currentBuilder: null,
    isLoading: false,
    hasBuilders: false,
    hasMultipleBuilders: false,
    selectBuilder: mockSelectBuilder,
    clearBuilderSelection: mockClearBuilderSelection,
  })),
}));

// Import mocks after vi.mock
import { useUser } from '@/lib/user-context';
import { useBuilder } from '@/lib/builder-context';

// Factory functions for test data
const createTestMembership = (overrides?: Partial<ArtistMembership>): ArtistMembership => ({
  id: 'membership-1',
  user_id: 'user-1',
  artist_id: 'artist-1',
  display_name: 'Test Artist',
  resolved_display_name: 'Test Artist',
  status: 'active',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  name: 'Test Artist',
  artist: {
    id: 'artist-1',
    name: 'Test Artist',
    displayColour: '#ff00ff',
  },
  ...overrides,
});

const createTestBuilder = (overrides?: Partial<Builder>): Builder => ({
  id: 'builder-1',
  user_id: 'user-1',
  name: 'Congleton Live',
  slug: 'congleton',
  description: 'Live music in Congleton',
  branding: {
    logoUrl: 'https://example.com/logo.png',
    tagline: 'Music in the heart of Cheshire',
  },
  theme: {
    primaryColor: '#ff00ff',
    secondaryColor: '#00ffff',
    backgroundColor: '#0a0a0a',
    foregroundColor: '#ffffff',
    defaultMode: 'dark',
  },
  coverage: {
    type: 'postcode_radius',
    postcode: 'CW12 1AB',
    radius: 10,
  },
  status: 'published',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('PersonaSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('shows artist-only view when user has artists but no builders', () => {
      const membership = createTestMembership();

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [membership],
        },
        currentArtistId: 'artist-1',
        currentMembership: membership,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: false,
        error: null,
        hasBuilders: false,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Should show current artist name
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      // Should show artist icon/indicator
      expect(screen.getByTestId('persona-artist-indicator')).toBeInTheDocument();
    });

    it('shows builder-only view when user has builders but no artists', () => {
      const builder = createTestBuilder();

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [],
        },
        currentArtistId: null,
        currentMembership: null,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [builder],
        currentBuilderId: 'builder-1',
        currentBuilder: builder,
        isLoading: false,
        error: null,
        hasBuilders: true,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Should show current builder name
      expect(screen.getByText('Congleton Live')).toBeInTheDocument();
      // Should show builder icon/indicator
      expect(screen.getByTestId('persona-builder-indicator')).toBeInTheDocument();
    });

    it('shows both personas when user has artists AND builders', async () => {
      const membership = createTestMembership();
      const builder = createTestBuilder();

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [membership],
        },
        currentArtistId: 'artist-1',
        currentMembership: membership,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [builder],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: false,
        error: null,
        hasBuilders: true,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      const user = userEvent.setup();
      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Should show both artist and builder sections (use findBy for async portal content)
      expect(await screen.findByText('Artists')).toBeInTheDocument();
      expect(await screen.findByText('Builders')).toBeInTheDocument();
    });

    it('shows loading state when data is loading', () => {
      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
        user: null,
        userProfile: null,
        currentArtistId: null,
        currentMembership: null,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: true,
        error: null,
        hasBuilders: false,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      render(<PersonaSelector />, { wrapper: createWrapper() });

      expect(screen.getByTestId('persona-loading')).toBeInTheDocument();
    });
  });

  describe('artist selection', () => {
    it('selects artist and navigates to dashboard when artist clicked', async () => {
      const membership1 = createTestMembership({ artist_id: 'artist-1', name: 'Band One' });
      const membership2 = createTestMembership({ id: 'membership-2', artist_id: 'artist-2', name: 'Band Two' });

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [membership1, membership2],
        },
        currentArtistId: 'artist-1',
        currentMembership: membership1,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: true,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: false,
        error: null,
        hasBuilders: false,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      const user = userEvent.setup();
      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click on second artist (use findBy for async portal content)
      await user.click(await screen.findByText('Band Two'));

      // Should call selectArtist and navigate
      expect(mockSelectArtist).toHaveBeenCalledWith('artist-2');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('builder selection', () => {
    it('selects builder and navigates to builder dashboard when builder clicked', async () => {
      const membership = createTestMembership();
      const builder1 = createTestBuilder({ id: 'builder-1', name: 'Congleton Live' });
      const builder2 = createTestBuilder({ id: 'builder-2', name: 'Macclesfield Music' });

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [membership],
        },
        currentArtistId: 'artist-1',
        currentMembership: membership,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [builder1, builder2],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: false,
        error: null,
        hasBuilders: true,
        hasMultipleBuilders: true,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      const user = userEvent.setup();
      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click on a builder (use findBy for async portal content)
      await user.click(await screen.findByText('Congleton Live'));

      // Should call selectBuilder, clearArtistSelection, and navigate
      expect(mockSelectBuilder).toHaveBeenCalledWith('builder-1');
      expect(mockClearArtistSelection).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/builder');
    });
  });

  describe('persona switching', () => {
    it('clears builder when switching to artist persona', async () => {
      const membership = createTestMembership();
      const builder = createTestBuilder();

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [membership],
        },
        currentArtistId: null,
        currentMembership: null,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [builder],
        currentBuilderId: 'builder-1',
        currentBuilder: builder,
        isLoading: false,
        error: null,
        hasBuilders: true,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      const user = userEvent.setup();
      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click on artist (use findBy for async portal content)
      await user.click(await screen.findByText('Test Artist'));

      // Should clear builder selection when switching to artist
      expect(mockClearBuilderSelection).toHaveBeenCalled();
      expect(mockSelectArtist).toHaveBeenCalledWith('artist-1');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('shows current persona with checkmark indicator', async () => {
      const membership = createTestMembership();
      const builder = createTestBuilder();

      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [membership],
        },
        currentArtistId: 'artist-1',
        currentMembership: membership,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [builder],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: false,
        error: null,
        hasBuilders: true,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      const user = userEvent.setup();
      render(<PersonaSelector />, { wrapper: createWrapper() });

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Current artist should have active indicator (use findBy for async portal content)
      // testid is persona-item-artist-{artist_id}, and artist_id is 'artist-1'
      const artistItem = await screen.findByTestId('persona-item-artist-artist-1');
      expect(artistItem).toHaveAttribute('data-active', 'true');
    });
  });

  describe('empty states', () => {
    it('shows placeholder when no persona is selected', () => {
      vi.mocked(useUser).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user-1', displayName: 'Test User' },
        userProfile: {
          user: { id: 'user-1', displayName: 'Test User' },
          artists: [],
        },
        currentArtistId: null,
        currentMembership: null,
        selectArtist: mockSelectArtist,
        clearArtistSelection: mockClearArtistSelection,
        hasMultipleArtists: false,
        canAccessArtist: () => true,
        isUberAdmin: false,
        isStealthMode: false,
        logout: vi.fn(),
      } as any);

      vi.mocked(useBuilder).mockReturnValue({
        builders: [],
        currentBuilderId: null,
        currentBuilder: null,
        isLoading: false,
        error: null,
        hasBuilders: false,
        hasMultipleBuilders: false,
        selectBuilder: mockSelectBuilder,
        clearBuilderSelection: mockClearBuilderSelection,
        refresh: vi.fn(),
      });

      render(<PersonaSelector />, { wrapper: createWrapper() });

      expect(screen.getByText('Select persona')).toBeInTheDocument();
    });
  });
});
