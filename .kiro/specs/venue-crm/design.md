# Design Document

## Overview

The Venue CRM feature introduces a comprehensive relationship management system for artists to track and manage their venue connections within bndy-backstage. The system integrates seamlessly with the existing dashboard, leveraging the bndy-venues master data system while maintaining artist-specific context and contact information.

### Key Design Principles

1. **Artist-Scoped Data**: All contact information and notes remain private to the artist
2. **Master Data Integration**: Leverage existing bndy-venues for venue information
3. **Business Card UX**: Clean, condensed venue cards with minimal padding
4. **Mobile-First**: Optimized for touch interactions and small screens
5. **Theme Consistency**: Full light/dark mode support matching dashboard aesthetics
6. **Progressive Enhancement**: Support future venue membership and messaging features

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Artist Dashboard                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Calendar   │  │     Gigs     │  │    Venues    │      │
│  │              │  │              │  │   (NEW CRM)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Venue CRM Interface                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Search & Filter Bar                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Venue Cards Grid (Business Card Style)              │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                 │   │
│  │  │ Venue  │  │ Venue  │  │ Venue  │                 │   │
│  │  │ Card 1 │  │ Card 2 │  │ Card 3 │                 │   │
│  │  └────────┘  └────────┘  └────────┘                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Artist-Venue │  │ Venue        │  │ Venue        │      │
│  │ Relationships│  │ Contacts     │  │ Notes        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         bndy-venues Master Data (Read/Write)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Venue Addition via Public Gig**:
   - User creates public gig → Venue search/creation → Venue saved to bndy-venues → Artist-Venue relationship created

2. **Manual Venue Addition**:
   - User clicks "Add Venue" → Search bndy-venues → Select or create → Artist-Venue relationship created

3. **Contact Management**:
   - User adds contact → Stored in artist_venue_contacts table → Visible only to artist members

4. **Gig History Tracking**:
   - Public gig created with venue → Automatically linked to venue → Count updated on venue card

## Components and Interfaces

### Frontend Components

#### 1. Venues Dashboard Tile
**Location**: `client/src/pages/dashboard.tsx`

```typescript
<DashboardTile
  title="Venues"
  icon={<MapPin />}
  color="hsl(142, 76%, 36%)" // Green theme
  count={venueCount}
  onClick={() => setLocation("/venues")}
  className="animate-stagger-4"
  data-testid="tile-venues"
/>
```

#### 2. Venue CRM Page
**Location**: `client/src/pages/venues.tsx`

