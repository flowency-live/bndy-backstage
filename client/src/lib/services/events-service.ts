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
}

// Export singleton instance
export const eventsService = new EventsService();
export default eventsService;
