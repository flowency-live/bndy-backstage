# Implementation Plan

## Task Overview

This implementation plan breaks down the Notification System into discrete, incremental coding tasks. Each task builds on previous tasks and includes specific requirements references. The plan follows a backend-first approach, then frontend components, then integration, and finally PWA push notifications.

## Tasks

- [ ] 1. Create DynamoDB table and CloudFormation infrastructure
  - Create `bndy-notifications` DynamoDB table with primary key `id`
  - Add GSI `user_id-created_at-index` for user notification queries
  - Add GSI `artist_id-created_at-index` for artist notification queries
  - Enable TTL on `expires_at` attribute (30-day expiration)
  - Configure pay-per-request billing mode
  - Add CloudFormation template to `bndy-serverless-api/template.yaml`
  - _Requirements: 16_

- [ ] 2. Implement NotificationsFunction Lambda handler
  - [ ] 2.1 Create Lambda function structure and JWT validation
    - Create `src/notifications/index.ts` in bndy-serverless-api
    - Implement JWT validation middleware using existing auth patterns
    - Set up API Gateway event routing for 5 endpoints
    - Add error handling with proper HTTP status codes
    - _Requirements: 17_
  
  - [ ] 2.2 Implement GET /api/notifications endpoint
    - Query DynamoDB using `user_id-created_at-index` GSI
    - Filter by artistId if query parameter provided
    - Sort by created_at descending (newest first)
    - Limit to 50 results with pagination support
    - Filter out expired notifications
    - Return notifications with artist name enrichment
    - _Requirements: 9, 15, 16_
  
  - [ ] 2.3 Implement PUT /api/notifications/{id}/read endpoint
    - Validate notification ownership (user_id matches JWT)
    - Update DynamoDB record to set `read: true`
    - Return 403 if user doesn't own notification
    - Return 404 if notification not found
    - _Requirements: 10_
  
  - [ ] 2.4 Implement PUT /api/notifications/{id}/dismiss endpoint
    - Validate notification ownership (user_id matches JWT)
    - Delete notification from DynamoDB
    - Return 403 if user doesn't own notification
    - Return 404 if notification not found
    - _Requirements: 11_
  
  - [ ] 2.5 Implement POST /api/notifications/mark-all-read endpoint
    - Query all unread notifications for user
    - Use DynamoDB BatchWriteItem to update in batches of 25
    - Handle partial failures with retry logic
    - Return count of notifications marked as read
    - _Requirements: 10_
  
  - [ ] 2.6 Implement internal createNotification function
    - Accept parameters: type, artistId, performedBy, metadata
    - Fetch all artist members from MembershipsFunction
    - Filter out the user who performed the action
    - Check for recent similar notifications (grouping logic)
    - Create notification records in DynamoDB for each recipient
    - Set expires_at to 30 days from now
    - Generate human-readable message based on type
    - _Requirements: 3, 4, 5, 6, 7, 8, 14_


- [ ] 3. Integrate notification creation into EventsFunction
  - [ ] 3.1 Add Lambda invocation for gig creation
    - After successful gig creation, invoke NotificationsFunction
    - Pass event type: 'gig_added'
    - Include metadata: eventId, venueName, eventDate
    - Handle Lambda invocation errors gracefully
    - _Requirements: 5, 18_
  
  - [ ] 3.2 Add Lambda invocation for gig deletion
    - After successful gig deletion, invoke NotificationsFunction
    - Pass event type: 'gig_removed'
    - Include metadata: venueName, eventDate
    - Handle Lambda invocation errors gracefully
    - _Requirements: 6, 18_
  
  - [ ] 3.3 Add Lambda invocation for rehearsal creation
    - After successful rehearsal creation, invoke NotificationsFunction
    - Pass event type: 'rehearsal_added'
    - Include metadata: eventId, eventDate, startTime
    - Handle Lambda invocation errors gracefully
    - _Requirements: 7, 18_
  
  - [ ] 3.4 Add Lambda invocation for rehearsal deletion
    - After successful rehearsal deletion, invoke NotificationsFunction
    - Pass event type: 'rehearsal_removed'
    - Include metadata: eventDate, startTime
    - Handle Lambda invocation errors gracefully
    - _Requirements: 8, 18_

