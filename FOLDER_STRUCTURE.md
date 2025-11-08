# Complete Refactor Folder Structure

## Before (Current State)
```
client/src/
├── pages/
│   ├── admin.tsx                    (1,185 LOC) ⚠️
│   ├── calendar.tsx                 (1,192 LOC) ⚠️
│   ├── dashboard.tsx
│   ├── pipeline.tsx
│   └── ...
├── components/
│   ├── event-modal.tsx              (654 LOC)
│   ├── public-gig-wizard.tsx        (431 LOC)
│   ├── unavailability-modal.tsx     (469 LOC)
│   ├── event-details.tsx            (224 LOC)
│   └── ...
└── types/
    └── api.ts
```

**Problems:**
- admin.tsx and calendar.tsx are monoliths (1,100+ LOC each)
- Modals scattered in components/ folder
- No clear organization
- TypeScript struggles with large files

---

## After (Target State)

### Full Tree View
```
client/src/
├── pages/
│   ├── admin/
│   │   ├── index.tsx                     (100 LOC) - Tab shell
│   │   ├── AdminContext.tsx              (60 LOC)  - State provider
│   │   │
│   │   ├── tabs/
│   │   │   ├── ArtistProfileTab/
│   │   │   │   ├── index.tsx             (80 LOC)  - Container
│   │   │   │   ├── ArtistProfileForm.tsx (150 LOC) - Form orchestrator
│   │   │   │   ├── components/
│   │   │   │   │   ├── AvatarSection.tsx        (60 LOC)
│   │   │   │   │   ├── BasicInfoSection.tsx     (80 LOC)
│   │   │   │   │   ├── ColorPickerSection.tsx   (80 LOC)
│   │   │   │   │   ├── GenresSection.tsx        (50 LOC)
│   │   │   │   │   └── SocialLinksSection.tsx   (120 LOC)
│   │   │   │   └── hooks/
│   │   │   │       └── useArtistSettings.ts     (100 LOC)
│   │   │   │
│   │   │   ├── MembersTab/
│   │   │   │   ├── index.tsx             (80 LOC)  - Container
│   │   │   │   ├── components/
│   │   │   │   │   ├── MembersList.tsx          (120 LOC)
│   │   │   │   │   ├── InviteSection.tsx        (150 LOC)
│   │   │   │   │   └── ActiveInvitesList.tsx    (existing, moved)
│   │   │   │   └── hooks/
│   │   │   │       ├── useMembers.ts            (60 LOC)
│   │   │   │       └── useInvites.ts            (80 LOC)
│   │   │   │
│   │   │   └── SpotifyTab/
│   │   │       ├── index.tsx             (80 LOC)  - Container
│   │   │       ├── components/
│   │   │       │   ├── SpotifyConnection.tsx    (100 LOC)
│   │   │       │   ├── PlaylistSelector.tsx     (120 LOC)
│   │   │       │   └── SpotifyProfile.tsx       (60 LOC)
│   │   │       └── hooks/
│   │   │           └── useSpotify.ts            (150 LOC)
│   │
│   ├── calendar/
│   │   ├── index.tsx                     (150 LOC) - Main shell
│   │   ├── CalendarContext.tsx           (100 LOC) - State provider
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCalendarData.ts        (80 LOC)  - Data fetching + filtering
│   │   │   ├── useCalendarExport.ts      (60 LOC)  - Export functionality
│   │   │   └── useEventPermissions.ts    (40 LOC)  - Permission checks
│   │   │
│   │   ├── views/
│   │   │   ├── CalendarGridView.tsx      (250 LOC) - Grid rendering
│   │   │   └── AgendaView.tsx            (120 LOC) - List view
│   │   │
│   │   ├── components/
│   │   │   ├── CalendarControls.tsx      (120 LOC) - Export, view toggle, filters
│   │   │   ├── MonthNavigation.tsx       (80 LOC)  - Month selector + swipe
│   │   │   ├── UpcomingEventBanner.tsx   (80 LOC)  - Next event highlight
│   │   │   ├── CalendarDay.tsx           (150 LOC) - Single day cell
│   │   │   └── EventBadge.tsx            (100 LOC) - Event display
│   │   │
│   │   ├── utils/
│   │   │   ├── eventFilters.ts           (100 LOC) - Filter logic
│   │   │   ├── eventDisplay.ts           (120 LOC) - Display names + colors
│   │   │   └── multiDayCalculations.ts   (80 LOC)  - Span calculations
│   │   │
│   │   └── modals/
│   │       ├── EventTypeSelector.tsx     (100 LOC) - NEW: Type picker
│   │       ├── RehearsalModal.tsx        (350 LOC) - NEW: Rehearsal + recurring
│   │       ├── OtherEventModal.tsx       (250 LOC) - NEW: Simplified other
│   │       ├── PublicGigWizard.tsx       (431 LOC) - MOVED: Existing gig wizard
│   │       ├── UnavailabilityModal.tsx   (469 LOC) - MOVED: Existing unavail
│   │       └── EventDetails.tsx          (224 LOC) - MOVED: Existing details
│   │
│   ├── dashboard.tsx                     (unchanged)
│   ├── pipeline.tsx                      (unchanged)
│   └── ...
│
├── components/                           (global/shared components only)
│   ├── ui/                               (shadcn components)
│   ├── layout/
│   └── ...
│
└── types/
    └── api.ts                            (unchanged)
```

