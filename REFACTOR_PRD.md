# Calendar & Admin Refactor PRD

**Status:** Planning Phase
**Target:** Option 2 (Aggressive Refactor)
**Timeline:** Complete before scaling beyond 5 users
**Last Updated:** 2025-11-07

---

## Executive Summary

Both `admin.tsx` (1,185 LOC) and `calendar.tsx` (1,192 LOC) have become unmaintainable monoliths. This PRD outlines a feature-based architectural refactor to bring components down to 150-300 LOC each while improving maintainability, testability, and TypeScript type safety.

---

## Part 1: Calendar Refactor PRD

### Current State Analysis

#### Core Functionality (from calendar.tsx)
1. **View Modes**: Calendar grid view + Agenda list view
2. **Event Types**: Gig, Rehearsal, Other, Unavailable
3. **Event Scopes**:
   - Artist events (practices, gigs for the band)
   - User personal events (unavailability, cross-artist events)
   - Cross-artist events (when user is in multiple bands)
4. **Filtering**: Toggle visibility of Artist Events, My Events, All Artists
5. **Event Interactions**: Click to view details, edit, delete
6. **Event Creation**: Dedicated modals for each type
   - **Gig** → PublicGigWizard (431 LOC) - Full wizard with venue search
   - **Unavailable** → UnavailabilityModal (469 LOC) - Date range + recurring patterns
   - **Rehearsal** → NEW: RehearsalModal (to be created) - Time + location + recurring
   - **Other** → EventModal (simplified, only shows after selecting "Other" type)
7. **Recurring Events**: Supported for Unavailable (existing) and Rehearsal (new)
   - Patterns: Daily, Weekly, Monthly, Yearly with interval
   - Duration: Forever, Count (X times), Until (specific date)
8. **Event Display**:
   - Single-day vs multi-day events
   - Week-spanning logic
   - Color coding by type or artist
   - Privacy protection for cross-artist unavailability
9. **Export**: iCal download + subscription URL
10. **Swipe Gestures**: Month navigation, banner dismissal
11. **Conflict Detection**: Shows warnings when scheduling overlaps

#### Complex Business Logic
- **Event Filtering** (lines 138-174): 3-level filtering system
  - Artist events vs personal events
  - Cross-artist unavailability detection
  - Ownership-based filtering
- **Event Display Names** (lines 259-304): Privacy-aware name formatting
  - Unavailability: Shows displayName with privacy protection
  - Gigs: "Venue Time Title" format
  - Other: Type-based formatting
  - Cross-artist prefix when no artist context
- **Permission System** (lines 307-331): Complex ownership checks
  - Unavailability: Check ownerUserId
  - Artist events: Check artist context match
  - Personal events: Always allow
- **Multi-day Event Rendering** (lines 236-250): Geometric calculations
  - Span days across weeks
  - Week boundary detection
  - Continuation bars for extending events

#### Data Flow
```
useQuery (calendarData) → Filter by toggles →
  ↓
Calendar Grid / Agenda View
  ↓
Event Click → EventDetails Modal
  ↓
Edit/Delete → EventModal / PublicGigWizard / UnavailabilityModal
  ↓
API Mutation → Invalidate Cache → Re-render
```

#### State Management (15 useState hooks!)
1. `currentDate` - Month being viewed
2. `showEventModal` - EventModal visibility
3. `showPublicGigWizard` - Gig wizard visibility
4. `showUnavailabilityModal` - Unavailability modal visibility
5. `showEventDetails` - Details modal visibility
6. `selectedDate` - Date for new event
7. `selectedEvent` - Event being edited/viewed
8. `eventType` - Type for new event
9. `isEditingEvent` - Edit mode flag
10. `dismissedHighlight` - Banner dismissed flag
11. `viewMode` - Calendar vs Agenda
12. `showArtistEvents` - Filter toggle
13. `showMyEvents` - Filter toggle
14. `showAllArtists` - Filter toggle

---

### Target Architecture: calendar/

