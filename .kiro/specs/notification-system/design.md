# Design Document

## Overview

The Notification System is a comprehensive feature that enables real-time awareness of artist activities across bndy-backstage. The system consists of four main components:

1. **Backend Infrastructure**: AWS Lambda function with DynamoDB storage for notification management
2. **Frontend UI**: Notification bell, popover, and dedicated page for viewing/managing notifications
3. **Notification Creation**: Integration points in existing Lambda functions to trigger notifications
4. **PWA Push Notifications**: Service worker integration for mobile push notifications

The design follows the existing bndy-backstage architecture patterns: serverless Lambda functions, DynamoDB for data storage, React with shadcn/ui for frontend, and mobile-first responsive design.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Notification │  │ Notification │  │  Notification Center   │ │
│  │     Bell     │  │   Popover    │  │   (/notifications)     │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│         │                  │                      │              │
│         └──────────────────┴──────────────────────┘              │
│                            │                                     │
│                   ┌────────▼────────┐                            │
│                   │ Notifications   │                            │
│                   │    Service      │                            │
│                   │  (API Client)   │                            │
│                   └────────┬────────┘                            │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway    │
                    │ (api.bndy.co.uk)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│ Notifications  │  │  Events         │  │  Songs         │
│   Function     │  │  Function       │  │  Function      │
│                │  │                 │  │                │
│ - GET /api/    │  │ - Creates       │  │ - Creates      │
│   notifications│  │   notifications │  │   notifications│
│ - PUT /read    │  │   on event      │  │   on song      │
│ - PUT /dismiss │  │   create/delete │  │   actions      │
│ - POST /mark-  │  │                 │  │                │
│   all-read     │  │                 │  │                │
└───────┬────────┘  └────────┬────────┘  └───────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   DynamoDB      │
                    │ bndy-           │
                    │ notifications   │
                    └─────────────────┘
```


### Component Interaction Flow

#### Notification Creation Flow
```
1. User Action (e.g., adds song to pipeline)
   ↓
2. EventsFunction/SongsFunction processes request
   ↓
3. Lambda invokes NotificationsFunction.createNotification()
   ↓
4. NotificationsFunction:
   - Fetches all artist members from MembershipsFunction
   - Filters out the action performer
   - Creates notification records in DynamoDB
   - Sends PWA push notifications via SNS
   ↓
5. Frontend polls /api/notifications every 60s
   ↓
6. Notification appears in bell badge and popover
```

#### Notification Read/Dismiss Flow
```
1. User clicks notification in popover
   ↓
2. Frontend calls PUT /api/notifications/{id}/read
   ↓
3. NotificationsFunction updates DynamoDB record
   ↓
4. Frontend navigates to relevant page
   ↓
5. Notification marked as read, unread count decrements
```

## Components and Interfaces

### Backend Components

#### 1. NotificationsFunction (AWS Lambda)

**Purpose**: Manage notification CRUD operations and creation

**Routes**:
- `GET /api/notifications` - Fetch user's notifications
- `PUT /api/notifications/{id}/read` - Mark notification as read
- `PUT /api/notifications/{id}/dismiss` - Dismiss notification
- `POST /api/notifications/mark-all-read` - Bulk mark as read
- `POST /api/notifications/create` (internal) - Create notification

**Handler Structure**:
```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  const { httpMethod, path, pathParameters, queryStringParameters } = event;
  
  // JWT validation
  const user = await validateJWT(event);
  
  // Route handling
  if (httpMethod === 'GET' && path === '/api/notifications') {
    return getNotifications(user, queryStringParameters);
  }
  
  if (httpMethod === 'PUT' && path.includes('/read')) {
    return markAsRead(user, pathParameters.id);
  }
  
  // ... other routes
};
```


#### 2. Notification Creation Integration

**EventsFunction Integration**:
```typescript
// After creating/deleting event
if (event.type === 'gig' || event.type === 'practice') {
  await invokeNotificationsFunction({
    action: 'create',
    type: event.type === 'gig' ? 'gig_added' : 'rehearsal_added',
    artistId: event.artistId,
    performedBy: currentUser.cognito_id,
    metadata: {
      eventId: event.id,
      venueName: event.venue,
      eventDate: event.date,
      startTime: event.startTime
    }
  });
}
```

**SongsFunction Integration**:
```typescript
// After adding song to playbook
await invokeNotificationsFunction({
  action: 'create',
  type: 'song_added',
  artistId: artistId,
  performedBy: currentUser.cognito_id,
  metadata: {
    songId: song.id,
    songTitle: song.globalSong.title,
    songArtist: song.globalSong.artistName
  }
});

