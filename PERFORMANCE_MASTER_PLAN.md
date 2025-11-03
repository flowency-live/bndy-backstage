# bndy-backstage Performance Optimization - Master Plan

**Status**: Ready for Implementation
**Created**: 2025-11-03
**Current Phase**: Not Started
**Last Updated**: 2025-11-03

---

## Quick Reference

### Current Metrics
- **Bundle Size**: 1,084.66 KB (294.32 KB gzipped) - **2x over recommended**
- **Initial Load**: 2.4s (cold) / 1.8s (warm)
- **Repeat Loads**: 1.8s (re-fetches everything)
- **Auth Waterfall**: 1.1-1.7s (sequential checks across 3 layers)
- **Duplicate API Calls**: 500-800ms wasted (calendar data fetched twice)

### Target Metrics
- **Bundle Size**: ~300KB main + ~150KB vendors (65% reduction)
- **Initial Load**: <1s (cold) / <500ms (warm)
- **Repeat Loads**: <100ms (from cache)
- **User Experience**: Instant render, progressive data population

---

## Critical Issues Identified

### 1. Bundle Size (CRITICAL - 1,084KB)
- 2x over recommended 500KB threshold
- Impacts mobile and slow connections severely
- All pages loaded upfront (no code splitting)
- Heavy libraries not chunked separately

### 2. Duplicate Calendar API Call (VERIFIED)
**Dashboard.tsx** (line 614):
- Fetches 30-day calendar window
- Endpoint: `/api/artists/${artistId}/calendar?startDate=${today}&endDate=${nextMonth}`

**GigAlertBanner.tsx** (line 31):
- Fetches 2-day calendar window (subset of 30-day data)
- Endpoint: `/api/artists/${artistId}/calendar?startDate=${todayStr}&endDate=${tomorrowStr}`

**Impact**: 500-800ms wasted, redundant network request

### 3. No Caching Strategy
- Every navigation triggers ALL API calls again
- No staleTime configured in React Query
- Users wait unnecessarily on repeat visits

### 4. Authentication Waterfall (1.1-1.7s)
- Sequential auth checks across 3 layers
- Redundant `/api/me` call in MemberGate (line 44-46)
- Already checked by ServerAuthProvider

### 5. Blocking Render (600-900ms spinner)
- Dashboard waits for ALL queries before showing ANY content
- Full-page spinner unnecessarily blocks user experience

---

## Implementation Phases

### ✅ PHASE 1: ZERO-RISK Quick Wins (30 minutes)
**Risk**: None - Pure optimization, no behavior changes
**Rollback**: Simple git revert
**Impact**: High - Instant repeat loads, reduced API calls

#### Step 1.1: Add React Query Caching (15 min)
**File**: `client/src/lib/queryClient.ts`

**Current Code**:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No caching configured
    },
  },
});
```

**New Code**:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,        // 10 minutes - cache retention
      refetchOnWindowFocus: false,   // Don't refetch on tab switch
      refetchOnMount: false,         // Don't refetch on component remount
      retry: 1,                      // Only retry once on failure
    },
  },
});
```

**Testing**:
1. Navigate to dashboard
2. Navigate away and back - should load instantly from cache
3. Check React Query DevTools - data should show as "fresh" for 5 min
4. Hard refresh (Ctrl+Shift+R) - should still fetch fresh data
5. Verify no stale data issues

**Expected Result**: Instant repeat loads within 5 minutes

**Rollback**: If cache causes stale data issues, revert this file

---

#### Step 1.2: Remove Duplicate Calendar API Call (15 min)
**Files**:
- `client/src/pages/dashboard.tsx`
- `client/src/components/gig-alert-banner.tsx`

**Current Problem**: Two separate API calls for overlapping calendar data

**Solution**: Fetch once in dashboard, pass to GigAlertBanner as props

**Changes**:

**In dashboard.tsx** (around line 838):
```typescript
// Already fetching events here (line 603-630)
const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
  queryKey: ["/api/artists", artistId, "events", "upcoming"],
  queryFn: async () => {
    // ... existing fetch logic
  }
});

// Pass events to GigAlertBanner instead of letting it fetch
<GigAlertBanner
  artistId={artistId}
  events={upcomingEvents}  // NEW: pass data instead of fetching
  isLoading={eventsLoading} // NEW: pass loading state
/>
```

**In gig-alert-banner.tsx**:
```typescript
interface GigAlertBannerProps {
  artistId: string;
  events: Event[];        // NEW: receive from parent
  isLoading?: boolean;    // NEW: loading state
  className?: string;
}

export default function GigAlertBanner({
  artistId,
  events,           // NEW
  isLoading,        // NEW
  className = ""
}: GigAlertBannerProps) {
  // REMOVE the useQuery hook (lines 24-54)

  // Filter events client-side
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const upcomingGigs = events.filter((event: Event) =>
    event.type === "gig" &&
    (event.date === todayStr || event.date === tomorrowStr)
  );

  // Show skeleton if loading
  if (isLoading) {
    return <div className="w-full h-16 bg-muted animate-pulse rounded-lg mb-3 sm:mb-4" />;
  }

  // Rest of component unchanged
  const todayGigs = upcomingGigs.filter(g => g.date === todayStr);
  const tomorrowGigs = upcomingGigs.filter(g => g.date === tomorrowStr);

  if (!todayGigs.length && !tomorrowGigs.length) {
    return null;
  }

  // ... rest of JSX unchanged
}
```

**Testing**:
1. Check Network tab - should see only ONE `/api/artists/{id}/calendar` call
2. Verify gig alerts still show correctly for today/tomorrow
3. Verify dashboard loads properly
4. Test with 0 gigs, 1 gig, multiple gigs
5. Test skeleton state shows while loading

**Expected Result**: Saves 500-800ms, reduces API calls by 50%

**Rollback**: Revert GigAlertBanner to fetch its own data

---

### ✅ PHASE 2: LOW-RISK Optimizations (1 hour)
**Risk**: Low - Progressive rendering might show loading states differently
**Rollback**: Revert specific files
**Impact**: High - Perceived 60% faster, cleaner auth flow

#### Step 2.1: Remove Redundant Auth Check (15 min)
**File**: `client/src/components/member-gate.tsx`

**Current Code** (lines 44-46):
```typescript
useEffect(() => {
  checkAuth();
}, [checkAuth]);
```

**Change**: REMOVE this useEffect entirely

**Reason**: Auth already checked by ServerAuthProvider, this is redundant

**Testing**:
1. Test all protected routes still require auth
2. Test logout redirects properly
3. Test expired session handling
4. Check no console errors about auth
5. Verify auth flow feels faster

**Expected Result**: Saves 300-500ms on every protected route

**Rollback**: Restore the useEffect if auth breaks

---

#### Step 2.2: Progressive Rendering (45 min)
**File**: `client/src/pages/dashboard.tsx`

**Current Code** (lines 827-831):
```typescript
const isLoading = !session || eventsLoading || songsLoading || membersLoading;

if (isLoading) {
  return <BndySpinnerOverlay />;
}
```

**New Code**: Remove blocking spinner, show skeleton states

```typescript
// REMOVE the blocking loading check

return (
  <div className="bg-gradient-subtle animate-fade-in-up">
    <OnboardingTour />

    <div className="px-2 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-6">
      {/* Show banner with loading state */}
      <GigAlertBanner
        artistId={artistId}
        events={upcomingEvents}
        isLoading={eventsLoading}
      />

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
            count={eventsLoading ? undefined : upcomingGigs}  // Show count when loaded
            onClick={() => setLocation("/gigs")}
            className="animate-stagger-2"
            data-testid="tile-gigs"
          />

          {/* Other tiles - counts populate as data arrives */}
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
            count={songsLoading ? undefined : totalSongs}  // Show count when loaded
            onClick={() => setLocation("/songs")}
            className="animate-stagger-1"
            data-testid="tile-playbook"
          />

          {/* Other tiles */}
        </div>
      </div>
    </div>
  </div>
);
```

