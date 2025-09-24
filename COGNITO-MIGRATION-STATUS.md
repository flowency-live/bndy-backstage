# Cognito Migration Status

## Current State: PARTIALLY COMPLETE ⚠️

The migration from Supabase to AWS Cognito is **architecturally incomplete**. While the core authentication flow works, the codebase has significant technical debt due to poor separation of concerns in the original Replit implementation.

## What's Been Completed ✅

### Core Authentication Flow
- `client/src/pages/auth/login.tsx` - Login component uses Cognito
- `client/src/App.tsx` - Uses CognitoAuthProvider
- `client/src/lib/user-context.tsx` - Uses Cognito sessions
- `client/src/components/band-gate.tsx` - Route protection with Cognito
- `client/src/hooks/useCognitoAuth.tsx` - New Cognito auth service
- `client/src/lib/queryClient.ts` - Centralized API authentication
- `server/cognito-auth-middleware.ts` - JWT verification middleware
- `server/routes.ts` - Uses Cognito middleware
- `.env` - Cognito configuration

### Backend Infrastructure
- AWS Cognito User Pool: `eu-west-2_LqtkKHs1P`
- App Client ID: `5v481th8k6v9lqifnp5oppak89`
- JWT verification with `aws-jwt-verify`
- Development god mode: +447758240770 / any 6-digit code

## The Architectural Problem ❌

The original Replit codebase **incorrectly mixed authentication with data access** throughout the UI layer:

### What Should Be (Clean Architecture)
```
Login → Cognito Auth → JWT Token → QueryClient → bndy-api → Database
                          ↓
                    Components get data via React Query hooks
```

### What Actually Exists (Messy Architecture)
```
Every Component → Direct auth session access → API calls with tokens
```

## Remaining Supabase References: 432 across 31 files

### Critical UI Components Still Using useSupabaseAuth:
- `client/src/components/side-nav.tsx` - Navigation component
- `client/src/components/band-switcher.tsx` - Band context switching
- `client/src/components/gig-alert-banner.tsx` - Alert component
- `client/src/pages/dashboard.tsx` - Main dashboard
- `client/src/pages/profile.tsx` - User profile
- `client/src/pages/calendar.tsx` - Calendar view
- `client/src/pages/admin.tsx` - Admin interface
- `client/src/pages/songs.tsx` - Song management
- `client/src/pages/onboarding.tsx` - User onboarding

### Why These Components Have Auth Dependencies:
These components **shouldn't need direct auth access** but do because:
1. **Token Leakage**: Directly accessing `session.access_token` for API calls
2. **Missing Abstraction**: No proper data hooks, components fetch data themselves
3. **Mixed Concerns**: UI components handling authentication logic

### Legacy Files That Need Cleanup:
- `client/src/hooks/useSupabaseAuth.tsx` - Old auth hook (entire file)
- `server/auth-middleware.ts` - Old Supabase middleware
- `client/src/lib/supabase.ts` - Compatibility layer
- Database schema fields: `supabaseId` references

## Recommended Path Forward

### Option 1: Quick Fix (Partial Migration) ⚡
**Time**: 1-2 hours
**Approach**: Update remaining components to use `useCognitoAuth` instead of `useSupabaseAuth`
**Pros**: Fast, gets system working
**Cons**: Maintains bad architecture, technical debt remains

### Option 2: Proper Refactor (Clean Architecture) 🏗️
**Time**: 4-6 hours
**Approach**:
1. Remove direct auth access from UI components
2. Create proper data hooks using React Query
3. Centralize all API authentication in queryClient
4. Clean separation between auth and data concerns

**Pros**: Clean, maintainable, scalable architecture
**Cons**: More time investment

### Option 3: Hybrid Approach (Recommended) 🎯
**Time**: 2-3 hours
**Approach**:
1. **Phase 1**: Quick fix critical UI components (30 min)
2. **Phase 2**: Identify and refactor the worst offenders (2 hours)
3. **Phase 3**: Document remaining tech debt for future cleanup

## Current Risk Assessment

### High Risk 🔴
- Dashboard may not load properly (uses useSupabaseAuth)
- Band switching broken (band-switcher uses old auth)
- Navigation broken (side-nav uses old auth)

### Medium Risk 🟡
- Profile page may have issues
- Calendar/songs pages may not authenticate properly

### Low Risk 🟢
- Login flow works
- Core API authentication works
- Route protection works

## Next Steps

**STOP ALL CHANGES** until path forward is confirmed.

The user needs to decide between:
1. Quick fix to get system working (Option 1)
2. Proper architectural cleanup (Option 2)
3. Phased hybrid approach (Option 3)

**Current Status**: Core auth works, but UI layer is partially broken due to incomplete migration.