// src/lib/services/memberships-service.ts
import { API_BASE_URL } from '../../config/api';

export interface ArtistMembership {
  id: string;
  membership_id: string;
  user_id: string;
  artist_id: string;
  role: string;
  membership_type: string;
  display_name?: string;
  icon?: string;
  color?: string;
  status: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  artist?: {
    id: string;
    name: string;
    location?: string;
    displayColour?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface MembershipsResponse {
  user: { id: string };
  artists: ArtistMembership[];
}

class MembershipsService {
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
   * Get current user's artist memberships
   */
  async getMyMemberships(): Promise<MembershipsResponse> {
    return this.apiRequest<MembershipsResponse>('/api/memberships/me');
  }

  /**
   * Get members of a specific artist
   */
  async getArtistMembers(artistId: string): Promise<ArtistMembership[]> {
    return this.apiRequest<ArtistMembership[]>(`/api/artists/${artistId}/members`);
  }
}

// Export singleton instance
export const membershipsService = new MembershipsService();
export default membershipsService;