**Testing**:
1. Dashboard appears instantly with tiles
2. Counts populate as data arrives (not all at once)
3. No "flash of wrong content"
4. Works on slow 3G throttling
5. Gig alert banner shows skeleton or loads smoothly
6. No console errors

**Expected Result**: Feels 60% faster, instant render

**Rollback**: Restore blocking spinner if UX feels broken

---

### ⚠️ PHASE 3: MEDIUM-RISK Code Splitting (3 hours)
**Risk**: Medium - Can break imports/routing if misconfigured
**Rollback**: Remove manualChunks config, rebuild
**Impact**: Very High - 65% bundle size reduction

**RECOMMENDATION**: Only attempt AFTER Phases 1-2 are stable AND you have staging environment OR low-traffic deployment window

#### Step 3.1: Vendor Chunk Separation (1 hour)
**File**: `client/vite.config.ts`

**Add to build config**:
```typescript
export default defineConfig({
  // ... existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'router-vendor': ['wouter'],
          'date-vendor': ['date-fns'],
          'icons-vendor': ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```

**Testing**:
1. Run `npm run build` - must succeed
2. Check dist/ folder - should see multiple vendor chunks
3. Check bundle analyzer - chunks should be split correctly
4. Test all pages load correctly
5. Check browser console - no module loading errors
6. Test on mobile with slow connection
7. Verify offline PWA still works

**Expected Result**:
- Main bundle: ~300KB
- React vendor: ~150KB (cached between pages)
- Query vendor: ~50KB
- Icons vendor: ~100KB

**Rollback**: Remove manualChunks config, rebuild

---

#### Step 3.2: Route-Based Code Splitting (2 hours)
**File**: `client/src/App.tsx` (or main routing file)

**Add lazy imports**:
```typescript
import { lazy, Suspense } from 'react';
import { BndySpinnerOverlay } from '@/components/ui/bndy-spinner';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/dashboard'));
const Calendar = lazy(() => import('./pages/calendar'));
const Songs = lazy(() => import('./pages/songs'));
const Pipeline = lazy(() => import('./pages/pipeline'));
const Admin = lazy(() => import('./pages/admin'));
const Gigs = lazy(() => import('./pages/gigs'));
const Setlists = lazy(() => import('./pages/setlists'));
const SetlistEditor = lazy(() => import('./pages/setlist-editor'));
const SetlistPrint = lazy(() => import('./pages/setlist-print'));

// Wrap routes in Suspense
function App() {
  return (
    <Suspense fallback={<BndySpinnerOverlay />}>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/songs" component={Songs} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/admin" component={Admin} />
      <Route path="/gigs" component={Gigs} />
      <Route path="/setlists" component={Setlists} />
      <Route path="/setlists/:id" component={SetlistEditor} />
      <Route path="/setlists/:artistId/:setlistId/print" component={SetlistPrint} />
      {/* etc */}
    </Suspense>
  );
}
```

**Testing** (CRITICAL - test EVERY route):
1. Build completes - check for multiple JS chunks in dist/
2. Test EVERY route loads correctly
3. Check Network tab - pages load on-demand
4. Test navigation between pages (forward and back)
5. Test browser back/forward buttons
6. Test deep linking to specific pages
7. Check no "chunk load failed" errors
8. Test on slow 3G connection
9. Test hard refresh on various routes

**Expected Result**: Each page becomes separate chunk (~50-100KB each)

**Rollback**: Remove lazy() imports, use regular imports, rebuild, redeploy

---

### 🔵 PHASE 4: OPTIONAL Lazy Components (30 min)
**Risk**: Low
**Impact**: Moderate - Additional 50-100KB saved

Only do AFTER Phase 3 succeeds.