```
pages/
  calendar/
    index.tsx                    (~150 LOC) - Main shell, routes to views
    CalendarContext.tsx          (~100 LOC) - Shared state provider

    hooks/
      useCalendarData.ts         (~80 LOC)  - Data fetching + filtering
      useCalendarExport.ts       (~60 LOC)  - Export functionality
      useEventPermissions.ts     (~40 LOC)  - Permission checks

    views/
      CalendarGridView.tsx       (~250 LOC) - Grid rendering
      AgendaView.tsx             (~120 LOC) - List view

    components/
      CalendarControls.tsx       (~120 LOC) - Export, view toggle, toggles
      MonthNavigation.tsx        (~80 LOC)  - Month selector + swipe
      UpcomingEventBanner.tsx    (~80 LOC)  - Next event highlight
      CalendarDay.tsx            (~150 LOC) - Single day cell logic
      EventBadge.tsx             (~100 LOC) - Event display formatting

    utils/
      eventFilters.ts            (~100 LOC) - Filter logic
      eventDisplay.ts            (~120 LOC) - Display name + colors
      multiDayCalculations.ts    (~80 LOC)  - Span calculations

    modals/
      EventTypeSelector.tsx      (~100 LOC) - Simplified type picker
      PublicGigWizard.tsx        (existing 431 LOC - lift & shift)
      UnavailabilityModal.tsx    (existing 469 LOC - lift & shift)
      RehearsalModal.tsx         (~350 LOC) - NEW: Time, location, recurring
      OtherEventModal.tsx        (~250 LOC) - Simplified from EventModal
```

**Total:** ~1,430 LOC across 14 files (avg 102 LOC/file)

---

### Event Creation Flow (Improved UX)

#### Current Problem
The existing EventModal shows ALL fields immediately, making it overwhelming and cluttered.

#### New Approach: Type-First Selection
```
User clicks "Add Event" or day cell
  ↓
EventTypeSelector shows (minimalist)
  ┌─────────────────────────────┐
  │  Select Event Type          │
  │  [🎵 Gig]  [🎤 Rehearsal]   │
  │  [📅 Other] [🚫 Unavailable]│
  └─────────────────────────────┘
  ↓
Based on selection:
  • Gig → PublicGigWizard (full venue search wizard)
  • Rehearsal → RehearsalModal (time, location, recurring)
  • Other → OtherEventModal (minimal: title, date, time, notes)
  • Unavailable → UnavailabilityModal (date range, recurring, notes)
```

#### Benefits
1. **Less cognitive load** - User sees 4 clear options first
2. **Dedicated workflows** - Each event type has optimized UI
3. **Consistent with proven UX** - Gig and Unavailable modals already work great
4. **Easier maintenance** - Each modal is self-contained

---

### Detailed Component Specifications

#### 1. CalendarContext.tsx
**Purpose:** Central state management for calendar
**State:**
- View preferences (viewMode, filters)
- Modal visibility states
- Selected date/event
- Current month
**Methods:**
- `openEventModal(date, type)`
- `openEventDetails(event)`
- `openGigWizard(event?)`
- Navigation methods

#### 2. useCalendarData.ts
**Purpose:** Data fetching + filtering logic
**Exports:**
- `useCalendarData(artistId, filters, currentDate)` hook
**Returns:**
- `events` - Filtered event list
- `upcomingEvent` - Next event
- `isLoading`
- `refetch`

#### 3. CalendarGridView.tsx
**Purpose:** Renders the calendar grid
**Props:**
- `events: Event[]`
- `currentDate: Date`
- `onDayClick: (date, events) => void`
- `onEventClick: (event) => void`
**Features:**
- Week headers
- Day cells (delegates to CalendarDay)
- Touch/swipe handling

#### 4. CalendarDay.tsx
**Purpose:** Single day cell rendering
**Props:**
- `day: Date`
- `events: Event[]`
- `isCurrentMonth: boolean`
- `isToday: boolean`
- `onEventClick: (event) => void`
- `onAddClick: (date) => void`
**Features:**
- Multi-day event bars
- Continuing event bars
- Hover add button
- Event overflow handling

#### 5. EventBadge.tsx
**Purpose:** Event display with formatting
**Props:**
- `event: Event`
- `displayMode: 'calendar' | 'agenda'`
- `artistData?: { displayColour: string }`
- `onClick: () => void`
**Features:**
- Privacy-aware display names
- Color coding (type vs artist)
- Icon + text formatting
- Truncation/ellipsis

