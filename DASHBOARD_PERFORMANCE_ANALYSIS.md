# Dashboard Performance Analysis - November 2025

## Current Load Time: 1.8-2.4 seconds (typical) | 2.5-3.5 seconds (cold starts)

## Root Causes

### 1. Authentication Waterfall (1.1-1.7s)
- Sequential auth checks across 3 layers
- Redundant `/api/me` call in MemberGate
- User context waits for auth completion

### 2. Duplicate API Calls
- GigAlertBanner fetches 2-day calendar window
- Dashboard fetches 30-day calendar window
- **2-day data is subset of 30-day data** = wasted 500-800ms

### 3. No Caching Strategy
- Every navigation to dashboard triggers ALL API calls again
- No staleTime configured in React Query

### 4. Blocking Render
- Dashboard waits for ALL queries before showing ANY content
- User sees spinner for 600-900ms

## Quick Wins (1-2 hours, ~1000ms improvement)

### Fix #1: Remove Duplicate Calendar Call
**File**: `client/src/components/gig-alert-banner.tsx` + `client/src/pages/dashboard.tsx`

Fetch calendar data ONCE in dashboard, pass to GigAlertBanner as props.
**Saves**: 500-800ms

### Fix #2: Remove Redundant checkAuth()
**File**: `client/src/components/member-gate.tsx` (lines 44-46)

Remove the `useEffect` that calls `checkAuth()` on mount - auth already checked by ServerAuthProvider.
**Saves**: 300-500ms

### Fix #3: Add React Query Caching
**File**: `client/src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
```
**Saves**: Instant repeat loads

## User Experience Win (2-3 hours, +60% perceived improvement)

### Fix #4: Progressive Rendering
**File**: `client/src/pages/dashboard.tsx` (lines 802-806)

Remove blocking loading check. Render dashboard immediately with skeleton states for each tile.
Data populates as it arrives.

## Full Analysis

See detailed analysis in the task output above, including:
- API call waterfall diagram
- Lambda performance breakdown
- Backend optimization opportunities
- Code locations and examples

## Recommendation

**Implement Fixes #1-3 immediately** for ~50% load time reduction (2s → 1s).
**Add Fix #4** for instant perceived load time.

---
Created: 2025-11-03
Status: Analysis Complete - Awaiting implementation approval
