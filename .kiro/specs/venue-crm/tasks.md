# Implementation Plan

- [ ] 1. Set up database schema and backend API foundation
  - Create artist_venues table with proper indexes and foreign keys
  - Create artist_venue_contacts table with cascade delete constraints
  - Add venue_id index to events table for gig history queries
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 2. Implement backend API endpoints for artist-venue relationships
- [ ] 2.1 Create GET /api/artists/:artistId/venues endpoint
  - Fetch all venues for an artist with enriched data from bndy-venues
  - Include contact counts and gig counts in response
  - Add managed status indicator (hasMembership field)
  - _Requirements: 1.3, 5.1, 5.2, 5.3_

- [ ] 2.2 Create POST /api/artists/:artistId/venues endpoint
  - Accept venueId and optional notes
  - Create artist-venue relationship record
  - Validate artist membership before creation
  - Return created relationship with enriched venue data
  - _Requirements: 2.2, 3.5, 9.1_

- [ ] 2.3 Create PUT /api/artists/:artistId/venues/:venueId endpoint
  - Update relationship notes
  - Validate artist membership
  - Return updated relationship
  - _Requirements: 6.5, 8.4_

- [ ] 2.4 Create DELETE /api/artists/:artistId/venues/:venueId endpoint
  - Remove artist-venue relationship
  - Cascade delete associated contacts
  - Validate artist membership
  - _Requirements: 9.4_

- [ ] 3. Implement backend API endpoints for venue contacts
- [ ] 3.1 Create GET /api/artists/:artistId/venues/:venueId/contacts endpoint
  - Fetch all contacts for a venue scoped to artist
  - Validate artist membership
  - _Requirements: 4.1, 4.6_

- [ ] 3.2 Create POST /api/artists/:artistId/venues/:venueId/contacts endpoint
  - Accept contact data (name, mobile, landline, email)
  - Validate email format using regex
  - Validate UK phone number formats
  - Create contact record
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 3.3 Create PUT /api/artists/:artistId/venues/:venueId/contacts/:contactId endpoint
  - Update contact information
  - Validate email and phone formats
  - Validate artist membership
  - _Requirements: 4.5_

- [ ] 3.4 Create DELETE /api/artists/:artistId/venues/:venueId/contacts/:contactId endpoint
  - Delete contact record
  - Validate artist membership
  - _Requirements: 4.5_

- [ ] 4. Implement venue gig history and search endpoints
- [ ] 4.1 Create GET /api/artists/:artistId/venues/:venueId/gigs endpoint
  - Fetch all public gigs at venue for artist
  - Sort by date descending
  - Include event details (date, title, description)
  - _Requirements: 8.1, 8.5_

- [ ] 4.2 Create GET /api/venues/search endpoint
  - Search bndy-venues by name and location
  - Calculate match confidence scores
  - Support proximity sorting when lat/lng provided
  - Return venues with distance from artist location
  - _Requirements: 2.3, 2.4, 3.3_

- [ ] 5. Update public gig creation to auto-create venue relationships
- [ ] 5.1 Modify POST /api/artists/:artistId/public-gigs endpoint
  - After creating public gig event, check if artist-venue relationship exists
  - If not exists, create artist-venue relationship automatically
  - Set first_gig_date if this is the first gig at venue
  - _Requirements: 2.1, 2.2, 8.3_

- [ ] 5.2 Modify PUT /api/artists/:artistId/events/:eventId endpoint
  - When updating public gig venue, ensure artist-venue relationship exists
  - Update first_gig_date if needed
  - _Requirements: 2.2_

- [ ] 6. Create frontend service layer for venue CRM
- [ ] 6.1 Create client/src/lib/services/venue-crm-service.ts
  - Implement getAllArtistVenues function
  - Implement createArtistVenue function
  - Implement updateArtistVenue function
  - Implement deleteArtistVenue function
  - Follow existing godmode-service.ts pattern
  - _Requirements: 1.3, 3.5_

