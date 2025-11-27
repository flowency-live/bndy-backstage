// src/lib/services/events-service.ts
import { API_BASE_URL } from '../../config/api';

export interface Event {
  id: string;
  artistId: string;
  type: 'gig' | 'practice' | 'recording' | 'other';
  title?: string;
  venue?: string;
  location?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  setlistId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarResponse {
  artistEvents: Event[];
  userUnavailability?: Array<{
    id: string;
    userId: string;
    date: string;
    reason?: string;
  }>;
}

export interface CreateEventRequest {
  type: 'gig' | 'practice' | 'recording' | 'other';
  title?: string;
  venue?: string;
  location?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  setlistId?: string;
}

export interface UpdateEventRequest {
  type?: 'gig' | 'practice' | 'recording' | 'other';
  title?: string;
  venue?: string;
  location?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  setlistId?: string;
}

class EventsService {
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      // Handle empty responses (like DELETE)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get calendar events for an artist within a date range
   */
  async getArtistCalendar(
    artistId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarResponse> {
    return this.apiRequest<CalendarResponse>(
      `/api/artists/${artistId}/calendar?startDate=${startDate}&endDate=${endDate}`
    );
  }

  /**
   * Get all events for an artist (no date filter)
   */
  async getAllArtistEvents(artistId: string): Promise<Event[]> {
    return this.apiRequest<Event[]>(`/api/artists/${artistId}/events`);
  }

  /**
   * Create a new event for an artist
   */
  async createEvent(artistId: string, event: CreateEventRequest): Promise<Event> {
    return this.apiRequest<Event>(`/api/artists/${artistId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  /**
   * Update an existing event
   */
  async updateEvent(artistId: string, eventId: string, updates: UpdateEventRequest): Promise<Event> {
    return this.apiRequest<Event>(`/api/artists/${artistId}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(artistId: string, eventId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Export calendar as iCal file
   * Returns a Blob for download
   */
  async exportCalendar(
    artistId: string,
    options: {
      includePrivate?: boolean;
      memberOnly?: boolean;
      accessToken: string;
    }
  ): Promise<{ blob: Blob; filename: string }> {
    const { includePrivate = false, memberOnly = false, accessToken } = options;

    const params = new URLSearchParams();
    if (includePrivate) params.append('includePrivate', 'true');
    if (memberOnly) params.append('memberOnly', 'true');

    const url = `${this.baseUrl}/api/artists/${artistId}/calendar/export/ical?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export calendar');
    }

    // Get the filename from the response headers
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'calendar.ics';

    // Get the blob
    const blob = await response.blob();

    return { blob, filename };
  }

  /**
   * Get calendar subscription URLs
   */
  async getCalendarUrls(
    artistId: string,
    accessToken: string
  ): Promise<{ urls: { full: string; public: string; personal: string } }> {
    const url = `${this.baseUrl}/api/artists/${artistId}/calendar/url`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get calendar URLs');
    }

    return await response.json();
  }

  /**
   * Create a public gig
   */
  async createPublicGig(artistId: string, gigData: {
    venueId: string;
    type: string;
    date: string;
    startTime: string;
    endTime?: string;
    title?: string;
    hasCustomTitle?: boolean;
    description?: string;
    ticketUrl?: string;
    ticketPrice?: string;
    isPublic?: boolean;
    source?: string;
  }): Promise<Event> {
    return this.apiRequest<Event>(`/api/artists/${artistId}/public-gigs`, {
      method: 'POST',
      body: JSON.stringify(gigData),
    });
  }

  /**
   * Update a public gig
   */
  async updatePublicGig(artistId: string, eventId: string, gigData: {
    venueId?: string;
    type?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    hasCustomTitle?: boolean;
    description?: string;
    ticketUrl?: string;
    ticketPrice?: string;
    isPublic?: boolean;
    source?: string;
  }): Promise<Event> {
    return this.apiRequest<Event>(`/api/artists/${artistId}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(gigData),
    });
  }

  /**
   * Toggle availability for a specific date
   */
  async toggleAvailability(
    artistId: string,
    date: string,
    notes?: string
  ): Promise<{ action: 'created' | 'deleted'; event?: Event; id?: string }> {
    return this.apiRequest<{ action: 'created' | 'deleted'; event?: Event; id?: string }>(
      `/api/artists/${artistId}/events/toggle-availability`,
      {
        method: 'POST',
        body: JSON.stringify({ date, notes }),
      }
    );
  }

  /**
   * Bulk set availability based on rules
   */
  async bulkSetAvailability(params: {
    artistId: string;
    startDate: string;
    endDate: string;
    rules: string[];
    notes?: string;
  }): Promise<{ created: number; skipped: number; events: Event[] }> {
    const { artistId, ...body } = params;
    return this.apiRequest<{ created: number; skipped: number; events: Event[] }>(
      `/api/artists/${artistId}/events/bulk-availability`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }
}

// Export singleton instance
export const eventsService = new EventsService();
export default eventsService;
