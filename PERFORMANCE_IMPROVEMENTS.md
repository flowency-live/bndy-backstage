# bndy-backstage Performance Improvements

**Status**: Ready for Implementation
**Created**: 2025-11-03
**Target**: Reduce initial load time from 2.4s to <1s
**Bundle Size**: Reduce from 1,084KB to <500KB

---

## Critical Issues

### 1. Bundle Size (CRITICAL)
**Current**: 1,084.66 KB (294.32 KB gzipped)
**Warning Threshold**: 500 KB
**Problem**: 2x over recommended size, impacts mobile/slow connections

### 2. Authentication Waterfall (1.1-1.7s)
- Sequential auth checks across 3 layers
- Redundant `/api/me` call in MemberGate
- User context waits for auth completion

### 3. Duplicate API Calls (500-800ms wasted)
- GigAlertBanner fetches 2-day calendar window
- Dashboard fetches 30-day calendar window
- **2-day data is subset of 30-day data**

### 4. No Caching Strategy
- Every navigation triggers ALL API calls again
- No staleTime configured in React Query

### 5. Blocking Render (600-900ms spinner)
- Dashboard waits for ALL queries before showing ANY content
- User sees full-page spinner unnecessarily

---

## Implementation Plan

### Phase 1: Code Splitting (HIGHEST PRIORITY)
**Impact**: Reduce initial bundle from 1,084KB to ~300KB
**Time**: 2-3 hours

#### 1.1 Route-Based Code Splitting
Split pages into separate chunks loaded on-demand:

**Files to modify**:
- `client/src/App.tsx` or main routing file

**Implementation**:
```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy pages
const Dashboard = lazy(() => import('./pages/dashboard'));
const Calendar = lazy(() => import('./pages/calendar'));
const Songs = lazy(() => import('./pages/songs'));
const Pipeline = lazy(() => import('./pages/pipeline'));
const Admin = lazy(() => import('./pages/admin'));
const Gigs = lazy(() => import('./pages/gigs'));
const Setlists = lazy(() => import('./pages/setlists'));

// Wrap routes in Suspense
<Suspense fallback={<BndySpinnerOverlay />}>
  <Route path="/dashboard" component={Dashboard} />
  <Route path="/calendar" component={Calendar} />
  {/* etc */}
</Suspense>
```

**Result**: Each page becomes a separate chunk (~50-100KB each)

#### 1.2 Vendor Chunk Separation
Split large libraries into separate chunks:

**File**: `client/vite.config.ts`

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],

          // Data fetching
          'query-vendor': ['@tanstack/react-query'],

          // Routing
          'router-vendor': ['wouter'],

          // Date utilities
          'date-vendor': ['date-fns'],

          // Icons
          'icons-vendor': ['lucide-react'],

          // UI components (if large)
          'ui-vendor': [
            '@/components/ui/button',
            '@/components/ui/card',
            '@/components/ui/dialog',
            // etc
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```

**Result**:
- Main bundle: ~200-300KB
- React vendor: ~150KB (cached between pages)
- Query vendor: ~50KB (cached)
- Icons vendor: ~100KB (cached)

#### 1.3 Lazy Load Heavy Components

**File**: `client/src/components/onboarding-tour.tsx`

```typescript
// Lazy load Driver.js (only loaded when tour starts)
const driver = lazy(() => import('driver.js').then(m => ({ default: m.driver })));
```

**File**: `client/src/components/ui/image-upload.tsx`

```typescript
// Lazy load image cropper/upload libraries
const ImageCropper = lazy(() => import('./image-cropper'));
```

**Result**: Driver.js (~50KB) only loaded when user starts tour, not on every page load

---

### Phase 2: API Call Optimization (QUICK WIN)
**Impact**: Save 500-800ms on dashboard load
**Time**: 1 hour

#### 2.1 Remove Duplicate Calendar Call

**File**: `client/src/pages/dashboard.tsx`

**Current Problem**: Two separate API calls
```typescript
// GigAlertBanner fetches 2-day window
// Dashboard fetches 30-day window
```

**Solution**: Fetch once in dashboard, pass to GigAlertBanner
```typescript
// In dashboard.tsx
const { data: events } = useQuery({
  queryKey: ["/api/artists", artistId, "events"],
  // ... fetch 30-day window
});

// Pass to GigAlertBanner
<GigAlertBanner artistId={artistId} events={events} />
```

**File**: `client/src/components/gig-alert-banner.tsx`

**Change**: Accept events as prop instead of fetching
```typescript
interface GigAlertBannerProps {
  artistId: string;
  events: Event[]; // NEW: receive from parent
  className?: string;
}

export default function GigAlertBanner({ artistId, events, className }: GigAlertBannerProps) {
  // Remove the useQuery hook
  // Use events prop directly
  const upcomingGigs = events?.filter(e =>
    e.event_type === 'gig' &&
    isWithinInterval(parseISO(e.starts_at), { start: new Date(), end: addDays(new Date(), 2) })
  ) || [];

  // Rest of component unchanged
}
```

**Result**: Saves 500-800ms, reduces API calls by 50%

#### 2.2 Remove Redundant checkAuth()

**File**: `client/src/components/member-gate.tsx`

**Remove lines 44-46** (the useEffect that calls checkAuth):
```typescript
// DELETE THIS:
useEffect(() => {
  checkAuth();
}, [checkAuth]);
```

**Reason**: Auth already checked by ServerAuthProvider, this is redundant

**Result**: Saves 300-500ms on every protected route

---

### Phase 3: React Query Caching (INSTANT WINS)
**Impact**: Instant repeat loads, no re-fetching on navigation
**Time**: 15 minutes

**File**: `client/src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,        // 10 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false,   // Don't refetch on tab switch
      refetchOnMount: false,         // Don't refetch on component remount
      retry: 1,                      // Only retry once on failure
    },
  },
});
```

**Result**:
- Dashboard loads instantly on repeat visits (within 5 min)
- No unnecessary API calls when switching tabs
- Cached data persists for 10 minutes

---

### Phase 4: Progressive Rendering (UX WIN)
**Impact**: 60% perceived performance improvement
**Time**: 2 hours

**File**: `client/src/pages/dashboard.tsx`

**Current Code (lines 825-829)**:
```typescript
const isLoading = !session || eventsLoading || songsLoading || membersLoading;