---

## File Count & LOC Summary

### Admin Refactor
| Area | Files | Total LOC | Avg LOC/File |
|------|-------|-----------|--------------|
| **Before** | 1 file | 1,185 LOC | 1,185 |
| **After** | 21 files | ~1,540 LOC | 73 |

**Breakdown:**
- Core (index + context): 2 files, 160 LOC
- Artist Profile Tab: 8 files, 620 LOC
- Members Tab: 6 files, 490 LOC
- Spotify Tab: 5 files, 510 LOC

### Calendar Refactor
| Area | Files | Total LOC | Avg LOC/File |
|------|-------|-----------|--------------|
| **Before** | 5 files | 2,970 LOC | 594 |
| **After** | 20 files | ~2,600 LOC | 130 |

**Breakdown:**
- Core (index + context): 2 files, 250 LOC
- Hooks: 3 files, 180 LOC
- Views: 2 files, 370 LOC
- Components: 5 files, 630 LOC
- Utils: 3 files, 300 LOC
- Modals (new): 3 files, 700 LOC
- Modals (moved): 3 files, 1,124 LOC

### Total Impact
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Total Files** | 6 | 41 | +35 files |
| **Total LOC** | 4,155 | 4,140 | -15 LOC |
| **Largest File** | 1,192 LOC | 469 LOC | -61% |
| **Avg File Size** | 693 LOC | 101 LOC | -85% |

---

## Migration Checklist

### Phase 1: Calendar (Days 1-21)

#### Days 1-2: Folder Structure
- [ ] Create `pages/calendar/` folder
- [ ] Create `pages/calendar/hooks/` folder
- [ ] Create `pages/calendar/views/` folder
- [ ] Create `pages/calendar/components/` folder
- [ ] Create `pages/calendar/utils/` folder
- [ ] Create `pages/calendar/modals/` folder
- [ ] Create empty `index.tsx`, `CalendarContext.tsx`

#### Days 3-4: Utils
- [ ] Extract `eventDisplay.ts` (getEventDisplayName, getEventColors, formatEventTime)
- [ ] Extract `eventFilters.ts` (filter logic from lines 138-174)
- [ ] Extract `multiDayCalculations.ts` (getEventSpanDays, getRemainingDaysInWeek)
- [ ] Write unit tests for each util

#### Days 5-6: Hooks
- [ ] Create `useCalendarData.ts` (queries + filtering)
- [ ] Create `useEventPermissions.ts` (canEdit, canDelete, isOwner)
- [ ] Create `useCalendarExport.ts` (export + subscription URL)
- [ ] Test hooks independently

#### Days 7-8: Components
- [ ] Create `CalendarDay.tsx` (single day cell logic)
- [ ] Create `EventBadge.tsx` (event display badge)
- [ ] Create `CalendarControls.tsx` (export menu, view toggle, filters)
- [ ] Create `MonthNavigation.tsx` (month navigation + swipe)
- [ ] Create `UpcomingEventBanner.tsx` (next event highlight)

#### Days 9-10: Views
- [ ] Create `CalendarGridView.tsx` (grid rendering)
- [ ] Create `AgendaView.tsx` (list view)
- [ ] Wire up to context

#### Days 11-12: New Modals
- [ ] Create `EventTypeSelector.tsx` (4-button picker)
- [ ] Create `OtherEventModal.tsx` (simplified from EventModal)
- [ ] Create `RehearsalModal.tsx` (copy recurring from UnavailabilityModal)
- [ ] Test each modal independently

#### Days 13-14: Move Existing Modals
- [ ] Move `PublicGigWizard.tsx` to `calendar/modals/`
- [ ] Move `UnavailabilityModal.tsx` to `calendar/modals/`
- [ ] Move `EventDetails.tsx` to `calendar/modals/`
- [ ] Update imports in calendar components