// After song receives all votes
if (allVotesReceived) {
  await invokeNotificationsFunction({
    action: 'create',
    type: 'song_ready_for_review',
    artistId: artistId,
    performedBy: null, // System-generated
    metadata: {
      songId: song.id,
      songTitle: song.globalSong.title,
      voteCount: votes.length
    }
  });
}
```

### Frontend Components

#### 1. NotificationBell Component

**Location**: `client/src/components/notification-bell.tsx`

**Purpose**: Display bell icon with unread count in header

**Props**:
```typescript
interface NotificationBellProps {
  className?: string;
}
```

**State**:
```typescript
const [unreadCount, setUnreadCount] = useState(0);
const [isPopoverOpen, setIsPopoverOpen] = useState(false);
```

**Component Structure**:
```tsx
<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <NotificationPopover onClose={() => setIsPopoverOpen(false)} />
  </PopoverContent>
</Popover>
```


#### 2. NotificationPopover Component

**Location**: `client/src/components/notification-popover.tsx`

**Purpose**: Display recent notifications in dropdown

**Props**:
```typescript
interface NotificationPopoverProps {
  onClose: () => void;
}
```

**Component Structure**:
```tsx
<div className="w-80 max-h-96 overflow-y-auto">
  <div className="flex items-center justify-between p-4 border-b">
    <h3 className="font-semibold">Notifications</h3>
    <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
      Mark all read
    </Button>
  </div>
  
  <div className="divide-y">
    {notifications.slice(0, 10).map(notification => (
      <NotificationItem
        key={notification.id}
        notification={notification}
        onClick={() => handleNotificationClick(notification)}
      />
    ))}
  </div>
  
  <div className="p-4 border-t">
    <Button variant="outline" className="w-full" onClick={handleViewAll}>
      View All
    </Button>
  </div>
</div>
```

#### 3. NotificationItem Component

**Location**: `client/src/components/notification-item.tsx`

**Purpose**: Display individual notification with icon, message, and timestamp

**Props**:
```typescript
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
}
```

**Component Structure**:
```tsx
<div 
  className={cn(
    "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
    !notification.read && "bg-primary/5"
  )}
  onClick={onClick}
