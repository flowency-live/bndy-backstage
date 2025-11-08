# Event Creation Flow - Visual Guide

## Current State (Before Refactor)
```
User clicks "Add Event"
         ↓
    EventModal
  ┌──────────────────────────────┐
  │ [Type: Gig Rehearsal Other]  │
  │                              │
  │ Title: ___________________   │
  │ Date: ____________________   │
  │ Time: ____________________   │
  │ Location: _______________    │
  │ Notes: ___________________   │
  │ ________________________     │
  │                              │
  │ [Cancel]  [Save]             │
  └──────────────────────────────┘
         ↓
  If "Gig" → Opens PublicGigWizard
  If "Unavailable" → Opens UnavailabilityModal
  Otherwise → Saves directly
```
**Problem:** Shows all fields before user chooses type (cluttered, confusing)

---

## New State (After Refactor)
```
User clicks "Add Event" or day cell or FAB
                ↓
         EventTypeSelector
       ┌─────────────────────┐
       │  What type?         │
       │                     │
       │  [🎵 Gig]           │
       │  [🎤 Rehearsal]     │
       │  [📅 Other]         │
       │  [🚫 Unavailable]   │
       │                     │
       └─────────────────────┘
                ↓
    User selects type
    ┌─────┬─────┬──────┬────────────┐
    │ Gig │ Reh │Other │Unavailable │
    └──┬──┴──┬──┴───┬──┴──────┬─────┘
       │     │      │         │
       ↓     ↓      ↓         ↓
```

---

## Path 1: Gig Selected
```
PublicGigWizard (existing - 431 LOC)
┌────────────────────────────────────┐
│ Step 1: Search for Venue           │
│ [Search: "The Garage, London"]     │
│                                    │
│ Results:                           │
│  ○ The Garage, Highbury            │
│  ○ The Old Garage, Camden          │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ Step 2: Event Details              │
│ Venue: The Garage ✓                │
│ Date: 15/01/2025                   │
│ Time: 20:00 - 23:00                │
│ Title: Friday Night Live           │
│ Description: ___________________   │
│                                    │
│ [Back] [Create Gig]                │
└────────────────────────────────────┘
```
**Theme:** Green (matches gig color)
**Status:** EXISTING - Lift & shift to calendar/modals/

---

## Path 2: Rehearsal Selected (NEW!)
```
RehearsalModal (~350 LOC)
┌────────────────────────────────────┐
│ 🎤 Add Rehearsal                   │
├────────────────────────────────────┤
│ Title (optional)                   │
│ [Rehearsal__________________]      │
│                                    │
│ Date                               │
│ [15/01/2025] 📅                    │
│                                    │
│ Time                               │
│ [19:00] 🕐  to  [21:00] 🕐         │
│                                    │
│ Location (private)                 │
│ [Studio B, Main St___________]     │
│                                    │
│ ┌─ Repeat ─────────────────────┐  │
│ │ [🔁 Add repeat]              │  │
│ └──────────────────────────────┘  │
│                                    │
│ Notes                              │
│ [Bring PA system___________]       │
│                                    │
│ [Cancel]  [Save Rehearsal]         │
└────────────────────────────────────┘

When "Add repeat" clicked:
┌────────────────────────────────────┐
│ ┌─ Repeat ───────────── [Remove]┐ │
│ │ ○ Don't repeat                │ │
│ │ ● Every [2] week(s)           │ │
│ │ ○ Every [1] month(s)          │ │
│ │ ○ Every [1] year(s)           │ │
│ │                               │ │
│ │ Duration:                     │ │
│ │ ○ Forever                     │ │
│ │ ● [10] times                  │ │
│ │ ○ Until [Select date]         │ │
│ └───────────────────────────────┘ │
└────────────────────────────────────┘
```
**Theme:** Orange (matches rehearsal color)
**Recurring Logic:** Copy from UnavailabilityModal lines 37-126, 173-400
**Result:** Creates 10 rehearsals, every 2 weeks

---

## Path 3: Other Selected (NEW!)
```
OtherEventModal (~250 LOC)
┌────────────────────────────────────┐
│ 📅 Add Other Event                 │
├────────────────────────────────────┤
│ Title *                            │
│ [Team Meeting______________]       │
│                                    │
│ Date                               │
│ [15/01/2025] 📅                    │
│                                    │
│ Time (optional)                    │
│ [14:00] 🕐  to  [15:00] 🕐         │
│                                    │
│ Location (optional)                │
│ [Meeting Room 3____________]       │
│                                    │
│ Notes                              │
│ [Bring quarterly reports____]      │
│                                    │
│ [Cancel]  [Save Event]             │
└────────────────────────────────────┘
```
**Theme:** Gray (matches "other" color)
**No Recurring:** Keep it simple for miscellaneous events

---