#### Days 15-17: Integration
- [ ] Create `CalendarContext.tsx` (modal state, filters, navigation)
- [ ] Wire up `index.tsx` (route to GridView/AgendaView)
- [ ] Connect EventTypeSelector → modals routing
- [ ] Update `dashboard.tsx` to import new calendar

#### Days 18-19: Recurring Testing
- [ ] Test rehearsal recurring (daily, weekly, monthly, yearly)
- [ ] Test rehearsal recurring duration (forever, X times, until)
- [ ] Test unavailable recurring (verify not broken)
- [ ] Test edit/delete recurring events

#### Days 20-21: Polish
- [ ] Fix TypeScript errors
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Performance testing (large event counts)
- [ ] Delete old `pages/calendar.tsx`
- [ ] Delete old `components/event-modal.tsx`

### Phase 2: Admin (Days 22-28)

#### Days 22-23: Folder Structure + Hooks
- [ ] Create `pages/admin/` folder structure
- [ ] Create `pages/admin/tabs/` subfolders
- [ ] Create `useArtistSettings.ts` hook
- [ ] Create `useMembers.ts`, `useInvites.ts`, `useSpotify.ts` hooks

#### Day 24: Artist Profile Tab
- [ ] Create `AvatarSection.tsx`
- [ ] Create `BasicInfoSection.tsx`
- [ ] Create `ColorPickerSection.tsx`
- [ ] Create `GenresSection.tsx`
- [ ] Create `SocialLinksSection.tsx`
- [ ] Create `ArtistProfileForm.tsx` (orchestrator)
- [ ] Create `ArtistProfileTab/index.tsx`

#### Day 25: Members Tab
- [ ] Create `MembersList.tsx`
- [ ] Create `InviteSection.tsx`
- [ ] Move `ActiveInvitesList.tsx`
- [ ] Create `MembersTab/index.tsx`

#### Day 26: Spotify Tab
- [ ] Create `SpotifyConnection.tsx`
- [ ] Create `PlaylistSelector.tsx`
- [ ] Create `SpotifyProfile.tsx`
- [ ] Create `SpotifyTab/index.tsx`

#### Day 27: Integration
- [ ] Create `AdminContext.tsx`
- [ ] Wire up `admin/index.tsx` (tab shell)
- [ ] Update `dashboard.tsx` to import new admin

#### Day 28: Testing + Cleanup
- [ ] Test all admin functionality
- [ ] Fix TypeScript errors
- [ ] Delete old `pages/admin.tsx`
- [ ] Update documentation

---

## Import Path Changes

### Before
```typescript
import Calendar from '@/pages/calendar';
import Admin from '@/pages/admin';
import EventModal from '@/components/event-modal';
import PublicGigWizard from '@/components/public-gig-wizard';
```

### After
```typescript
import Calendar from '@/pages/calendar';
import Admin from '@/pages/admin';
import EventTypeSelector from '@/pages/calendar/modals/EventTypeSelector';
import RehearsalModal from '@/pages/calendar/modals/RehearsalModal';
import PublicGigWizard from '@/pages/calendar/modals/PublicGigWizard';
```

**Note:** Only files importing these components need updating (mainly dashboard.tsx)

---

## Git Strategy

### Branch Structure
```
master (production)
  └── refactor/calendar-admin-architecture
       ├── calendar-utils (Days 3-4)
       ├── calendar-hooks (Days 5-6)
       ├── calendar-components (Days 7-8)
       ├── calendar-views (Days 9-10)
       ├── calendar-modals (Days 11-14)
       ├── calendar-integration (Days 15-17)
       ├── calendar-testing (Days 18-21)
       ├── admin-structure (Days 22-23)
       ├── admin-tabs (Days 24-26)
       ├── admin-integration (Days 27-28)
       └── READY FOR MERGE
```

### Commit Strategy
- One commit per file created (easy to review)
- Test commit after each phase (ensures working state)
- Squash before merge (clean history)

---

## Rollback Plan

### If Things Go Wrong
1. **Keep old files** until refactor complete
2. **Feature flag** in `dashboard.tsx`:
```typescript
const USE_NEW_CALENDAR = false; // Toggle to switch back

{USE_NEW_CALENDAR ? (
  <NewCalendar />
) : (
  <OldCalendar />
)}
```
3. **Parallel development**: New code doesn't affect old code
4. **Only delete old files** after 100% confidence

---

## Success Metrics

- [ ] All 41 files created
- [ ] All files < 300 LOC
- [ ] No TypeScript errors
- [ ] All existing tests pass
- [ ] New recurring event tests pass
- [ ] 5 users can test without issues
- [ ] Performance maintained (< 100ms render)
- [ ] Mobile works perfectly

**When all checked → Merge to master! 🚀**