>
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0">
      {getNotificationIcon(notification.type)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">{notification.message}</p>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs">
          {notification.artistName}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(notification.createdAt)}
        </span>
      </div>
    </div>
    {showDismiss && (
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss?.();
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
</div>
```


#### 4. NotificationCenter Page

**Location**: `client/src/pages/notifications.tsx`

**Purpose**: Full-page view of all notifications with filtering

**Component Structure**:
```tsx
export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by artist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Artists</SelectItem>
              {artists.map(artist => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        {filteredNotifications.map(notification => (
          <Card key={notification.id}>
            <CardContent className="p-0">
              <NotificationItem
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onDismiss={() => handleDismiss(notification.id)}
                showDismiss
              />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredNotifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notifications</p>
        </div>
      )}
    </div>
  );
}
```

#### 5. NotificationsService

**Location**: `client/src/lib/services/notifications-service.ts`

**Purpose**: API client for notification operations

**Interface**:
```typescript
export interface Notification {
  id: string;
  artistId: string;
  artistName: string;
  userId: string;
  type: NotificationType;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  expiresAt: string;
}

export type NotificationType =
  | 'song_added'
  | 'song_ready_for_review'
  | 'gig_added'
  | 'gig_removed'
  | 'rehearsal_added'
  | 'rehearsal_removed';

class NotificationsService {
  async getNotifications(artistId?: string): Promise<Notification[]>;
  async markAsRead(notificationId: string): Promise<void>;
  async dismiss(notificationId: string): Promise<void>;
  async markAllAsRead(): Promise<void>;
}
```


## Data Models

### DynamoDB Table: bndy-notifications

**Table Configuration**:
- **Table Name**: `bndy-notifications`
- **Primary Key**: `id` (String, UUID)
- **Billing Mode**: Pay-per-request
- **TTL Attribute**: `expiresAt` (Number, Unix timestamp in seconds)

**Global Secondary Indexes**:

1. **user_id-created_at-index**
   - Partition Key: `user_id` (String)
   - Sort Key: `created_at` (String, ISO 8601)
   - Projection: ALL
   - Purpose: Fetch all notifications for a user, sorted by date

2. **artist_id-created_at-index**
   - Partition Key: `artist_id` (String)
   - Sort Key: `created_at` (String, ISO 8601)
   - Projection: ALL
   - Purpose: Fetch all notifications for an artist, sorted by date

**Attributes**:
```typescript
interface NotificationRecord {
  id: string;                    // UUID (Primary Key)
  artist_id: string;             // Artist UUID (GSI Partition Key)
  user_id: string;               // User cognito_id (GSI Partition Key)
  type: NotificationType;        // Notification type enum
  message: string;               // Human-readable message
  metadata: string;              // JSON string with context data
  read: boolean;                 // Read status
  dismissed: boolean;            // Dismissed status
  created_at: string;            // ISO 8601 timestamp (GSI Sort Key)
  expires_at: number;            // Unix timestamp in seconds (TTL)
}
```

**Example Records**:

```json
// Song added notification
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "artist_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "cognito_abc123",
  "type": "song_added",
  "message": "John Smith added 'Wonderwall' to suggestions",
  "metadata": "{\"songId\":\"s123\",\"songTitle\":\"Wonderwall\",\"songArtist\":\"Oasis\",\"performedBy\":\"cognito_xyz789\"}",
  "read": false,
  "dismissed": false,
  "created_at": "2025-11-08T14:30:00.000Z",
  "expires_at": 1733673000
}

// Gig added notification
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "artist_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "cognito_abc123",
  "type": "gig_added",
  "message": "Sarah Jones added a gig at The Cavern Club on 15/12/2025",
  "metadata": "{\"eventId\":\"e456\",\"venueName\":\"The Cavern Club\",\"eventDate\":\"2025-12-15\",\"performedBy\":\"cognito_def456\"}",
  "read": false,
  "dismissed": false,
  "created_at": "2025-11-08T15:45:00.000Z",
  "expires_at": 1733677500
}
```


### Notification Grouping Logic

**Purpose**: Combine multiple similar notifications to reduce noise

**Grouping Rules**:
- Group notifications of the same type from the same user within 5 minutes
- Only group `song_added` notifications (other types remain individual)
- Store grouped count in metadata

**Implementation**:
```typescript
async function createNotification(params: CreateNotificationParams) {
  const { type, artistId, performedBy, metadata } = params;
  
  // Check for recent similar notifications (song_added only)
  if (type === 'song_added') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const existingNotifications = await queryNotifications({
      artistId,
      type: 'song_added',
      performedBy,
      createdAfter: fiveMinutesAgo
    });
    
    if (existingNotifications.length > 0) {
      // Update existing notification with incremented count
      const existing = existingNotifications[0];
      const currentCount = existing.metadata.count || 1;
      const newCount = currentCount + 1;
      
      await updateNotification(existing.id, {
        message: `${performedByName} added ${newCount} songs to suggestions`,
        metadata: { ...existing.metadata, count: newCount }
      });
      
      return;
    }
  }
  
  // Create new notification
  await createNewNotification(params);
}
```

## Error Handling

### Backend Error Handling

**Lambda Function Error Responses**:
```typescript
// 400 Bad Request - Invalid input
{
  statusCode: 400,
  body: JSON.stringify({ error: 'Invalid notification ID format' })
}

// 401 Unauthorized - Missing/invalid JWT
{
  statusCode: 401,
  body: JSON.stringify({ error: 'Unauthorized' })
}

// 403 Forbidden - User doesn't own notification
{
  statusCode: 403,
  body: JSON.stringify({ error: 'Cannot modify another user\'s notification' })
}

// 404 Not Found - Notification doesn't exist
{
  statusCode: 404,
  body: JSON.stringify({ error: 'Notification not found' })
}

// 500 Internal Server Error - DynamoDB/Lambda error
{
  statusCode: 500,
  body: JSON.stringify({ error: 'Internal server error' })
}
```

**DynamoDB Error Handling**:
```typescript
try {
  await dynamoDB.putItem(params).promise();
} catch (error) {
  if (error.code === 'ConditionalCheckFailedException') {
    // Handle duplicate notification
    return { statusCode: 409, body: 'Notification already exists' };
  }
  
  if (error.code === 'ProvisionedThroughputExceededException') {
    // Retry with exponential backoff
    await retryWithBackoff(() => dynamoDB.putItem(params).promise());
  }
  
  throw error;
}
```


### Frontend Error Handling

**Service Layer Error Handling**:
```typescript
class NotificationsService {
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Network error or JSON parse error
      console.error('Notifications API error:', error);
      throw error;
    }
  }
}
```

**Component Error Handling**:
```typescript
// Graceful degradation - show cached notifications on error
const { data: notifications = [], error } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => notificationsService.getNotifications(),
  staleTime: 60000, // 1 minute
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
});