- [ ] 6.2 Add venue contact service functions
  - Implement getVenueContacts function
  - Implement createVenueContact function
  - Implement updateVenueContact function
  - Implement deleteVenueContact function
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 6.3 Add venue gig history and search functions
  - Implement getVenueGigHistory function
  - Implement searchVenues function
  - _Requirements: 8.5, 3.3_

- [ ] 7. Create Venues dashboard tile
- [ ] 7.1 Add Venues tile to dashboard.tsx
  - Add tile in appropriate section with MapPin icon
  - Use green theme color (hsl(142, 76%, 36%))
  - Display venue count from API
  - Navigate to /venues on click
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 7.2 Add /venues route to App.tsx
  - Register route for venues page
  - Apply same authentication guards as other pages
  - _Requirements: 1.2_

- [ ] 8. Create Venue CRM main page
- [ ] 8.1 Create client/src/pages/venues.tsx
  - Implement page layout with header and "Add Venue" button
  - Fetch venues using React Query
  - Display loading and error states
  - Show empty state when no venues exist
  - _Requirements: 1.3, 3.1, 7.1, 7.2_

- [ ] 8.2 Add search and filter bar
  - Implement real-time search input
  - Filter venues by name, address, and contacts
  - Add status filter buttons (All, Managed on bndy, Not on bndy)
  - Maintain search state during session
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 8.3 Implement responsive venue cards grid
  - 1 column on mobile (< 640px)
  - 2 columns on tablet (640px - 1024px)
  - 3 columns on desktop (> 1024px)
  - Apply theme-aware styling
  - _Requirements: 7.3, 11.1, 11.2, 11.5_

- [ ] 9. Create Venue Card component
- [ ] 9.1 Create client/src/components/venue-card.tsx
  - Implement business card layout with minimal padding
  - Display venue name, address, and map link
  - Show contact count and gig count
  - Display managed status badge
  - Add edit mode toggle icon
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

- [ ] 9.2 Implement map link functionality
  - Create map pin icon that opens Google Maps in new tab
  - Format URL for cross-platform compatibility (iOS and Android)
  - Use venue coordinates for accurate location
  - _Requirements: 6.2_

- [ ] 9.3 Add clickable gig count with history display
  - Make gig count clickable
  - Show gig history modal on click
  - Display past gigs with dates
  - _Requirements: 6.4, 6.5, 8.5_

- [ ] 9.4 Implement edit mode toggle
  - Switch between view and edit modes
  - Inline editing for notes
  - Save changes on blur or explicit save action
  - _Requirements: 6.6_

- [ ] 10. Create Add Venue Modal component
- [ ] 10.1 Create client/src/components/add-venue-modal.tsx
  - Implement modal with search interface
  - Search bndy-venues on input change
  - Display search results with match confidence
  - Show "Create New Venue" option
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 10.2 Implement venue search results display
  - Show venue name, address, and distance
  - Display match confidence percentage
  - Allow selection of existing venue
  - Highlight selected venue
  - _Requirements: 2.3, 2.4, 3.3_

- [ ] 10.3 Create new venue form
  - Simplified form compared to godmode
  - Fields: name (required), address (required), website (optional), phone (optional)
  - Integrate Google Places autocomplete for address
  - Auto-populate Google Place ID
  - _Requirements: 2.5, 3.4_

- [ ] 10.4 Handle venue creation and relationship
  - Submit new venue to bndy-venues API
  - Create artist-venue relationship on success
  - Show success toast notification
  - Close modal and refresh venue list
  - _Requirements: 3.5, 9.1_

- [ ] 11. Create Venue Contact Manager component
- [ ] 11.1 Create client/src/components/venue-contact-manager.tsx
  - Display list of contacts for venue
  - Show contact name, mobile, landline, email
  - Add "Add Contact" button
  - _Requirements: 4.1, 6.3_

