// src/lib/services/artists-service.ts
// Artist management service for the new platform architecture
// NOTE: "band" is just one artist type (band, solo, duo, group, dj, collective)
// This service provides artist-specific operations following the new architecture

import { API_BASE_URL } from '../../config/api';

export interface ArtistMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  instrument: string | null;
  role: string;
  joinedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  bio?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  profileImageUrl?: string;
  displayColour?: string;
  genres?: string[];
  artistType?: 'band' | 'solo' | 'duo' | 'group' | 'dj' | 'collective';
  actType?: string[];
  acoustic?: boolean;
  facebookUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  twitterUrl?: string;
  createdAt: string;
  updatedAt: string;
}

class ArtistsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses (204 No Content, etc.)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get artist members
   */
  async getArtistMembers(artistId: string): Promise<ArtistMember[]> {
    const response = await this.apiRequest<ArtistMember[] | { members: ArtistMember[] }>(
      `/api/artists/${artistId}/members`
    );
    // Handle both response formats (array or object with members property)
    return Array.isArray(response) ? response : response.members || [];
  }

  /**
   * Remove membership by ID
   */
  async removeMembership(membershipId: string): Promise<void> {
    return this.apiRequest<void>(`/api/memberships/${membershipId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update artist details
   */
  async updateArtist(artistId: string, updates: Partial<Artist>): Promise<Artist> {
    return this.apiRequest<Artist>(`/api/artists/${artistId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Get artist by ID
   */
  async getArtist(artistId: string): Promise<Artist> {
    return this.apiRequest<Artist>(`/api/artists/${artistId}`);
  }

  /**
   * Get all artists for current user
   */
  async getMyArtists(): Promise<Artist[]> {
    return this.apiRequest<Artist[]>('/api/artists');
  }

  /**
   * Create new artist
   */
  async createArtist(artistData: Partial<Artist>): Promise<Artist> {
    return this.apiRequest<Artist>('/api/artists', {
      method: 'POST',
      body: JSON.stringify(artistData),
    });
  }

  /**
   * Delete artist
   */
  async deleteArtist(artistId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get pipeline song counts by status
   */
  async getPipelineCounts(artistId: string): Promise<{
    voting: number;
    review: number;
    practice: number;
  }> {
    const [votingResponse, reviewResponse, practiceResponse] = await Promise.all([
      this.apiRequest<any[]>(`/api/artists/${artistId}/pipeline?status=voting`),
      this.apiRequest<any[]>(`/api/artists/${artistId}/pipeline?status=review`),
      this.apiRequest<any[]>(`/api/artists/${artistId}/pipeline?status=practice`)
    ]);

    return {
      voting: votingResponse?.length || 0,
      review: reviewResponse?.length || 0,
      practice: practiceResponse?.length || 0
    };
  }

  /**
   * Check and send vote reminders for an artist
   */
  async checkVoteReminders(artistId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/check-vote-reminders`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const artistsService = new ArtistsService();
export default artistsService;
