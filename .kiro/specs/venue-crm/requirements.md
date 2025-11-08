# Requirements Document

## Introduction

The Venue CRM feature enables artists in bndy-backstage to manage their relationships with venues through a comprehensive customer relationship management system. This feature allows artists to track venues they've worked with, maintain contact information for venue staff, and integrate with the existing bndy-venues master data system. The system will support future venue membership capabilities and bidirectional artist-venue relationship management.

## Glossary

- **Artist_Dashboard**: The main dashboard interface for artist users in bndy-backstage
- **Venue_CRM**: The customer relationship management system for venues within the artist dashboard
- **Bndy_Venues**: The master data system containing venue information across the platform
- **Venue_Contact**: Individual contact person associated with a venue (name, phone, email)
- **Artist_Venue_Relationship**: The connection between an artist and a venue, including interaction history
- **Public_Gig**: A public performance event that requires venue information
- **Venue_Membership**: Future system allowing venue owners to manage their own accounts
- **Contact_System**: Future messaging system between artists and venues

## Requirements

### Requirement 1

**User Story:** As an artist user, I want to access a Venues section in my dashboard, so that I can manage my venue relationships in one centralized location.

#### Acceptance Criteria

1. WHEN an artist user views their dashboard, THE Artist_Dashboard SHALL display a "Venues" tile in the dashboard grid
2. WHEN an artist user clicks the Venues tile, THE Artist_Dashboard SHALL navigate to the Venue_CRM interface
3. THE Venue_CRM SHALL display a list of venues the artist has relationships with
4. THE Venue_CRM SHALL show a count of total venues on the dashboard tile

### Requirement 2

**User Story:** As an artist user, I want to add venues when creating public gigs, so that venue information is automatically captured in my CRM.

#### Acceptance Criteria

1. WHEN an artist user creates a public gig event, THE Artist_Dashboard SHALL require venue selection
2. WHEN venue information is provided for a public gig, THE Artist_Dashboard SHALL automatically create an Artist_Venue_Relationship
3. THE Artist_Dashboard SHALL search Bndy_Venues master data first when adding venue information
4. IF a venue exists in Bndy_Venues, THEN THE Artist_Dashboard SHALL allow selection from existing data
5. IF a venue does not exist in Bndy_Venues, THEN THE Artist_Dashboard SHALL allow manual venue creation

### Requirement 3

**User Story:** As an artist user, I want to manually add venues to my CRM without creating a gig, so that I can proactively build my venue network.

#### Acceptance Criteria

1. THE Venue_CRM SHALL provide an "Add Venue" action button
2. WHEN an artist user clicks "Add Venue", THE Venue_CRM SHALL display a venue search and creation interface
3. THE Venue_CRM SHALL search Bndy_Venues master data first when adding venues
4. THE Venue_CRM SHALL allow manual venue creation with simplified form fields compared to godmode interface
5. WHEN a venue is added manually, THE Artist_Dashboard SHALL create an Artist_Venue_Relationship

### Requirement 4

**User Story:** As an artist user, I want to add and manage contact information for venue staff, so that I can maintain professional relationships.

#### Acceptance Criteria

1. THE Venue_CRM SHALL allow adding multiple Venue_Contact records per venue
2. WHEN adding a Venue_Contact, THE Venue_CRM SHALL capture contact name, mobile phone, landline phone, and email address
3. THE Venue_CRM SHALL validate email addresses using standard email format validation
4. THE Venue_CRM SHALL validate phone numbers using UK phone number format
5. THE Venue_CRM SHALL allow editing and deleting existing Venue_Contact records
6. THE Venue_CRM SHALL restrict contact information visibility to members of the artist only
7. WHERE a venue has Venue_Membership, THE Venue_CRM SHALL also display venue-provided contact information alongside artist-added contacts

### Requirement 5

**User Story:** As an artist user, I want to see if a venue is actively managed on bndy, so that I know if I can communicate with them through the platform.

#### Acceptance Criteria