- [ ] 4. Integrate notification creation into SongsFunction
  - [ ] 4.1 Add Lambda invocation for song addition
    - After successful song addition to playbook, invoke NotificationsFunction
    - Pass event type: 'song_added'
    - Include metadata: songId, songTitle, songArtist
    - Implement grouping check (5-minute window)
    - Handle Lambda invocation errors gracefully
    - _Requirements: 3, 18_
  
  - [ ] 4.2 Add Lambda invocation for song ready for review
    - After song receives all votes, invoke NotificationsFunction
    - Pass event type: 'song_ready_for_review'
    - Include metadata: songId, songTitle, voteCount
    - Set performedBy to null (system-generated)
    - Handle Lambda invocation errors gracefully
    - _Requirements: 4, 18_

- [ ] 5. Create NotificationsService frontend API client
  - Create `client/src/lib/services/notifications-service.ts`
  - Define Notification interface matching backend schema
  - Define NotificationType enum
  - Implement getNotifications(artistId?: string) method
  - Implement markAsRead(notificationId: string) method
  - Implement dismiss(notificationId: string) method
  - Implement markAllAsRead() method
  - Use existing apiRequest pattern with credentials: 'include'
  - Add error handling with try-catch
  - Export singleton instance
  - _Requirements: 1, 2, 9, 10, 11_


- [ ] 6. Create NotificationBell component
  - Create `client/src/components/notification-bell.tsx`
  - Use Popover, PopoverTrigger, PopoverContent from shadcn/ui
  - Display Bell icon from lucide-react
  - Show Badge with unread count when count > 0
  - Display "99+" for counts exceeding 99
  - Use React Query to fetch notifications every 60 seconds
  - Calculate unread count from notifications array
  - Open/close popover on bell click
  - Position popover to align right on mobile and desktop
  - _Requirements: 1, 2, 15_

- [ ] 7. Create NotificationItem component
  - Create `client/src/components/notification-item.tsx`
  - Accept props: notification, onClick, onDismiss, showDismiss
  - Display notification icon based on type (Music, Calendar, etc.)
  - Display notification message with proper formatting
  - Display artist name in Badge component
  - Display relative timestamp ("5 minutes ago") for < 24 hours
  - Display absolute timestamp (dd/MM/yyyy HH:mm) for >= 24 hours
  - Highlight unread notifications with background color
  - Add dismiss button (X icon) when showDismiss is true
  - Make entire item clickable except dismiss button
  - Use memo to prevent unnecessary re-renders
  - _Requirements: 2, 10, 11, 12, 19, 20_

- [ ] 8. Create NotificationPopover component
  - Create `client/src/components/notification-popover.tsx`
  - Accept props: onClose
  - Display "Notifications" header with "Mark all read" button
  - Show 10 most recent notifications using NotificationItem
  - Display "View All" button at bottom
  - Handle notification click to navigate to relevant page
  - Handle mark all read button click
  - Close popover after navigation
  - Show empty state when no notifications
  - Use responsive width (full width on mobile, 320px on desktop)
  - _Requirements: 2, 10, 12_

- [ ] 9. Create NotificationCenter page
  - Create `client/src/pages/notifications.tsx`
  - Display page title "Notifications"
  - Add artist filter dropdown (All Artists + individual artists)
  - Add "Mark all read" button in header
  - Fetch all notifications using React Query
  - Filter notifications by selected artist
  - Display notifications in Card components using NotificationItem
  - Show dismiss button on each notification
  - Handle notification click to navigate to relevant page
  - Handle dismiss button click
  - Show empty state with Bell icon when no notifications
  - Use container max-width for desktop layout
  - _Requirements: 2, 9, 10, 11, 12_

