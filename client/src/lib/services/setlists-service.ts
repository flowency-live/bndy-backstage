// src/lib/services/setlists-service.ts
import { API_BASE_URL } from '../../config/api';

export interface SetlistSong {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  custom_duration?: number;
  tuning?: string;
  notes?: string;
  segueInto?: boolean;
  spotifyUrl?: string;
  guitarChordsUrl?: string;
}

export interface Setlist {
  id: string;
  artistId: string;
  name: string;
  description?: string;
  songs: SetlistSong[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSetlistRequest {
  name: string;
  description?: string;
}

export interface UpdateSetlistRequest {
  name?: string;
  description?: string;
  songs?: SetlistSong[];
}

class SetlistsService {
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
   * Get all setlists for an artist
   */
  async getArtistSetlists(artistId: string): Promise<Setlist[]> {
    return this.apiRequest<Setlist[]>(`/api/artists/${artistId}/setlists`);
  }

  /**
   * Get a specific setlist by ID
   */
  async getSetlist(artistId: string, setlistId: string): Promise<Setlist> {
    return this.apiRequest<Setlist>(`/api/artists/${artistId}/setlists/${setlistId}`);
  }

  /**
   * Create a new setlist
   */
  async createSetlist(artistId: string, setlist: CreateSetlistRequest): Promise<Setlist> {
    return this.apiRequest<Setlist>(`/api/artists/${artistId}/setlists`, {
      method: 'POST',
      body: JSON.stringify(setlist),
    });
  }

  /**
   * Update an existing setlist
   */
  async updateSetlist(
    artistId: string,
    setlistId: string,
    updates: UpdateSetlistRequest
  ): Promise<Setlist> {
    return this.apiRequest<Setlist>(`/api/artists/${artistId}/setlists/${setlistId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a setlist
   */
  async deleteSetlist(artistId: string, setlistId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/setlists/${setlistId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Duplicate a setlist
   */
  async duplicateSetlist(artistId: string, setlistId: string, newName: string): Promise<Setlist> {
    return this.apiRequest<Setlist>(`/api/artists/${artistId}/setlists/${setlistId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
  }
}

// Export singleton instance
export const setlistsService = new SetlistsService();
export default setlistsService;