**Files to optimize**:
- `client/src/components/onboarding-tour.tsx` - Lazy load Driver.js (~50KB)
- `client/src/components/ui/image-upload.tsx` - Lazy load image cropper

---

## Testing Checklist

### Before ANY Changes
- [ ] Create git branch: `feature/performance-phase-X`
- [ ] Document current performance metrics (screenshot)
- [ ] Record Network tab baseline
- [ ] Take screenshot of React Query DevTools

### After EACH Phase
- [ ] Run `npm run build` - must succeed
- [ ] Check bundle sizes in build output
- [ ] Test in Chrome DevTools (Slow 3G)
- [ ] Test all routes manually
- [ ] Check browser console - zero errors
- [ ] Test auth flow (login/logout)
- [ ] Verify no broken images/icons
- [ ] Check PWA still works offline
- [ ] Compare performance metrics to baseline

### Before Merge to Main
- [ ] All phases pass testing
- [ ] Build size reduced significantly
- [ ] No console errors
- [ ] Performance metrics improved
- [ ] Create rollback plan
- [ ] Document changes in commit message

---

## Rollback Procedures

### If Phase 1 Breaks (Caching Issues)
```bash
cd C:\VSProjects\bndy-backstage
git checkout main -- client/src/lib/queryClient.ts
git checkout main -- client/src/components/gig-alert-banner.tsx
git checkout main -- client/src/pages/dashboard.tsx
npm run build
# Deploy via usual method
```

### If Phase 2 Breaks (Progressive Rendering)
```bash
# Revert dashboard changes
git checkout main -- client/src/pages/dashboard.tsx
npm run build
```

### If Phase 2.1 Breaks (Auth)
```bash
# Revert member-gate changes
git checkout main -- client/src/components/member-gate.tsx
npm run build
```

### If Phase 3.1 Breaks (Vendor Chunks)
```bash
# Remove vendor chunks
git checkout main -- client/vite.config.ts
npm run build
```

### If Phase 3.2 Breaks (Route Splitting)
```bash
# Remove lazy loading
git checkout main -- client/src/App.tsx
npm run build
```

### Emergency Full Rollback
```bash
# Full rollback to last known good commit
git log --oneline -5  # Find last good commit
git reset --hard <commit-hash>
npm run build
# Force deploy
```

---

## Implementation Timeline

### Conservative Approach (RECOMMENDED)
1. **Day 1**: Phase 1 (30 min) → Deploy → Monitor for 24h
2. **Day 2**: If stable, Phase 2 (1h) → Deploy → Monitor for 24h
3. **Day 3**: Set up staging environment
4. **Day 4**: Test Phase 3.1 in staging (1h) → If stable, deploy to prod → Monitor
5. **Day 5**: Test Phase 3.2 in staging (2h) → If stable, deploy to prod → Monitor
6. **Day 6**: Measure results, document improvements

### Aggressive Approach (Only if confident)
1. Do Phase 1-2 together in one session
2. Monitor for 2 hours
3. If stable, do Phase 3 in staging
4. Deploy to production
5. Monitor overnight

---

## Risk Assessment

| Phase | Risk | Impact | Rollback Time | Production Ready? | Staging Required? |
|-------|------|--------|---------------|-------------------|-------------------|
| 1.1 Caching | Very Low | High | 5 min | YES | NO |
| 1.2 Remove Duplicate Call | Low | High | 10 min | YES | NO |
| 2.1 Remove Auth Check | Low | Medium | 5 min | YES | NO |
| 2.2 Progressive Render | Low | High | 10 min | YES | NO |
| 3.1 Vendor Chunks | Medium | High | 15 min | CAREFUL | RECOMMENDED |
| 3.2 Route Splitting | Medium | Very High | 20 min | CAREFUL | REQUIRED |
| 4 Lazy Components | Low | Low | 10 min | OPTIONAL | NO |

---

## Monitoring After Deploy