- [ ] 11.2 Implement add contact form
  - Fields: name (required), mobile (optional), landline (optional), email (optional)
  - Validate email format using regex
  - Validate UK phone formats (07xxx, 01xxx, 02xxx)
  - Show validation errors inline
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 11.3 Add edit and delete contact actions
  - Edit button opens inline edit form
  - Delete button shows confirmation dialog
  - Update contact on save
  - Remove contact on delete confirmation
  - _Requirements: 4.5_

- [ ] 11.4 Integrate contact manager into venue card
  - Show contact manager in expanded view or edit mode
  - Display contact count on card
  - Allow toggling contact visibility
  - _Requirements: 4.1, 6.3_

- [ ] 12. Create Venue Gig History Modal component
- [ ] 12.1 Create client/src/components/venue-gig-history.tsx
  - Display modal with list of past gigs
  - Show date, title, and notes for each gig
  - Sort chronologically (most recent first)
  - Add link to view/edit each gig
  - _Requirements: 8.1, 8.5_

- [ ] 12.2 Integrate gig history with venue card
  - Open modal when gig count is clicked
  - Pass venue ID to fetch gig history
  - Show loading state while fetching
  - _Requirements: 6.5, 8.5_

- [ ] 13. Implement theme consistency and mobile optimization
- [ ] 13.1 Apply light/dark theme styling
  - Use theme-aware colors for all components
  - Test contrast ratios in both themes
  - Ensure readability in all lighting conditions
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 13.2 Optimize for mobile devices
  - Ensure touch targets are minimum 56px
  - Add adequate spacing between interactive elements
  - Test on iOS and Android devices
  - Verify smooth scrolling performance
  - _Requirements: 11.4, 11.5_

- [ ] 13.3 Add responsive design breakpoints
  - Test layout at 320px, 640px, 1024px, 1440px widths
  - Ensure no horizontal scrolling
  - Verify text remains readable at all sizes
  - _Requirements: 7.3, 11.5_

- [ ] 14. Integrate with existing dashboard navigation
- [ ] 14.1 Update mobile floating action button
  - Add "Add Venue" option to FAB menu
  - Navigate to venues page or open add venue modal
  - _Requirements: 7.4_

- [ ] 14.2 Update navigation configuration
  - Add venues to navigation menu if applicable
  - Ensure consistent navigation patterns
  - _Requirements: 7.2_

- [ ] 15. Add error handling and validation
- [ ] 15.1 Implement frontend error handling
  - Display toast notifications for API errors
  - Show inline validation errors
  - Maintain form state on error for retry
  - _Requirements: All requirements_

- [ ] 15.2 Add duplicate venue detection
  - Check for similar venues before creation
  - Show confirmation dialog with match confidence
  - Allow user to confirm or select existing venue
  - _Requirements: 9.2_

- [ ] 15.3 Implement contact validation
  - Email format validation with regex
  - UK phone number validation
  - Display validation errors inline
  - Prevent submission until valid
  - _Requirements: 4.3, 4.4_

- [ ] 16. Add data persistence and caching
- [ ] 16.1 Configure React Query for venue data
  - Set up query keys for venues, contacts, and gig history
  - Implement stale-while-revalidate caching
  - Add optimistic updates for mutations
  - _Requirements: All requirements_

- [ ] 16.2 Implement auto-save for notes
  - Debounce note updates
  - Show saving indicator
  - Handle save failures gracefully
  - _Requirements: 6.5, 8.4_

- [ ] 17. Final integration and polish
- [ ] 17.1 Test complete user flows
  - Create public gig with new venue
  - Manually add venue to CRM
  - Add and manage contacts
  - View gig history
  - Search and filter venues
  - _Requirements: All requirements_

- [ ] 17.2 Verify data consistency
  - Ensure venue data syncs between CRM and bndy-venues
  - Verify gig counts update correctly
  - Test cascade deletes work properly
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 17.3 Performance optimization
  - Lazy load venue cards
  - Optimize image loading
  - Minimize bundle size
  - Test with 100+ venues
  - _Requirements: 11.4, 11.5_