**Structure**:
- Header with title and "Add Venue" button
- Search and filter bar
- Venue cards grid (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- Empty state for no venues

**Key Features**:
- Real-time search filtering
- Status filter (All, Managed on bndy, Not on bndy)
- Infinite scroll or pagination for large lists

#### 3. Venue Card Component
**Location**: `client/src/components/venue-card.tsx`

**Business Card Layout**:
```
┌─────────────────────────────────────────┐
│ 🏛️ Venue Name              [Edit Icon] │
│ 📍 123 Main St, London, SW1A 1AA        │
│ 🗺️ View on Map                          │
│                                         │
│ 📞 Contacts (2)                         │
│ • John Smith - 07700 900000             │
│ • jane@venue.com                        │
│                                         │
│ 🎸 5 Gigs Performed [View History]     │
│ ✅ Managed on bndy                      │
└─────────────────────────────────────────┘
```

**Props Interface**:
```typescript
interface VenueCardProps {
  venue: ArtistVenue;
  contacts: VenueContact[];
  gigCount: number;
  onEdit: () => void;
  onViewGigs: () => void;
}
```

**States**:
- View mode (default)
- Edit mode (inline editing)
- Expanded (showing gig history)

#### 4. Add Venue Modal
**Location**: `client/src/components/add-venue-modal.tsx`

**Flow**:
1. Search bndy-venues by name/location
2. Display search results with match confidence
3. Allow selection of existing venue OR
4. Show "Create New Venue" form (simplified from godmode)

**Form Fields** (for new venues):
- Venue name (required)
- Address (required, with Google Places autocomplete)
- Google Place ID (auto-populated)
- Website (optional)
- Phone (optional)

#### 5. Venue Contact Manager
**Location**: `client/src/components/venue-contact-manager.tsx`

**Features**:
- Add multiple contacts per venue
- Edit/delete contacts
- Contact fields: Name, Mobile, Landline, Email
- Validation for email and UK phone formats

#### 6. Gig History Modal
**Location**: `client/src/components/venue-gig-history.tsx`

**Display**:
- List of past gigs at venue
- Date, title, and notes for each gig
- Sorted chronologically (most recent first)
- Link to view/edit each gig

### Backend API Endpoints

#### Artist Venue Relationships

**GET** `/api/artists/:artistId/venues`
- Returns all venues for an artist with contact counts and gig counts
- Includes venue details from bndy-venues
- Includes managed status

**POST** `/api/artists/:artistId/venues`
- Creates artist-venue relationship
- Body: `{ venueId: string, notes?: string }`

**PUT** `/api/artists/:artistId/venues/:venueId`
- Updates relationship notes
- Body: `{ notes: string }`

**DELETE** `/api/artists/:artistId/venues/:venueId`
- Removes artist-venue relationship
- Cascades to delete contacts

#### Venue Contacts

**GET** `/api/artists/:artistId/venues/:venueId/contacts`
- Returns all contacts for a venue (artist-scoped)

**POST** `/api/artists/:artistId/venues/:venueId/contacts`
- Creates new contact
- Body: `{ name: string, mobile?: string, landline?: string, email?: string }`

**PUT** `/api/artists/:artistId/venues/:venueId/contacts/:contactId`
- Updates contact information
- Body: `{ name?: string, mobile?: string, landline?: string, email?: string }`

**DELETE** `/api/artists/:artistId/venues/:venueId/contacts/:contactId`
- Deletes contact

#### Venue Gig History

**GET** `/api/artists/:artistId/venues/:venueId/gigs`
- Returns all public gigs performed at venue
- Sorted by date descending

#### Venue Search

**GET** `/api/venues/search?q=:query&lat=:lat&lng=:lng`
- Searches bndy-venues master data
- Returns venues with match confidence scores
- Supports location-based proximity sorting

## Data Models

### Database Schema

#### artist_venues (New Table)
```sql
CREATE TABLE artist_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES bndy_venues(id) ON DELETE CASCADE,
  notes TEXT,
  first_gig_date DATE, -- Auto-populated from first public gig
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artist_id, venue_id)
);

CREATE INDEX idx_artist_venues_artist ON artist_venues(artist_id);
CREATE INDEX idx_artist_venues_venue ON artist_venues(venue_id);
```

#### artist_venue_contacts (New Table)
```sql
CREATE TABLE artist_venue_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES bndy_venues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  landline VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_artist_venue FOREIGN KEY (artist_id, venue_id) 
    REFERENCES artist_venues(artist_id, venue_id) ON DELETE CASCADE
);

CREATE INDEX idx_artist_venue_contacts_artist_venue 
  ON artist_venue_contacts(artist_id, venue_id);
```

#### events Table (Existing - Add Index)
```sql
-- Add index for venue-based queries
CREATE INDEX idx_events_venue ON events(venue_id) 
  WHERE type = 'gig' AND is_public = true;
```

### TypeScript Interfaces

```typescript
// Artist-Venue Relationship
export interface ArtistVenue {
  id: string;
  artistId: string;
  venueId: string;
  notes?: string;
  firstGigDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Enriched from bndy-venues
  venue: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
    website?: string;
    phone?: string;
    hasMembership: boolean; // Future: venue is managed on bndy
  };
  
  // Computed fields
  contactCount: number;
  gigCount: number;
}

// Venue Contact
export interface VenueContact {
  id: string;
  artistId: string;
  venueId: string;
  name: string;
  mobile?: string;
  landline?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// Venue Gig History Item
export interface VenueGig {
  id: string;
  venueId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  description?: string;
  ticketUrl?: string;
}

// Venue Search Result
export interface VenueSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
  matchConfidence: number; // 0-100
  distance?: number; // meters from artist location
}
```

## Error Handling

### Frontend Error Scenarios

1. **Network Failures**
   - Display toast notification with retry option
   - Maintain form state for retry
   - Show offline indicator

2. **Validation Errors**
   - Inline field validation with error messages
   - Prevent form submission until resolved
   - Highlight invalid fields

3. **Duplicate Venue Detection**
   - Show confirmation dialog with match confidence
   - Allow user to confirm or cancel
   - Suggest existing venue as alternative

4. **Contact Validation**
   - Email format validation using regex
   - UK phone number validation (07xxx, 01xxx, 02xxx formats)
   - Display validation errors inline

### Backend Error Responses

```typescript
// Standard error response format
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

// Error codes
enum VenueCRMErrorCode {
  VENUE_NOT_FOUND = 'VENUE_NOT_FOUND',
  DUPLICATE_RELATIONSHIP = 'DUPLICATE_RELATIONSHIP',
  INVALID_CONTACT_DATA = 'INVALID_CONTACT_DATA',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VENUE_CREATION_FAILED = 'VENUE_CREATION_FAILED',
}
```

### Error Recovery Strategies

1. **Optimistic Updates**: Update UI immediately, rollback on failure
2. **Retry Logic**: Automatic retry for transient network errors (max 3 attempts)
3. **Graceful Degradation**: Show cached data when API unavailable
4. **User Feedback**: Clear error messages with actionable next steps

## Testing Strategy

### Unit Tests

#### Frontend Components
- **Venue Card Component**
  - Renders venue information correctly
  - Toggles between view and edit modes
  - Handles contact display and formatting
  - Shows correct managed status indicator

- **Add Venue Modal**
  - Searches venues correctly
  - Displays search results with confidence scores
  - Validates form inputs
  - Handles venue creation flow

- **Contact Manager**
  - Adds contacts with validation
  - Edits existing contacts
  - Deletes contacts with confirmation
  - Validates email and phone formats

#### Backend Services
- **Venue CRM Service**
  - Creates artist-venue relationships
  - Prevents duplicate relationships
  - Retrieves venues with correct counts
  - Handles cascade deletes

- **Contact Service**
  - CRUD operations for contacts
  - Validates contact data
  - Enforces artist-scoping

- **Venue Search Service**
  - Searches bndy-venues accurately
  - Calculates match confidence correctly
  - Sorts by proximity when location provided

### Integration Tests

1. **End-to-End Venue Addition**
   - Create public gig with new venue
   - Verify venue added to bndy-venues
   - Verify artist-venue relationship created
   - Verify venue appears in CRM

2. **Contact Management Flow**
   - Add venue to CRM
   - Add multiple contacts
   - Edit contact information
   - Delete contact
   - Verify data persistence

3. **Gig History Tracking**
   - Create multiple gigs at same venue
   - Verify gig count updates
   - View gig history
   - Verify chronological sorting

4. **Search and Filter**
   - Search venues by name
   - Filter by managed status
   - Verify real-time filtering
   - Test empty states

### Manual Testing Checklist

- [ ] Dashboard tile displays correct venue count
- [ ] Venue CRM page loads with all venues
- [ ] Search filters venues in real-time
- [ ] Add venue modal searches bndy-venues
- [ ] New venue creation works correctly
- [ ] Duplicate detection prevents duplicates
- [ ] Contact addition validates inputs
- [ ] Contact editing persists changes
- [ ] Contact deletion removes contact
- [ ] Gig history displays correctly
- [ ] Map link opens in new tab (mobile & desktop)
- [ ] Edit mode toggles correctly
- [ ] Theme switches between light/dark
- [ ] Mobile layout is responsive
- [ ] Touch targets are adequate (56px minimum)

### Performance Testing

1. **Load Testing**
   - Test with 100+ venues
   - Measure render time for venue grid
   - Test search performance with large dataset

2. **API Response Times**
   - Venue list endpoint < 500ms
   - Search endpoint < 300ms
   - Contact CRUD operations < 200ms

3. **Mobile Performance**
   - First contentful paint < 1.5s
   - Time to interactive < 3s
   - Smooth scrolling (60fps)

## Future Enhancements

### Phase 2: Venue Membership Integration

When venues join bndy-backstage:
- Display venue-provided contact information alongside artist contacts
- Show "Managed on bndy" badge prominently
- Enable direct messaging to venue (via Contact System)
- Allow venue to see artists who have them in CRM

### Phase 3: Venue-to-Artist CRM

Reciprocal CRM for venues:
- Venues can manage their artist relationships
- Track booking history and preferences
- Add notes about artists
- Contact artists through platform

### Phase 4: Analytics and Insights

- Most frequently played venues
- Venue performance metrics (attendance, revenue)
- Geographic distribution of venues
- Booking trends and patterns

### Phase 5: Booking Management

- Send booking requests through platform
- Track booking status (pending, confirmed, cancelled)
- Manage contracts and riders
- Payment tracking

## Mobile Considerations

### Touch Interactions
- Minimum touch target: 56px × 56px
- Adequate spacing between interactive elements (8px minimum)
- Swipe gestures for card actions (swipe left to edit/delete)

### Responsive Breakpoints
- Mobile: < 640px (1 column)
- Tablet: 640px - 1024px (2 columns)
- Desktop: > 1024px (3 columns)

### Performance Optimizations
- Lazy load venue cards (virtual scrolling)
- Optimize images (WebP format, responsive sizes)
- Minimize bundle size (code splitting)
- Cache venue data (React Query with stale-while-revalidate)

### Offline Support
- Cache venue list for offline viewing
- Queue contact changes for sync when online
- Show offline indicator
- Prevent actions that require network

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Logical tab order
   - Visible focus indicators

2. **Screen Reader Support**
   - Semantic HTML elements
   - ARIA labels for icons
   - Descriptive button text
   - Status announcements for dynamic content

3. **Color Contrast**
   - Text contrast ratio ≥ 4.5:1
   - Interactive elements contrast ratio ≥ 3:1
   - Test both light and dark themes

4. **Responsive Text**
   - Support text zoom up to 200%
   - No horizontal scrolling at 320px width
   - Readable font sizes (minimum 16px body text)

## Security Considerations

### Data Privacy
- Artist contacts visible only to artist members
- Venue notes private to artist
- No cross-artist data leakage

### Input Validation
- Sanitize all user inputs
- Validate email and phone formats
- Prevent SQL injection (parameterized queries)
- Prevent XSS (escape HTML in notes)

### Authentication & Authorization
- Verify artist membership before CRM access
- Check permissions for contact CRUD operations
- Rate limiting on search endpoints
- CSRF protection on state-changing operations

### Data Retention
- Soft delete for audit trail
- GDPR compliance (right to be forgotten)
- Data export functionality
- Retention policy documentation