if (error) {
  // Show toast notification
  toast({
    title: 'Failed to load notifications',
    description: 'Using cached data. Please check your connection.',
    variant: 'destructive'
  });
}
```

## Testing Strategy

### Backend Testing

**Unit Tests** (Jest):
```typescript
describe('NotificationsFunction', () => {
  describe('GET /api/notifications', () => {
    it('should return user notifications sorted by date', async () => {
      const event = createAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/api/notifications',
        headers: { Authorization: 'Bearer valid-jwt' }
      });
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(5);
      expect(body[0].createdAt).toBeGreaterThan(body[1].createdAt);
    });
    
    it('should filter by artist when artistId provided', async () => {
      const event = createAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/api/notifications',
        queryStringParameters: { artistId: 'artist-123' }
      });
      
      const response = await handler(event);
      const body = JSON.parse(response.body);
      
      expect(body.every(n => n.artistId === 'artist-123')).toBe(true);
    });
  });
  
  describe('PUT /api/notifications/{id}/read', () => {
    it('should mark notification as read', async () => {
      const event = createAPIGatewayEvent({
        httpMethod: 'PUT',
        path: '/api/notifications/notif-123/read',
        pathParameters: { id: 'notif-123' }
      });
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      // Verify DynamoDB update
      const notification = await getNotification('notif-123');
      expect(notification.read).toBe(true);
    });
  });
});
```


**Integration Tests**:
```typescript
describe('Notification Creation Integration', () => {
  it('should create notifications when song is added', async () => {
    // Add song via SongsFunction
    const songResponse = await addSong(artistId, songData);
    
    // Wait for notification creation
    await waitFor(1000);
    
    // Verify notifications created for all members except performer
    const notifications = await getNotifications(artistId);
    expect(notifications).toHaveLength(2); // 3 members - 1 performer
    expect(notifications[0].type).toBe('song_added');
  });
  
  it('should group multiple song additions', async () => {
    // Add 3 songs within 5 minutes
    await addSong(artistId, song1);
    await addSong(artistId, song2);
    await addSong(artistId, song3);
    
    // Verify single grouped notification
    const notifications = await getNotifications(artistId);
    const songNotifications = notifications.filter(n => n.type === 'song_added');
    expect(songNotifications).toHaveLength(1);
    expect(songNotifications[0].message).toContain('added 3 songs');
  });
});
```

### Frontend Testing

**Component Tests** (React Testing Library):
```typescript
describe('NotificationBell', () => {
  it('should display unread count badge', () => {
    const { getByText } = render(<NotificationBell />);
    
    // Mock notifications with 5 unread
    mockNotifications([
      { id: '1', read: false },
      { id: '2', read: false },
      { id: '3', read: false },
      { id: '4', read: false },
      { id: '5', read: false }
    ]);
    
    expect(getByText('5')).toBeInTheDocument();
  });
  
  it('should open popover on click', async () => {
    const { getByRole, getByText } = render(<NotificationBell />);
    
    const bell = getByRole('button');
    await userEvent.click(bell);
    
    expect(getByText('Notifications')).toBeInTheDocument();
  });
});

