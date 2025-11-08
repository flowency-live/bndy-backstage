# AWS Infrastructure Findings - BNDY Platform
**Date:** 2025-11-07
**Region:** eu-west-2 (London)
**Investigation:** Backend capabilities for admin/calendar refactor

---

## Lambda Functions Inventory

### Active Lambdas (14 functions)
All running **nodejs20.x** runtime:

| Function Name | Purpose | Last Modified |
|---------------|---------|---------------|
| **events-lambda** | Calendar system, artist events, unavailability | 2025-11-06 22:32 |
| **users-lambda** | User profile management | 2025-11-06 22:18 |
| **artists-lambda** | Artist CRUD, settings, members | 2025-11-06 22:36 |
| **memberships-lambda** | Artist memberships, roles | 2025-11-06 22:25 |
| **invites-lambda** | Magic link invites | 2025-11-06 17:37 |
| **songs-lambda** | Song library | 2025-11-06 17:48 |
| **artist-songs-lambda** | Artist-specific songs | 2025-11-06 18:11 |
| **setlists-lambda** | Setlist management | 2025-11-06 18:42 |
| **venues-lambda** | Venue search, enrichment | 2025-11-06 12:32 |
| **spotify-lambda** | Spotify OAuth, playlists | 2025-11-06 12:33 |
| **uploads-lambda** | S3 presigned URLs | 2025-11-06 17:27 |
| **auth-lambda** | Cognito authentication | 2025-11-06 12:32 |
| **issues-lambda** | Issue tracking | 2025-11-06 17:25 |
| **events-agent-lambda** | Events agent (unused?) | 2025-10-19 23:06 |

---

## Critical Finding: NO Recurring Event Support

### Events Lambda Analysis

**File:** `C:/VSProjects/bndy-serverless-api/events-lambda/handler.js`
**Lines:** 1,722 LOC

#### Event Creation Endpoints

1. **POST /api/artists/:artistId/events** (Line 531-612)
   - Creates **single artist event** (gig, rehearsal, other)
   - No recurring parameter handling
   - Fields: type, date, endDate, startTime, endTime, location, notes, venueId

2. **POST /api/users/me/unavailability** (Line 614-662)
   - Creates **single unavailability event**
   - No recurring parameter handling
   - Fields: date, endDate (for multi-day unavailability)
   - Always all-day events

3. **POST /api/artists/:artistId/public-gigs** (Line 997-1134)
   - Creates **single public gig** with geohash
   - No recurring support
   - Includes venue enrichment + duplicate checking

#### What Frontend Thinks Exists (But Doesn't!)

The **UnavailabilityModal** component (line 617) sends this:

```javascript
// Frontend sends recurring object (but backend ignores it!)
{
  date: "2025-01-15",
  endDate: "2025-01-17",
  notes: "Holiday",
  recurring: {
    type: "week",
    interval: 1,
    duration: "forever"
  }
}
```

**Backend receives it but does NOTHING with `recurring` field!**

Backend code (events-lambda/handler.js:614-662):
```javascript
const unavailableEvent = {
  id: eventId,
  ownerUserId: session.userId,
  type: 'unavailable',
  title: eventData.title || 'Unavailable',
  date: eventData.date,         // ✅ Used
  endDate: eventData.endDate,   // ✅ Used (for multi-day)
  // recurring: NOT USED ❌
  ...
};
```

### Conclusion: Frontend Has Dead Code!

The recurring UI in `UnavailabilityModal.tsx` (lines 37-126, 173-400) **does not work**. It:
- Shows UI to users
- Collects recurring pattern data
- Sends it to backend
- **Backend silently ignores it** and creates only 1 event

---

## DynamoDB Tables (Inferred from Code)

| Table Name | Primary Key | GSI Indexes | Purpose |
|------------|-------------|-------------|---------|
| **bndy-events** | `id` (PK) | `artistId-date-index`, `ownerUserId-date-index`, `venueId-date-index`, `geohash6-date-index` | All events (artist + user unavailability) |
| **bndy-users** | `cognito_id` (PK) | None visible | User profiles |
| **bndy-artists** | `id` (PK) | None visible | Artist profiles, settings |
| **bndy-artist-memberships** | `membership_id` (PK) | `user_id-index`, `artist_id-index` | User-Artist relationships |
| **bndy-venues** | `id` (PK) | None visible | Venue data (name, address, coords) |

### Events Table Schema (Extracted from Code)

