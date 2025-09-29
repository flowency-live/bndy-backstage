// src/lib/services/bands-service.ts
import { API_BASE_URL } from '../../config/api';

export interface BandMember {
  id: string;
  userId: string;
  bandId: string;
  role: string;
  status: string;
  instrument: string;
  joinedAt: string;
  user: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

export interface Band {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BandEvent {
  id: string;
  bandId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: 'rehearsal' | 'gig' | 'recording' | 'meeting';
  status: 'scheduled' | 'confirmed' | 'cancelled';
}

export interface Song {
  id: string;
  bandId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  spotifyId?: string;
  key?: string;
  tempo?: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: 'learning' | 'rehearsing' | 'ready' | 'retired';
  addedAt: string;
}

class BandsService {
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

      // Handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`Bands API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get all bands for the current user
   */
  async getBands(): Promise<Band[]> {
    return this.apiRequest<Band[]>('/api/bands');
  }

  /**
   * Get band members
   */
  async getBandMembers(bandId: string): Promise<BandMember[]> {
    return this.apiRequest<BandMember[]>(`/api/bands/${bandId}/members`);
  }

  /**
   * Get band events within date range
   */
  async getBandEvents(bandId: string, startDate: string, endDate: string): Promise<BandEvent[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    return this.apiRequest<BandEvent[]>(`/api/bands/${bandId}/events?${params.toString()}`);
  }

  /**
   * Get band songs
   */
  async getBandSongs(bandId: string): Promise<Song[]> {
    return this.apiRequest<Song[]>(`/api/bands/${bandId}/songs`);
  }

  /**
   * Add song to band
   */
  async addSong(bandId: string, songData: Partial<Song>): Promise<Song> {
    return this.apiRequest<Song>(`/api/bands/${bandId}/songs`, {
      method: 'POST',
      body: JSON.stringify(songData),
    });
  }

  /**
   * Update song
   */
  async updateSong(bandId: string, songId: string, updates: Partial<Song>): Promise<Song> {
    return this.apiRequest<Song>(`/api/bands/${bandId}/songs/${songId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete song
   */
  async deleteSong(bandId: string, songId: string): Promise<void> {
    return this.apiRequest<void>(`/api/bands/${bandId}/songs/${songId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update song readiness for member
   */
  async updateSongReadiness(
    bandId: string,
    songId: string,
    membershipId: string,
    readiness: 1 | 2 | 3 | 4 | 5
  ): Promise<void> {
    return this.apiRequest<void>(`/api/bands/${bandId}/songs/${songId}/readiness`, {
      method: 'POST',
      body: JSON.stringify({ membershipId, readiness }),
    });
  }

  /**
   * Update band details
   */
  async updateBand(bandId: string, updates: Partial<Band>): Promise<Band> {
    return this.apiRequest<Band>(`/api/bands/${bandId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Invite member to band
   */
  async inviteMember(bandId: string, inviteData: { email: string; role: string }): Promise<void> {
    return this.apiRequest<void>(`/api/bands/${bandId}/members/invite`, {
      method: 'POST',
      body: JSON.stringify(inviteData),
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    bandId: string,
    membershipId: string,
    role: string
  ): Promise<void> {
    return this.apiRequest<void>(`/api/bands/${bandId}/members/${membershipId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Remove member from band
   */
  async removeMember(bandId: string, membershipId: string): Promise<void> {
    return this.apiRequest<void>(`/api/bands/${bandId}/members/${membershipId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const bandsService = new BandsService();
export default bandsService;