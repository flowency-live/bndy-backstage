// src/lib/services/venues-service.ts
import { API_BASE_URL } from '../../config/api';

export interface Venue {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  website?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FindOrCreateVenueRequest {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  website?: string;
  source?: string;
}

export interface FindOrCreateVenueResponse {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  website?: string;
  matchConfidence?: number;
}

class VenuesService {
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

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find an existing venue or create a new one
   * Uses deduplication logic on the backend
   */
  async findOrCreate(venueData: FindOrCreateVenueRequest): Promise<FindOrCreateVenueResponse> {
    return this.apiRequest<FindOrCreateVenueResponse>('/api/venues/find-or-create', {
      method: 'POST',
      body: JSON.stringify(venueData),
    });
  }

  /**
   * Get venue by ID
   */
  async getVenue(venueId: string): Promise<Venue> {
    return this.apiRequest<Venue>(`/api/venues/${venueId}`);
  }

  /**
   * Search venues
   */
  async searchVenues(query: string): Promise<Venue[]> {
    return this.apiRequest<Venue[]>(`/api/venues?q=${encodeURIComponent(query)}`);
  }
}

// Export singleton instance
export const venuesService = new VenuesService();
export default venuesService;