describe('NotificationItem', () => {
  it('should navigate to pipeline on song notification click', async () => {
    const mockNavigate = jest.fn();
    const notification = {
      id: '1',
      type: 'song_added',
      message: 'John added Wonderwall',
      metadata: { songId: 's123' }
    };
    
    const { getByText } = render(
      <NotificationItem notification={notification} onClick={mockNavigate} />
    );
    
    await userEvent.click(getByText('John added Wonderwall'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/pipeline');
  });
});
```


## PWA Push Notifications

### Service Worker Integration

**Location**: `client/public/sw.js` (generated by vite-plugin-pwa)

**Push Event Handler**:
```javascript
// Add to existing service worker
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.message,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.notificationId,
    data: {
      url: data.url,
      notificationId: data.notificationId
    },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### Push Subscription Management

**Frontend Hook**: `client/src/hooks/use-push-notifications.ts`

```typescript
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);
  
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      await subscribeToPush();
    }
    
    return result;
  };
  
  const subscribeToPush = async () => {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    setSubscription(subscription);
    
    // Send subscription to backend
    await notificationsService.registerPushSubscription(subscription);
  };
  
  return { permission, subscription, requestPermission };
}
```

### AWS SNS Integration

**Lambda Function**: Send push notifications via AWS SNS

```typescript
import { SNS } from 'aws-sdk';

const sns = new SNS({ region: 'eu-west-2' });

async function sendPushNotification(params: {
  subscription: PushSubscription;
  notification: Notification;
}) {
  const { subscription, notification } = params;
  
  const payload = {
    title: notification.artistName,
    message: notification.message,
    url: getNotificationUrl(notification),
    notificationId: notification.id
  };
  
  // Use Web Push protocol
  const message = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    payload: JSON.stringify(payload)
  };
  
  await sns.publish({
    TopicArn: process.env.PUSH_NOTIFICATIONS_TOPIC_ARN,
    Message: JSON.stringify(message)
  }).promise();
}
```


## Performance Considerations

### Backend Optimization

**DynamoDB Query Optimization**:
- Use GSI `user_id-created_at-index` for efficient user notification queries
- Limit query results to 50 notifications per request (pagination)
- Use `ScanIndexForward: false` to get newest notifications first
- Filter expired notifications at query time using `FilterExpression`

**Lambda Cold Start Mitigation**:
- Keep Lambda function warm with CloudWatch Events (every 5 minutes)
- Use provisioned concurrency for NotificationsFunction (1 instance)
- Minimize dependencies in Lambda package

**Batch Operations**:
```typescript
// Mark all as read - use BatchWriteItem
async function markAllAsRead(userId: string) {
  const notifications = await queryNotifications({ userId, read: false });
  
  const batches = chunk(notifications, 25); // DynamoDB batch limit
  
  await Promise.all(
    batches.map(batch => 
      dynamoDB.batchWriteItem({
        RequestItems: {
          'bndy-notifications': batch.map(n => ({
            PutRequest: {
              Item: { ...n, read: true }
            }
          }))
        }
      }).promise()
    )
  );
}
```

### Frontend Optimization

**Polling Strategy**:
```typescript
// Use React Query with smart polling
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => notificationsService.getNotifications(),
  refetchInterval: 60000, // 60 seconds
  refetchIntervalInBackground: false, // Stop polling when tab inactive
  staleTime: 30000, // Consider data fresh for 30 seconds
});
```

**Notification Caching**:
```typescript
// Cache notifications in localStorage for offline access
const CACHE_KEY = 'bndy-notifications-cache';

function cacheNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(notifications));
  } catch (error) {
    // Handle quota exceeded
    console.warn('Failed to cache notifications:', error);
  }
}

function getCachedNotifications(): Notification[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    return [];
  }
}
```

**Component Memoization**:
```typescript
// Memoize notification items to prevent unnecessary re-renders
const NotificationItem = memo(({ notification, onClick }: NotificationItemProps) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.notification.id === nextProps.notification.id &&
         prevProps.notification.read === nextProps.notification.read;
});
```


## Security Considerations

### Authentication & Authorization

**JWT Validation**:
```typescript
// All notification endpoints require valid JWT
async function validateJWT(event: APIGatewayProxyEvent): Promise<User> {
  const token = extractJWTFromCookie(event.headers.Cookie);
  
  if (!token) {
    throw new UnauthorizedError('Missing authentication token');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return await getUserFromCognito(decoded.sub);
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

**Notification Ownership Validation**:
```typescript
// Users can only read/modify their own notifications
async function markAsRead(user: User, notificationId: string) {
  const notification = await getNotification(notificationId);
  
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }
  
  if (notification.user_id !== user.cognito_id) {
    throw new ForbiddenError('Cannot modify another user\'s notification');
  }
  
  await updateNotification(notificationId, { read: true });
}
```

### Data Privacy

**Sensitive Data Handling**:
- Notification messages do not contain sensitive user data (emails, phone numbers)
- Metadata is stored as JSON string, not exposed in logs
- User IDs are Cognito IDs (UUIDs), not personally identifiable

**CORS Configuration**:
```typescript
// API Gateway CORS settings
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://backstage.bndy.co.uk',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

### Rate Limiting

**DynamoDB Throttling Protection**:
```typescript
// Implement exponential backoff for DynamoDB operations
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'ProvisionedThroughputExceededException' && i < maxRetries - 1) {
        const delay = Math.min(1000 * 2 ** i, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Frontend Rate Limiting**:
```typescript
// Prevent notification spam from rapid polling
const MIN_POLL_INTERVAL = 30000; // 30 seconds minimum
let lastPollTime = 0;

async function pollNotifications() {
  const now = Date.now();
  if (now - lastPollTime < MIN_POLL_INTERVAL) {
    return; // Skip poll if too soon
  }
  
  lastPollTime = now;
  await notificationsService.getNotifications();
}
```


## Mobile-First Design

### Responsive Layout

**Notification Bell Positioning**:
```tsx
// Mobile: Top-right of header
// Desktop: Top-right of header (same position)
<header className="sticky top-0 z-50 bg-background border-b">
  <div className="container flex items-center justify-between h-16 px-4">
    <BndyLogo />
    <div className="flex items-center gap-2">
      <NotificationBell />
      <ThemeToggle />
      <UserMenu />
    </div>
  </div>
</header>
```

**Popover Responsive Sizing**:
```tsx
// Mobile: Full width with padding
// Desktop: Fixed 320px width
<PopoverContent 
  className="w-screen max-w-[calc(100vw-2rem)] sm:w-80"
  align="end"
  sideOffset={8}
>
  {/* Notification list */}
</PopoverContent>
```

**Notification Center Mobile Layout**:
```tsx
// Mobile: Full-width cards with touch-friendly spacing
// Desktop: Max-width container with hover states
<div className="container max-w-4xl mx-auto p-4 sm:p-6">
  <div className="space-y-2 sm:space-y-3">
    {notifications.map(notification => (
      <Card 
        key={notification.id}
        className="touch-manipulation active:scale-[0.98] transition-transform"
      >
        <NotificationItem notification={notification} />
      </Card>
    ))}
  </div>
</div>
```

### Touch Interactions

**Swipe to Dismiss** (Optional Enhancement):
```typescript
// Use react-swipeable for mobile swipe gestures
import { useSwipeable } from 'react-swipeable';

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onDismiss(notification.id),
    trackMouse: false, // Only track touch
    delta: 50 // Minimum swipe distance
  });
  
  return (
    <div {...handlers} className="relative">
      {/* Notification content */}
    </div>
  );
}
```

### Accessibility

**ARIA Labels**:
```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
  aria-expanded={isPopoverOpen}
