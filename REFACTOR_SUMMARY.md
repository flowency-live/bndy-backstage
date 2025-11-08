# Calendar & Admin Refactor - Quick Summary

## What Changed from Initial Plan

### Your Excellent Improvements ✅

1. **Event Creation UX Overhaul**
   - **OLD:** Generic EventModal with all fields shown immediately
   - **NEW:** EventTypeSelector → Route to dedicated modals
     - Gig → PublicGigWizard (existing, works great!)
     - Rehearsal → **NEW** RehearsalModal with recurring
     - Other → **NEW** OtherEventModal (simplified)
     - Unavailable → UnavailabilityModal (existing, works great!)

2. **Recurring Events for Rehearsals**
   - **ADDED:** Recurring pattern support (daily/weekly/monthly/yearly)
   - **ADDED:** Duration options (forever, X times, until date)
   - **LIFT:** Copy proven logic from UnavailabilityModal

3. **Existing Modals - Lift & Shift**
   - PublicGigWizard (431 LOC) → Move as-is to `calendar/modals/`
   - UnavailabilityModal (469 LOC) → Move as-is to `calendar/modals/`
   - EventDetails → Move as-is to `calendar/modals/`
   - **No changes to lower-level functionality**

---

## New Modal Architecture

### EventTypeSelector.tsx (~100 LOC)
```tsx
// Minimalist type picker - shows ONLY type selection
<Modal>
  <Grid>
    [🎵 Gig]      [🎤 Rehearsal]
    [📅 Other]    [🚫 Unavailable]
  </Grid>
</Modal>
```

### RehearsalModal.tsx (~350 LOC)
```tsx
// Orange-themed dedicated modal
- Title (optional, default "Rehearsal")
- Date picker
- Time picker (start/end)
- Location (private)
- Recurring pattern (copied from UnavailabilityModal)
  ├─ Type: Daily/Weekly/Monthly/Yearly
  ├─ Interval: Every X days/weeks/etc
  └─ Duration: Forever / X times / Until date
- Notes
- Conflict warnings
```

### OtherEventModal.tsx (~250 LOC)
```tsx
// Gray-themed simplified modal
- Title (required)
- Date picker
- Time picker (optional)
- Location (optional)
- Notes
// NO recurring - keep it simple
```

---

## Timeline Impact

- **Original Plan:** 3 weeks total (2 weeks calendar, 1 week admin)
- **Updated Plan:** 4 weeks total (3 weeks calendar, 1 week admin)
- **Extra Week For:**
  - Building 3 new modals (EventTypeSelector, RehearsalModal, OtherEventModal)
  - Testing recurring rehearsals thoroughly
  - Verifying existing recurring unavailability still works

---

## Why This Is Better

1. **UX Wins**
   - Less cognitive load (4 buttons vs full form)
   - Consistent with proven patterns (Gig/Unavailable already work!)
   - Each event type gets optimized workflow

2. **Maintainability**
   - Self-contained modals (easier to test)
   - Recurring logic in 2 places (Rehearsal + Unavailable)
   - Clear separation of concerns

3. **Future-Proof**
   - Easy to add new event types (new dedicated modal)
   - Pattern established for specialized workflows
   - No "god component" with all logic

---

## Critical Questions to Answer

### Backend Support
**Q:** Does the backend already handle recurring events properly?
- `/api/users/me/unavailability` accepts `recurring` object ✅
- Does it expand to individual events or store pattern?
- Does it support "delete this only" vs "delete all future"?
- **ACTION:** Check serverless-api unavailability Lambda before starting

### Folder Structure Decision
**Q:** Keep modals in `components/` or move to `calendar/modals/`?
- **RECOMMENDED:** Move to `calendar/modals/` for better organization
- All calendar-related in one place
- Easier to find during refactor

---

## Before You Start Checklist

- [ ] Review updated [REFACTOR_PRD.md](./REFACTOR_PRD.md)
- [ ] Check backend recurring event support (unavailability Lambda)
- [ ] Decide: React Query devtools?
- [ ] Decide: `types/calendar.ts` for calendar-specific types?
- [ ] Create feature branch: `refactor/calendar-admin-architecture`
- [ ] Run existing tests to establish baseline
- [ ] Backup current working state

---

## First Steps (Day 1)

1. Create folder structure:
```
pages/calendar/
├── index.tsx
├── CalendarContext.tsx
├── hooks/
├── views/
├── components/
├── utils/
└── modals/
```

2. Create empty files with TypeScript interfaces
3. Move first utility: `eventDisplay.ts` (safest, no dependencies)
4. Write unit tests for `getEventDisplayName()`
5. Verify existing calendar still works (parallel development)

---

## Success =
- ✅ EventTypeSelector shows first (not full form)
- ✅ All 4 event types have dedicated, optimized flows
- ✅ Rehearsal recurring works (daily/weekly/monthly/yearly)
- ✅ Unavailable recurring still works (not broken)
- ✅ All components < 300 LOC
- ✅ No TypeScript errors
- ✅ All existing functionality preserved
- ✅ 5 users can still use the app during refactor!

---

**Ready to start? Let's build this properly while you have a small user base!**