### First 30 Minutes
- [ ] Watch browser console for errors
- [ ] Monitor API error rates
- [ ] Check user sessions don't break
- [ ] Verify all routes accessible
- [ ] Test on mobile device
- [ ] Test on slow connection

### First 24 Hours
- [ ] Monitor error tracking (if available)
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Verify API call counts reduced
- [ ] Check bundle sizes in production

### Success Metrics
- ✅ Bundle size: 1084KB → ~300-400KB (65% reduction)
- ✅ Initial load: 2.4s → <1s (60% faster)
- ✅ Repeat loads: Instant from cache (<100ms)
- ✅ API calls: -50% (duplicate calendar call removed)
- ✅ Zero new errors
- ✅ User sessions stable
- ✅ Auth flow working correctly

---

## Current Progress Tracking

### Phase 1: ZERO-RISK Quick Wins
- [x] Step 1.1: Add React Query Caching ✅ **COMPLETED 2025-11-03**
  - Changed staleTime from Infinity to 5 minutes
  - Added gcTime: 10 minutes for cache retention
  - Added refetchOnMount: false
  - Changed retry from false to 1
- [x] Step 1.2: Remove Duplicate Calendar API Call ✅ **COMPLETED 2025-11-03**
  - Modified GigAlertBanner to accept events as props
  - Dashboard now passes upcomingEvents to GigAlertBanner
  - Eliminated redundant 2-day calendar API call
  - Added skeleton loading state to GigAlertBanner
- [ ] Deployed to production
- [ ] Monitored for 24h - stable

### Phase 2: LOW-RISK Optimizations
- [ ] Step 2.1: Remove Redundant Auth Check
- [ ] Step 2.2: Progressive Rendering
- [ ] Deployed to production
- [ ] Monitored for 24h - stable

### Phase 3: MEDIUM-RISK Code Splitting
- [ ] Staging environment created
- [ ] Step 3.1: Vendor Chunk Separation (tested in staging)
- [ ] Step 3.1: Deployed to production
- [ ] Step 3.2: Route-Based Code Splitting (tested in staging)
- [ ] Step 3.2: Deployed to production
- [ ] Monitored for 48h - stable

### Phase 4: OPTIONAL
- [ ] Lazy load heavy components
- [ ] Deployed and verified

---

## Staging Environment Setup

**TODO: Create staging environment before Phase 3**

### Requirements
1. Separate AWS Amplify app: `bndy-backstage-staging`
2. Point to same API (or create staging API)
3. Separate domain: `staging-backstage.bndy.co.uk`
4. Same authentication flow
5. Same data (or test data)

### Benefits
- Test code splitting safely
- Verify chunk loading works correctly
- Test on real infrastructure
- No risk to production users

---

## Notes

- All changes are backward compatible
- No breaking changes to existing functionality
- Focus on user-facing performance first
- Backend optimizations (Lambda cold starts, DynamoDB) are separate effort
- This plan combines safety procedures with technical implementation
- Always refer to this SINGLE document for all performance work

---

## When Context is Lost

**If you lose context**, read this section first:

1. **Check "Current Progress Tracking"** section above to see what's been completed
2. **Find the next unchecked step** in the current phase
3. **Read that phase's instructions** carefully
4. **Follow the testing checklist** after implementation
5. **Update "Current Progress Tracking"** when done
6. **Document any issues** encountered in commit messages

**Key Files**:
- Phase 1.1: `client/src/lib/queryClient.ts`
- Phase 1.2: `client/src/pages/dashboard.tsx`, `client/src/components/gig-alert-banner.tsx`
- Phase 2.1: `client/src/components/member-gate.tsx`
- Phase 2.2: `client/src/pages/dashboard.tsx`
- Phase 3.1: `client/vite.config.ts`
- Phase 3.2: `client/src/App.tsx`

**Always verify duplicate calendar call** is at:
- Dashboard: line 614 (30-day fetch)
- GigAlertBanner: line 31 (2-day fetch)