>
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <Badge aria-label={`${unreadCount} unread notifications`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  )}
</Button>
```

**Keyboard Navigation**:
```tsx
// Support keyboard navigation in notification list
<div
  role="listitem"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleNotificationClick(notification);
    }
  }}
>
  {/* Notification content */}
</div>
```

**Screen Reader Support**:
```tsx
// Announce new notifications to screen readers
<div role="status" aria-live="polite" className="sr-only">
  {newNotificationCount > 0 && (
    `${newNotificationCount} new notification${newNotificationCount > 1 ? 's' : ''}`
  )}
</div>
```


## Deployment Strategy

### Infrastructure as Code

**CloudFormation Template Addition** (bndy-serverless-api):

```yaml
NotificationsFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub '${AWS::StackName}-NotificationsFunction'
    CodeUri: src/notifications/
    Handler: index.handler
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 512
    Environment:
      Variables:
        NOTIFICATIONS_TABLE: !Ref NotificationsTable
        JWT_SECRET: !Ref JWTSecret
        PUSH_TOPIC_ARN: !Ref PushNotificationsTopic
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref NotificationsTable
      - SNSPublishMessagePolicy:
          TopicName: !GetAtt PushNotificationsTopic.TopicName
      - Statement:
          - Effect: Allow
            Action:
              - lambda:InvokeFunction
            Resource: !GetAtt MembershipsFunction.Arn
    Events:
      GetNotifications:
        Type: HttpApi
        Properties:
          Path: /api/notifications
          Method: GET
          ApiId: !Ref HttpApi
      MarkAsRead:
        Type: HttpApi
        Properties:
          Path: /api/notifications/{id}/read
          Method: PUT
          ApiId: !Ref HttpApi
      Dismiss:
        Type: HttpApi
        Properties:
          Path: /api/notifications/{id}/dismiss
          Method: PUT
          ApiId: !Ref HttpApi
      MarkAllRead:
        Type: HttpApi
        Properties:
          Path: /api/notifications/mark-all-read
          Method: POST
          ApiId: !Ref HttpApi

NotificationsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: bndy-notifications
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: id
        AttributeType: S
      - AttributeName: user_id
        AttributeType: S
      - AttributeName: artist_id
        AttributeType: S
      - AttributeName: created_at
        AttributeType: S
    KeySchema:
      - AttributeName: id
        KeyType: HASH
    GlobalSecondaryIndexes:
      - IndexName: user_id-created_at-index
        KeySchema:
          - AttributeName: user_id
            KeyType: HASH
          - AttributeName: created_at
            KeyType: RANGE
        Projection:
          ProjectionType: ALL
      - IndexName: artist_id-created_at-index
        KeySchema:
          - AttributeName: artist_id
            KeyType: HASH
          - AttributeName: created_at
            KeyType: RANGE
        Projection:
          ProjectionType: ALL
    TimeToLiveSpecification:
      AttributeName: expires_at
      Enabled: true

PushNotificationsTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: bndy-push-notifications
    DisplayName: BNDY Push Notifications
```


### Deployment Steps

**Phase 1: Backend Infrastructure**
1. Update CloudFormation template with NotificationsTable and NotificationsFunction
2. Deploy stack: `sam build && sam deploy --guided`
3. Verify DynamoDB table created with GSIs and TTL enabled
4. Test Lambda function with Postman/curl

**Phase 2: Lambda Integration**
1. Update EventsFunction to invoke NotificationsFunction on event create/delete
2. Update SongsFunction to invoke NotificationsFunction on song add/vote
3. Deploy updated functions: `sam build && sam deploy`
4. Test notification creation via existing API endpoints

**Phase 3: Frontend Components**
1. Create NotificationsService in `client/src/lib/services/`
2. Create NotificationBell component
3. Create NotificationPopover component
4. Create NotificationItem component
5. Add NotificationBell to header/navigation
6. Test in development environment

**Phase 4: Notification Center Page**
1. Create NotificationsPage component
2. Add route to router configuration
3. Implement filtering and mark-all-read functionality
4. Test full user flow

**Phase 5: PWA Push Notifications**
1. Update service worker with push event handlers
2. Create usePushNotifications hook
3. Add permission request UI
4. Configure AWS SNS for Web Push
5. Test push notifications on mobile devices

**Phase 6: Production Deployment**
1. Merge to main branch (triggers GitHub Actions)
2. Amplify auto-deploys frontend
3. SAM auto-deploys backend
4. Monitor CloudWatch logs for errors
5. Verify notifications working in production

### Rollback Plan

**Backend Rollback**:
```bash
# Rollback to previous CloudFormation stack version
aws cloudformation update-stack \
  --stack-name bndy-serverless-api \
  --use-previous-template \
  --capabilities CAPABILITY_IAM
```

**Frontend Rollback**:
```bash
# Revert Amplify deployment to previous version
aws amplify start-deployment \
  --app-id d3hbhqxqqchzbb \
  --branch-name main \
  --job-id <previous-job-id>
```

**Feature Flag** (Optional):
```typescript
// Add feature flag to disable notifications if issues arise
const NOTIFICATIONS_ENABLED = process.env.VITE_NOTIFICATIONS_ENABLED === 'true';

export function NotificationBell() {
  if (!NOTIFICATIONS_ENABLED) {
    return null;
  }
  
  // Component implementation
}
```


## Monitoring & Observability

### CloudWatch Metrics

**Custom Metrics**:
```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch({ region: 'eu-west-2' });

async function recordMetric(metricName: string, value: number) {
  await cloudwatch.putMetricData({
    Namespace: 'BNDY/Notifications',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: 'Count',
      Timestamp: new Date()
    }]
  }).promise();
}

// Track notification creation
await recordMetric('NotificationsCreated', 1);

// Track notification reads
await recordMetric('NotificationsRead', 1);

// Track push notification sends
await recordMetric('PushNotificationsSent', 1);
```

**CloudWatch Alarms**:
```yaml
NotificationErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: bndy-notifications-errors
    MetricName: Errors
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: FunctionName
        Value: !Ref NotificationsFunction
    AlarmActions:
      - !Ref AlertTopic

NotificationLatencyAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: bndy-notifications-latency
    MetricName: Duration
    Namespace: AWS/Lambda
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 3000
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: FunctionName
        Value: !Ref NotificationsFunction
```

### Logging Strategy

**Structured Logging**:
```typescript
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  }));
}

// Usage
log('INFO', 'Notification created', {
  notificationId: notification.id,
  artistId: notification.artist_id,
  type: notification.type,
  recipientCount: recipients.length
});

log('ERROR', 'Failed to send push notification', {
  notificationId: notification.id,
  error: error.message,
  stack: error.stack
});
```

**Log Insights Queries**:
```sql
-- Find most common notification types
fields type, count(*) as count
| filter @message like /Notification created/
| stats count() by type
| sort count desc