```javascript
{
  // Primary Key
  id: "uuid",

  // Artist Event XOR User Event (sparse GSI keys)
  artistId?: "artist-uuid",      // Artist events only
  ownerUserId?: "cognito-uuid",  // User unavailability only

  // Event details
  type: "gig" | "rehearsal" | "other" | "unavailable",
  title?: string,
  description?: string,
  notes?: string,
  date: "YYYY-MM-DD",            // Start date (GSI sort key)
  endDate?: "YYYY-MM-DD",        // Multi-day events
  startTime?: "HH:MM",
  endTime?: "HH:MM",
  isAllDay: boolean,
  isPublic: boolean,

  // Location (sparse GSI keys)
  location?: string,             // Private location text
  venueId?: "venue-uuid",        // Public venue (GSI key)

  // Geolocation (for Frontstage geo queries)
  geohash6?: string,             // GSI key for 9-cell queries
  geohash4?: string,
  geoLat?: number,
  geoLng?: number,

  // Metadata
  membershipId?: "membership-uuid",
  createdAt: "ISO8601",
  updatedAt: "ISO8601",
  source?: "backstage_wizard" | "community_wizard",

  // NO RECURRING FIELDS! ❌
}
```

**Key Insight:** DynamoDB table has NO recurring pattern fields. Backend creates individual events only.

---

## Admin Page Backend Support

### Artist Settings (artists-lambda - not analyzed yet)

**Assumption from frontend:**
- Artist profile (name, description, location)
- Avatar upload (S3 presigned URL from uploads-lambda)
- Display color
- Genres
- Social links (Facebook, Instagram, etc.)

**Action Required:** Check artists-lambda/handler.js to confirm fields

### Members Management (memberships-lambda - not analyzed yet)

**Assumption from frontend:**
- List members with roles
- Remove member
- Generate magic link invites (via invites-lambda)

**Action Required:** Check memberships-lambda and invites-lambda

### Spotify Integration (spotify-lambda - not analyzed yet)

**Assumption from frontend:**
- OAuth flow
- Playlist selection
- Import songs from playlist
- Sync setlist to Spotify

**Action Required:** Check spotify-lambda/handler.js

---

## Event Types & Permissions (from events-lambda analysis)

### Event Type Matrix

| Type | Artist Context | Owner | Editable By | Deletable By |
|------|----------------|-------|-------------|--------------|
| **gig** | Yes (artistId) | membershipId | Any band member | Any band member |
| **rehearsal** | Yes (artistId) | membershipId | Any band member | Any band member |
| **other** | Yes (artistId) | membershipId | Any band member | Any band member |
| **unavailable** | No (ownerUserId) | ownerUserId | Owner only | Owner only |

### Permission Logic (events-lambda lines 729-736, 824-831)

```javascript
// Edit permission
if (event.type === 'unavailable' && event.ownerUserId !== session.userId) {
  return 403; // Can only edit your own unavailability
}

// Delete permission
if (event.type === 'unavailable' && event.ownerUserId !== session.userId) {
  return 403; // Can only delete your own unavailability
}
```

**No role-based permissions** for artist events (any member can edit/delete)

---

## Unified Calendar Logic (events-lambda lines 162-528)

### 4 Data Sources

1. **Artist Events** (gigs, rehearsals, other for current artist)
   - Query: `artistId-date-index`
   - Returns: Events created by any band member

