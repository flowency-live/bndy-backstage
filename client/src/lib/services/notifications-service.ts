// src/lib/services/notifications-service.ts
import { API_BASE_URL } from '../../config/api';

export type NotificationType =
  | 'song_added'
  | 'song_ready'
  | 'gig_added'
  | 'gig_removed'
  | 'rehearsal_added'
  | 'rehearsal_removed';

export interface Notification {
  id: string;
  user_id: string;
  artist_id: string;
  type: NotificationType;
  message: string;
  metadata: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  updated_at: string;
  expires_at: number;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
}

export interface MarkAllAsReadResponse {
  count: number;
}

class NotificationsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request with credentials
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (
        response.status === 204 ||
        response.headers.get('content-length') === '0'
      ) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error('NotificationsService API request failed:', error);
      throw error;
    }
  }

  /**
   * Get notifications for the authenticated user
   * @param artistId Optional filter by artist ID
   * @param limit Maximum number of notifications to return (default 50)
   */
  async getNotifications(
    artistId?: string,
    limit: number = 50
  ): Promise<GetNotificationsResponse> {
    const params = new URLSearchParams();
    if (artistId) {
      params.append('artistId', artistId);
    }
    params.append('limit', limit.toString());

    const query = params.toString();
    const endpoint = `/api/notifications${query ? `?${query}` : ''}`;

    return this.apiRequest<GetNotificationsResponse>(endpoint);
  }

  /**
   * Mark a notification as read
   * @param notificationId The notification ID to mark as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.apiRequest<Notification>(
      `/api/notifications/${notificationId}/read`,
      {
        method: 'PUT',
      }
    );
  }

  /**
   * Delete a notification
   * @param notificationId The notification ID to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    return this.apiRequest<void>(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Mark all unread notifications as read
   * @param artistId Optional filter by artist ID
   */
  async markAllAsRead(
    artistId?: string
  ): Promise<MarkAllAsReadResponse> {
    const params = artistId ? `?artistId=${artistId}` : '';
    return this.apiRequest<MarkAllAsReadResponse>(
      `/api/notifications/mark-all-read${params}`,
      {
        method: 'POST',
      }
    );
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;