-- Find slow notification queries
fields @timestamp, @duration, user_id
| filter @message like /GET \/api\/notifications/
| filter @duration > 1000
| sort @duration desc

-- Find notification creation errors
fields @timestamp, @message, error
| filter @message like /Failed to create notification/
| sort @timestamp desc
```


## Cost Estimation

### AWS Service Costs (Monthly)

**DynamoDB** (bndy-notifications table):
- Storage: ~1GB (10,000 notifications × 1KB each) = $0.25/month
- Read requests: 43,200 reads/day (30 users × 60 polls/hour × 24 hours) = $0.11/month
- Write requests: 500 writes/day (notifications created) = $0.01/month
- **Total DynamoDB**: ~$0.37/month

**Lambda** (NotificationsFunction):
- Invocations: 43,700/day (43,200 reads + 500 writes) = 1.3M/month
- Duration: 200ms average × 512MB memory = 100 GB-seconds/month
- Free tier: 1M requests + 400,000 GB-seconds/month
- **Total Lambda**: $0 (within free tier)

**API Gateway**:
- Requests: 1.3M/month
- Free tier: 1M requests/month
- Overage: 300K requests × $1.00/million = $0.30/month
- **Total API Gateway**: ~$0.30/month

**SNS** (Push Notifications):
- Push notifications: 500/day × 30 days = 15,000/month
- Cost: 15,000 × $0.50/million = $0.01/month
- **Total SNS**: ~$0.01/month

**CloudWatch Logs**:
- Log ingestion: 1GB/month = $0.50/month
- Log storage: 1GB/month = $0.03/month
- **Total CloudWatch**: ~$0.53/month

**Total Monthly Cost**: ~$1.21/month

### Cost Optimization Strategies

1. **Reduce Polling Frequency**: Increase from 60s to 120s (halves API Gateway costs)
2. **Implement Caching**: Cache notifications in frontend for 30s (reduces DynamoDB reads)
3. **Batch Notifications**: Group similar notifications (reduces write operations)
4. **TTL Cleanup**: Ensure TTL is working to prevent storage bloat
5. **Reserved Capacity**: If usage grows, consider DynamoDB reserved capacity

### Scaling Considerations

**At 100 users**:
- DynamoDB: ~$1.50/month
- Lambda: ~$0.50/month (exceeds free tier)
- API Gateway: ~$1.00/month
- **Total**: ~$3.50/month

**At 1,000 users**:
- DynamoDB: ~$15/month
- Lambda: ~$5/month
- API Gateway: ~$10/month
- **Total**: ~$35/month

**At 10,000 users**:
- DynamoDB: ~$150/month
- Lambda: ~$50/month
- API Gateway: ~$100/month
- **Total**: ~$350/month


## Future Enhancements

### Phase 2 Features (Post-MVP)

**1. Real-Time Notifications via WebSocket**
- Replace polling with WebSocket connection
- Use AWS API Gateway WebSocket API
- Instant notification delivery
- Reduced API costs (no polling overhead)

**2. Notification Preferences**
- User settings to enable/disable notification types
- Per-artist notification preferences
- Email digest option (daily/weekly summary)
- Quiet hours (mute notifications during specific times)

**3. Advanced Filtering**
- Filter by notification type (songs, gigs, rehearsals)
- Filter by date range
- Search notifications by keyword
- Archive old notifications

**4. Notification Actions**
- Quick actions in notification (e.g., "Accept", "Decline", "View")
- Inline responses without navigating away
- Batch actions (dismiss all, mark all read)

**5. Analytics Dashboard**
- Notification engagement metrics
- Most active notification types
- User engagement rates
- Push notification delivery rates

**6. Enhanced Push Notifications**
- Rich notifications with images
- Action buttons in push notifications
- Notification grouping on mobile
- Priority levels (urgent, normal, low)

### Technical Debt Considerations

**1. Notification Deduplication**
- Prevent duplicate notifications from race conditions
- Use DynamoDB conditional writes with unique constraint
- Implement idempotency keys

**2. Notification Archiving**
- Move old notifications to S3 for long-term storage
- Reduce DynamoDB storage costs
- Implement "View Archive" feature

**3. Performance Monitoring**
- Add distributed tracing with AWS X-Ray
- Track notification delivery latency
- Monitor push notification success rates

**4. Internationalization**
- Support multiple languages for notification messages
- Use i18n library for message templates
- Store user language preference

**5. Notification Templates**
- Centralize notification message generation
- Support dynamic message formatting
- A/B test notification wording