if (isLoading) {
  return <BndySpinnerOverlay />;
}
```

**New Code**:
```typescript
// Remove blocking loading check
// Render dashboard immediately with skeleton states

return (
  <div className="bg-gradient-subtle animate-fade-in-up">
    <OnboardingTour />

    <div className="px-2 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-6">
      {/* Show banner immediately if data available, skeleton if loading */}
      {eventsLoading ? (
        <GigAlertBannerSkeleton />
      ) : (
        <GigAlertBanner artistId={artistId} events={events} />
      )}

      {/* Calendar & Gigs Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-3 sm:mb-4">
          Calendar & Gigs
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 w-full max-w-[900px]">
          <DashboardTile
            title="Calendar"
            icon={<Calendar />}
            color="hsl(271, 91%, 65%)"
            onClick={() => setLocation("/calendar")}
            className="animate-stagger-1"
            data-testid="tile-calendar"
          />

          <DashboardTile
            title="Gigs"
            icon={<Mic />}
            color="hsl(24, 95%, 53%)"
            count={eventsLoading ? undefined : upcomingGigs}
            onClick={() => setLocation("/gigs")}
            className="animate-stagger-2"
            data-testid="tile-gigs"
          />

          {/* etc - tiles render immediately, counts populate as data arrives */}
        </div>
      </div>

      {/* Song Lists Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-3 sm:mb-4">
          Song Lists
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 w-full max-w-[900px]">
          <DashboardTile
            title="Playbook"
            icon={<Music />}
            color="hsl(199, 89%, 48%)"
            count={songsLoading ? undefined : totalSongs}
            onClick={() => setLocation("/songs")}
            className="animate-stagger-1"
            data-testid="tile-playbook"
          />

          {/* etc */}
        </div>
      </div>
    </div>
  </div>
);
```

**Add Skeleton Component**:
```typescript
function GigAlertBannerSkeleton() {
  return (
    <div className="w-full h-16 bg-muted animate-pulse rounded-lg mb-3 sm:mb-4" />
  );
}
```

**Result**:
- Dashboard appears instantly (no full-page spinner)
- Tiles render immediately
- Counts populate as data arrives
- Feels 60% faster to users

---

## Expected Results

### Before
- Initial load: 2.4s (cold) / 1.8s (warm)
- Bundle size: 1,084KB (294KB gzipped)
- Repeat loads: 1.8s (re-fetches everything)
- User experience: Full-page spinner for 600-900ms

### After (All Phases)
- Initial load: <1s (cold) / <500ms (warm)
- Main bundle: ~300KB (~80KB gzipped)
- Repeat loads: Instant (<100ms, from cache)
- User experience: Instant render, progressive data population

### Breakdown by Phase
- **Phase 1 (Code Splitting)**: -700KB bundle, -60% initial load time
- **Phase 2 (API Optimization)**: -800ms load time
- **Phase 3 (Caching)**: Instant repeat loads
- **Phase 4 (Progressive Render)**: +60% perceived speed

---

## Implementation Order

1. **Phase 3** (15 min) - Quick win, add caching
2. **Phase 2.1** (30 min) - Remove duplicate calendar call
3. **Phase 2.2** (15 min) - Remove redundant auth check
4. **Phase 1.1** (1 hour) - Route-based code splitting
5. **Phase 1.2** (1 hour) - Vendor chunk separation
6. **Phase 4** (2 hours) - Progressive rendering
7. **Phase 1.3** (30 min) - Lazy load heavy components

**Total Time**: ~5-6 hours
**Total Impact**: 50-60% faster load times

---

## Testing Checklist

After each phase:
- [ ] Run `npm run build` and check bundle sizes
- [ ] Test in Chrome DevTools Network tab (Slow 3G)
- [ ] Verify no console errors
- [ ] Test all routes load correctly
- [ ] Check React Query DevTools for cache behavior
- [ ] Test on mobile device

---

## Monitoring

Add these to track improvements:

```typescript
// In main app file
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log(`Page load time: ${pageLoadTime}ms`);
  });
}
```

Track metrics:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Bundle size (from build output)

---

## Notes

- All changes are backward compatible
- No breaking changes to existing functionality
- Focus on user-facing performance first
- Backend optimizations (Lambda cold starts, DynamoDB queries) are separate effort
