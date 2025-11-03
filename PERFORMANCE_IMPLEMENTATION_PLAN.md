# Performance Improvements - Safe Implementation Plan

**Status**: Ready for Careful Production Rollout
**Risk Level**: Medium (code splitting), Low (API optimization, caching)
**Rollback Strategy**: Git revert + immediate redeploy

---

## Implementation Order (Safest First)

### Phase 1: ZERO-RISK Changes (30 minutes)
**Risk**: None - Pure optimization, no behavior changes
**Rollback**: Git revert if any issues

#### Step 1.1: Add React Query Caching (15 min)
**File**: `client/src/lib/queryClient.ts`

**Change**:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});
```

**Testing**:
1. Navigate to dashboard
2. Navigate away and back - should load instantly from cache
3. Check React Query DevTools - data should show as "fresh" for 5 min
4. Hard refresh (Ctrl+Shift+R) - should still fetch fresh data

**Rollback**: Simple revert if cache causes stale data issues

---

#### Step 1.2: Remove Duplicate Calendar API Call (15 min)
**Files**:
- `client/src/pages/dashboard.tsx`
- `client/src/components/gig-alert-banner.tsx`

**Current Problem**: 2 API calls for calendar data (2-day + 30-day windows)

**Change**: Fetch once in dashboard, pass to GigAlertBanner as props

**Testing**:
1. Check Network tab - should see only ONE `/api/artists/{id}/events` call
2. Verify gig alerts still show correctly for next 2 days
3. Verify dashboard calendar counts are correct
4. Test with 0 gigs, 1 gig, multiple gigs

**Risk**: Very low - just removing redundant call
**Rollback**: Revert GigAlertBanner to fetch its own data

---

### Phase 2: LOW-RISK Changes (1 hour)
**Risk**: Low - Progressive rendering might show loading states differently

#### Step 2.1: Remove Redundant Auth Check (15 min)
**File**: `client/src/components/member-gate.tsx`

**Change**: Remove the useEffect that calls checkAuth() on mount

**Testing**:
1. Test all protected routes still require auth
2. Test logout redirects properly
3. Test expired session handling
4. Check no console errors about auth

**Risk**: Low - auth already checked by ServerAuthProvider
**Rollback**: Restore the useEffect if auth breaks

---

#### Step 2.2: Progressive Rendering (45 min)
**File**: `client/src/pages/dashboard.tsx`

**Change**: Remove blocking loading spinner, show skeleton states

**Testing**:
1. Dashboard appears instantly with tiles
2. Counts populate as data arrives
3. No "flash of wrong content"
4. Works on slow 3G throttling
5. Gig alert banner shows skeleton or loads smoothly

**Risk**: Low - purely visual, doesn't change data flow
**Rollback**: Restore blocking spinner if UX feels broken

---

### Phase 3: MEDIUM-RISK Changes (3 hours)
**Risk**: Medium - Code splitting can break imports/routing

#### Step 3.1: Vendor Chunk Separation (1 hour)
**File**: `client/vite.config.ts`

**Change**: Split large libraries into separate chunks

```typescript
export default defineConfig({
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
1. Build completes successfully
2. Check bundle analyzer - chunks should be split
3. Test all pages load correctly
4. Check browser console - no module loading errors
5. Test on mobile with slow connection
6. Verify offline PWA still works

**Risk**: Medium - misconfigured chunks can break imports
**Rollback**: Remove manualChunks config, rebuild

---

#### Step 3.2: Route-Based Code Splitting (2 hours)
**File**: `client/src/App.tsx` or routing file

**Change**: Lazy load page components

```typescript
import { lazy, Suspense } from 'react';

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

**Testing**:
1. Build completes - check for multiple JS chunks in dist/
2. Test EVERY route loads correctly
3. Check Network tab - pages load on-demand
4. Test navigation between pages
5. Test browser back/forward
6. Test deep linking to specific pages
7. Check no "chunk load failed" errors

**Risk**: Medium - can break routing if lazy imports fail
**Rollback**: Remove lazy() imports, rebuild, redeploy

---

### Phase 4: OPTIONAL Lazy Load Heavy Components
**Risk**: Low
**Impact**: Moderate

Lazy load Driver.js, ImageUpload, etc. Only do after Phase 3 succeeds.

---

## Testing Checklist

### Before ANY Changes
- [ ] Create git branch: `feature/performance-improvements`
- [ ] Document current performance metrics
- [ ] Take screenshots of React Query DevTools
- [ ] Record Network tab for baseline

### After Each Phase
- [ ] Run `npm run build` - must succeed
- [ ] Check bundle sizes in output
- [ ] Test in Chrome DevTools (Fast 3G)
- [ ] Test all routes manually
- [ ] Check browser console - zero errors
- [ ] Test auth flow
- [ ] Test logout
- [ ] Verify no broken images/icons
- [ ] Check PWA still works offline

### Before Merge to Main
- [ ] All phases pass testing
- [ ] Build size reduced significantly
- [ ] No console errors
- [ ] Performance metrics improved
- [ ] Create rollback plan

---

## Rollback Procedures

### If Phase 1 Breaks
```bash
cd C:\VSProjects\bndy-backstage
git checkout main
git pull
npm run build
# Deploy via usual method
```

### If Phase 2 Breaks Progressive Rendering
Revert just the dashboard changes:
```bash
git checkout main -- client/src/pages/dashboard.tsx
npm run build
```

### If Phase 3 Breaks Code Splitting
```bash
# Remove vendor chunks
git checkout main -- client/vite.config.ts
npm run build

# Or remove lazy loading
git checkout main -- client/src/App.tsx
npm run build
```

### Emergency Rollback (Any Issue)
```bash
# Full rollback to last known good commit
git log --oneline -5  # Find last good commit
git reset --hard <commit-hash>
npm run build
# Force deploy
```

---

## Monitoring After Deploy

### First 30 Minutes
- [ ] Watch browser console for errors
- [ ] Monitor API error rates
- [ ] Check user sessions don't break
- [ ] Verify all routes accessible

### First 24 Hours
- [ ] Monitor error tracking (if available)
- [ ] Check performance metrics
- [ ] User feedback
- [ ] API call counts reduced?

### Success Metrics
- Bundle size: 1084KB → ~300-400KB (65% reduction)
- Initial load: 2.4s → <1s (60% faster)
- Repeat loads: Instant from cache
- API calls: -50% (duplicate calendar call removed)
- Zero new errors

---

## Implementation Timeline

**Conservative Approach**:
1. **Day 1**: Phase 1 (30 min) - Deploy, monitor for 24h
2. **Day 2**: If stable, Phase 2 (1h) - Deploy, monitor for 24h
3. **Day 3**: If stable, Phase 3.1 (1h) - Deploy, monitor
4. **Day 4**: If stable, Phase 3.2 (2h) - Deploy, monitor
5. **Day 5**: Measure results, document improvements

**Aggressive Approach** (if you're confident):
1. Do Phase 1-2 together
2. Monitor for 2 hours
3. If stable, do Phase 3
4. Monitor overnight

**Recommended**: Conservative approach for production

---

## Risk Assessment

| Phase | Risk | Impact | Rollback Time | Should Do? |
|-------|------|--------|---------------|------------|
| 1.1 Caching | Very Low | High | 5 min | YES |
| 1.2 Remove Duplicate Call | Low | High | 10 min | YES |
| 2.1 Remove Auth Check | Low | Medium | 5 min | YES |
| 2.2 Progressive Render | Low | High | 10 min | YES |
| 3.1 Vendor Chunks | Medium | High | 15 min | YES (carefully) |
| 3.2 Route Splitting | Medium | Very High | 20 min | YES (carefully) |
| 4 Lazy Components | Low | Low | 10 min | OPTIONAL |

**Recommendation**: Do Phases 1-2 definitely. Phase 3 only if you can test thoroughly.

---

## Questions Before Starting

1. Do you have staging environment to test first?
2. Can you deploy during low-traffic period?
3. Do you have quick rollback capability?
4. Can you monitor in real-time after deploy?
5. Do you have error tracking (Sentry, etc.)?

If NO to most: Do Phase 1 only, observe for a week.
If YES to most: Do Phases 1-2, then consider Phase 3.
