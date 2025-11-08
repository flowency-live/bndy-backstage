# Requirements Document

## Introduction

The Notification System enables users in bndy-backstage to receive real-time updates about important activities across all their artists. Users will be notified when songs are added to the pipeline, when songs are ready for review, and when calendar events (gigs and rehearsals) are added or removed by other members. The system includes an in-app notification bell with unread count, a popover for quick access, and PWA push notifications for mobile devices. Notifications are artist-scoped, filterable, and automatically expire after 30 days.

## Glossary

- **Notification_System**: The complete notification infrastructure including backend Lambda, DynamoDB storage, frontend UI, and PWA push notifications
- **Notification_Bell**: The bell icon in the top header showing unread notification count
- **Notification_Popover**: The dropdown that appears when clicking the bell, showing recent notifications
- **Notification_Center**: The dedicated `/notifications` page showing all notifications with filtering
- **Artist_Member**: Any user with membership in an artist (owner, admin, or member role)
- **Pipeline**: The song suggestion and voting workflow where songs progress from suggestions → voting → review → practice
- **PWA_Push**: Web Push API notifications delivered to mobile devices even when the app is closed
- **Service_Worker**: Background script that handles PWA push notifications
- **Notification_Trigger**: An action that creates a notification (song added, gig created, etc.)
- **Notification_Recipient**: An Artist_Member who receives a notification
- **Notification_Metadata**: JSON data containing context about the notification (song ID, event ID, artist ID, etc.)
- **Notification_Grouping**: Combining multiple similar notifications into a single grouped notification
- **DynamoDB_TTL**: Time-to-live attribute that automatically deletes expired notifications after 30 days

## Requirements

### Requirement 1

**User Story:** As an artist member, I want to see a notification bell in the top header, so that I can quickly check if there are new updates.

#### Acceptance Criteria

1. THE Notification_System SHALL display a bell icon in the top header on all pages
2. WHEN there are unread notifications, THE Notification_Bell SHALL display a badge with the unread count
3. THE Notification_Bell SHALL show a maximum count of 99+ for counts exceeding 99
4. THE Notification_Bell SHALL be visible on both mobile and desktop layouts
5. THE Notification_Bell SHALL maintain consistent positioning in the header across all screen sizes

### Requirement 2

**User Story:** As an artist member, I want to click the notification bell to see recent notifications, so that I can quickly review updates without navigating away.

#### Acceptance Criteria

1. WHEN a user clicks the Notification_Bell, THE Notification_System SHALL display a Notification_Popover
2. THE Notification_Popover SHALL show the 10 most recent notifications
3. THE Notification_Popover SHALL display notification type, message, timestamp, and artist name
4. THE Notification_Popover SHALL show a "View All" button at the bottom
5. WHEN a user clicks "View All", THE Notification_System SHALL navigate to the Notification_Center page
6. WHEN a user clicks outside the popover, THE Notification_Popover SHALL close
7. THE Notification_Popover SHALL be mobile-optimized with appropriate sizing and positioning

### Requirement 3

**User Story:** As an artist member, I want to receive notifications when other members add songs to suggestions, so that I can stay informed about new song proposals.

#### Acceptance Criteria

1. WHEN an Artist_Member adds a song to the Pipeline suggestions, THE Notification_System SHALL create a notification for all other Artist_Member users
2. THE Notification_System SHALL NOT create a notification for the user who performed the action
3. THE notification message SHALL display: "[Member Name] added '[Song Title]' to suggestions"
4. THE Notification_Metadata SHALL include song_id, artist_id, and member_id
5. WHEN multiple songs are added within 5 minutes by the same member, THE Notification_System SHALL group them into a single notification: "[Member Name] added [N] songs to suggestions"

### Requirement 4

**User Story:** As an artist member, I want to receive notifications when a song in voting gets all its votes, so that I know it's ready for review.

#### Acceptance Criteria

1. WHEN a song in the Pipeline voting stage receives votes from all Artist_Member users, THE Notification_System SHALL create a notification for all Artist_Member users
2. THE notification message SHALL display: "'[Song Title]' has all votes and is ready for review"
3. THE Notification_Metadata SHALL include song_id, artist_id, and vote_count
4. THE Notification_System SHALL create this notification immediately when the final vote is cast

### Requirement 5

**User Story:** As an artist member, I want to receive notifications when other members add public gigs to the calendar, so that I'm aware of new performance commitments.

#### Acceptance Criteria

1. WHEN an Artist_Member creates a public gig event, THE Notification_System SHALL create a notification for all other Artist_Member users
2. THE Notification_System SHALL NOT create a notification for the user who created the event
3. THE notification message SHALL display: "[Member Name] added a gig at [Venue Name] on [Date]"
4. THE Notification_Metadata SHALL include event_id, artist_id, venue_name, and event_date
5. THE date format SHALL use UK format: dd/MM/yyyy