- [ ] 10. Add NotificationBell to application header
  - Update `client/src/components/navigation.tsx` or header component
  - Import and render NotificationBell component
  - Position in top-right of header next to ThemeToggle
  - Ensure proper spacing and alignment on mobile and desktop
  - Test with different screen sizes
  - _Requirements: 1, 19_


- [ ] 11. Add notifications route to router
  - Update router configuration in `client/src/App.tsx` or routing file
  - Add route: `/notifications` → NotificationCenter page
  - Ensure route is protected (requires authentication)
  - Test navigation from NotificationPopover "View All" button
  - _Requirements: 2_

- [ ] 12. Implement notification navigation logic
  - Create utility function `getNotificationNavigationUrl(notification: Notification)`
  - Map notification types to routes:
    - song_added → /pipeline
    - song_ready_for_review → /pipeline
    - gig_added → /calendar
    - gig_removed → /calendar
    - rehearsal_added → /calendar
    - rehearsal_removed → /calendar
  - Use in NotificationItem onClick handler
  - Call markAsRead before navigation
  - _Requirements: 12_

- [ ] 13. Implement notification polling with React Query
  - Create custom hook `useNotifications()` in `client/src/hooks/use-notifications.ts`
  - Use React Query with refetchInterval: 60000 (60 seconds)
  - Set refetchIntervalInBackground: false (stop polling when tab inactive)
  - Set staleTime: 30000 (30 seconds)
  - Return notifications, unreadCount, markAsRead, dismiss, markAllAsRead
  - Handle loading and error states
  - Cache notifications in localStorage for offline access
  - _Requirements: 15_

- [ ] 14. Add PWA push notification service worker handlers
  - Update `client/public/sw.js` or service worker file
  - Add 'push' event listener to handle incoming push notifications
  - Parse notification data from event.data.json()
  - Display notification using self.registration.showNotification()
  - Add 'notificationclick' event listener to handle notification clicks
  - Open app and navigate to notification URL on click
  - Close notification after click
  - _Requirements: 13_

- [ ] 15. Create usePushNotifications hook
  - Create `client/src/hooks/use-push-notifications.ts`
  - Check if Notification API is supported
  - Track notification permission state
  - Implement requestPermission() function
  - Implement subscribeToPush() function using PushManager
  - Convert VAPID public key to Uint8Array
  - Send subscription to backend via NotificationsService
  - Return permission, subscription, requestPermission
  - _Requirements: 13_

- [ ] 16. Add push notification permission UI
  - Create banner or modal to request notification permission
  - Show on first app load if permission is 'default'
  - Explain benefits of push notifications
  - Add "Enable Notifications" button
  - Call usePushNotifications().requestPermission() on click
  - Hide banner after permission granted or denied
  - Store permission request state in localStorage
  - _Requirements: 13_