1. THE Venue_CRM SHALL display a clear indicator when a venue has active Venue_Membership
2. WHEN a venue has Venue_Membership, THE Venue_CRM SHALL show "Managed on bndy" status
3. WHEN a venue does not have Venue_Membership, THE Venue_CRM SHALL show "Not on bndy" status
4. THE Venue_CRM SHALL visually distinguish between managed and unmanaged venues in the venue list

### Requirement 6

**User Story:** As an artist user, I want to view venue information in a clean, business card format, so that I can quickly access essential venue details.

#### Acceptance Criteria

1. THE Venue_CRM SHALL display venues as compact business card-style components
2. THE Venue_CRM SHALL show venue name, address, and map pin icon that opens location in new tab for cross-platform mobile compatibility
3. THE Venue_CRM SHALL display artist-added contact details only, including phone numbers and email addresses
4. THE Venue_CRM SHALL show a clickable count of total gigs performed at each venue
5. WHEN the gig count is clicked, THE Venue_CRM SHALL display a list of past gigs with dates
6. THE Venue_CRM SHALL provide an edit mode icon to switch between view and edit states
7. THE Venue_CRM SHALL minimize padding and containers to maintain clean, condensed appearance

### Requirement 7

**User Story:** As an artist user, I want the venue CRM to integrate seamlessly with existing dashboard functionality, so that my workflow remains consistent.

#### Acceptance Criteria

1. THE Venue_CRM SHALL follow the same design patterns as other Artist_Dashboard sections
2. THE Venue_CRM SHALL use the same navigation structure as Songs, Calendar, and Gigs sections
3. THE Venue_CRM SHALL maintain the same responsive design principles for mobile and desktop
4. THE Venue_CRM SHALL integrate with the existing floating action button on mobile devices

### Requirement 8

**User Story:** As an artist user, I want to track my performance history and notes for each venue, so that I can maintain context for future bookings.

#### Acceptance Criteria

1. THE Venue_CRM SHALL automatically track all Public_Gig events performed at each venue
2. THE Venue_CRM SHALL display the total count of gigs performed at each venue
3. THE Venue_CRM SHALL show the date when the venue relationship was first established
4. THE Venue_CRM SHALL allow adding and editing private notes about each venue relationship
5. THE Venue_CRM SHALL display gig history in chronological order when venue details are expanded

### Requirement 9

**User Story:** As a system administrator, I want venue data to be consistent between the CRM and master data, so that platform-wide venue information remains accurate.

#### Acceptance Criteria

1. WHEN an artist creates a new venue through the CRM, THE Artist_Dashboard SHALL add the venue to Bndy_Venues master data
2. THE Artist_Dashboard SHALL prevent duplicate venue creation by checking name and address similarity
3. WHEN venue information is updated in the CRM, THE Artist_Dashboard SHALL update the corresponding Bndy_Venues record
4. THE Artist_Dashboard SHALL maintain referential integrity between Artist_Venue_Relationship and Bndy_Venues records

### Requirement 10

**User Story:** As an artist user, I want to search and filter my venue list, so that I can quickly find specific venues.

#### Acceptance Criteria

1. THE Venue_CRM SHALL provide a search input field for filtering venues
2. THE Venue_CRM SHALL filter venues by name, address, and contact information in real-time
3. THE Venue_CRM SHALL provide filter options for venue status (managed on bndy vs not on bndy)
4. THE Venue_CRM SHALL maintain search state during the user session

### Requirement 11

**User Story:** As an artist user, I want the venue CRM to adapt to my theme preferences, so that the interface remains consistent with my dashboard experience.

#### Acceptance Criteria

1. THE Venue_CRM SHALL respect the current light/dark mode theme setting
2. THE Venue_CRM SHALL apply appropriate contrast and color schemes for both light and dark themes
3. THE Venue_CRM SHALL maintain visual consistency with other Artist_Dashboard sections
4. THE Venue_CRM SHALL provide optimal mobile user experience with responsive design
5. THE Venue_CRM SHALL ensure venue cards remain visually appealing across all screen sizes