### Requirement 6

**User Story:** As an artist member, I want to receive notifications when other members remove public gigs from the calendar, so that I'm aware of cancelled performances.

#### Acceptance Criteria

1. WHEN an Artist_Member deletes a public gig event, THE Notification_System SHALL create a notification for all other Artist_Member users
2. THE Notification_System SHALL NOT create a notification for the user who deleted the event
3. THE notification message SHALL display: "[Member Name] removed a gig at [Venue Name] on [Date]"
4. THE Notification_Metadata SHALL include artist_id, venue_name, and event_date
5. THE date format SHALL use UK format: dd/MM/yyyy

### Requirement 7

**User Story:** As an artist member, I want to receive notifications when other members add rehearsals to the calendar, so that I can plan my schedule accordingly.

#### Acceptance Criteria

1. WHEN an Artist_Member creates a rehearsal event, THE Notification_System SHALL create a notification for all other Artist_Member users
2. THE Notification_System SHALL NOT create a notification for the user who created the event
3. THE notification message SHALL display: "[Member Name] added a rehearsal on [Date] at [Time]"
4. THE Notification_Metadata SHALL include event_id, artist_id, event_date, and start_time
5. THE date format SHALL use UK format: dd/MM/yyyy
6. THE time format SHALL use 24-hour format: HH:mm

### Requirement 8

**User Story:** As an artist member, I want to receive notifications when other members remove rehearsals from the calendar, so that I'm aware of cancelled practice sessions.

#### Acceptance Criteria

1. WHEN an Artist_Member deletes a rehearsal event, THE Notification_System SHALL create a notification for all other Artist_Member users
2. THE Notification_System SHALL NOT create a notification for the user who deleted the event
3. THE notification message SHALL display: "[Member Name] removed a rehearsal on [Date] at [Time]"
4. THE Notification_Metadata SHALL include artist_id, event_date, and start_time
5. THE date format SHALL use UK format: dd/MM/yyyy
6. THE time format SHALL use 24-hour format: HH:mm

### Requirement 9

**User Story:** As an artist member, I want to see notifications from all my artists in one place, so that I can stay informed across all my musical projects.

#### Acceptance Criteria

1. THE Notification_System SHALL display notifications from all artists the user is a member of
2. THE Notification_System SHALL show the artist name alongside each notification
3. THE Notification_System SHALL provide a filter dropdown to show notifications for a specific artist
4. WHEN "All Artists" is selected, THE Notification_System SHALL display notifications from all artists
5. THE Notification_System SHALL persist the selected filter during the user session

### Requirement 10

**User Story:** As an artist member, I want to mark notifications as read, so that I can track which updates I've already seen.

#### Acceptance Criteria

1. WHEN a user views a notification in the Notification_Popover, THE Notification_System SHALL automatically mark it as read
2. THE Notification_System SHALL provide a "Mark all as read" button in the Notification_Popover
3. THE Notification_System SHALL provide a "Mark all as read" button in the Notification_Center
4. WHEN a notification is marked as read, THE Notification_Bell SHALL decrement the unread count
5. THE Notification_System SHALL visually distinguish between read and unread notifications

### Requirement 11

**User Story:** As an artist member, I want to dismiss notifications I'm not interested in, so that I can keep my notification list clean.

#### Acceptance Criteria

1. THE Notification_System SHALL provide a dismiss button (X icon) on each notification
2. WHEN a user dismisses a notification, THE Notification_System SHALL remove it from the notification list
3. THE Notification_System SHALL permanently delete dismissed notifications from storage
4. THE Notification_System SHALL update the unread count if a dismissed notification was unread

### Requirement 12

**User Story:** As an artist member, I want to click on notifications to navigate to the relevant page, so that I can quickly act on updates.

#### Acceptance Criteria

1. WHEN a user clicks a song-related notification, THE Notification_System SHALL navigate to the Pipeline page
2. WHEN a user clicks a gig-related notification, THE Notification_System SHALL navigate to the Calendar page
3. WHEN a user clicks a rehearsal-related notification, THE Notification_System SHALL navigate to the Calendar page
4. THE Notification_System SHALL automatically mark the notification as read when clicked
5. THE Notification_System SHALL close the Notification_Popover after navigation

### Requirement 13

**User Story:** As an artist member, I want to receive push notifications on my mobile device, so that I'm notified even when the app is closed.

#### Acceptance Criteria

1. THE Notification_System SHALL request browser notification permission on first app load
2. WHEN a user grants permission, THE Notification_System SHALL register the device for PWA_Push notifications
3. WHEN a Notification_Trigger occurs, THE Notification_System SHALL send a PWA_Push notification to all registered devices
4. THE PWA_Push notification SHALL display the notification message and artist name
5. WHEN a user clicks a PWA_Push notification, THE Notification_System SHALL open the app and navigate to the relevant page
6. THE Service_Worker SHALL handle push notifications even when the app is closed