## Path 4: Unavailable Selected
```
UnavailabilityModal (existing - 469 LOC)
┌────────────────────────────────────┐
│ 🚫 Mark as Unavailable             │
├────────────────────────────────────┤
│ Dates                              │
│ [15/01/25 - 19/01/25] 📅           │
│                                    │
│ ┌─ Repeat ─────────────────────┐  │
│ │ [🔁 Add repeat]              │  │
│ └──────────────────────────────┘  │
│                                    │
│ Notes                              │
│ [On holiday in Spain________]      │
│                                    │
│ [Cancel]  [Mark Unavailable]       │
└────────────────────────────────────┘

When "Add repeat" clicked:
┌────────────────────────────────────┐
│ ┌─ Repeat ───────────── [Remove]┐ │
│ │ ○ Don't repeat                │ │
│ │ ○ Every [1] day(s)            │ │
│ │ ● Every [1] week(s)           │ │
│ │ ○ Every [1] month(s)          │ │
│ │                               │ │
│ │ Duration:                     │ │
│ │ ● Forever                     │ │
│ │ ○ [5] times                   │ │
│ │ ○ Until [Select date]         │ │
│ └───────────────────────────────┘ │
└────────────────────────────────────┘
```
**Theme:** Red/Pink gradient
**Status:** EXISTING - Lift & shift to calendar/modals/
**Example:** "Every Monday, forever" → Blocks every Monday

---

## Modal Responsibilities Summary

| Event Type   | Modal                  | LOC | Features                              | Status   |
|--------------|------------------------|-----|---------------------------------------|----------|
| **Gig**      | PublicGigWizard        | 431 | Venue search, multi-step wizard       | Existing |
| **Rehearsal**| RehearsalModal         | 350 | Time, location, **recurring**         | **NEW**  |
| **Other**    | OtherEventModal        | 250 | Simple form, no recurring             | **NEW**  |
| **Unavail.** | UnavailabilityModal    | 469 | Date range, **recurring**, notes      | Existing |
| *(Initial)*  | EventTypeSelector      | 100 | 4-button picker                       | **NEW**  |

---

## Code Reuse Strategy

### Recurring Logic (DRY Principle)
```typescript
// Option 1: Shared Component (RECOMMENDED)
components/RecurringPattern.tsx (~200 LOC)
  - Extracted from UnavailabilityModal
  - Used by both UnavailabilityModal + RehearsalModal
  - Props: value, onChange, theme color

// Option 2: Copy-Paste (FASTER for MVP)
  - Copy lines 37-126, 173-400 from UnavailabilityModal
  - Paste into RehearsalModal
  - Change theme color to orange
  - Refactor to shared component later if time permits
```

**Recommendation:** Option 2 for speed, then refactor in Phase 2 if needed

---

## User Journey Examples

### Example 1: Weekly Rehearsal
```
1. User clicks calendar day (Monday 20th Jan)
2. EventTypeSelector appears
3. User clicks [🎤 Rehearsal]
4. RehearsalModal opens with date = 20th Jan
5. User enters:
   - Title: "Monday Night Practice"
   - Time: 19:00 - 21:00
   - Location: "Studio B"
   - Clicks "Add repeat"
   - Selects: Every 1 week, Forever
6. User clicks "Save Rehearsal"
7. Backend creates recurring pattern
8. Calendar shows rehearsal every Monday
```

### Example 2: One-off Meeting
```
1. User clicks FAB
2. EventTypeSelector appears
3. User clicks [📅 Other]
4. OtherEventModal opens with date = today
5. User enters:
   - Title: "Marketing Strategy Meeting"
   - Date: Tomorrow
   - Time: 14:00 - 15:00
6. User clicks "Save Event"
7. Single event created (no recurring)
```

### Example 3: Multi-day Holiday
```
1. User clicks calendar day (1st Feb)
2. EventTypeSelector appears
3. User clicks [🚫 Unavailable]
4. UnavailabilityModal opens
5. User selects date range: 1st Feb - 7th Feb
6. Notes: "Ski trip in Austria"
7. User clicks "Mark Unavailable"
8. All 7 days blocked on calendar
9. Other band members see "User X unavailable"
```

---

## Key Benefits

### For Users
- ✅ Clear, focused choices (4 buttons)
- ✅ No overwhelming forms
- ✅ Each event type feels "right" (optimized UI)
- ✅ Recurring rehearsals (requested feature!)

### For Developers
- ✅ Modals are self-contained (easier to test)
- ✅ Clear separation of concerns
- ✅ Easier to add new event types in future
- ✅ No "god component" with 15 useState hooks

### For Testing
- ✅ Each modal tested independently
- ✅ EventTypeSelector: 4 click paths to test
- ✅ Recurring logic: Unit tests possible
- ✅ E2E: One journey per event type

---

## Next: Implementation Order

1. **EventTypeSelector** (Day 11) - Simplest, no dependencies
2. **OtherEventModal** (Day 11) - Simplify existing EventModal
3. **RehearsalModal** (Day 12) - Copy recurring from UnavailabilityModal
4. **Move existing modals** (Day 13-14) - Lift & shift
5. **Wire up routing** (Day 15) - Connect EventTypeSelector to modals
6. **Test recurring** (Day 18-19) - Rehearsal + Unavailable patterns

**Total:** 3 new modals + 3 moved modals = Cleaner, better UX! 🎉