- [ ] 17. Implement backend push notification sending
  - [ ] 17.1 Add AWS SNS configuration to NotificationsFunction
    - Add SNS client initialization
    - Add environment variable for SNS topic ARN
    - Add IAM policy for SNS publish permissions
    - _Requirements: 13_
  
  - [ ] 17.2 Create push subscription storage in DynamoDB
    - Create `bndy-push-subscriptions` table
    - Primary key: user_id
    - Attributes: user_id, endpoint, keys (JSON), created_at
    - Add table to CloudFormation template
    - _Requirements: 13_
  
  - [ ] 17.3 Implement registerPushSubscription endpoint
    - Add POST /api/notifications/push/subscribe route
    - Validate JWT and extract user_id
    - Store subscription in bndy-push-subscriptions table
    - Return success response
    - _Requirements: 13_
  
  - [ ] 17.4 Implement sendPushNotification function
    - Fetch user's push subscriptions from DynamoDB
    - Format notification payload for Web Push
    - Send push notification via AWS SNS
    - Handle subscription errors (expired, invalid)
    - Remove invalid subscriptions from database
    - _Requirements: 13_
  
  - [ ] 17.5 Integrate push sending into createNotification
    - After creating notification in DynamoDB, send push notification
    - Call sendPushNotification for each recipient
    - Handle errors gracefully (don't fail notification creation)
    - Log push notification success/failure
    - _Requirements: 13_

- [ ] 18. Deploy backend infrastructure
  - Update CloudFormation template with all resources
  - Run `sam build` to build Lambda functions
  - Run `sam deploy --guided` to deploy stack
  - Verify DynamoDB tables created with correct configuration
  - Verify Lambda functions deployed with correct permissions
  - Verify API Gateway routes configured correctly
  - Test Lambda functions with Postman or curl
  - _Requirements: 16, 17_

- [ ] 19. Deploy frontend to Amplify
  - Commit and push changes to main branch
  - Verify GitHub Actions triggers Amplify deployment
  - Monitor Amplify build logs for errors
  - Verify frontend deployed successfully
  - Test notification bell appears in header
  - Test notification popover opens and displays notifications
  - _Requirements: 1, 2, 19_


- [ ] 20. End-to-end testing and validation
  - [ ] 20.1 Test song notification flow
    - Add song to playbook as User A
    - Verify User B receives notification
    - Verify notification appears in bell badge
    - Verify notification appears in popover
    - Click notification and verify navigation to pipeline
    - Verify notification marked as read
    - _Requirements: 3, 12_
  
  - [ ] 20.2 Test gig notification flow
    - Create public gig as User A
    - Verify User B receives notification
    - Click notification and verify navigation to calendar
    - Delete gig as User A
    - Verify User B receives removal notification
    - _Requirements: 5, 6, 12_
  
  - [ ] 20.3 Test rehearsal notification flow
    - Create rehearsal as User A
    - Verify User B receives notification
    - Click notification and verify navigation to calendar
    - Delete rehearsal as User A
    - Verify User B receives removal notification
    - _Requirements: 7, 8, 12_
  
  - [ ] 20.4 Test notification grouping
    - Add 3 songs within 5 minutes as User A
    - Verify User B receives single grouped notification
    - Verify message shows "added 3 songs"
    - _Requirements: 3_
  
  - [ ] 20.5 Test mark all as read
    - Create multiple notifications
    - Click "Mark all as read" in popover
    - Verify all notifications marked as read
    - Verify unread count resets to 0
    - _Requirements: 10_
  
  - [ ] 20.6 Test dismiss functionality
    - Create notification
    - Click dismiss button
    - Verify notification removed from list
    - Verify notification deleted from database
    - _Requirements: 11_
  
  - [ ] 20.7 Test artist filtering
    - Create notifications for multiple artists
    - Open Notification Center page
    - Select specific artist from filter dropdown
    - Verify only that artist's notifications displayed
    - Select "All Artists" and verify all notifications displayed
    - _Requirements: 9_
  
  - [ ] 20.8 Test PWA push notifications
    - Grant notification permission in browser
    - Close app or switch to another tab
    - Trigger notification (add song, create gig, etc.)
    - Verify push notification appears on device
    - Click push notification and verify app opens to correct page
    - _Requirements: 13_
  
  - [ ] 20.9 Test mobile responsiveness
    - Test on mobile device (iPhone, Android)
    - Verify notification bell positioned correctly in header
    - Verify popover displays full-width on mobile
    - Verify touch interactions work smoothly
    - Verify Notification Center page is mobile-optimized
    - _Requirements: 1, 2, 19_
  
  - [ ] 20.10 Test notification expiration
    - Create notification with short TTL (for testing)
    - Wait for TTL to expire
    - Verify notification no longer appears in list
    - Verify notification deleted from DynamoDB
    - _Requirements: 14_

- [ ] 21. Documentation and cleanup
  - Update BNDY_PLATFORM_BIBLE.md with notification system details
  - Add notification system section to architecture documentation
  - Document API endpoints in API documentation
  - Add inline code comments for complex logic
  - Remove any debug logging or console.log statements
  - Update README with notification feature description
  - _Requirements: All_