2. **Member Unavailability** (all band members' unavailability)
   - Query: `ownerUserId-date-index` for each member
   - Enriches with `displayName` from users table
   - Returns: Unavailability events for all band members

3. **Cross-Artist Events** (user's other artists)
   - Query: User's other memberships → fetch their artist events
   - Enriches with `artistName` and `artistDisplayColour`
   - Returns: Events from user's other bands

4. **Cross-Artist Unavailability** (band members' other artists)
   - Query: All band members' other memberships → fetch their events
   - Creates synthetic "unavailable" events
   - Marks as `crossArtistEvent: true`
   - Returns: Shows band members as unavailable when gigging elsewhere

### Privacy Protection (lines 431-434)

```javascript
// Only show cross-artist unavailability to users NOT in that artist
const filteredCrossArtistUnavailability = enrichedCrossArtistUnavailability.filter(event => {
  return !currentUserOtherArtists.includes(event.originalArtistId);
});
```

**Insight:** Cross-artist unavailability hides details (time, location) to protect privacy

---

## Conflict Detection (events-lambda lines 861-994)

### handleCheckConflicts Logic

1. Queries artist events in date range
2. Queries ALL band members' unavailability
3. Detects conflicts:
   - **All-day events:** Conflict with anything on same date
   - **Timed events:** Check time overlap
4. Enriches conflicts with user displayName
5. Returns: `{ hasConflicts: boolean, conflicts: Event[] }`

**Used by:** Frontend modals before creating events

---

## Public Event Features (Frontstage Integration)

### Geohash Queries (lines 1137-1193)

- **POST /api/events/public/geo** - NO AUTH required
- Queries 9 geohashes (center + 8 neighbors) for map view
- Returns lightweight event list (id, artistId, venueId, date, coords)

### Community Wizard (lines 1505-1609)

- **POST /api/events/community** - NO AUTH required
- Creates public gigs submitted by community
- Marks as `verifiedByArtist: false` (ghost checkmark)
- Source: `community_wizard`

---

## Key Findings Summary

### ✅ What Works
1. **Single event creation** (all types)
2. **Multi-day events** via endDate
3. **Unified calendar** with 4 data sources
4. **Conflict detection** for artist events + member unavailability
5. **Privacy protection** for cross-artist events
6. **Public event geoqueries** for Frontstage
7. **Venue enrichment** with geohash

### ❌ What Doesn't Work
1. **Recurring events** - Frontend UI exists, backend ignores it
2. **Edit recurring "all future"** - Not possible (no recurring storage)
3. **Delete recurring series** - Not possible (individual events only)

### ✅ Artist Settings Backend (artists-lambda CONFIRMED)

**File:** `artists-lambda/handler.js` (758 LOC)
**Endpoint:** `PUT /api/artists/:id` (Line 377-423)

**Exact Fields from Backend:**
```javascript
{
  // Core fields
  name: string,                  // Artist name (required)
  bio: string,                   // Description/bio
  location: string,              // Location text (e.g., "London, UK")
  locationLat: number | null,    // Latitude from autocomplete
  locationLng: number | null,    // Longitude from autocomplete

  // Visual
  profileImageUrl: string,       // Avatar URL (S3)
  displayColour: string,         // Hex color (default: '#f97316')

  // Metadata
  genres: string[],              // Array of genres
  isVerified: boolean,           // Verified badge
  allowedEventTypes: string[],   // Default: ['practice', 'public_gig']

  // Social media (all nullable)
  facebookUrl: string | null,
  instagramUrl: string | null,
  websiteUrl: string | null,
  youtubeUrl: string | null,
  spotifyUrl: string | null,
  twitterUrl: string | null,

  // Timestamps
  updated_at: ISO8601
}
```

**Key Insights:**
1. **6 social platforms** supported (not just 3)
2. **displayColour** is the exact field name (not `displayColor`)
3. **location** is plain text + lat/lng coordinates
4. **genres** is an array (not limited set)
5. **No recurring fields** anywhere

### 🔧 What Still Needs Investigation
1. **memberships-lambda** - Member management, roles, removal cascade
2. **invites-lambda** - Magic link generation, expiry logic
3. **spotify-lambda** - OAuth flow, playlist sync, token refresh

---

## Recommendations for Refactor

### For Calendar Refactor:

1. **Remove recurring UI completely** from UnavailabilityModal
   - It doesn't work and never has
   - Users think it works but it creates 1 event only
   - Clean up 263 lines of dead code (lines 37-126, 173-400)

2. **Don't add recurring to RehearsalModal**
   - Backend doesn't support it
   - Would require backend changes first
   - Save that for Phase 2 after backend upgrade

3. **Keep all existing event creation** as-is
   - Single events work perfectly
   - Multi-day via endDate works
   - Conflict detection works

4. **Focus refactor on:**
   - Component size reduction
   - Type safety improvements
   - State management cleanup
   - EventTypeSelector for better UX

### For Admin Refactor (Priority):

1. **Investigate artists-lambda** first
   - Confirm exact fields for artist settings
   - Check update mutation structure
   - Verify social links storage format

2. **Check memberships-lambda**
   - Confirm member removal cascade logic
   - Check invite link generation

3. **Check spotify-lambda**
   - Confirm OAuth token storage
   - Verify playlist import/sync endpoints

4. **Then proceed with component breakdown**
   - Extract sections based on confirmed backend structure
   - No guesswork on field names or mutations

---

## Next Steps

1. ✅ events-lambda analyzed (complete)
2. ✅ users-lambda analyzed (complete)
3. 🔄 Analyze artists-lambda for admin settings
4. 🔄 Analyze memberships-lambda + invites-lambda
5. 🔄 Analyze spotify-lambda
6. 📝 Update refactor PRD based on findings
7. 🚀 Start admin refactor with confirmed backend structure

---

**Status:** Backend investigation 40% complete. Moving to admin-specific Lambdas next.
