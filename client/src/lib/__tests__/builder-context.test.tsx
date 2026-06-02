import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuilderProvider, useBuilder } from '../builder-context';
import { server } from '@/test/setupTests';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';

const API_BASE = 'https://api.bndy.co.uk';

// Mock useServerAuth hook
vi.mock('@/hooks/useServerAuth', () => ({
  useServerAuth: vi.fn(() => ({
    session: { user: { id: 'user-1' }, session: { expiresAt: Date.now() + 3600000 } },
    isAuthenticated: true,
    loading: false,
    signOut: vi.fn(),
  })),
}));

// Factory function for test builders
const createTestBuilder = (overrides?: Record<string, unknown>) => ({
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
        <BuilderProvider>{children}</BuilderProvider>
      </QueryClientProvider>
    );
  };
};

describe('BuilderContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Default MSW handlers for builders
    server.use(
      http.get(`${API_BASE}/api/builders/me`, () => {
        return HttpResponse.json({
          builders: [createTestBuilder()],
        });
      })
    );
  });

  describe('Builder Loading', () => {
    it('should load builders when authenticated', async () => {
      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.builders).toHaveLength(1);
      expect(result.current.builders[0].id).toBe('builder-1');
      expect(result.current.builders[0].name).toBe('Congleton Live');
    });

    it('should return empty array for user with no builders', async () => {
      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          return HttpResponse.json({ builders: [] });
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.builders).toEqual([]);
      expect(result.current.hasBuilders).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          return HttpResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
          );
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.builders).toEqual([]);
      expect(result.current.error).toBe('Not authenticated');
    });
  });

  describe('Builder Selection', () => {
    it('should auto-select builder when user has only one', async () => {
      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentBuilderId).toBe('builder-1');
      });

      expect(localStorage.getItem('bndy-selected-builder-id')).toBe('builder-1');
    });

    it('should allow manual builder selection', async () => {
      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          return HttpResponse.json({
            builders: [
              createTestBuilder({ id: 'builder-1', name: 'Builder One' }),
              createTestBuilder({ id: 'builder-2', name: 'Builder Two' }),
            ],
          });
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectBuilder('builder-2');
      });

      expect(result.current.currentBuilderId).toBe('builder-2');
      expect(result.current.currentBuilder?.name).toBe('Builder Two');
      expect(localStorage.getItem('bndy-selected-builder-id')).toBe('builder-2');
    });

    it('should restore builder selection from localStorage', async () => {
      localStorage.setItem('bndy-selected-builder-id', 'builder-1');

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentBuilderId).toBe('builder-1');
      });
    });

    it('should clear invalid builder selection from localStorage', async () => {
      localStorage.setItem('bndy-selected-builder-id', 'invalid-builder-id');

      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          return HttpResponse.json({
            builders: [
              createTestBuilder({ id: 'builder-1' }),
              createTestBuilder({ id: 'builder-2' }),
            ],
          });
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(localStorage.getItem('bndy-selected-builder-id')).toBeNull();
      });
    });

    it('should clear builder selection', async () => {
      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentBuilderId).toBe('builder-1');
      });

      act(() => {
        result.current.clearBuilderSelection();
      });

      expect(result.current.currentBuilderId).toBeNull();
      expect(result.current.currentBuilder).toBeNull();
      expect(localStorage.getItem('bndy-selected-builder-id')).toBeNull();
    });
  });

  describe('Current Builder', () => {
    it('should return current builder when selected', async () => {
      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.currentBuilder).not.toBeNull();
      });

      expect(result.current.currentBuilder?.id).toBe('builder-1');
      expect(result.current.currentBuilder?.slug).toBe('congleton');
    });

    it('should return null when no builder selected', async () => {
      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          return HttpResponse.json({
            builders: [
              createTestBuilder({ id: 'builder-1' }),
              createTestBuilder({ id: 'builder-2' }),
            ],
          });
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With multiple builders, no auto-selection
      expect(result.current.currentBuilder).toBeNull();
    });
  });

  describe('Helper Properties', () => {
    it('should correctly identify users with builders', async () => {
      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasBuilders).toBe(true);
    });

    it('should correctly identify users with multiple builders', async () => {
      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          return HttpResponse.json({
            builders: [
              createTestBuilder({ id: 'builder-1' }),
              createTestBuilder({ id: 'builder-2' }),
            ],
          });
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMultipleBuilders).toBe(true);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refetch builders when refresh is called', async () => {
      let callCount = 0;
      server.use(
        http.get(`${API_BASE}/api/builders/me`, () => {
          callCount++;
          return HttpResponse.json({
            builders: callCount === 1
              ? [createTestBuilder()]
              : [createTestBuilder(), createTestBuilder({ id: 'builder-2', name: 'New Builder' })],
          });
        })
      );

      const { result } = renderHook(() => useBuilder(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.builders).toHaveLength(1);

      await act(async () => {
        await result.current.refresh();
      });

      // Wait for the new data to be reflected
      await waitFor(() => {
        expect(result.current.builders).toHaveLength(2);
      });
    });
  });

  describe('useBuilder Hook Error Handling', () => {
    it('should throw error when used outside BuilderProvider', () => {
      expect(() => {
        renderHook(() => useBuilder());
      }).toThrow('useBuilder must be used within a BuilderProvider');
    });
  });
});