### Requirement 14

**User Story:** As an artist member, I want notifications to automatically expire after 30 days, so that my notification list doesn't become cluttered with old updates.

#### Acceptance Criteria

1. THE Notification_System SHALL set a DynamoDB_TTL of 30 days on all notifications
2. THE Notification_System SHALL automatically delete notifications after 30 days
3. THE Notification_System SHALL not display expired notifications in the Notification_Popover or Notification_Center
4. THE Notification_System SHALL not include expired notifications in the unread count

### Requirement 15

**User Story:** As an artist member, I want the notification system to poll for new notifications every 60 seconds, so that I receive updates without requiring real-time infrastructure.

#### Acceptance Criteria

1. THE Notification_System SHALL poll the backend API every 60 seconds for new notifications
2. THE Notification_System SHALL only poll when the user is authenticated
3. THE Notification_System SHALL stop polling when the user logs out
4. THE Notification_System SHALL resume polling when the user logs back in
5. THE Notification_System SHALL update the Notification_Bell unread count when new notifications are received

### Requirement 16

**User Story:** As a system administrator, I want notification data stored in DynamoDB with appropriate indexes, so that queries are efficient and cost-effective.

#### Acceptance Criteria

1. THE Notification_System SHALL store notifications in a `bndy-notifications` DynamoDB table
2. THE table SHALL have a primary key of `id` (UUID)
3. THE table SHALL have a GSI `user_id-created_at-index` for fetching user notifications sorted by date
4. THE table SHALL have a GSI `artist_id-created_at-index` for artist-specific queries
5. THE table SHALL include fields: id, artist_id, user_id, type, message, metadata (JSON), read, dismissed, created_at, expires_at
6. THE table SHALL have DynamoDB_TTL enabled on the `expires_at` field

### Requirement 17

**User Story:** As a system administrator, I want a dedicated Lambda function for notifications, so that notification logic is isolated and maintainable.

#### Acceptance Criteria

1. THE Notification_System SHALL create a new Lambda function: `bndy-serverless-api-NotificationsFunction`
2. THE Lambda function SHALL expose route: GET `/api/notifications` - fetch user's notifications
3. THE Lambda function SHALL expose route: PUT `/api/notifications/{id}/read` - mark notification as read
4. THE Lambda function SHALL expose route: PUT `/api/notifications/{id}/dismiss` - dismiss notification
5. THE Lambda function SHALL expose route: POST `/api/notifications/mark-all-read` - bulk mark as read
6. THE Lambda function SHALL validate JWT authentication on all routes
7. THE Lambda function SHALL follow the same architecture patterns as existing Lambda functions

### Requirement 18

**User Story:** As a system administrator, I want notification creation to be triggered by existing Lambda functions, so that notifications are created automatically when events occur.

#### Acceptance Criteria

1. THE SongsFunction SHALL call the NotificationsFunction when a song is added to suggestions
2. THE SongsFunction SHALL call the NotificationsFunction when a song receives all votes
3. THE EventsFunction SHALL call the NotificationsFunction when a gig is created
4. THE EventsFunction SHALL call the NotificationsFunction when a gig is deleted
5. THE EventsFunction SHALL call the NotificationsFunction when a rehearsal is created
6. THE EventsFunction SHALL call the NotificationsFunction when a rehearsal is deleted
7. THE Notification_System SHALL use Lambda-to-Lambda invocation for notification creation

### Requirement 19

**User Story:** As an artist member, I want the notification UI to follow the existing design system, so that the interface feels consistent with the rest of the app.

#### Acceptance Criteria

1. THE Notification_System SHALL use existing shadcn/ui components (Popover, Badge, Button, Card)
2. THE Notification_System SHALL respect the current theme (light/dark mode)
3. THE Notification_System SHALL use the same typography and spacing as other dashboard sections
4. THE Notification_System SHALL be mobile-first optimized with responsive design
5. THE Notification_System SHALL minimize component nesting to maintain flat architecture

### Requirement 20

**User Story:** As an artist member, I want to see relative timestamps on notifications, so that I can quickly understand when events occurred.

#### Acceptance Criteria

1. THE Notification_System SHALL display relative timestamps for notifications less than 24 hours old (e.g., "5 minutes ago", "2 hours ago")
2. THE Notification_System SHALL display absolute timestamps for notifications older than 24 hours (e.g., "15/11/2025 14:30")
3. THE Notification_System SHALL use UK date format: dd/MM/yyyy HH:mm
4. THE Notification_System SHALL update relative timestamps every minute