#### 6. eventDisplay.ts (Utility)
**Purpose:** Extract display logic
**Exports:**
```typescript
export function getEventDisplayName(
  event: Event,
  artistMembers: ArtistMembership[],
  userProfile: UserProfile,
  effectiveArtistId?: string
): string

export function getEventColors(
  event: Event,
  artistData?: { displayColour: string }
): { bg: string, border: string, text: string }

export function formatEventTime(event: Event): string
```

#### 7. useEventPermissions.ts
**Purpose:** Permission checking
**Exports:**
```typescript
export function useEventPermissions(
  currentUserId: string,
  currentMembershipId: string,
  effectiveArtistId: string
) {
  return {
    canEdit: (event: Event) => boolean,
    canDelete: (event: Event) => boolean,
    isOwner: (event: Event) => boolean
  }
}
```

#### 8. EventTypeSelector.tsx (NEW)
**Purpose:** Initial modal for selecting event type
**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `selectedDate: string`
- `onSelectType: (type: EventType) => void`
**Features:**
- Minimalist 4-button grid
- Color-coded by event type
- Icons + labels
- No other fields until type selected

#### 9. RehearsalModal.tsx (NEW)
**Purpose:** Dedicated modal for rehearsal/practice events
**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `selectedDate: string`
- `artistId: string`
- `editingEvent?: Event`
**Features:**
- Title (optional, defaults to "Rehearsal")
- Date picker (single date)
- Start/End time pickers
- Location input (private location)
- Recurring pattern (same as UnavailabilityModal)
  - Daily, Weekly, Monthly, Yearly
  - Interval input
  - Duration: Forever, Count, Until
- Notes (optional)
- Conflict detection
- Orange theme (matches rehearsal color)

**Recurring Logic:** Lift & shift from UnavailabilityModal (lines 37-126, 173-400)

#### 10. OtherEventModal.tsx (NEW)
**Purpose:** Simplified modal for "Other" event type
**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `selectedDate: string`
- `artistId: string`
- `editingEvent?: Event`
**Features:**
- Title (required)
- Date picker
- Start/End time (optional)
- Location (optional)
- Notes (optional)
- Gray theme (matches "other" color)
- No recurring (keep it simple)

**Note:** This is the current EventModal stripped down to essentials

---

### Critical Test Cases

1. **Filter Combinations**
   - All toggles ON → Shows all events
   - Artist Events OFF, My Events ON → Only personal unavailability
   - All Artists OFF → Current artist only
   - Cross-artist unavailability → Shows in Artist Events

2. **Multi-day Events**
   - Event spanning 3 days → Shows as bar across days
   - Event crossing week boundary → Wraps to next week
   - Multiple multi-day events → Stack without overlap

3. **Privacy Protection**
   - Cross-artist unavailability → Hides time, location, public badge
   - Same artist unavailability → Shows full details
   - Event details modal → Privacy rules applied

4. **Permissions**
   - User unavailability → Only owner can edit
   - Artist event in current context → Artist members can edit
   - Artist event from other artist → Cannot edit

5. **Event Creation Flow**
   - Click day → Opens EventTypeSelector
   - Select Gig → Opens PublicGigWizard
   - Select Rehearsal → Opens RehearsalModal
   - Select Other → Opens OtherEventModal
   - Select Unavailable → Opens UnavailabilityModal
   - FAB → Opens EventTypeSelector for today

6. **Recurring Events**
   - Rehearsal: Every 2 weeks, 10 times → Creates 10 rehearsals
   - Unavailability: Daily for 5 days → Blocks 5 consecutive days
   - Rehearsal recurring edit → Updates all future occurrences
   - Delete recurring event → Offers "This only" or "All future"

---

## Part 2: Admin Refactor PRD

### Current State Analysis

#### Core Functionality (from admin.tsx)
1. **Tab System**: Artist Settings, Members, Spotify
2. **Artist Profile**:
   - Avatar upload (ImageUpload component)
   - Name, description, location (LocationAutocomplete)
   - Display color picker with presets
   - Genre selector (multi-select)
   - Social media links (6 platforms)
3. **Member Management**:
   - Member list with avatars
   - Role display
   - Remove member (admin/owner only)
   - Magic link invites (general + phone-specific)
   - Active invites list with copy/disable
4. **Spotify Integration**:
   - OAuth connection flow
   - Playlist selection
   - Import songs from playlist
   - Sync to Spotify
   - User profile display

#### State Management (7 useState hooks + form state)
1. `accessToken` - Spotify auth
2. `selectedPlaylistId` - Selected playlist
3. `userProfile` - Spotify user
4. `activeTab` - Current tab
5. `invitePhone` - Phone input
6. `artistSettings` - Massive form state object (12 fields)

---

### Target Architecture: admin/

```
pages/
  admin/
    index.tsx                      (~100 LOC) - Tab shell
    AdminContext.tsx               (~60 LOC)  - Shared state

    tabs/
      ArtistProfileTab/
        index.tsx                  (~80 LOC)  - Tab container
        ArtistProfileForm.tsx      (~150 LOC) - Form orchestrator
        components/
          AvatarSection.tsx        (~60 LOC)  - Avatar upload
          BasicInfoSection.tsx     (~80 LOC)  - Name, bio, location
          ColorPickerSection.tsx   (~80 LOC)  - Color selector
          GenresSection.tsx        (~50 LOC)  - Genre selector wrapper
          SocialLinksSection.tsx   (~120 LOC) - All social inputs
        hooks/
          useArtistSettings.ts     (~100 LOC) - Form state + mutations

      MembersTab/
        index.tsx                  (~80 LOC)  - Tab container
        components/
          MembersList.tsx          (~120 LOC) - Member cards
          InviteSection.tsx        (~150 LOC) - Invite forms
          ActiveInvitesList.tsx    (existing, move here)
        hooks/
          useMembers.ts            (~60 LOC)  - Member queries
          useInvites.ts            (~80 LOC)  - Invite mutations

      SpotifyTab/
        index.tsx                  (~80 LOC)  - Tab container
        components/
          SpotifyConnection.tsx    (~100 LOC) - Connect/disconnect
          PlaylistSelector.tsx     (~120 LOC) - Playlist picker + actions
          SpotifyProfile.tsx       (~60 LOC)  - User display
        hooks/
          useSpotify.ts            (~150 LOC) - OAuth + playlist logic
```

**Total:** ~1,540 LOC across 21 files (avg 73 LOC/file)

---

### Detailed Component Specifications

#### 1. useArtistSettings.ts
**Purpose:** Centralize form state management
**Exports:**
```typescript
export function useArtistSettings(artistId: string, artistData: Artist) {
  return {
    settings: ArtistSettings,
    updateField: (field, value) => void,
    save: () => Promise<void>,
    isDirty: boolean,
    isLoading: boolean
  }
}
```

#### 2. SocialLinksSection.tsx
**Purpose:** All 6 social media inputs
**Props:**
- `values: { facebookUrl, instagramUrl, ... }`
- `onChange: (field, value) => void`
**Features:**
- Icon + branded background for each platform
- URL validation
- Consistent layout (2-column grid)

#### 3. InviteSection.tsx
**Purpose:** Invite creation forms
**Props:**
- `artistId: string`
- `onInviteSent: () => void`
**Features:**
- General link generator (copy to clipboard)
- Phone-specific invite (phone input + send button)
- Toast notifications
- Validation

#### 4. useSpotify.ts
**Purpose:** Spotify integration logic
**Exports:**
```typescript
export function useSpotify(artistId: string) {
  return {
    accessToken: string | null,
    playlists: Playlist[],
    userProfile: SpotifyUser | null,
    isConnected: boolean,
    connect: () => Promise<void>,
    disconnect: () => void,
    selectPlaylist: (id: string) => void,
    importFromPlaylist: () => Promise<void>,
    syncToSpotify: () => Promise<void>
  }
}
```

---

## Migration Strategy

### Phase 1: Calendar (Week 1-3)
1. **Day 1-2:** Create folder structure + context
2. **Day 3-4:** Extract utility functions (eventDisplay, eventFilters, multiDayCalculations)
3. **Day 5-6:** Create hooks (useCalendarData, useEventPermissions, useCalendarExport)
4. **Day 7-8:** Build components (CalendarDay, EventBadge, CalendarControls)
5. **Day 9-10:** Build views (CalendarGridView, AgendaView)
6. **Day 11-12:** Build new modals:
   - EventTypeSelector (~100 LOC)
   - RehearsalModal (~350 LOC) - Copy recurring logic from UnavailabilityModal
   - OtherEventModal (~250 LOC) - Simplify existing EventModal
7. **Day 13-14:** Move existing modals to calendar/modals/
   - PublicGigWizard (lift & shift)
   - UnavailabilityModal (lift & shift)
   - EventDetails (lift & shift)
8. **Day 15-17:** Wire up index.tsx + comprehensive testing
9. **Day 18-19:** Recurring event testing (rehearsal + unavailability)
10. **Day 20-21:** Bug fixes + edge case handling

### Phase 2: Admin (Week 4)
1. **Day 1-2:** Create folder structure + context + useArtistSettings hook
2. **Day 3:** Artist Profile tab components
3. **Day 4:** Members tab components
4. **Day 5:** Spotify tab components
5. **Day 6-7:** Testing + bug fixes

**Total Timeline:** ~4 weeks (Calendar: 3 weeks, Admin: 1 week)

---

## Testing Requirements

### Calendar
- [ ] All filter combinations work correctly
- [ ] Multi-day events render across weeks
- [ ] Privacy protection applied correctly
- [ ] Permissions enforced on edit/delete
- [ ] Export downloads .ics file
- [ ] Subscription URL copied
- [ ] Swipe gestures work on mobile
- [ ] **NEW:** EventTypeSelector opens first (not full modal)
- [ ] **NEW:** Gig selection → PublicGigWizard
- [ ] **NEW:** Rehearsal selection → RehearsalModal
- [ ] **NEW:** Other selection → OtherEventModal (simplified)
- [ ] **NEW:** Unavailable selection → UnavailabilityModal
- [ ] **NEW:** Rehearsal recurring (daily/weekly/monthly/yearly) works
- [ ] **NEW:** Rehearsal recurring "10 times" creates 10 events
- [ ] **NEW:** Rehearsal recurring "until date" stops correctly
- [ ] Unavailable recurring works (existing - verify not broken)
- [ ] Conflict detection shows warnings
- [ ] Cross-artist events display properly

### Admin
- [ ] Avatar upload works
- [ ] Location autocomplete functional
- [ ] Color picker saves correctly
- [ ] Genre selector works
- [ ] Social links save + validate
- [ ] Member removal works (with cascade)
- [ ] Invite links generate + copy
- [ ] Spotify OAuth flow completes
- [ ] Playlist import adds songs
- [ ] Spotify sync updates playlist

---

## Success Criteria

1. ✅ All components < 300 LOC
2. ✅ No TypeScript errors
3. ✅ All existing functionality preserved
4. ✅ Test coverage on critical paths
5. ✅ No breaking changes to API calls
6. ✅ Performance maintained or improved
7. ✅ Mobile responsive maintained

---

## Risk Mitigation

1. **State Management Complexity**
   - Risk: Context introduces re-render issues
   - Mitigation: Use React.memo + split contexts if needed

2. **Multi-day Event Rendering**
   - Risk: Edge cases in week-spanning logic
   - Mitigation: Extract to utility with unit tests

3. **Privacy Logic**
   - Risk: Cross-artist privacy rules missed
   - Mitigation: Centralize in eventDisplay.ts with tests

4. **Spotify OAuth**
   - Risk: Token refresh during refactor
   - Mitigation: Don't touch localStorage key names

---

## Open Questions

1. ~~Should we use Zustand instead of Context for calendar state?~~
   - **DECISION:** Start with Context, switch to Zustand if re-render issues arise

2. ~~Should EventModal, PublicGigWizard, UnavailabilityModal be moved into calendar/modals/?~~
   - **DECISION:** YES - Move to `calendar/modals/` with lift & shift

3. Should we add React Query devtools during this refactor?
   - **TODO:** Decide before starting

4. Should we create a shared `types/calendar.ts` for Calendar-specific types?
   - **TODO:** Decide before starting

5. **NEW:** Backend support for recurring event management?
   - Does backend handle "delete all future" vs "delete this only"?
   - Does backend expand recurring events or store pattern + generate on-demand?
   - **TODO:** Check existing backend implementation in unavailability endpoint

---

## Next Steps

1. Review this PRD with team
2. Approve folder structure
3. Create feature branch: `refactor/calendar-admin-architecture`
4. Begin Phase 1 Day 1 (calendar folder + context)
